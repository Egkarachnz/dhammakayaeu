/**
 * ============================================================
 * Google Apps Script — ระบบเพิ่ม/แก้ไข/ลบ "งานบุญ" จากหน้าเว็บ
 * ============================================================
 * ใช้คู่กับเว็บ index.html (ตัวเลือกเสริม — ถ้าไม่ใช้ ก็แก้งานบุญ
 * ใน Google Sheets โดยตรงได้เลย)
 *
 * วิธีติดตั้ง:
 * 1) เปิด Google Sheet ของคุณ → เมนู Extensions → Apps Script
 * 2) ลบโค้ดเดิมทิ้ง แล้ววางโค้ดนี้แทน
 * 3) แก้ SECRET ให้ตรงกับ ADMIN_PASSWORD ในไฟล์ index.html
 * 4) กด Deploy → New deployment → ประเภท "Web app"
 *      - Execute as: Me
 *      - Who has access: Anyone
 * 5) คัดลอกลิงก์ที่ลงท้ายด้วย /exec มาวางใน CONFIG.ADMIN_URL ของเว็บ
 *
 * โครงสร้างชีต "Events" (แถวแรกเป็นหัวคอลัมน์):
 *   id | temple_id | date | title | description
 * ============================================================
 */

const SECRET = "dhamma2569";      // <<< ต้องตรงกับ ADMIN_PASSWORD ในเว็บ
const SHEET_NAME = "Events";       // ชื่อชีตงานบุญ

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    // ตรวจรหัสผ่าน
    if (data.secret !== SECRET) {
      return out({ ok: false, error: "unauthorized" });
    }

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    const ev = data.event || {};

    if (data.action === "add") {
      sheet.appendRow([ev.id, ev.temple_id, ev.date, ev.title, ev.description]);
      return out({ ok: true, action: "add", id: ev.id });
    }

    if (data.action === "edit") {
      const row = findRowById(sheet, ev.id);
      if (row < 0) return out({ ok: false, error: "not found" });
      sheet.getRange(row, 1, 1, 5)
           .setValues([[ev.id, ev.temple_id, ev.date, ev.title, ev.description]]);
      return out({ ok: true, action: "edit", id: ev.id });
    }

    if (data.action === "delete") {
      const row = findRowById(sheet, ev.id);
      if (row < 0) return out({ ok: false, error: "not found" });
      sheet.deleteRow(row);
      return out({ ok: true, action: "delete", id: ev.id });
    }

    return out({ ok: false, error: "unknown action" });
  } catch (err) {
    return out({ ok: false, error: String(err) });
  }
}

/** หาเลขแถวจากค่าในคอลัมน์ id (คอลัมน์ A) */
function findRowById(sheet, id) {
  const ids = sheet.getRange(1, 1, sheet.getLastRow(), 1).getValues();
  for (let i = 1; i < ids.length; i++) {           // เริ่มที่ 1 เพื่อข้ามหัวคอลัมน์
    if (String(ids[i][0]) === String(id)) return i + 1;
  }
  return -1;
}

function out(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/** ใช้ทดสอบว่า Web App ทำงานหรือไม่ (เปิดลิงก์ /exec ในเบราว์เซอร์) */
function doGet() {
  return out({ ok: true, message: "Temple events endpoint is running." });
}
