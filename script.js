"use strict";

console.log("🏠 Коммунальный помощник запущен");

let selectedFile = null;
let bankAccountNumber = "";
let payments = [];
let receipts = [];
let currentMonth = "Май";
let currentYear = 2026;

const MONTH_NAMES = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];

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
const electronicReceiptButton = document.getElementById("electronicReceiptButton");
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
    if (!selectedFile) { status.textContent = "Выписка не выбрана."; return; }
    if (selectedFile.type !== "application/pdf") {
        alert("Пожалуйста, выберите PDF-файл."); this.value = ""; selectedFile = null; status.textContent = "Выбран неверный файл."; return;
    }
    status.textContent = "✅ " + selectedFile.name;
});

pdfReceiptButton?.addEventListener("click", () => pdfReceiptInput?.click());
pdfReceiptInput?.addEventListener("change", function () {
    const file = this.files[0]; if (!file) return;
    if (file.type !== "application/pdf") { alert("Пожалуйста, выберите PDF-квитанцию."); this.value = ""; pdfReceiptStatus.textContent = "Выбран неверный файл."; return; }
    pdfReceiptStatus.textContent = "📄 Квитанция выбрана";
});

processPdfReceiptButton?.addEventListener("click", async function () {
    const file = pdfReceiptInput?.files[0];
    if (!file) { alert("Сначала выберите PDF-квитанцию."); return; }
    pdfReceiptStatus.textContent = "⏳ Квитанция обрабатывается...";
    try {
        const data = await loadReceiptPDF(file);
        data.fileName = file.name; data.id = `${Date.now()}-${Math.random()}`;
        receipts.push(data);
        matchAllReceipts();
        if (data.month && data.year) { currentMonth = data.month; currentYear = Number(data.year); }
        renderReceipts(); updateMonths(); updateSummary(); updateArchive();
        pdfReceiptStatus.textContent = data.month && data.year
            ? `✅ Квитанция успешно обработана: ${data.month} ${data.year}`
            : "✅ Квитанция успешно обработана";
        pdfReceiptInput.value = "";
    } catch (error) { console.error("Ошибка обработки квитанции:", error); pdfReceiptStatus.textContent = "❌ Не удалось обработать квитанцию."; }
});

async function loadReceiptPDF(file) { const pdf = await loadPDF(file); const text = await extractPDFText(pdf); return findReceiptData(text); }
function normalizeAccount(value) { return String(value || "").replace(/\D/g, ""); }
function amountsEqual(a, b) { return a !== null && a !== undefined && b !== null && b !== undefined && Math.abs(Number(a) - Number(b)) < 0.01; }

function findMatchingPayment(receipt) {
    if (receipt.noPaymentRequired || receipt.amount === null || receipt.amount <= 0 || !receipt.month || !receipt.year) return null;
    const recipientAccount = normalizeAccount(receipt.recipientAccount);
    if (recipientAccount) {
        const exactRecipientMatch = payments.find(payment => normalizeAccount(payment.recipientAccount) === recipientAccount && amountsEqual(payment.amount, receipt.amount));
        if (exactRecipientMatch) return exactRecipientMatch;
    }
    const receiptMonthIndex = MONTH_NAMES.indexOf(receipt.month);
    return payments.find(payment => {
        if (!amountsEqual(payment.amount, receipt.amount)) return false;
        const paymentMonthIndex = MONTH_NAMES.indexOf(payment.month);
        const receiptSerial = receipt.year * 12 + receiptMonthIndex;
        const paymentSerial = payment.year * 12 + paymentMonthIndex;
        return paymentSerial === receiptSerial || paymentSerial === receiptSerial + 1;
    }) || null;
}

function matchAllReceipts() {
    receipts.forEach(receipt => {
        if (receipt.noPaymentRequired || (receipt.amount !== null && receipt.amount <= 0)) {
            receipt.paid = false; receipt.noPaymentRequired = true; receipt.status = "Оплата не требуется"; receipt.matchedPayment = null; return;
        }
        receipt.noPaymentRequired = false;
        const match = findMatchingPayment(receipt); receipt.paid = Boolean(match); receipt.status = receipt.paid ? "Оплачено" : "Ждёт оплаты"; receipt.matchedPayment = match || null;
    });
}

