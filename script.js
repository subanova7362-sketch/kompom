"use strict";

console.log("🏠 Коммунальный помощник запущен");

let selectedFile = null;
let accountNumber = "";
let payments = [];
let receipts = [];
let currentMonth = "Май";
let currentYear = 2026;

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

pdfReceiptButton?.addEventListener("click", () => pdfReceiptInput?.click());

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
        const data = await loadReceiptPDF(file);
        data.fileName = file.name;
        data.id = `${Date.now()}-${Math.random()}`;
        receipts.push(data);
        matchAllReceipts();
        renderReceipts();
        updateSummary();
        pdfReceiptStatus.textContent = "✅ Квитанция успешно обработана";
        pdfReceiptInput.value = "";
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

function normalizeAccount(value) {
    return String(value || "").replace(/\D/g, "");
}

function amountsEqual(a, b) {
    if (a === null || a === undefined || b === null || b === undefined) return false;
    return Math.abs(Number(a) - Number(b)) < 0.01;
}

function findMatchingPayment(receipt) {
    if (receipt.amount === null || !receipt.month || !receipt.year) return null;

    const receiptAccount = normalizeAccount(receipt.accountNumber);
    const statementAccount = normalizeAccount(accountNumber);

    if (receiptAccount && statementAccount && receiptAccount !== statementAccount) return null;

    return payments.find(payment =>
        payment.month === receipt.month &&
        payment.year === receipt.year &&
        amountsEqual(payment.amount, receipt.amount)
    ) || null;
}

function matchAllReceipts() {
    receipts.forEach(receipt => {
        const match = findMatchingPayment(receipt);
        receipt.paid = Boolean(match);
        receipt.matchedPayment = match || null;
    });
}

function renderReceipts() {
    if (receipts.length === 0) {
        receiptList.textContent = "Квитанций пока нет";
        return;
    }

    receiptList.innerHTML = "";
    receipts.forEach(receipt => {
        const item = document.createElement("div");
        item.className = "receipt-result";
        const account = receipt.accountNumber || "Не найден";
        const amount = receipt.amount !== null ? formatAmount(receipt.amount) : "Не найдена";
        const period = receipt.period || "Не найден";
        const state = receipt.paid ? "✅ Оплачено" : "⏳ Ждёт оплаты";
        const paymentDate = receipt.matchedPayment ? `<div>Дата оплаты: ${receipt.matchedPayment.date}</div>` : "";

        item.innerHTML = `
            <div><b>🧾 ${receipt.fileName || "Электронная квитанция"}</b></div>
            <div>Лицевой счёт: ${account}</div>
            <div>Сумма к оплате: ${amount}</div>
            <div>Период: ${period}</div>
            <div><b>Статус: ${state}</b></div>
            ${paymentDate}
        `;
        receiptList.appendChild(item);
    });
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
        payments.push(...findUtilityPayments(text));

        if (payments.length > 0) currentYear = payments[0].year;
        accountBox.textContent = accountNumber || "Не найден";

        matchAllReceipts();
        renderReceipts();
        updateMonths();
        updateSummary();
        updateArchive();

        status.textContent = "✅ Выписка успешно обработана.";
        fileInput.value = "";
        selectedFile = null;
    } catch (error) {
        console.error("Ошибка чтения выписки:", error);
        status.textContent = "❌ Ошибка чтения PDF.";
    }
}

function getCurrentReceipts() {
    return receipts.filter(receipt => receipt.month === currentMonth && receipt.year === currentYear);
}

function updateSummary() {
    const currentPayments = payments.filter(payment => payment.month === currentMonth && payment.year === currentYear);
    const currentReceipts = getCurrentReceipts();

    paymentCount.textContent = currentPayments.length;
    totalAmount.textContent = formatAmount(currentPayments.reduce((sum, payment) => sum + payment.amount, 0));

    const paidReceipts = currentReceipts.filter(receipt => receipt.paid && receipt.amount !== null);
    const unpaidReceipts = currentReceipts.filter(receipt => !receipt.paid && receipt.amount !== null);

    paidAmount.textContent = formatAmount(paidReceipts.reduce((sum, receipt) => sum + receipt.amount, 0));
    unpaidAmount.textContent = formatAmount(unpaidReceipts.reduce((sum, receipt) => sum + receipt.amount, 0));
}

function updateMonths() {
    const monthNames = ["Май", "Июнь", "Июль"];
    const groups = {};
    payments.filter(payment => payment.year === currentYear).forEach(payment => {
        if (!groups[payment.month]) groups[payment.month] = [];
        groups[payment.month].push(payment);
    });

    if (!monthNames.includes(currentMonth)) currentMonth = monthNames[0];
    monthsContainer.innerHTML = "";
    monthNames.forEach(month => {
        const total = (groups[month] || []).reduce((sum, item) => sum + item.amount, 0);
        const button = document.createElement("button");
        button.className = "month-card";
        if (month === currentMonth) button.classList.add("active");
        button.innerHTML = `<div class="month-name">${month}</div><div class="month-total">${formatAmount(total)}</div>`;
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
    const years = [...new Set([2025, 2026, ...payments.map(payment => payment.year), ...receipts.map(receipt => receipt.year).filter(Boolean)])].sort();
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

    const monthPayments = payments.filter(payment => payment.month === currentMonth && payment.year === currentYear);
    if (monthPayments.length === 0) {
        archiveList.innerHTML = `<div class="archive-empty">За ${currentMonth} ${currentYear} платежей нет</div>`;
        return;
    }

    let total = 0;
    monthPayments.forEach(payment => {
        total += payment.amount;
        const item = document.createElement("div");
        item.className = "archive-item";
        item.innerHTML = `<div class="archive-title">📅 ${payment.date}</div><div>${payment.description}</div><div>💰 ${formatAmount(payment.amount)}</div>`;
        archiveList.appendChild(item);
    });

    const result = document.createElement("div");
    result.className = "archive-total";
    result.textContent = `Итого за ${currentMonth}: ${formatAmount(total)}`;
    archiveList.appendChild(result);
}

themeSwitch?.addEventListener("change", function () {
    document.body.classList.toggle("dark-theme", this.checked);
});

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
    renderReceipts();
    archiveList.innerHTML = '<div class="archive-empty">Выписок пока нет</div>';
    status.textContent = "Выписка не загружена";
    updateYears();
});

console.log("✅ script.js готов");
