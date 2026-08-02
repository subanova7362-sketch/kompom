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

function findAccountNumber(text) {
    const patterns = [
        /Лицевой\s+сч[её]т\s*(?:№|N)?\s*[:№-]?\s*([0-9][0-9\s-]{5,24})/i,
        /Л\/С\s*(?:№|N)?\s*[:№-]?\s*([0-9][0-9\s-]{5,24})/i,
        /Лицевой\s*[:№-]\s*([0-9][0-9\s-]{5,24})/i
    ];
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) return match[1].replace(/[\s-]/g, "");
    }
    return "";
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
    return Number(amount).toLocaleString("ru-RU", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }) + " ₽";
}

function findUtilityPayments(text) {
    const payments = [];
    const lines = text.split("\n").map(line => line.trim()).filter(Boolean);
    const utilityLabels = [
        "Оплата услуг mBank.ZhKU",
        "Оплата услуг mBank.ZHKH",
        "Оплата услуг iBank.ZhKU",
        "Оплата услуг iBank.ZHKH"
    ];

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
            for (let j = i; j <= Math.min(lines.length - 1, i + 8); j++) {
                const accountMatch = lines[j].match(/\b(\d{20})\b/);
                if (accountMatch) {
                    recipientAccount = accountMatch[1];
                    break;
                }
            }
        }

        if (date && amount !== 0) {
            payments.push({
                date,
                description: lines[i],
                amount: Math.abs(amount),
                paid: true,
                month: getMonthName(date.split(".")[1]),
                year: Number(date.split(".")[2]),
                recipientAccount
            });
        }
    }
    return payments;
}

function parseMoney(value) {
    if (!value) return null;
    const cleaned = String(value).replace(/₽/g, "").replace(/руб\.?/gi, "").replace(/\s/g, "").replace(",", ".");
    const number = Number(cleaned);
    return Number.isFinite(number) ? number : null;
}

function findReceiptData(text) {
    const normalized = text.replace(/\u00a0/g, " ");
    const lines = normalized.split("\n").map(line => line.trim()).filter(Boolean);
    const accountNumber = findAccountNumber(normalized);

    let recipientAccount = "";
    const recipientMatches = [...normalized.matchAll(/(?:р\/?с|расч[её]тн(?:ый|ого)\s+сч[её]т)\s*[:№-]?\s*(\d{20})/gi)];
    if (recipientMatches.length) recipientAccount = recipientMatches[0][1];

    let amount = null;
    const amountPatterns = [
        /(?:итого\s+к\s+опл(?:ате|\.)?|к\s+оплате|сумма\s+к\s+оплате|всего\s+к\s+оплате)\s*[:№-]?\s*(-?\s*[0-9][0-9\s]*[.,]\d{2})/i,
        /(?:итого|всего)\s*[:№-]?\s*(-?\s*[0-9][0-9\s]*[.,]\d{2})\s*(?:₽|руб\.?)/i
    ];
    for (const pattern of amountPatterns) {
        const match = normalized.match(pattern);
        if (match) {
            amount = parseMoney(match[1]);
            if (amount !== null) break;
        }
    }

    // В некоторых PDF заголовок и значение разбиты на разные строки.
    // Ищем число рядом с заголовком «Итого к опл.» и сохраняем знак минус.
    if (amount === null) {
        const headingIndex = lines.findIndex(line => /итого\s+к\s+опл/i.test(line));
        if (headingIndex >= 0) {
            const nearby = lines.slice(Math.max(0, headingIndex - 8), Math.min(lines.length, headingIndex + 12));
            const moneyLine = nearby.find(line => /^-?\s*\d[\d\s]*[.,]\d{2}$/.test(line));
            if (moneyLine) amount = parseMoney(moneyLine);
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
    for (const pattern of numericPatterns) {
        numericPeriod = normalized.match(pattern);
        if (numericPeriod) break;
    }

    if (numericPeriod) {
        month = getMonthName(numericPeriod[1]);
        year = Number(numericPeriod[2]);
        period = `${numericPeriod[1]}.${numericPeriod[2]}`;
    } else {
        const wordPeriod = normalized.match(/(?:за)\s+(январ[ья]|феврал[ья]|март[а]?|апрел[ья]|ма[йя]|июн[ья]|июл[ья]|август[а]?|сентябр[ья]|октябр[ья]|ноябр[ья]|декабр[ья])\s+(20\d{2})/i);
        if (wordPeriod) {
            const stem = wordPeriod[1].toLowerCase();
            const names = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
            const stems = ["январ","феврал","март","апрел","ма","июн","июл","август","сентябр","октябр","ноябр","декабр"];
            const index = stems.findIndex(item => stem.startsWith(item));
            if (index >= 0) month = names[index];
            year = Number(wordPeriod[2]);
            period = `${month} ${year}`.trim();
        }
    }

    return {
        accountNumber,
        recipientAccount,
        amount,
        period,
        month,
        year,
        noPaymentRequired: amount !== null && amount <= 0,
        lines
    };
}
