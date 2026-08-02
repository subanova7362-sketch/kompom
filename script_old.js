"use strict";

/* ==========================================================
                    SCRIPT.JS
========================================================== */

console.clear();

console.log("🏠 Коммунальный помощник запущен");

/* ==========================================================
                ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
========================================================== */

let selectedFile = null;

let accountNumber = "";

let payments = [];

let archive = [];

let months = [];

let currentMonth = "";

let currentSummary = "paymentCount";

/* ==========================================================
                    КОНЕЦ ЧАСТИ 1
========================================================== */
/* ==========================================================
                    ЭЛЕМЕНТЫ HTML
========================================================== */

const fileInput =
    document.getElementById("fileInput");

const loadButton =
    document.getElementById("loadButton");

const status =
    document.getElementById("status");

const accountBox =
    document.getElementById("accountNumber");

const paymentCount =
    document.getElementById("paymentCount");

const totalAmount =
    document.getElementById("totalAmount");

const paidAmount =
    document.getElementById("paidAmount");

const unpaidAmount =
    document.getElementById("unpaidAmount");

const monthsContainer =
    document.getElementById("monthsContainer");

const archiveList =
    document.getElementById("archiveList");

/* ==========================================================
                    КАРТОЧКИ ИТОГОВ
========================================================== */

const paymentCountCard =
    document.getElementById("paymentCountCard");

const totalAmountCard =
    document.getElementById("totalAmountCard");

const paidAmountCard =
    document.getElementById("paidAmountCard");

const unpaidAmountCard =
    document.getElementById("unpaidAmountCard");

/* ==========================================================
                    КНОПКИ НАСТРОЕК
========================================================== */

const reminderSwitch =
    document.getElementById("reminderSwitch");

const themeSwitch =
    document.getElementById("themeSwitch");

const smallFont =
    document.getElementById("smallFont");

const normalFont =
    document.getElementById("normalFont");

const bigFont =
    document.getElementById("bigFont");

/* ==========================================================
                    КОНЕЦ ЧАСТИ 2
========================================================== */
/* ==========================================================
                ВЫБОР PDF-ФАЙЛА
========================================================== */

fileInput.addEventListener(

    "change",

    function () {

        selectedFile = this.files[0];

        if (!selectedFile) {

            status.textContent =

                "Выписка не выбрана.";

            return;

        }

        if (selectedFile.type !== "application/pdf") {

            alert(

                "Пожалуйста, выберите PDF-файл."

            );

            fileInput.value = "";

            selectedFile = null;

            status.textContent =

                "Выбран неверный файл.";

            return;

        }

        status.textContent =

            "✅ " + selectedFile.name;

    }

);

/* ==========================================================
                КНОПКА ЗАГРУЗКИ
========================================================== */

loadButton.addEventListener(

    "click",

    loadStatement

);
/* ==========================================================
                ЗАГРУЗИТЬ ВЫПИСКУ
========================================================== */

async function loadStatement() {

    if (!selectedFile) {

        alert(

            "Сначала выберите PDF-выписку."

        );

        return;

    }

    status.textContent =

        "⏳ Обработка выписки...";

    try {

        const pdf = await loadPDF(

            selectedFile

        );

        const text = await extractPDFText(

            pdf

        );
        
        accountNumber =

            findAccountNumber(text);

        payments =

            findUtilityPayments(text);

        accountBox.textContent =

            accountNumber || "Не найден";

        updateSummary();

        updateMonths();

        updateArchive();

        status.textContent =

            "✅ Выписка успешно обработана.";

    }

    catch (error) {

        console.error(error);

        status.textContent =

            "❌ Ошибка чтения PDF.";

    }

}
/* ==========================================================
                    ИТОГИ
========================================================== */

function updateSummary() {

    paymentCount.textContent =

        payments.length;

    let total = 0;

    let paid = 0;

    let unpaid = 0;

    payments.forEach(payment => {

        total += payment.amount;

        if (payment.paid === false) {

            unpaid += payment.amount;

        }

        else {

            paid += payment.amount;

        }

    });

    totalAmount.textContent =

        formatAmount(total);

    paidAmount.textContent =

        formatAmount(paid);

    unpaidAmount.textContent =

        formatAmount(unpaid);

}
/* ==========================================================
                ПЛАТЕЖИ ПО МЕСЯЦАМ
========================================================== */

function updateMonths() {

    monthsContainer.innerHTML = "";

    const groups = {};

    payments.forEach(payment => {

        if (!groups[payment.month]) {

            groups[payment.month] = [];

        }

        groups[payment.month].push(payment);

    });

    const foundMonths = Object.keys(groups);

    const visibleMonths = [...foundMonths];

    while (visibleMonths.length < 3) {

        visibleMonths.push("");

    }

    currentMonth = "";

    visibleMonths.forEach((month, index) => {

        const button = document.createElement("button");

        button.className = "month-card";

        let total = 0;

        if (month !== "") {

            groups[month].forEach(item => {

                total += item.amount;

            });

        }

        button.innerHTML = `

            <div class="month-name">

                ${month || "—"}

            </div>

            <div class="month-total">

                ${formatAmount(total)}

            </div>

        `;

        if (

            month !== "" &&

            currentMonth === ""

        ) {

            button.classList.add("active");

            currentMonth = month;

        }

        if (month !== "") {

            button.addEventListener(

                "click",

                function () {

                    selectMonth(

                        month,

                        button

                    );

                }

            );

        }

        monthsContainer.appendChild(button);

    });

    updateArchive();

}

/* ==========================================================
                ВЫБОР МЕСЯЦА
========================================================== */

function selectMonth(month, button) {

    currentMonth = month;

    document
        .querySelectorAll(".month-card")
        .forEach(card => {

            card.classList.remove("active");

        });

    button.classList.add("active");

    updateArchive();

}

