/*
  File Store Pro
  Beginner-friendly JavaScript

  Features:
  - KN1 to KN30 dashboard buttons
  - Separate 1st Shift and 2nd Shift records
  - File upload + camera barcode scanner + manual barcode entry
  - Duplicate barcode warning
  - Records saved in browser localStorage
  - Excel export using SheetJS
  - Camera scanner using html5-qrcode
*/

// localStorage key. Change version name if you later change storage format.
const STORAGE_KEY = "FILE_STORE_PRO_RECORDS_V1";

// Currently opened KN section.
let selectedKN = "KN1";

// All records are stored in this array.
let records = [];

// Scanner instances are stored here so we can start/stop separately for both shifts.
const scanners = {
  "1st": null,
  "2nd": null,
};

// Scanner running status.
const scannerRunning = {
  "1st": false,
  "2nd": false,
};

// DOM elements.
const knGrid = document.getElementById("knGrid");
const totalRecordsEl = document.getElementById("totalRecords");
const selectedKnLabelEl = document.getElementById("selectedKnLabel");
const firstShiftCountEl = document.getElementById("firstShiftCount");
const secondShiftCountEl = document.getElementById("secondShiftCount");
const barcodeCountEl = document.getElementById("barcodeCount");
const activeKnTitleEl = document.getElementById("activeKnTitle");
const activeKnBadgeEl = document.getElementById("activeKnBadge");
const toastEl = document.getElementById("toast");

// Run app after page load.
document.addEventListener("DOMContentLoaded", () => {
  loadRecordsFromLocalStorage();
  createKNButtons();
  attachEvents();
  renderApp();
});

/**
 * Create KN1 to KN30 buttons automatically.
 */
function createKNButtons() {
  knGrid.innerHTML = "";

  for (let i = 1; i <= 30; i++) {
    const knNumber = `KN${i}`;
    const button = document.createElement("button");

    button.className = "kn-btn";
    button.type = "button";
    button.textContent = knNumber;
    button.dataset.kn = knNumber;

    button.addEventListener("click", () => {
      selectedKN = knNumber;
      stopAllScanners();
      renderApp();
    });

    knGrid.appendChild(button);
  }
}

/**
 * Attach all button click events.
 */
function attachEvents() {
  // Save button events for both shifts.
  document.querySelectorAll("[data-save-shift]").forEach((button) => {
    button.addEventListener("click", () => {
      const shiftName = button.dataset.saveShift;
      const shiftKey = button.dataset.shiftKey;
      saveRecord(shiftName, shiftKey);
    });
  });

  // Start/Stop camera button events.
  document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.action;
      const shiftKey = button.dataset.shiftKey;

      if (action === "start") startScanner(shiftKey);
      if (action === "stop") stopScanner(shiftKey);
    });
  });

  // Export buttons.
  document.getElementById("exportAllBtn").addEventListener("click", exportAllRecords);
  document.getElementById("exportCurrentKnBtn").addEventListener("click", exportCurrentKNRecords);

  document.querySelectorAll(".export-shift-btn").forEach((button) => {
    button.addEventListener("click", () => exportShiftRecords(button.dataset.shift));
  });

  // Clear all records button.
  document.getElementById("clearAllBtn").addEventListener("click", clearAllRecords);
}

/**
 * Load records from browser localStorage.
 */
function loadRecordsFromLocalStorage() {
  try {
    const savedData = localStorage.getItem(STORAGE_KEY);
    records = savedData ? JSON.parse(savedData) : [];
  } catch (error) {
    console.error("localStorage read error:", error);
    records = [];
    showToast("Storage data read nahi ho pa raha. Fresh start kiya gaya.", "error");
  }
}

/**
 * Save records array into browser localStorage.
 */
function saveRecordsToLocalStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (error) {
    console.error("localStorage save error:", error);
    showToast("Storage full ho sakta hai. Large files ke liye cloud/IndexedDB use karein.", "error");
  }
}

/**
 * Render full app UI.
 */
