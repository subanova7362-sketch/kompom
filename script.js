"use strict";

console.log("🏠 Коммунальный помощник запущен");

let selectedFile = null;
let accountNumber = "";
let payments = [];
let currentMonth = "Май";
let currentYear = 2026;
let receiptData = null;

const fileInput = document.getElementById("fileInput");
const loadButton = document.getElementById("loadButton");
const status = document.getElementById("status");
const accountBox = document.getElementById("accountNumber");
const paymentCount = document.getElementById("paymentCount");
const totalAmount = document.getElementById("totalAmount");
const paidAmount = document.getElementById("paidAmount");
const unpaidAmount = document.getElementById("unpaidAmount");
const monthsContainer = document.getElementById("monthsContainer");
const yearSelect = document.getElementById("yearSelect");
const archiveList = document.getElementById("archiveList");
const receiptList = document.getElementById("receiptList");

const pdfReceiptButton = document.getElementById("pdfReceiptButton");
const pdfReceiptInput = document.getElementById("pdfReceiptInput");
const processPdfReceiptButton = document.getElementById("processPdfReceiptButton");
const pdfReceiptStatus = document.getElementById("pdfReceiptStatus");

const paymentCountCard = document.getElementById("paymentCountCard");
const totalAmountCard = document.getElementById("totalAmountCard");
const paidAmountCard = document.getElementById("paidAmountCard");
const unpaidAmountCard = document.getElementById("unpaidAmountCard");

const reminderSwitch = document.getElementById("reminderSwitch");
const themeSwitch = document.getElementById("themeSwitch");
const smallFont = document.getElementById("smallFont");
const normalFont = document.getElementById("normalFont");
const bigFont = document.getElementById("bigFont");

const toggleSettingsButton = document.getElementById("toggleSettingsButton");
const settingsContent = document.getElementById("settingsContent");
const toggleArchiveButton = document.getElementById("toggleArchiveButton");
const archiveContent = document.getElementById("archiveContent");

fileInput?.addEventListener("change", function () {
    selectedFile = this.files[0] || null;

    if (!selectedFile) {
        status.textContent = "Выписка не выбрана.";
        return;
    }

    if (selectedFile.type !== "application/pdf") {
        alert("Пожалуйста, выберите PDF-файл.");
        this.value = "";
        selectedFile = null;
        status.textContent = "Выбран неверный файл.";
        return;
    }

    status.textContent = "✅ " + selectedFile.name;
});

pdfReceiptButton?.addEventListener("click", function () {
    pdfReceiptInput?.click();
});

pdfReceiptInput?.addEventListener("change", function () {
    const file = this.files[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
        alert("Пожалуйста, выберите PDF-квитанцию.");
        this.value = "";
        pdfReceiptStatus.textContent = "Выбран неверный файл.";
        return;
    }

    pdfReceiptStatus.innerHTML = `📄 <b>Электронная квитанция</b><br>${file.name}`;
});

processPdfReceiptButton?.addEventListener("click", async function () {
    const file = pdfReceiptInput?.files[0];

    if (!file) {
        alert("Сначала выберите PDF-квитанцию.");
        return;
    }

    pdfReceiptStatus.innerHTML = "⏳ Квитанция обрабатывается...<br><small>Чтение PDF...</small>";

    try {
        receiptData = await loadReceiptPDF(file);
        renderReceipt(receiptData);
        pdfReceiptStatus.textContent = "✅ Квитанция успешно обработана";
    } catch (error) {
        console.error("Ошибка обработки квитанции:", error);
        pdfReceiptStatus.textContent = "❌ Не удалось обработать квитанцию.";
    }
});

async function loadReceiptPDF(file) {
    const pdf = await loadPDF(file);
    const text = await extractPDFText(pdf);
    return findReceiptData(text);
}

function renderReceipt(data) {
    const account = data.accountNumber || "Не найден";
    const amount = data.amount !== null ? formatAmount(data.amount) : "Не найдена";
    const period = data.period || "Не найден";

    receiptList.innerHTML = `
        <div class="receipt-result">
            <div><b>✅ Электронная квитанция загружена</b></div>
            <div>Лицевой счёт: ${account}</div>
            <div>Сумма к оплате: ${amount}</div>
            <div>Период: ${period}</div>
        </div>
    `;
}

loadButton?.addEventListener("click", loadStatement);

async function loadStatement() {
    if (!selectedFile) {
        alert("Сначала выберите PDF-выписку.");
        return;
    }

    status.textContent = "⏳ Обработка выписки...";

    try {
        const pdf = await loadPDF(selectedFile);
        const text = await extractPDFText(pdf);

        accountNumber = findAccountNumber(text);
        const newPayments = findUtilityPayments(text);
        payments.push(...newPayments);

        if (newPayments.length > 0) currentYear = newPayments[0].year;

        accountBox.textContent = accountNumber || "Не найден";
        updateMonths();
        updateSummary();
        updateArchive();

        if (!receiptList.textContent.trim()) receiptList.textContent = "Квитанций пока нет";

        status.textContent = "✅ Выписка успешно обработана.";
        fileInput.value = "";
        selectedFile = null;
    } catch (error) {
        console.error("Ошибка чтения выписки:", error);
        status.textContent = "❌ Ошибка чтения PDF.";
    }
}

