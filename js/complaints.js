/*
  Customer Complaint Traceability
  This module keeps complaint records separate from production records.
  It searches barcode records saved by app.js and shows KN + Shift trace.
*/

const COMPLAINT_STORAGE_KEY = "FILE_STORE_PRO_COMPLAINTS_V1";
const PRODUCTION_STORAGE_KEYS = [
  "FILE_STORE_PRO_RECORDS_V2",
  "FILE_STORE_PRO_RECORDS_V1",
  "DK_FILE_STORE_PRO_RECORDS_V1"
];

let complaintRecords = [];

window.addEventListener("DOMContentLoaded", () => {
  loadComplaintRecords();
  attachComplaintEvents();
  renderComplaintTable();
});

function attachComplaintEvents() {
  const saveBtn = document.getElementById("saveComplaintBtn");
  const traceBtn = document.getElementById("traceBarcodeBtn");
  const clearBtn = document.getElementById("clearComplaintFormBtn");
  const exportBtn = document.getElementById("exportComplaintsBtn");

  if (saveBtn) saveBtn.addEventListener("click", saveComplaintAndTrace);
  if (traceBtn) traceBtn.addEventListener("click", traceBarcodeOnly);
  if (clearBtn) clearBtn.addEventListener("click", clearComplaintForm);
  if (exportBtn) exportBtn.addEventListener("click", exportComplaintsExcel);
}

function loadComplaintRecords() {
  try {
    complaintRecords = JSON.parse(localStorage.getItem(COMPLAINT_STORAGE_KEY)) || [];
  } catch (error) {
    complaintRecords = [];
  }
}

function saveComplaintRecords() {
  localStorage.setItem(COMPLAINT_STORAGE_KEY, JSON.stringify(complaintRecords));
}

function getProductionRecords() {
  for (const key of PRODUCTION_STORAGE_KEYS) {
    try {
      const data = JSON.parse(localStorage.getItem(key)) || [];
      if (Array.isArray(data) && data.length) return data;
    } catch (error) {
      // Try next storage key.
    }
  }
  return [];
}

function getComplaintFormData() {
  return {
    complaintNo: getValue("complaintNo"),
    customerName: getValue("customerName"),
    barcode: getValue("complaintBarcode"),
    partName: getValue("complaintPartName"),
    defect: getValue("complaintDefect"),
    foundAt: getValue("complaintFoundAt"),
    suspectedUnit: getValue("suspectedUnit"),
    remark: getValue("complaintRemark")
  };
}

function saveComplaintAndTrace() {
  const form = getComplaintFormData();

  if (!form.complaintNo && !form.barcode && !form.defect) {
    showComplaintToast("Complaint No., barcode ya defect me se kuch to enter karo.", "warning");
    return;
  }

  const trace = findTraceByBarcode(form.barcode);

  const complaint = {
    id: createComplaintId(),
    ...form,
    tracedKN: trace ? normalizeRecordField(trace, "kn") : "Not Found",
    tracedShift: trace ? normalizeRecordField(trace, "shift") : "Not Found",
    tracedFileName: trace ? normalizeRecordField(trace, "fileName") : "",
    tracedDateTime: trace ? normalizeRecordField(trace, "createdAt") : "",
    createdAt: new Date().toLocaleString("en-IN")
  };

  complaintRecords.unshift(complaint);
  saveComplaintRecords();
  renderComplaintTable();
  showTraceResult(form.barcode, trace, complaint);
  clearComplaintForm(false);
  showComplaintToast("Complaint saved and traced.", "success");
}

function traceBarcodeOnly() {
  const barcode = getValue("complaintBarcode");

  if (!barcode) {
    showComplaintToast("Trace ke liye barcode enter karo.", "warning");
    return;
  }

  const trace = findTraceByBarcode(barcode);
  showTraceResult(barcode, trace, null);
}

function findTraceByBarcode(barcode) {
  if (!barcode) return null;

  const productionRecords = getProductionRecords();
  return productionRecords.find((record) => {
    const recordBarcode = normalizeRecordField(record, "barcode") || normalizeRecordField(record, "barcodeNumber");
    return recordBarcode && recordBarcode.toLowerCase() === barcode.toLowerCase();
  }) || null;
}