function renderApp() {
  renderActiveKNInfo();
  renderKNButtonsActiveState();
  renderSummary();
  renderShiftTable("1st Shift", "1st");
  renderShiftTable("2nd Shift", "2nd");
}

/**
 * Update active KN labels.
 */
function renderActiveKNInfo() {
  selectedKnLabelEl.textContent = selectedKN;
  activeKnTitleEl.textContent = `${selectedKN} Records`;
  activeKnBadgeEl.textContent = selectedKN;
}

/**
 * Highlight selected KN button.
 */
function renderKNButtonsActiveState() {
  document.querySelectorAll(".kn-btn").forEach((button) => {
    button.classList.toggle("active", button.dataset.kn === selectedKN);
  });
}

/**
 * Update top summary cards.
 */
function renderSummary() {
  const currentFirstShift = getRecordsByKNAndShift(selectedKN, "1st Shift");
  const currentSecondShift = getRecordsByKNAndShift(selectedKN, "2nd Shift");

  totalRecordsEl.textContent = records.length;
  barcodeCountEl.textContent = records.filter((record) => record.barcode && record.barcode !== "-").length;
  firstShiftCountEl.textContent = currentFirstShift.length;
  secondShiftCountEl.textContent = currentSecondShift.length;
}

/**
 * Render records table for selected KN and selected shift only.
 */
function renderShiftTable(shiftName, shiftKey) {
  const tbody = document.getElementById(`tbody_${shiftKey}`);
  const filteredRecords = getRecordsByKNAndShift(selectedKN, shiftName);

  tbody.innerHTML = "";

  if (filteredRecords.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td class="empty-row" colspan="8">No records found for ${selectedKN} - ${shiftName}</td>`;
    tbody.appendChild(tr);
    return;
  }

  filteredRecords.forEach((record) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${escapeHTML(record.kn)}</td>
      <td>${escapeHTML(record.shift)}</td>
      <td>${escapeHTML(record.barcode)}</td>
      <td>${escapeHTML(record.fileName || "No File")}</td>
      <td>${escapeHTML(record.createdAt)}</td>
      <td>${record.fileData ? `<button class="btn action-btn" data-view-id="${record.id}">View</button>` : "-"}</td>
      <td>${record.fileData ? `<button class="btn action-btn" data-download-id="${record.id}">Download</button>` : "-"}</td>
      <td><button class="btn btn-danger-outline action-btn" data-delete-id="${record.id}">Delete</button></td>
    `;

    tbody.appendChild(tr);
  });

  // Table action buttons.
  tbody.querySelectorAll("[data-view-id]").forEach((button) => {
    button.addEventListener("click", () => viewFile(button.dataset.viewId));
  });

  tbody.querySelectorAll("[data-download-id]").forEach((button) => {
    button.addEventListener("click", () => downloadFile(button.dataset.downloadId));
  });

  tbody.querySelectorAll("[data-delete-id]").forEach((button) => {
    button.addEventListener("click", () => deleteRecord(button.dataset.deleteId));
  });
}

/**
 * Get records for one KN and one shift.
 */
function getRecordsByKNAndShift(kn, shiftName) {
  return records.filter((record) => record.kn === kn && record.shift === shiftName);
}

/**
 * Save one record for selected KN and selected shift.
 */
async function saveRecord(shiftName, shiftKey) {
  const barcodeInput = document.getElementById(`barcode_${shiftKey}`);
  const fileInput = document.getElementById(`file_${shiftKey}`);

  const barcode = barcodeInput.value.trim();
  const file = fileInput.files[0];

  if (!barcode) {
    showToast("Please barcode scan karein ya manual barcode enter karein.", "warning");
    barcodeInput.focus();
    return;
  }

  // Duplicate check: same KN + same Shift ke andar same barcode repeat nahi hoga.
  const duplicate = records.find(
    (record) =>
      record.kn === selectedKN &&
      record.shift === shiftName &&
      record.barcode.toLowerCase() === barcode.toLowerCase()
  );

  if (duplicate) {
    showToast("This barcode is already scanned.", "warning");
    return;
  }

  let fileData = "";
  let fileName = "";
  let fileType = "";

  // File is optional. You can save barcode only also.
  if (file) {
    fileData = await convertFileToBase64(file);
    fileName = file.name;
    fileType = file.type || "application/octet-stream";
  }

  const newRecord = {
    id: createUniqueId(),
    kn: selectedKN,
    shift: shiftName,
    barcode,
    fileName,
    fileType,
    fileData,
    createdAt: getCurrentDateTime(),
  };

  records.unshift(newRecord);
  saveRecordsToLocalStorage();

  // Clear fields after save.
  barcodeInput.value = "";
  fileInput.value = "";

  renderApp();
  showToast(`Record saved in ${selectedKN} - ${shiftName}.`, "success");
}

