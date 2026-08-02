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

let currentYear = 2026;

let receiptData = null;

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

const yearSelect =
    document.getElementById("yearSelect");

    const pdfReceiptButton =
    document.getElementById("pdfReceiptButton");

const pdfReceiptInput =
    document.getElementById("pdfReceiptInput");

    const processPdfReceiptButton =
    document.getElementById("processPdfReceiptButton");

const archiveList =
    document.getElementById("archiveList");
    const receiptButton =
    document.getElementById("receiptButton");

const receiptList =
    document.getElementById("receiptList");

const pdfReceiptStatus =
    document.getElementById("pdfReceiptStatus");

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

pdfReceiptInput.addEventListener(
    "change",

    function () {

        const file = this.files[0];

        if (!file) {
            return;
        }

        pdfReceiptStatus.innerHTML =
    "📄 <b>Электронная квитанция</b><br>" + file.name;

    }

);

if (processPdfReceiptButton) {

    processPdfReceiptButton.addEventListener(

        "click",

    async function () {

            if (!pdfReceiptInput.files.length) {

                alert("Сначала выберите PDF-квитанцию.");

                return;

            }

  pdfReceiptStatus.innerHTML =

"⏳ Квитанция обрабатывается...<br><small>Чтение PDF...</small>";

const receiptText =
    await loadReceiptPDF(pdfReceiptInput.files[0]);

console.log("Текст квитанции:");
console.log(receiptText);

pdfReceiptStatus.innerHTML =
    "✅ Квитанция успешно обработана";

receiptList.innerHTML = "✅ Электронная квитанция загружена<br>Лицевой счёт: " + (window.receiptData?.accountNumber || "Не найден");

console.log("После записи:");
console.log(receiptList.textContent);

        }

    );

}

async function loadReceiptPDF(file) {

    const pdf = await loadPDF(file);

    const text = await extractPDFText(pdf);

const receiptData = findReceiptData(text);

window.receiptData = receiptData;

window.receiptList = receiptList;

console.log("receiptList:", receiptList);

console.log("receiptList.innerHTML:", receiptList.innerHTML);

console.log("receiptList.textContent:", receiptList.textContent);

const receiptAccountNumber = receiptData.accountNumber;

const receiptPayments = findUtilityPayments(text);

console.log("findReceiptData выполнена");

const receiptAmount =
    receiptPayments.length > 0
        ? receiptPayments[0].amount
        : 0;

console.log("Лицевой счёт квитанции:");
console.log(receiptAccountNumber);

console.log("Данные квитанции:");

console.log(receiptData);

console.log("Лицевой счёт из findReceiptData:");

console.log(receiptData.accountNumber);

console.log("Платежи квитанции:");
console.log(receiptPayments);

console.log("Сумма из квитанции:");

console.log(receiptAmount);

if (receiptPayments.length > 0) {

    console.log("Первый найденный платёж:");

    console.log(receiptPayments[0]);

}

console.log("Текст квитанции:");
console.log(text);

console.log("=== КОНЕЦ ОБРАБОТКИ КВИТАНЦИИ ===");

    return text;

}

/* ==========================================================
                КНОПКА ЗАГРУЗКИ
========================================================== */

loadButton.addEventListener(

    "click",

    loadStatement

);
if (receiptButton) {

    receiptButton.addEventListener(

        "click",

        function () {

            alert("Добавление квитанций будет следующим шагом.");

        }

    );

}

if (pdfReceiptButton && pdfReceiptInput) {

    pdfReceiptButton.addEventListener(
        "click",
        function () {

            pdfReceiptInput.click();

        }
    );

}

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
        
        console.log("PDF TEXT:");
console.log(text);

        accountNumber =

            findAccountNumber(text);

        const newPayments =

    findUtilityPayments(text);

payments.push(...newPayments);

if (newPayments.length > 0) {

    currentYear = newPayments[0].year;

}

            console.log("PAYMENTS:");
console.log(payments);

        accountBox.textContent =

            accountNumber || "Не найден";

        updateSummary();

        updateMonths();

        updateArchive();

        
if (receiptList.textContent === "") {

    receiptList.textContent = "Квитанций пока нет";

}

        status.textContent =

            "✅ Выписка успешно обработана.";

            fileInput.value = "";

selectedFile = null;

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

const currentPayments = payments.filter(
    payment =>
        payment.month === currentMonth &&
    
        payment.year === currentYear
);

paymentCountCard.classList.remove("active");
totalAmountCard.classList.remove("active");
paidAmountCard.classList.remove("active");
unpaidAmountCard.classList.remove("active");
paymentCount.textContent = currentPayments.length;

paymentCountCard.classList.add("active");
totalAmountCard.classList.add("active");

    const total = currentPayments.reduce(
        (sum, payment) => sum + payment.amount,
        0
    );

    const paid = currentPayments
        .filter(payment => payment.paid)
        .reduce(
            (sum, payment) => sum + payment.amount,
            0
        );

    const unpaid = currentPayments
        .filter(payment => !payment.paid)
        .reduce(
            (sum, payment) => sum + payment.amount,
            0
        );

    totalAmount.textContent = formatAmount(total);
totalAmountCard.classList.remove("active");
paidAmountCard.classList.remove("active");
    totalAmountCard.classList.add("active");

    paymentCountCard.classList.remove("active");

unpaidAmountCard.classList.remove("active");
paidAmountCard.classList.add("active");

  paidAmount.textContent = "Нет данных";
unpaidAmountCard.classList.add("active");
unpaidAmount.textContent = "Нет данных";

}

/* ==========================================================
                ПЛАТЕЖИ ПО МЕСЯЦАМ
========================================================== */

function updateMonths() {

    monthsContainer.innerHTML = "";

    const monthNames = [

        "Май",

        "Июнь",

        "Июль"

    ];

    const groups = {};

    payments
.filter(payment => payment.year === currentYear)

.forEach(payment => {

        if (!groups[payment.month]) {

            groups[payment.month] = [];

        }

        groups[payment.month].push(payment);

    });

    currentMonth = monthNames[0];

    monthNames.forEach((month, index) => {

        let total = 0;

        if (groups[month]) {

            groups[month].forEach(item => {

                total += item.amount;

            });

        }

        const button = document.createElement("button");

        button.className = "month-card";

        if (index === 0) {

            button.classList.add("active");

        }

        button.innerHTML = `

            <div class="month-name">

                ${month}

            </div>

            <div class="month-total">

                ${formatAmount(total)}

            </div>

        `;

        button.addEventListener("click", function () {

            selectMonth(month, button);

        });

        monthsContainer.appendChild(button);
button.dataset.month = month;
    });

    updateArchive();

updateYears();

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

    updateSummary();
document.querySelector(".summary-card.active")?.click();
}

function updateYears() {

    yearSelect.innerHTML = "";

   const years = [2025, 2026];

years.forEach(year => {

    const option = document.createElement("option");

    option.value = year;

    option.textContent = year;

option.selected = (year === currentYear);
    
    yearSelect.appendChild(option);

});

}

yearSelect.addEventListener("change", function () {

    currentYear = Number(this.value);

    updateMonths();

});

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

receiptList.textContent = "Квитанций пока нет";

console.trace("receiptList очищен");

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
    const toggleArchiveButton =
    document.getElementById("toggleArchiveButton");

const archiveContent =
    document.getElementById("archiveContent");

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

if (toggleArchiveButton && archiveContent) {

    toggleArchiveButton.addEventListener("click", function () {

        if (archiveContent.style.display === "none") {

            archiveContent.style.display = "block";

            this.textContent = "Скрыть";

        } else {

            archiveContent.style.display = "none";

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