/* ==========================================================
            ВЫБОР КАРТОЧКИ "ИТОГИ"
========================================================== */

document
    .querySelectorAll(".summary-card")
    .forEach(card => {

        card.addEventListener(

            "click",

            function () {

                document
                    .querySelectorAll(".summary-card")
                    .forEach(item => {

                        item.classList.remove("active");

                    });

                this.classList.add("active");

            }

        );

    });

/* ==========================================================
                    КОНЕЦ ЧАСТИ 7
========================================================== */
/* ==========================================================
                ОБНОВИТЬ АРХИВ
========================================================== */

function updateArchive() {

    archiveList.innerHTML = "";

    if (payments.length === 0) {

        archiveList.innerHTML = `

            <div class="archive-empty">

                Выписок пока нет

            </div>

        `;

        return;

    }

    const monthPayments = payments.filter(

        payment => payment.month === currentMonth

    );

    if (monthPayments.length === 0) {

        archiveList.innerHTML = `

            <div class="archive-empty">

                За ${currentMonth} платежей нет

            </div>

        `;

        return;

    }

    let total = 0;

    monthPayments.forEach(payment => {

        total += payment.amount;

        const item = document.createElement("div");

        item.className = "archive-item";

        item.innerHTML = `

            <div class="archive-title">

                📅 ${payment.date}

            </div>

            <div>

                ${payment.description}

            </div>

            <div>

                💰 ${formatAmount(payment.amount)}

            </div>

        `;

        archiveList.appendChild(item);

    });

    const result = document.createElement("div");

    result.className = "archive-total";

    result.innerHTML = `

        Итого за ${currentMonth}: ${formatAmount(total)}

    `;

    archiveList.appendChild(result);

}

/* ==========================================================
                КОНЕЦ ЧАСТИ 8
========================================================== */
/* ==========================================================
                    НАСТРОЙКИ
========================================================== */

if (themeSwitch) {

    themeSwitch.addEventListener(

        "change",

        function () {

            document.body.classList.toggle(

                "dark-theme",

                this.checked

            );

        }

    );

}

if (smallFont) {

    smallFont.addEventListener(

        "click",

        function () {

            document.body.classList.remove(

                "font-normal",

                "font-big"

            );

            document.body.classList.add(

                "font-small"

            );

        }

    );

}

if (normalFont) {

    normalFont.addEventListener(

        "click",

        function () {

            document.body.classList.remove(

                "font-small",

                "font-big"

            );

            document.body.classList.add(

                "font-normal"

            );

        }

    );

}

if (bigFont) {

    bigFont.addEventListener(

        "click",

        function () {

            document.body.classList.remove(

                "font-small",

                "font-normal"

            );

            document.body.classList.add(

                "font-big"

            );

        }

    );

}

if (reminderSwitch) {

    reminderSwitch.addEventListener(

        "change",

        function () {

            console.log(

                this.checked
                    ? "Напоминания включены"
                    : "Напоминания выключены"

            );

        }

    );

}

/* ==========================================================
                КОНЕЦ ЧАСТИ 9
========================================================== */
/* ==========================================================
                ЗАПУСК ПРИЛОЖЕНИЯ
========================================================== */

document.addEventListener(

    "DOMContentLoaded",

    function () {

        accountBox.textContent =

            "Не найден";

        paymentCount.textContent =

            "0";

        totalAmount.textContent =

            formatAmount(0);

        paidAmount.textContent =

            formatAmount(0);

        unpaidAmount.textContent =

            formatAmount(0);

        archiveList.innerHTML = `

            <div class="archive-empty">

                Выписок пока нет

            </div>

        `;

        status.textContent =

            "Выписка не загружена";

    }

);

/* ==========================================================
                КОНЕЦ ЧАСТИ 10
========================================================== */
/* ==========================================================
                ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
========================================================== */

function clearData() {

    accountNumber = "";

    payments = [];

    months = [];

    currentMonth = "";

    accountBox.textContent = "Не найден";

    paymentCount.textContent = "0";

    totalAmount.textContent = formatAmount(0);

    paidAmount.textContent = formatAmount(0);

    unpaidAmount.textContent = formatAmount(0);

    monthsContainer.innerHTML = "";

    archiveList.innerHTML = `

        <div class="archive-empty">

            Выписок пока нет

        </div>

    `;

}

function resetActiveSummary() {

    document
        .querySelectorAll(".summary-card")
        .forEach(card => {

            card.classList.remove("active");

        });

    paymentCountCard.classList.add("active");

}

function resetActiveMonth() {

    document
        .querySelectorAll(".month-card")
        .forEach(card => {

            card.classList.remove("active");

        });

}

/* ==========================================================
                КОНЕЦ ЧАСТИ 11
========================================================== */
/* ==========================================================
                    ЗАВЕРШЕНИЕ SCRIPT.JS
========================================================== */

window.addEventListener(

    "beforeunload",

    function () {

        console.log(

            "Закрытие приложения..."

        );

    }

);

/* ==========================================================
        СКРЫТЬ / ПОКАЗАТЬ НАСТРОЙКИ
========================================================== */

const toggleSettingsButton =
    document.getElementById("toggleSettingsButton");

const settingsContent =
    document.getElementById("settingsContent");

if (toggleSettingsButton && settingsContent) {

    toggleSettingsButton.addEventListener("click", function () {

        if (settingsContent.style.display === "none") {

            settingsContent.style.display = "flex";

            this.textContent = "Скрыть";

        } else {

            settingsContent.style.display = "none";

            this.textContent = "Показать";

        }

    });

}

console.log(

    "✅ script.js готов"

);

/* ==========================================================
                    КОНЕЦ SCRIPT.JS
========================================================== */