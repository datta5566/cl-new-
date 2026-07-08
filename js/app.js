/*
  File Store Pro
  Continuous barcode scanning + manual save

  New behavior:
  - Type File / Batch Name first
  - Start camera
  - Every barcode scan auto-saves under that same file/batch name
  - Camera keeps running until Stop is clicked
  - All scanned barcodes show immediately in the shift table
*/

const STORAGE_KEY = "FILE_STORE_PRO_RECORDS_V2";
const OLD_STORAGE_KEYS = ["FILE_STORE_PRO_RECORDS_V1", "DK_FILE_STORE_PRO_RECORDS_V1"];

let selectedKN = "KN1";
let records = [];

const scanners = {
  "1st": null,
  "2nd": null,
};

const scannerRunning = {
  "1st": false,
  "2nd": false,
};

const lastScanCache = {
  "1st": { code: "", time: 0 },
  "2nd": { code: "", time: 0 },
};

window.addEventListener("DOMContentLoaded", () => {
  loadRecords();
  createKNButtons();
  attachEvents();
  renderApp();
  showToast("Website ready. File / batch name type karke camera start karo.", "success");
});

function createKNButtons() {
  const knGrid = document.getElementById("knGrid");
  knGrid.innerHTML = "";

  for (let i = 1; i <= 30; i++) {
    const knNumber = `KN${i}`;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "kn-btn";
    btn.textContent = knNumber;
    btn.dataset.kn = knNumber;
    knGrid.appendChild(btn);
  }
}

function attachEvents() {
  document.addEventListener("click", (event) => {
    const target = event.target.closest("button");
    if (!target) return;

    if (target.classList.contains("kn-btn")) {
      selectedKN = target.dataset.kn;
      stopAllScanners();
      renderApp();
      showToast(`${selectedKN} opened.`, "success");
      return;
    }

    if (target.dataset.saveShift) {
      saveManualRecord(target.dataset.saveShift, target.dataset.shiftKey);
      return;
    }

    if (target.dataset.action === "start") {
      startScanner(target.dataset.shiftKey);
      return;
    }

    if (target.dataset.action === "stop") {
      stopScanner(target.dataset.shiftKey);
      return;
    }

    if (target.id === "exportAllBtn") {
      exportAllRecords();
      return;
    }

    if (target.id === "exportCurrentKnBtn") {
      exportCurrentKNRecords();
      return;
    }

    if (target.id === "clearAllBtn") {
      clearAllRecords();
      return;
    }

    if (target.classList.contains("export-shift-btn")) {
      exportShiftRecords(target.dataset.shift);
      return;
    }

    if (target.dataset.viewId) {
      viewFile(target.dataset.viewId);
      return;
    }

    if (target.dataset.downloadId) {
      downloadFile(target.dataset.downloadId);
      return;
    }

    if (target.dataset.deleteId) {
      deleteRecord(target.dataset.deleteId);
    }
  });
}

function loadRecords() {
  try {
    records = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

    if (!records.length) {
      for (const oldKey of OLD_STORAGE_KEYS) {
        const oldData = JSON.parse(localStorage.getItem(oldKey)) || [];
        if (Array.isArray(oldData) && oldData.length) {
          records = oldData;
          saveRecords();
          break;
        }
      }
    }
  } catch (error) {
    console.error(error);
    records = [];
  }
}

function saveRecords() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (error) {
    console.error(error);
    showToast("Storage full ho sakta hai. Large files ke liye small file use karo.", "error");
  }
}

function renderApp() {
  renderHeader();
  renderKNActiveState();
  renderSummary();
  renderTable("1st Shift", "1st");
  renderTable("2nd Shift", "2nd");
}

function renderHeader() {
  document.getElementById("selectedKnLabel").textContent = selectedKN;
  document.getElementById("activeKnTitle").textContent = `${selectedKN} Records`;
  document.getElementById("activeKnBadge").textContent = selectedKN;
}

function renderKNActiveState() {
  document.querySelectorAll(".kn-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.kn === selectedKN);
  });
}

function renderSummary() {
  const firstShiftRecords = getRecordsByKNAndShift(selectedKN, "1st Shift");
  const secondShiftRecords = getRecordsByKNAndShift(selectedKN, "2nd Shift");

  document.getElementById("totalRecords").textContent = records.length;
  document.getElementById("barcodeCount").textContent = records.filter((r) => r.barcode && r.barcode !== "-").length;
  document.getElementById("firstShiftCount").textContent = firstShiftRecords.length;
  document.getElementById("secondShiftCount").textContent = secondShiftRecords.length;
}

