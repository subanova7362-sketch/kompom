"use strict";

console.log("✅ parser.js подключен");

async function loadPDF(file) {
    const arrayBuffer = await file.arrayBuffer();
    return await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
}

async function extractPDFText(pdf) {
    let text = "";
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();
        text += content.items.map(item => item.str).join("\n") + "\n";
    }
    return text;
}

function cleanDigits(value) { return String(value || "").replace(/\D/g, ""); }

function findAccountNumber(text) {
    const normalized = String(text || "").replace(/\u00a0/g, " ");
    const patterns = [
        /Лицевой\s+сч[её]т\s*(?:№|N)?\s*[:№-]?\s*([0-9][0-9\s-]{5,24})/i,
        /Л\/С\s*(?:№|N)?\s*[:№-]?\s*([0-9][0-9\s-]{5,24})/i,
        /Лицевой\s*[:№-]\s*([0-9][0-9\s-]{5,24})/i
    ];
    for (const pattern of patterns) { const match = normalized.match(pattern); if (match) return cleanDigits(match[1]); }
    const lines = normalized.split("\n").map(line => line.trim()).filter(Boolean);
    const index = lines.findIndex(line => /^Лицевой\s+сч[её]т$/i.test(line));
    if (index >= 0) {
        for (let i = index + 1; i <= Math.min(lines.length - 1, index + 12); i++) {
            const digits = cleanDigits(lines[i]);
            if (/^\d{6,15}$/.test(digits) && digits.length === lines[i].replace(/\s/g, "").length) return digits;
        }
    }
    return "";
}

function findBankAccountNumber(text) {
    const matches = [...String(text || "").matchAll(/(?:Номер\s+сч[её]та|Сч[её]т)\s*[:№-]?\s*(\d{20})/gi)];
    return matches.length ? matches[0][1] : "";
}

function getMonthName(month) {
    const months = {"01":"Январь","02":"Февраль","03":"Март","04":"Апрель","05":"Май","06":"Июнь","07":"Июль","08":"Август","09":"Сентябрь","10":"Октябрь","11":"Ноябрь","12":"Декабрь"};
    return months[month] || "Без месяца";
}

function formatAmount(amount) {
    if (amount === undefined || amount === null || isNaN(amount)) amount = 0;
    return Number(amount).toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " ₽";
}

function findUtilityPayments(text) {
    const payments = [];
    const lines = text.split("\n").map(line => line.trim()).filter(Boolean);
    const utilityLabels = ["Оплата услуг mBank.ZhKU","Оплата услуг mBank.ZHKH","Оплата услуг iBank.ZhKU","Оплата услуг iBank.ZHKH"];
    for (let i = 0; i < lines.length; i++) {
        const isUtilityLabel = utilityLabels.includes(lines[i]);
        const isBankTransfer = /Внешний банковский/i.test(lines[i]);
        if (!isUtilityLabel && !isBankTransfer) continue;
        let date = ""; let amount = 0;
        for (let j = i - 1; j >= Math.max(0, i - 12); j--) {
            if (!date && /^\d{2}\.\d{2}\.\d{4}$/.test(lines[j])) date = lines[j];
            if (amount === 0 && /^-\d[\d\s]*[.,]\d{2}(?:\s*₽)?$/.test(lines[j])) amount = parseFloat(lines[j].replace(/₽/g, "").replace(/\s/g, "").replace(",", "."));
            if (date && amount !== 0) break;
        }
        let recipientAccount = "";
        if (isBankTransfer) {
            for (let j = i; j <= Math.min(lines.length - 1, i + 10); j++) {
                const accountMatch = lines[j].match(/\b(\d{20})\b/);
                if (accountMatch) { recipientAccount = accountMatch[1]; break; }
            }
        }
        if (date && amount !== 0) payments.push({date, description: lines[i], amount: Math.abs(amount), paid: true, month: getMonthName(date.split(".")[1]), year: Number(date.split(".")[2]), recipientAccount});
    }
    return payments;
}

function parseMoney(value) {
    if (value === null || value === undefined || value === "") return null;
    const cleaned = String(value).replace(/[−–—]/g, "-").replace(/₽/g, "").replace(/руб(?:лей|ля|ль|\.)?/gi, "").replace(/\s/g, "").replace(",", ".");
    const number = Number(cleaned);
    return Number.isFinite(number) ? number : null;
}