function renderReceipts() {
    if (receiptList) receiptList.style.display = "none";
    if (!electronicReceiptButton) return;
    electronicReceiptButton.classList.remove("receipt-ok", "receipt-wait");
    if (receipts.length === 0) { electronicReceiptButton.innerHTML = "📎 Электронная квитанция"; return; }
    const receipt = receipts[receipts.length - 1];
    const periodText = receipt.month && receipt.year ? `${receipt.month} ${receipt.year}` : "";
    if (receipt.noPaymentRequired) {
        electronicReceiptButton.innerHTML = `✅ Квитанция загружена<br><span>Оплата не требуется${periodText ? ` · ${periodText}` : ""}</span>`;
        electronicReceiptButton.classList.add("receipt-ok");
    } else if (receipt.paid) {
        electronicReceiptButton.innerHTML = `✅ Квитанция загружена<br><span>Оплачено${periodText ? ` · ${periodText}` : ""}</span>`;
        electronicReceiptButton.classList.add("receipt-ok");
    } else {
        electronicReceiptButton.innerHTML = `⚠️ Квитанция загружена<br><span>Ждёт оплаты${periodText ? ` · ${periodText}` : ""}</span>`;
        electronicReceiptButton.classList.add("receipt-wait");
    }
}

loadButton?.addEventListener("click", loadStatement);
async function loadStatement() {
    if (!selectedFile) { alert("Сначала выберите PDF-выписку."); return; }
    status.textContent = "⏳ Обработка выписки...";
    try {
        const pdf = await loadPDF(selectedFile); const text = await extractPDFText(pdf);
        bankAccountNumber = findBankAccountNumber(text); payments = findUtilityPayments(text);
        if (payments.length > 0) currentYear = payments[0].year;
        accountBox.textContent = bankAccountNumber || "Не найден";
        matchAllReceipts(); renderReceipts(); updateMonths(); updateSummary(); updateArchive();
        status.textContent = "✅ Выписка успешно обработана."; fileInput.value = ""; selectedFile = null;
    } catch (error) { console.error("Ошибка чтения выписки:", error); status.textContent = "❌ Ошибка чтения PDF."; }
}

function getCurrentReceipts() { return receipts.filter(receipt => receipt.month === currentMonth && Number(receipt.year) === Number(currentYear)); }
function updateSummary() {
    const currentPayments = payments.filter(payment => payment.month === currentMonth && Number(payment.year) === Number(currentYear));
    const currentReceipts = getCurrentReceipts();
    paymentCount.textContent = currentPayments.length;
    totalAmount.textContent = formatAmount(currentPayments.reduce((sum, payment) => sum + payment.amount, 0));
    const paidReceipts = currentReceipts.filter(receipt => receipt.paid && receipt.amount !== null && receipt.amount > 0);
    const unpaidReceipts = currentReceipts.filter(receipt => !receipt.paid && !receipt.noPaymentRequired && receipt.amount !== null && receipt.amount > 0);
    paidAmount.textContent = formatAmount(paidReceipts.reduce((sum, receipt) => sum + receipt.amount, 0));
    unpaidAmount.textContent = formatAmount(unpaidReceipts.reduce((sum, receipt) => sum + receipt.amount, 0));
}