function renderTable(shiftName, shiftKey) {
  const tbody = document.getElementById(`tbody_${shiftKey}`);
  const data = getRecordsByKNAndShift(selectedKN, shiftName);
  tbody.innerHTML = "";

  if (data.length === 0) {
    tbody.innerHTML = `<tr><td class="empty-row" colspan="8">No records found for ${selectedKN} - ${shiftName}</td></tr>`;
    return;
  }

  data.forEach((record) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHTML(record.kn)}</td>
      <td>${escapeHTML(record.shift)}</td>
      <td>${escapeHTML(record.barcode || "-")}</td>
      <td>${escapeHTML(record.fileName || record.batchName || "No File")}</td>
      <td>${escapeHTML(record.createdAt)}</td>
      <td>${record.fileData ? `<button class="btn action-btn" type="button" data-view-id="${record.id}">View</button>` : "-"}</td>
      <td>${record.fileData ? `<button class="btn action-btn" type="button" data-download-id="${record.id}">Download</button>` : "-"}</td>
      <td><button class="btn btn-danger-outline action-btn" type="button" data-delete-id="${record.id}">Delete</button></td>
    `;
    tbody.appendChild(tr);
  });
}

function getRecordsByKNAndShift(kn, shiftName) {
  return records.filter((record) => record.kn === kn && record.shift === shiftName);
}

function getShiftName(shiftKey) {
  return shiftKey === "1st" ? "1st Shift" : "2nd Shift";
}

function getBatchFileName(shiftKey) {
  const input = document.getElementById(`batchFile_${shiftKey}`);
  return input ? input.value.trim() : "";
}

function isDuplicateBarcode(kn, shiftName, barcode) {
  return records.some((record) =>
    record.kn === kn &&
    record.shift === shiftName &&
    record.barcode &&
    record.barcode.toLowerCase() === barcode.toLowerCase()
  );
}

async function saveManualRecord(shiftName, shiftKey) {
  const barcodeInput = document.getElementById(`barcode_${shiftKey}`);
  const fileInput = document.getElementById(`file_${shiftKey}`);
  const batchName = getBatchFileName(shiftKey);

  const barcodeValue = barcodeInput.value.trim();
  const file = fileInput.files[0];

  if (!barcodeValue && !file) {
    showToast("Barcode enter karo ya file upload karo, phir Manual Save dabao.", "warning");
    return;
  }

  if (barcodeValue && isDuplicateBarcode(selectedKN, shiftName, barcodeValue)) {
    showToast("This barcode is already scanned.", "warning");
    return;
  }

  let fileData = "";
  let fileName = batchName;
  let fileType = "";

  if (file) {
    fileData = await convertFileToBase64(file);
    fileName = file.name;
    fileType = file.type || "application/octet-stream";
  }

  const newRecord = {
    id: createUniqueId(),
    kn: selectedKN,
    shift: shiftName,
    barcode: barcodeValue || "-",
    fileName: fileName || "Manual Entry",
    batchName: batchName || fileName || "Manual Entry",
    fileType,
    fileData,
    createdAt: getCurrentDateTime(),
  };

  records.unshift(newRecord);
  saveRecords();

  barcodeInput.value = "";
  fileInput.value = "";

  renderApp();
  showToast(`Saved successfully in ${selectedKN} - ${shiftName}.`, "success");
}

function autoSaveScannedBarcode(decodedText, shiftKey) {
  const barcode = String(decodedText || "").trim();
  const shiftName = getShiftName(shiftKey);
  const batchName = getBatchFileName(shiftKey);
  const status = document.getElementById(`scanStatus_${shiftKey}`);
  const barcodeInput = document.getElementById(`barcode_${shiftKey}`);

  if (!barcode) return;

  if (!batchName) {
    if (status) status.textContent = "File / batch name blank hai. Pehle file name type karo.";
    showToast("Pehle File / Batch Name type karo, phir scan karo.", "warning");
    return;
  }

  const now = Date.now();
  const last = lastScanCache[shiftKey];

  // Same barcode camera ke saamne rehne par repeated scan avoid.
  if (last.code === barcode && now - last.time < 1800) return;

  lastScanCache[shiftKey] = { code: barcode, time: now };
  if (barcodeInput) barcodeInput.value = barcode;

  if (isDuplicateBarcode(selectedKN, shiftName, barcode)) {
    if (status) status.textContent = `Duplicate skipped: ${barcode}`;
    showToast("This barcode is already scanned.", "warning");
    return;
  }

  const newRecord = {
    id: createUniqueId(),
    kn: selectedKN,
    shift: shiftName,
    barcode,
    fileName: batchName,
    batchName,
    fileType: "",
    fileData: "",
    createdAt: getCurrentDateTime(),
  };

  records.unshift(newRecord);
  saveRecords();
  renderApp();

  const totalInBatch = records.filter((record) =>
    record.kn === selectedKN &&
    record.shift === shiftName &&
    (record.fileName === batchName || record.batchName === batchName)
  ).length;

  if (status) status.textContent = `Saved: ${barcode} | File: ${batchName} | Total in this file: ${totalInBatch}`;
}

function convertFileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function startScanner(shiftKey) {
  if (!window.Html5Qrcode) {
    showToast("Scanner library load nahi hui. Internet check karo.", "error");
    return;
  }

  if (scannerRunning[shiftKey]) {
    showToast("Scanner already running hai.", "warning");
    return;
  }

  const batchName = getBatchFileName(shiftKey);
  if (!batchName) {
    showToast("Camera start karne se pehle File / Batch Name type karo.", "warning");
    const batchInput = document.getElementById(`batchFile_${shiftKey}`);
    if (batchInput) batchInput.focus();
    return;
  }

  const readerId = `reader_${shiftKey}`;
  const scanStatus = document.getElementById(`scanStatus_${shiftKey}`);

  try {
    scanners[shiftKey] = new Html5Qrcode(readerId);
    scannerRunning[shiftKey] = true;
    if (scanStatus) scanStatus.textContent = `Camera starting... File: ${batchName}`;

    await scanners[shiftKey].start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 250, height: 140 } },
      (decodedText) => {
        autoSaveScannedBarcode(decodedText, shiftKey);
      },
      () => {}
    );

    if (scanStatus) scanStatus.textContent = `Camera on. Har barcode automatic save hoga. File: ${batchName}`;
  } catch (error) {
    console.error(error);
    scannerRunning[shiftKey] = false;
    if (scanStatus) scanStatus.textContent = "Camera start nahi hua. Manual entry use karo.";
    showToast("Camera permission allow karo ya website HTTPS/localhost se run karo.", "error");
  }
}

async function stopScanner(shiftKey) {
  const scanStatus = document.getElementById(`scanStatus_${shiftKey}`);

  if (!scanners[shiftKey] || !scannerRunning[shiftKey]) {
    if (scanStatus) scanStatus.textContent = "Camera off. File / batch name type karke Start Camera dabao.";
    return;
  }

  try {
    await scanners[shiftKey].stop();
    await scanners[shiftKey].clear();
  } catch (error) {
    console.warn(error);
  }

  scannerRunning[shiftKey] = false;
  scanners[shiftKey] = null;
  lastScanCache[shiftKey] = { code: "", time: 0 };
  if (scanStatus) scanStatus.textContent = "Camera stopped. Scanned barcodes saved ho gaye.";
}

function stopAllScanners() {
  stopScanner("1st");
  stopScanner("2nd");
}

function viewFile(recordId) {
  const record = records.find((item) => item.id === recordId);
  if (!record || !record.fileData) {
    showToast("File not found.", "error");
    return;
  }

  const newTab = window.open();
  if (!newTab) {
    showToast("Popup blocked. Browser popup allow karo.", "warning");
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
        <p>This file type preview nahi hoga. Download button use karo.</p>
      </body>
    `);
  }
}

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

