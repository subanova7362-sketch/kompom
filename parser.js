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

function cleanDigits(value) {
    return String(value || "").replace(/\D/g, "");
}

function findAccountNumber(text) {
    const normalized = String(text || "").replace(/\u00a0/g, " ");
    const patterns = [
        /Лицевой\s+сч[её]т\s*(?:№|N)?\s*[:№-]?\s*([0-9][0-9\s-]{5,24})/i,
        /Л\/С\s*(?:№|N)?\s*[:№-]?\s*([0-9][0-9\s-]{5,24})/i,
        /Лицевой\s*[:№-]\s*([0-9][0-9\s-]{5,24})/i
    ];
    for (const pattern of patterns) {
        const match = normalized.match(pattern);
        if (match) return cleanDigits(match[1]);
    }

    // PDF.js часто отдаёт заголовок и значение отдельными элементами.
    const lines = normalized.split("\n").map(line => line.trim()).filter(Boolean);
    const index = lines.findIndex(line => /^Лицевой\s+сч[её]т$/i.test(line));
    if (index >= 0) {
        for (let i = index + 1; i <= Math.min(lines.length - 1, index + 10); i++) {
            if (/^\d{6,15}$/.test(cleanDigits(lines[i])) && cleanDigits(lines[i]).length === lines[i].replace(/\s/g, "").length) {
                return cleanDigits(lines[i]);
            }
        }
    }
    return "";
}

function findBankAccountNumber(text) {
    const matches = [...String(text || "").matchAll(/(?:Номер\s+сч[её]та|Сч[её]т)\s*[:№-]?\s*(\d{20})/gi)];
    return matches.length ? matches[0][1] : "";
}

function getMonthName(month) {
    const months = {
        "01":"Январь","02":"Февраль","03":"Март","04":"Апрель",
        "05":"Май","06":"Июнь","07":"Июль","08":"Август",
        "09":"Сентябрь","10":"Октябрь","11":"Ноябрь","12":"Декабрь"
    };
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

        let date = "";
        let amount = 0;
        for (let j = i - 1; j >= Math.max(0, i - 12); j--) {
            if (!date && /^\d{2}\.\d{2}\.\d{4}$/.test(lines[j])) date = lines[j];
            if (amount === 0 && /^-\d[\d\s]*[.,]\d{2}(?:\s*₽)?$/.test(lines[j])) {
                amount = parseFloat(lines[j].replace(/₽/g, "").replace(/\s/g, "").replace(",", "."));
            }
            if (date && amount !== 0) break;
        }

        let recipientAccount = "";
        if (isBankTransfer) {
            for (let j = i; j <= Math.min(lines.length - 1, i + 10); j++) {
                const accountMatch = lines[j].match(/\b(\d{20})\b/);
                if (accountMatch) { recipientAccount = accountMatch[1]; break; }
            }
        }

        if (date && amount !== 0) {
            payments.push({ date, description: lines[i], amount: Math.abs(amount), paid: true,
                month: getMonthName(date.split(".")[1]), year: Number(date.split(".")[2]), recipientAccount });
        }
    }
    return payments;
}

function parseMoney(value) {
    if (value === null || value === undefined || value === "") return null;
    const cleaned = String(value).replace(/₽/g, "").replace(/руб\.?/gi, "").replace(/\s/g, "").replace(",", ".");
    const number = Number(cleaned);
    return Number.isFinite(number) ? number : null;
}

function findNearbyValue(lines, headingRegex, valueRegex, before = 5, after = 12) {
    const index = lines.findIndex(line => headingRegex.test(line));
    if (index < 0) return "";
    const candidates = lines.slice(Math.max(0, index - before), Math.min(lines.length, index + after + 1));
    return candidates.find(line => valueRegex.test(line)) || "";
}

function findReceiptData(text) {
    const normalized = text.replace(/\u00a0/g, " ");
    const lines = normalized.split("\n").map(line => line.trim()).filter(Boolean);
    let accountNumber = findAccountNumber(normalized);

    // Счёт-квитанции Т Плюс: в PDF заголовки «Лицевой счет / Месяц, год / Итого к опл.»
    // и три значения часто идут отдельными текстовыми объектами.
    if (!accountNumber) {
        const headerIndex = lines.findIndex(line => /СЧЕТ-КВИТАНЦИЯ/i.test(line));
        const area = headerIndex >= 0 ? lines.slice(Math.max(0, headerIndex - 10), Math.min(lines.length, headerIndex + 20)) : lines.slice(0, 40);
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

    let amount = null;
    const amountPatterns = [
        /(?:итого\s+к\s+опл(?:ате|\.)?|к\s+оплате|сумма\s+к\s+оплате|всего\s+к\s+оплате)\s*[:№-]?\s*(-?\s*[0-9][0-9\s]*[.,]\d{2})/i,
        /(?:итого|всего)\s*[:№-]?\s*(-?\s*[0-9][0-9\s]*[.,]\d{2})\s*(?:₽|руб\.?)/i
    ];
    for (const pattern of amountPatterns) {
        const match = normalized.match(pattern);
        if (match) { amount = parseMoney(match[1]); if (amount !== null) break; }
    }

    if (amount === null) {
        const headingIndex = lines.findIndex(line => /итого\s+к\s+опл/i.test(line));
        if (headingIndex >= 0) {
            const nearby = lines.slice(Math.max(0, headingIndex - 10), Math.min(lines.length, headingIndex + 18));
            const moneyCandidates = nearby.filter(line => /^-?\s*\d[\d\s]*[.,]\d{2}$/.test(line));
            // Для шапки квитанции значение обычно находится рядом с периодом и лицевым счётом.
            if (moneyCandidates.length) amount = parseMoney(moneyCandidates[0]);
        }
    }

    let period = "";
    let month = "";
    let year = null;
    const numericPatterns = [
        /(?:расч[её]тный\s+период|период|месяц\s*,?\s*год)\s*[:№-]?\s*(0[1-9]|1[0-2])[.\/-](20\d{2})/i,
        /\b(0[1-9]|1[0-2])[.\/-](20\d{2})\b/
    ];
    let numericPeriod = null;
    for (const pattern of numericPatterns) { numericPeriod = normalized.match(pattern); if (numericPeriod) break; }

    if (numericPeriod) {
        month = getMonthName(numericPeriod[1]); year = Number(numericPeriod[2]); period = `${numericPeriod[1]}.${numericPeriod[2]}`;
    } else {
        const wordPeriod = normalized.match(/(?:за\s+)?(январ[ья]|феврал[ья]|март[а]?|апрел[ья]|ма[йя]|июн[ья]|июл[ья]|август[а]?|сентябр[ья]|октябр[ья]|ноябр[ья]|декабр[ья])\s+(20\d{2})/i);
        if (wordPeriod) {
            const stem = wordPeriod[1].toLowerCase();
            const names = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
            const stems = ["январ","феврал","март","апрел","ма","июн","июл","август","сентябр","октябр","ноябр","декабр"];
            const index = stems.findIndex(item => stem.startsWith(item));
            if (index >= 0) month = names[index];
            year = Number(wordPeriod[2]); period = `${month} ${year}`.trim();
        }
    }

    return { accountNumber, recipientAccount, amount, period, month, year,
        noPaymentRequired: amount !== null && amount <= 0, lines };
}
