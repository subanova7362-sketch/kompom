"use strict";

/* ==========================================================
                        UI.JS
========================================================== */

console.log("✅ ui.js подключен");

/* ==========================================================
                ОБНОВИТЬ ИНТЕРФЕЙС
========================================================== */

function refreshUI() {

    updateSummary();

    updateMonths();

    updateHistory();

}

/* ==========================================================
                ПОКАЗАТЬ ТЕКСТ PDF
========================================================== */

function showPDFText(text) {

    if (!pdfTextElement) {

        return;

    }

    pdfTextElement.textContent = text;

}

/* ==========================================================
                ОЧИСТИТЬ ТЕКСТ PDF
========================================================== */

function clearPDFText() {

    if (!pdfTextElement) {

        return;

    }

    pdfTextElement.textContent =

        "Выписка ещё не загружена.";

}
/* ==========================================================
                ПОКАЗАТЬ / СКРЫТЬ PDF
========================================================== */

function togglePDF() {

    if (!pdfTextElement) {

        return;

    }

    pdfTextElement.classList.toggle("hidden");

    const button = document.getElementById("togglePdf");

    if (!button) {

        return;

    }

    if (pdfTextElement.classList.contains("hidden")) {

        button.textContent = "Показать";

    }

    else {

        button.textContent = "Скрыть";

    }

}

/* ==========================================================
                ОЧИСТИТЬ ИНТЕРФЕЙС
========================================================== */

function clearInterface() {

    accountNumber.textContent = "Не найден";

    paymentCount.textContent = "0";

    totalAmount.textContent = "0 ₽";

    paidAmount.textContent = "0 ₽";

    unpaidAmount.textContent = "0 ₽";

    clearPDFText();

    showEmptyMonths();

    showEmptyArchive();

}

/* ==========================================================
                    ЗАПУСК UI
========================================================== */

document.addEventListener(

    "DOMContentLoaded",

    function () {

        const button = document.getElementById("togglePdf");

        if (button) {

            button.addEventListener(

                "click",

                togglePDF

            );

        }

    }

);

/* ==========================================================
                    КОНЕЦ UI.JS
========================================================== */

console.log("✅ ui.js готов");