/**
 * Convert uploaded file into Base64 string so it can be saved in localStorage.
 */
function convertFileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Start camera barcode scanner for one shift.
 */
async function startScanner(shiftKey) {
  if (!window.Html5Qrcode) {
    showToast("Scanner library load nahi hui. Internet connection check karein.", "error");
    return;
  }

  if (scannerRunning[shiftKey]) {
    showToast("Scanner already running hai.", "warning");
    return;
  }

  const readerId = `reader_${shiftKey}`;
  const barcodeInput = document.getElementById(`barcode_${shiftKey}`);
  const scanStatus = document.getElementById(`scanStatus_${shiftKey}`);

  try {
    scanners[shiftKey] = new Html5Qrcode(readerId);

    scannerRunning[shiftKey] = true;
    scanStatus.textContent = "Camera starting...";

    await scanners[shiftKey].start(
      { facingMode: "environment" },
      {
        fps: 10,
        qrbox: { width: 250, height: 140 },
      },
      (decodedText) => {
        barcodeInput.value = decodedText;
        scanStatus.textContent = `Scanned: ${decodedText}`;
        showToast("Barcode scanned. Ab Save button dabayein.", "success");

        // Scanner stops after successful scan to avoid repeated scan.
        stopScanner(shiftKey);
      },
      () => {
        // Scan errors happen continuously while camera is looking for barcode.
        // So we intentionally keep this empty.
      }
    );

    scanStatus.textContent = "Camera on. Barcode ko camera ke saamne rakhein.";
  } catch (error) {
    console.error("Scanner start error:", error);
    scannerRunning[shiftKey] = false;
    scanStatus.textContent = "Camera start nahi hua. Manual entry use karein.";
    showToast("Camera permission allow karein ya Live Server/localhost se app run karein.", "error");
  }
}

/**
 * Stop camera scanner for one shift.
 */
async function stopScanner(shiftKey) {
  const scanStatus = document.getElementById(`scanStatus_${shiftKey}`);

  if (!scanners[shiftKey] || !scannerRunning[shiftKey]) {
    scanStatus.textContent = "Camera off. Manual entry also works.";
    return;
  }

  try {
    await scanners[shiftKey].stop();
    await scanners[shiftKey].clear();
  } catch (error) {
    console.warn("Scanner stop warning:", error);
  }

  scannerRunning[shiftKey] = false;
  scanners[shiftKey] = null;
  scanStatus.textContent = "Camera off. Manual entry also works.";
}

/**
 * Stop both scanners when changing KN or clearing data.
 */
function stopAllScanners() {
  stopScanner("1st");
  stopScanner("2nd");
}

/**
 * View uploaded file in a new browser tab.
 */