function updateMonths() {
    const availableMonths = new Set();
    payments.filter(payment => Number(payment.year) === Number(currentYear)).forEach(payment => availableMonths.add(payment.month));
    receipts.filter(receipt => Number(receipt.year) === Number(currentYear) && receipt.month).forEach(receipt => availableMonths.add(receipt.month));
    let monthNames = MONTH_NAMES.filter(month => availableMonths.has(month));
    if (monthNames.length === 0) monthNames = ["Май", "Июнь", "Июль"];
    if (!monthNames.includes(currentMonth)) currentMonth = monthNames[0];
    monthsContainer.innerHTML = "";
    monthNames.forEach(month => {
        const total = payments.filter(payment => Number(payment.year) === Number(currentYear) && payment.month === month).reduce((sum, item) => sum + item.amount, 0);
        const button = document.createElement("button"); button.className = "month-card";
        if (month === currentMonth) button.classList.add("active");
        button.innerHTML = `<div class="month-name">${month}</div><div class="month-total">${formatAmount(total)}</div>`;
        button.addEventListener("click", () => selectMonth(month, button)); monthsContainer.appendChild(button);
    });
    updateYears();
}
function selectMonth(month, button) { currentMonth = month; document.querySelectorAll(".month-card").forEach(card => card.classList.remove("active")); button.classList.add("active"); updateSummary(); updateArchive(); }
function updateYears() {
    const years = [...new Set([2025, 2026, ...payments.map(payment => payment.year), ...receipts.map(receipt => receipt.year).filter(Boolean)])].sort(); yearSelect.innerHTML = "";
    years.forEach(year => { const option = document.createElement("option"); option.value = year; option.textContent = year; option.selected = Number(year) === Number(currentYear); yearSelect.appendChild(option); });
}
yearSelect?.addEventListener("change", function () { currentYear = Number(this.value); updateMonths(); updateSummary(); updateArchive(); });
document.querySelectorAll(".summary-card").forEach(card => { card.addEventListener("click", function () { document.querySelectorAll(".summary-card").forEach(item => item.classList.remove("active")); this.classList.add("active"); }); });

function updateArchive() {
    archiveList.innerHTML = "";
    if (payments.length === 0) { archiveList.innerHTML = '<div class="archive-empty">Выписок пока нет</div>'; return; }
    const monthPayments = payments.filter(payment => payment.month === currentMonth && Number(payment.year) === Number(currentYear));
    if (monthPayments.length === 0) { archiveList.innerHTML = `<div class="archive-empty">За ${currentMonth} ${currentYear} платежей нет</div>`; return; }
    let total = 0;
    monthPayments.forEach(payment => { total += payment.amount; const item = document.createElement("div"); item.className = "archive-item"; item.innerHTML = `<div class="archive-title">📅 ${payment.date}</div><div>${payment.description}</div><div>💰 ${formatAmount(payment.amount)}</div>${payment.recipientAccount ? `<div>Счёт получателя: ${payment.recipientAccount}</div>` : ""}`; archiveList.appendChild(item); });
    const result = document.createElement("div"); result.className = "archive-total"; result.textContent = `Итого за ${currentMonth}: ${formatAmount(total)}`; archiveList.appendChild(result);
}

themeSwitch?.addEventListener("change", function () { document.body.classList.toggle("dark-theme", this.checked); });
function setFontSize(className) { document.body.classList.remove("font-small", "font-normal", "font-big"); document.body.classList.add(className); }
smallFont?.addEventListener("click", () => setFontSize("font-small")); normalFont?.addEventListener("click", () => setFontSize("font-normal")); bigFont?.addEventListener("click", () => setFontSize("font-big"));
reminderSwitch?.addEventListener("change", function () { console.log(this.checked ? "Напоминания включены" : "Напоминания выключены"); });
toggleSettingsButton?.addEventListener("click", function () { const hidden = settingsContent.style.display === "none"; settingsContent.style.display = hidden ? "flex" : "none"; this.textContent = hidden ? "Скрыть" : "Показать"; });
toggleArchiveButton?.addEventListener("click", function () { const hidden = archiveContent.style.display === "none"; archiveContent.style.display = hidden ? "block" : "none"; this.textContent = hidden ? "Скрыть" : "Показать"; });

document.addEventListener("DOMContentLoaded", function () {
    accountBox.textContent = "Не найден"; paymentCount.textContent = "0"; totalAmount.textContent = formatAmount(0); paidAmount.textContent = formatAmount(0); unpaidAmount.textContent = formatAmount(0);
    renderReceipts(); archiveList.innerHTML = '<div class="archive-empty">Выписок пока нет</div>'; status.textContent = "Выписка не загружена"; updateYears();
});
console.log("✅ script.js готов");