function deleteRecord(recordId) {
  const record = records.find((item) => item.id === recordId);
  if (!record) return;

  const ok = confirm(`Delete record?\n${record.kn} - ${record.shift}\nBarcode: ${record.barcode}`);
  if (!ok) return;

  records = records.filter((item) => item.id !== recordId);
  saveRecords();
  renderApp();
  showToast("Record deleted.", "success");
}

function exportAllRecords() {
  exportRecordsToExcel(records, "File_Store_Pro_All_Records.xlsx");
}

function exportCurrentKNRecords() {
  const data = records.filter((record) => record.kn === selectedKN);
  exportRecordsToExcel(data, `File_Store_Pro_${selectedKN}.xlsx`);
}

function exportShiftRecords(shiftName) {
  const data = getRecordsByKNAndShift(selectedKN, shiftName);
  const safeShift = shiftName.replace(/\s+/g, "_");
  exportRecordsToExcel(data, `File_Store_Pro_${selectedKN}_${safeShift}.xlsx`);
}

function exportRecordsToExcel(data, fileName) {
  if (!data.length) {
    showToast("Export ke liye records available nahi hain.", "warning");
    return;
  }

  const rows = data.map((record, index) => ({
    "Sr No": index + 1,
    "KN Number": record.kn,
    Shift: record.shift,
    "Barcode Number": record.barcode,
    "File / Batch Name": record.fileName || record.batchName || "No File",
    "Upload / Scan Date & Time": record.createdAt,
  }));

  if (window.XLSX) {
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Records");
    XLSX.writeFile(workbook, fileName);
    showToast("Excel downloaded successfully.", "success");
    return;
  }

  const csv = convertRowsToCSV(rows);
  downloadTextFile(csv, fileName.replace(".xlsx", ".csv"), "text/csv");
  showToast("CSV downloaded. Excel library load nahi hui thi.", "warning");
}

function clearAllRecords() {
  const ok = confirm("All KN1 to KN30 records delete ho jayenge. Continue?");
  if (!ok) return;

  records = [];
  saveRecords();
  stopAllScanners();
  renderApp();
  showToast("All records cleared.", "success");
}

function convertRowsToCSV(rows) {
  const headers = Object.keys(rows[0]);
  const body = rows.map((row) => headers.map((header) => `"${String(row[header]).replaceAll('"', '""')}"`).join(","));
  return [headers.join(","), ...body].join("\n");
}

function downloadTextFile(text, fileName, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

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

function createUniqueId() {
  return `FS-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  if (!toast) {
    alert(message);
    return;
  }

  toast.textContent = message;
  toast.className = `toast show ${type}`;

  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toast.className = "toast";
  }, 3200);
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