function showTraceResult(barcode, trace, complaint) {
  const box = document.getElementById("traceResult");
  if (!box) return;

  if (!barcode) {
    box.className = "trace-result warn";
    box.innerHTML = "Barcode blank hai. Manual complaint save ho gayi, lekin trace nahi mila.";
    return;
  }

  if (!trace) {
    box.className = "trace-result warn";
    box.innerHTML = `
      <strong>Trace Not Found:</strong> Barcode <strong>${escapeComplaintHTML(barcode)}</strong> production records me nahi mila.<br>
      Iska matlab: ya barcode scan/save nahi hua, ya data kisi dusre device/browser me hai, ya barcode galat enter hua.
    `;
    return;
  }

  const kn = normalizeRecordField(trace, "kn") || normalizeRecordField(trace, "knNumber") || "-";
  const shift = normalizeRecordField(trace, "shift") || "-";
  const fileName = normalizeRecordField(trace, "fileName") || "No File";
  const dateTime = normalizeRecordField(trace, "createdAt") || normalizeRecordField(trace, "dateTime") || "-";
  const suspected = complaint && complaint.suspectedUnit ? complaint.suspectedUnit : getValue("suspectedUnit") || "Not entered";

  box.className = "trace-result";
  box.innerHTML = `
    <strong>Trace Found:</strong><br>
    Barcode: <strong>${escapeComplaintHTML(barcode)}</strong><br>
    Record KN / Unit: <strong>${escapeComplaintHTML(kn)}</strong><br>
    Record Shift: <strong>${escapeComplaintHTML(shift)}</strong><br>
    Saved File: <strong>${escapeComplaintHTML(fileName)}</strong><br>
    Record Date & Time: <strong>${escapeComplaintHTML(dateTime)}</strong><br>
    Suspected Process / Unit: <strong>${escapeComplaintHTML(suspected)}</strong><br>
    Note: Final responsible unit confirm karne ke liye process history, PDI report, and photo/file proof check karo.
  `;
}

function renderComplaintTable() {
  const tbody = document.getElementById("complaintTbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!complaintRecords.length) {
    tbody.innerHTML = `<tr><td class="empty-row" colspan="10">No customer complaints saved.</td></tr>`;
    return;
  }

  complaintRecords.forEach((item) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeComplaintHTML(item.complaintNo || "-")}</td>
      <td>${escapeComplaintHTML(item.customerName || "-")}</td>
      <td>${escapeComplaintHTML(item.barcode || "-")}</td>
      <td>${escapeComplaintHTML(item.partName || "-")}</td>
      <td>${escapeComplaintHTML(item.defect || "-")}</td>
      <td>${escapeComplaintHTML(item.tracedKN || "Not Found")}</td>
      <td>${escapeComplaintHTML(item.tracedShift || "Not Found")}</td>
      <td>${escapeComplaintHTML(item.suspectedUnit || "-")}</td>
      <td>${escapeComplaintHTML(item.createdAt || "-")}</td>
      <td><button class="btn btn-danger-outline action-btn" type="button" onclick="deleteComplaint('${item.id}')">Delete</button></td>
    `;
    tbody.appendChild(tr);
  });
}

function deleteComplaint(id) {
  const ok = confirm("Delete this complaint record?");
  if (!ok) return;

  complaintRecords = complaintRecords.filter((item) => item.id !== id);
  saveComplaintRecords();
  renderComplaintTable();
  showComplaintToast("Complaint deleted.", "success");
}

function exportComplaintsExcel() {
  if (!complaintRecords.length) {
    showComplaintToast("Complaint export ke liye data nahi hai.", "warning");
    return;
  }

  const rows = complaintRecords.map((item, index) => ({
    "Sr No": index + 1,
    "Complaint No": item.complaintNo || "-",
    "Customer": item.customerName || "-",
    "Barcode": item.barcode || "-",
    "Part Name": item.partName || "-",
    "Defect Type": item.defect || "-",
    "Defect Found At": item.foundAt || "-",
    "Traced KN / Unit": item.tracedKN || "Not Found",
    "Traced Shift": item.tracedShift || "Not Found",
    "Suspected Process / Unit": item.suspectedUnit || "-",
    "Remark": item.remark || "-",
    "Complaint Date & Time": item.createdAt || "-"
  }));

  if (window.XLSX) {
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Complaints");
    XLSX.writeFile(workbook, "Customer_Complaint_Traceability.xlsx");
    showComplaintToast("Complaint Excel downloaded.", "success");
    return;
  }

  const csv = convertComplaintRowsToCSV(rows);
  downloadComplaintTextFile(csv, "Customer_Complaint_Traceability.csv", "text/csv");
  showComplaintToast("CSV downloaded. Excel library load nahi hui thi.", "warning");
}

function clearComplaintForm(showMsg = true) {
  [
    "complaintNo",
    "customerName",
    "complaintBarcode",
    "complaintPartName",
    "complaintDefect",
    "complaintFoundAt",
    "suspectedUnit",
    "complaintRemark"
  ].forEach((id) => {
    const input = document.getElementById(id);
    if (input) input.value = "";
  });

  if (showMsg) showComplaintToast("Complaint form cleared.", "success");
}

function normalizeRecordField(record, fieldName) {
  if (!record) return "";
  return record[fieldName] ? String(record[fieldName]) : "";
}

function getValue(id) {
  const input = document.getElementById(id);
  return input ? input.value.trim() : "";
}

function createComplaintId() {
  return `CC-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function showComplaintToast(message, type) {
  if (typeof showToast === "function") {
    showToast(message, type);
  } else {
    alert(message);
  }
}

function escapeComplaintHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function convertComplaintRowsToCSV(rows) {
  const headers = Object.keys(rows[0]);
  const body = rows.map((row) => headers.map((header) => `"${String(row[header]).replaceAll('"', '""')}"`).join(","));
  return [headers.join(","), ...body].join("\n");
}

function downloadComplaintTextFile(text, fileName, type) {
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