function updateSummary() {
    const currentPayments = payments.filter(payment =>
        payment.month === currentMonth && payment.year === currentYear
    );

    paymentCount.textContent = currentPayments.length;
    const total = currentPayments.reduce((sum, payment) => sum + payment.amount, 0);
    totalAmount.textContent = formatAmount(total);

    // Пока выписка показывает факт банковских операций, а статус квитанций
    // будет рассчитываться после этапа сопоставления квитанция ↔ платёж.
    paidAmount.textContent = "Нет данных";
    unpaidAmount.textContent = "Нет данных";
}

function updateMonths() {
    const monthNames = ["Май", "Июнь", "Июль"];
    const groups = {};

    payments
        .filter(payment => payment.year === currentYear)
        .forEach(payment => {
            if (!groups[payment.month]) groups[payment.month] = [];
            groups[payment.month].push(payment);
        });

    if (!monthNames.includes(currentMonth)) currentMonth = monthNames[0];
    monthsContainer.innerHTML = "";

    monthNames.forEach(month => {
        const total = (groups[month] || []).reduce((sum, item) => sum + item.amount, 0);
        const button = document.createElement("button");
        button.className = "month-card";
        button.dataset.month = month;
        if (month === currentMonth) button.classList.add("active");

        button.innerHTML = `
            <div class="month-name">${month}</div>
            <div class="month-total">${formatAmount(total)}</div>
        `;

        button.addEventListener("click", () => selectMonth(month, button));
        monthsContainer.appendChild(button);
    });

    updateYears();
}

function selectMonth(month, button) {
    currentMonth = month;
    document.querySelectorAll(".month-card").forEach(card => card.classList.remove("active"));
    button.classList.add("active");
    updateSummary();
    updateArchive();
}

function updateYears() {
    const years = [...new Set([2025, 2026, ...payments.map(payment => payment.year)])].sort();
    yearSelect.innerHTML = "";

    years.forEach(year => {
        const option = document.createElement("option");
        option.value = year;
        option.textContent = year;
        option.selected = year === currentYear;
        yearSelect.appendChild(option);
    });
}

yearSelect?.addEventListener("change", function () {
    currentYear = Number(this.value);
    updateMonths();
    updateSummary();
    updateArchive();
});

document.querySelectorAll(".summary-card").forEach(card => {
    card.addEventListener("click", function () {
        document.querySelectorAll(".summary-card").forEach(item => item.classList.remove("active"));
        this.classList.add("active");
    });
});

function updateArchive() {
    archiveList.innerHTML = "";

    if (payments.length === 0) {
        archiveList.innerHTML = '<div class="archive-empty">Выписок пока нет</div>';
        return;
    }

    const monthPayments = payments.filter(payment =>
        payment.month === currentMonth && payment.year === currentYear
    );

    if (monthPayments.length === 0) {
        archiveList.innerHTML = `<div class="archive-empty">За ${currentMonth} ${currentYear} платежей нет</div>`;
        return;
    }

    let total = 0;
    monthPayments.forEach(payment => {
        total += payment.amount;
        const item = document.createElement("div");
        item.className = "archive-item";
        item.innerHTML = `
            <div class="archive-title">📅 ${payment.date}</div>
            <div>${payment.description}</div>
            <div>💰 ${formatAmount(payment.amount)}</div>
        `;
        archiveList.appendChild(item);
    });

    const result = document.createElement("div");
    result.className = "archive-total";
    result.textContent = `Итого за ${currentMonth}: ${formatAmount(total)}`;
    archiveList.appendChild(result);
}

if (themeSwitch) {
    themeSwitch.addEventListener("change", function () {
        document.body.classList.toggle("dark-theme", this.checked);
    });
}

function setFontSize(className) {
    document.body.classList.remove("font-small", "font-normal", "font-big");
    document.body.classList.add(className);
}

smallFont?.addEventListener("click", () => setFontSize("font-small"));
normalFont?.addEventListener("click", () => setFontSize("font-normal"));
bigFont?.addEventListener("click", () => setFontSize("font-big"));

reminderSwitch?.addEventListener("change", function () {
    console.log(this.checked ? "Напоминания включены" : "Напоминания выключены");
});

toggleSettingsButton?.addEventListener("click", function () {
    const hidden = settingsContent.style.display === "none";
    settingsContent.style.display = hidden ? "flex" : "none";
    this.textContent = hidden ? "Скрыть" : "Показать";
});

toggleArchiveButton?.addEventListener("click", function () {
    const hidden = archiveContent.style.display === "none";
    archiveContent.style.display = hidden ? "block" : "none";
    this.textContent = hidden ? "Скрыть" : "Показать";
});

document.addEventListener("DOMContentLoaded", function () {
    accountBox.textContent = "Не найден";
    paymentCount.textContent = "0";
    totalAmount.textContent = formatAmount(0);
    paidAmount.textContent = formatAmount(0);
    unpaidAmount.textContent = formatAmount(0);
    receiptList.textContent = "Квитанций пока нет";
    archiveList.innerHTML = '<div class="archive-empty">Выписок пока нет</div>';
    status.textContent = "Выписка не загружена";
    updateYears();
});

console.log("✅ script.js готов");