function extractReceiptAmount(normalized, lines) {
    const label = /(?:итого\s+к\s+оплате|сумма\s+к\s+оплате|всего\s+к\s+оплате|к\s+оплате\s+за\s+расч[её]тный\s+период|к\s+оплате)/i;
    const moneyToken = /-?\s*\d{1,3}(?:[ \u00a0]\d{3})*(?:[.,]\d{1,2})|-?\s*\d+[.,]\d{1,2}|-?\s*\d+/;

    // Сначала ищем сумму рядом с подписью. Между подписью и числом PDF может вставить
    // «руб.», двоеточие, переносы строк и другие подписи таблицы.
    const labelMatches = [...normalized.matchAll(new RegExp(label.source, "gi"))];
    for (const match of labelMatches) {
        const after = normalized.slice(match.index + match[0].length, match.index + match[0].length + 180);
        const cleanedAfter = after.replace(/^\s*[,;:.\-–—]*\s*(?:руб(?:лей|ля|ль|\.)?|₽)?\s*[:=]?\s*/i, "");
        const amountMatch = cleanedAfter.match(moneyToken);
        if (amountMatch) {
            const value = parseMoney(amountMatch[0]);
            if (value !== null && Math.abs(value) < 1000000) return value;
        }
    }

    // Затем ищем ближайшую отдельную денежную строку около подписи.
    const headerIndexes = lines.map((line, i) => label.test(line) ? i : -1).filter(i => i >= 0);
    for (const headingIndex of headerIndexes) {
        for (let distance = 1; distance <= 35; distance++) {
            for (const index of [headingIndex + distance, headingIndex - distance]) {
                if (index < 0 || index >= lines.length) continue;
                const line = lines[index].replace(/\s*(?:₽|руб(?:лей|ля|ль|\.)?)\s*$/i, "").trim();
                if (!/^-?\s*\d[\d\s]*(?:[.,]\d{1,2})?$/.test(line)) continue;
                const value = parseMoney(line);
                if (value !== null && Math.abs(value) < 1000000) return value;
            }
        }
    }
    return null;
}

function findReceiptData(text) {
    const normalized = text.replace(/\u00a0/g, " ").replace(/[−–—]/g, "-");
    const lines = normalized.split("\n").map(line => line.trim()).filter(Boolean);
    let accountNumber = findAccountNumber(normalized);

    if (!accountNumber) {
        const headerIndex = lines.findIndex(line => /СЧЕТ-КВИТАНЦИЯ/i.test(line));
        const area = headerIndex >= 0 ? lines.slice(Math.max(0, headerIndex - 10), Math.min(lines.length, headerIndex + 30)) : lines.slice(0, 50);
        const accountCandidate = area.find(line => /^\d{9,12}$/.test(line));
        if (accountCandidate) accountNumber = accountCandidate;
    }

    let recipientAccount = "";
    const recipientMatches = [...normalized.matchAll(/(?:р\/?с|расч[её]тн(?:ый|ого)\s+сч[её]т)\s*[:№-]?\s*(\d{20})/gi)];
    if (recipientMatches.length) recipientAccount = recipientMatches[0][1];
    if (!recipientAccount) {
        const all20 = [...normalized.matchAll(/\b(\d{20})\b/g)].map(match => match[1]);
        recipientAccount = all20.find(value => value.startsWith("40702")) || "";
    }

    let period = ""; let month = ""; let year = null;
    let numericPeriod = normalized.match(/(?:расч[её]тный\s+период|период|месяц\s*,?\s*год)\s*[:№-]?\s*(0?[1-9]|1[0-2])[.\/-](20\d{2})/i);
    if (!numericPeriod) numericPeriod = normalized.match(/\b(0?[1-9]|1[0-2])[.\/-](20\d{2})\b/);
    if (numericPeriod) {
        const mm = String(numericPeriod[1]).padStart(2, "0"); month = getMonthName(mm); year = Number(numericPeriod[2]); period = `${mm}.${numericPeriod[2]}`;
    } else {
        const wordPeriod = normalized.match(/(?:за\s+)?(январ[ья]|феврал[ья]|март[а]?|апрел[ья]|ма[йя]|июн[ья]|июл[ья]|август[а]?|сентябр[ья]|октябр[ья]|ноябр[ья]|декабр[ья])\s+(20\d{2})/i);
        if (wordPeriod) {
            const stem = wordPeriod[1].toLowerCase();
            const names = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
            const stems = ["январ","феврал","март","апрел","ма","июн","июл","август","сентябр","октябр","ноябр","декабр"];
            const index = stems.findIndex(item => stem.startsWith(item));
            if (index >= 0) { month = names[index]; year = Number(wordPeriod[2]); period = `${month} ${year}`; }
        }
    }

    let amount = extractReceiptAmount(normalized, lines);

    // Запасной вариант для счёт-квитанций: отдельные денежные значения в верхней части.
    // Отрицательная сумма означает переплату/нулевую необходимость оплаты.
    if (amount === null && /Т\s*Плюс|СЧЕТ-КВИТАНЦИЯ/i.test(normalized)) {
        const top = lines.slice(0, Math.min(lines.length, 180));
        const candidates = top.map(line => ({ line, value: parseMoney(line) })).filter(item => /^-?\s*\d[\d\s]*[.,]\d{1,2}\s*(?:₽|руб\.?)?$/.test(item.line) && item.value !== null && Math.abs(item.value) < 1000000);
        const negative = candidates.find(item => item.value < 0);
        if (negative) amount = negative.value;
        else if (candidates.length) amount = candidates[candidates.length - 1].value;
    }

    return {accountNumber, recipientAccount, amount, period, month, year, noPaymentRequired: amount !== null && amount <= 0, lines};
}
