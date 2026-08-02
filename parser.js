"use strict";

/* ==========================================================
                    PARSER.JS
========================================================== */

console.log("✅ parser.js подключен");

/* ==========================================================
                ЗАГРУЗКА PDF
========================================================== */

async function loadPDF(file) {

    const arrayBuffer =

        await file.arrayBuffer();

    const pdf = await pdfjsLib.getDocument({

        data: arrayBuffer

    }).promise;

    return pdf;

}

/* ==========================================================
                КОНЕЦ ЧАСТИ 1
========================================================== */
/* ==========================================================
                ИЗВЛЕЧЕНИЕ ТЕКСТА ИЗ PDF
========================================================== */

async function extractPDFText(pdf) {

    let text = "";

    for (

        let pageNumber = 1;

        pageNumber <= pdf.numPages;

        pageNumber++

    ) {

        const page = await pdf.getPage(

            pageNumber

        );

        const content =

            await page.getTextContent();

        const pageText = content.items

            .map(item => item.str)

            .join("\n");

        text += pageText + "\n";

    }

    return text;

}

/* ==========================================================
                КОНЕЦ ЧАСТИ 2
========================================================== */
/* ==========================================================
                ПОИСК ЛИЦЕВОГО СЧЁТА
========================================================== */

function findAccountNumber(text) {

    const patterns = [

        /Лицевой\s+сч[её]т[:\s]*([0-9]{6,20})/i,

        /Л\/С[:\s]*([0-9]{6,20})/i,

        /Лицевой[:\s]*([0-9]{6,20})/i,

        /Сч[её]т[:\s]*([0-9]{6,20})/i

    ];

    for (const pattern of patterns) {

        const match = text.match(pattern);

        if (match) {

            return match[1];

        }

    }

    return "";

}

/* ==========================================================
                КОНЕЦ ЧАСТИ 3
========================================================== */
/* ==========================================================
                НАЗВАНИЕ МЕСЯЦА
========================================================== */

function getMonthName(month) {

    const months = {

        "01": "Январь",
        "02": "Февраль",
        "03": "Март",
        "04": "Апрель",
        "05": "Май",
        "06": "Июнь",
        "07": "Июль",
        "08": "Август",
        "09": "Сентябрь",
        "10": "Октябрь",
        "11": "Ноябрь",
        "12": "Декабрь"

    };

    return months[month] || "Без месяца";

}

/* ==========================================================
                ФОРМАТ СУММЫ
========================================================== */

function formatAmount(amount) {

    if (

        amount === undefined ||

        amount === null ||

        isNaN(amount)

    ) {

        amount = 0;

    }

    return amount.toLocaleString(

        "ru-RU",

        {

            minimumFractionDigits: 2,

            maximumFractionDigits: 2

        }

    ) + " ₽";

}

/* ==========================================================
                КОНЕЦ ЧАСТИ 4
========================================================== */
/* ==========================================================
            ПОИСК КОММУНАЛЬНЫХ ПЛАТЕЖЕЙ
========================================================== */

function findUtilityPayments(text) {

    const payments = [];

    const lines = text
        .split("\n")
        .map(line => line.trim())
        .filter(line => line !== "");

    for (let i = 0; i < lines.length; i++) {

        if (
            lines[i] === "Оплата услуг mBank.ZhKU" ||
            lines[i] === "Оплата услуг mBank.ZHKH" ||
            lines[i] === "Оплата услуг iBank.ZhKU" ||
            lines[i] === "Оплата услуг iBank.ZHKH"
        ) {

            let date = "";
            let amount = 0;

            for (let j = i - 1; j >= 0; j--) {

                if (
                    !date &&
                    /^\d{2}\.\d{2}\.\d{4}$/.test(lines[j])
                ) {
                    date = lines[j];
                }

                if (
                    amount === 0 &&
                    /^-\d[\d\s]*[.,]\d{2}$/.test(lines[j])
                ) {
                    amount = parseFloat(
                        lines[j]
                            .replace(/\s/g, "")
                            .replace(",", ".")
                    );
                }

                if (date && amount !== 0) {
                    break;
                }
            }

            if (date && amount !== 0) {

                payments.push({

                    date: date,

                    description: lines[i],

                    amount: Math.abs(amount),

                    paid: true,

                    month: getMonthName(date.split(".")[1]),

year: Number(date.split(".")[2])

                });

            }

        }

    }

    return payments;

}

function findReceiptData(text) {

const lines = text
    .split("\n")
    .map(line => line.trim())
    .filter(line => line !== "");

let accountNumber = "";

for (const line of lines) {

    if (/^\d{10,20}$/.test(line)) {

        accountNumber = line;

        break;

    }

}

return {
    lines: lines,

accountNumber: accountNumber

};

}

/* ==========================================================
                КОНЕЦ PARSER.JS
========================================================== */