function viewFile(recordId) {
  const record = records.find((item) => item.id === recordId);

  if (!record || !record.fileData) {
    showToast("File not found.", "error");
    return;
  }

  const newTab = window.open();

  if (!newTab) {
    showToast("Popup blocked. Browser popup allow karein.", "warning");
    return;
  }

  if (record.fileType.startsWith("image/")) {
    newTab.document.write(`
      <title>${escapeHTML(record.fileName)}</title>
      <body style="margin:0;background:#0f172a;display:grid;place-items:center;min-height:100vh;">
        <img src="${record.fileData}" alt="${escapeHTML(record.fileName)}" style="max-width:95%;max-height:95vh;border-radius:12px;" />
      </body>
    `);
  } else if (record.fileType === "application/pdf") {
    newTab.document.write(`
      <title>${escapeHTML(record.fileName)}</title>
      <iframe src="${record.fileData}" style="border:0;width:100%;height:100vh;"></iframe>
    `);
  } else {
    newTab.document.write(`
      <title>${escapeHTML(record.fileName)}</title>
      <body style="font-family:Arial;padding:24px;background:#0f172a;color:white;">
        <h2>${escapeHTML(record.fileName)}</h2>
        <p>This file type may not preview in browser. Please use Download button.</p>
      </body>
    `);
  }
}

/**
 * Download uploaded file.
 */
function downloadFile(recordId) {
  const record = records.find((item) => item.id === recordId);

  if (!record || !record.fileData) {
    showToast("File not found.", "error");
    return;
  }

  const link = document.createElement("a");
  link.href = record.fileData;
  link.download = record.fileName || `${record.barcode}.file`;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

/**
 * Delete one record.
 */
function deleteRecord(recordId) {
  const record = records.find((item) => item.id === recordId);

  if (!record) return;

  const ok = confirm(`Delete record?\n${record.kn} - ${record.shift}\nBarcode: ${record.barcode}`);

  if (!ok) return;

  records = records.filter((item) => item.id !== recordId);
  saveRecordsToLocalStorage();
  renderApp();
  showToast("Record deleted.", "success");
}

/**
 * Export all records to Excel.
 */
function exportAllRecords() {
  exportRecordsToExcel(records, "File_Store_Pro_All_Records.xlsx");
}

/**
 * Export current KN records to Excel.
 */
function exportCurrentKNRecords() {
  const currentKNRecords = records.filter((record) => record.kn === selectedKN);
  exportRecordsToExcel(currentKNRecords, `File_Store_Pro_${selectedKN}.xlsx`);
}

/**
 * Export current KN + selected shift records to Excel.
 */
function exportShiftRecords(shiftName) {
  const shiftRecords = getRecordsByKNAndShift(selectedKN, shiftName);
  const safeShiftName = shiftName.replace(/\s+/g, "_");
  exportRecordsToExcel(shiftRecords, `File_Store_Pro_${selectedKN}_${safeShiftName}.xlsx`);
}

/**
 * Convert records to Excel file.
 */
function exportRecordsToExcel(data, fileName) {
  if (!window.XLSX) {
    showToast("Excel library load nahi hui. Internet connection check karein.", "error");
    return;
  }

  if (!data.length) {
    showToast("Export ke liye records available nahi hain.", "warning");
    return;
  }

  // Excel me fileData nahi daalte, kyunki Base64 bahut bada hota hai.
  const excelRows = data.map((record, index) => ({
    "Sr No": index + 1,
    "KN Number": record.kn,
    Shift: record.shift,
    "Barcode Number": record.barcode,
    "File Name": record.fileName || "No File",
    "Upload / Scan Date & Time": record.createdAt,
  }));

  const worksheet = XLSX.utils.json_to_sheet(excelRows);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, "Records");
  XLSX.writeFile(workbook, fileName);

  showToast("Excel downloaded successfully.", "success");
}

/**
 * Clear all records from localStorage.
 */
function clearAllRecords() {
  const ok = confirm("All KN1 to KN30 records delete ho jayenge. Continue?");

  if (!ok) return;

  records = [];
  saveRecordsToLocalStorage();
  stopAllScanners();
  renderApp();
  showToast("All records cleared.", "success");
}

/**
 * Create current Indian style date time string.
 */
function getCurrentDateTime() {
  return new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 * Create simple unique id.
 */
function createUniqueId() {
  return `FS-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Toast notification message.
 */
function showToast(message, type = "success") {
  toastEl.textContent = message;
  toastEl.className = `toast show ${type}`;

  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    toastEl.className = "toast";
  }, 3200);
}

/**
 * Escape HTML text before placing it inside table.
 * This keeps UI safe if barcode/file name has special characters.
 */
function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
