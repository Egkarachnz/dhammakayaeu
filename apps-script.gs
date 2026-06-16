/**
 * ============================================================
 * Google Apps Script — ฐานข้อมูลคลาวด์ของเว็บ (Google Sheets)
 * ============================================================
 * เก็บทั้ง "วัด" และ "งานบุญ" ไว้ใน Google Sheets เดียว
 * ข้อมูลจะอยู่ถาวร ไม่หายแม้จะอัปเดตโค้ดเว็บกี่เวอร์ชั่นก็ตาม
 *
 * ── วิธีติดตั้ง (ทำครั้งเดียว) ──
 * 1) สร้าง Google Sheet ใหม่ 1 ไฟล์ (ตั้งชื่ออะไรก็ได้)
 * 2) เมนู Extensions → Apps Script
 * 3) ลบโค้ดเดิมทั้งหมด แล้ววางโค้ดนี้แทน → กดบันทึก (💾)
 * 4) แก้ SECRET ด้านล่างให้ตรงกับ ADMIN_PASSWORD ใน config.js
 * 5) กด Deploy → New deployment → เลือกชนิด "Web app"
 *      - Execute as: Me
 *      - Who has access: Anyone
 * 6) กด Deploy แล้วคัดลอกลิงก์ที่ลงท้ายด้วย /exec
 * 7) นำลิงก์ไปวางใน CONFIG.DATA_URL ในไฟล์ config.js
 *
 * แท็บชีตจะถูกสร้างให้อัตโนมัติเมื่อมีการบันทึกครั้งแรก
 * (ชีต "Temples" และ "Events") — แก้ในชีตโดยตรงก็ได้
 * ============================================================
 */

const SECRET = "dhamma2569";   // <<< ต้องตรงกับ ADMIN_PASSWORD ใน config.js

const TEMPLE_SHEET = "Temples";
const EVENT_SHEET  = "Events";

const TEMPLE_COLS = [
  "id", "name", "country", "abbot", "deputy", "abbot_photo", "logo", "address",
  "map_url", "phone", "monks", "monk_count", "website",
  "facebook", "line", "youtube", "instagram",
  "established", "history", "gallery"   // ← เพิ่มใหม่: วันสร้างวัด, ประวัติ, ลิงก์รูปภาพ
];
const EVENT_COLS = ["id", "temple_id", "date", "title", "description"];

// โฟลเดอร์ใน Google Drive สำหรับเก็บรูปที่แอดมินอัปโหลด (สร้างให้อัตโนมัติ)
const IMAGE_FOLDER = "DhammakayaEU Images";

/** ── อ่านข้อมูลทั้งหมด (เว็บเรียกตอนโหลดหน้า) ── */
function doGet() {
  return out({
    ok: true,
    temples: readSheet(TEMPLE_SHEET, TEMPLE_COLS),
    events:  readSheet(EVENT_SHEET,  EVENT_COLS),
  });
}

/** ── เพิ่ม / แก้ไข / ลบ (เว็บเรียกตอนแอดมินบันทึก) ── */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    if (data.secret !== SECRET) return out({ ok: false, error: "unauthorized" });

    // ── อัปโหลดรูปขึ้น Google Drive แล้วคืนลิงก์ ──
    if (data.type === "image") {
      if (data.action === "upload") return out({ ok: true, url: saveImage(data) });
      return out({ ok: false, error: "unknown image action" });
    }

    const cfg = data.type === "event"
      ? { name: EVENT_SHEET,  cols: EVENT_COLS }
      : { name: TEMPLE_SHEET, cols: TEMPLE_COLS };

    const sheet = getSheet(cfg.name, cfg.cols);

    if (data.action === "save") {
      upsert(sheet, cfg.cols, data.item || {});
      return out({ ok: true, action: "save", id: (data.item || {}).id });
    }

    if (data.action === "bulkSave") {
      (data.items || []).forEach(item => upsert(sheet, cfg.cols, item));
      return out({ ok: true, action: "bulkSave", count: (data.items || []).length });
    }

    if (data.action === "delete") {
      const row = findRowById(sheet, (data.item || {}).id);
      if (row > 0) sheet.deleteRow(row);
      return out({ ok: true, action: "delete", id: (data.item || {}).id });
    }

    return out({ ok: false, error: "unknown action" });
  } catch (err) {
    return out({ ok: false, error: String(err) });
  }
}

/** เพิ่มแถวใหม่ หรือทับแถวเดิมถ้ามี id ตรงกัน */
function upsert(sheet, cols, item) {
  const values = cols.map(c => (item[c] != null ? item[c] : ""));
  const row = findRowById(sheet, item.id);
  if (row > 0) sheet.getRange(row, 1, 1, cols.length).setValues([values]);
  else sheet.appendRow(values);
}

/** หาเลขแถวจาก id (คอลัมน์ A) — คืน -1 ถ้าไม่พบ */
function findRowById(sheet, id) {
  if (sheet.getLastRow() < 2) return -1;
  const ids = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return i + 2;
  }
  return -1;
}

/** อ่านทั้งชีตเป็น array ของ object (อิงชื่อหัวคอลัมน์) */
function readSheet(name, cols) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const grid   = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).getValues();
  const header = grid[0].map(h => String(h).trim());
  return grid.slice(1)
    .filter(r => String(r[0]).trim() !== "")
    .map(r => {
      const o = {};
      header.forEach((h, i) => { o[h] = r[i] == null ? "" : r[i]; });
      cols.forEach(c => { if (o[c] == null) o[c] = ""; });
      return o;
    });
}

/** คืนชีต ถ้ายังไม่มีจะสร้างพร้อมหัวคอลัมน์
 *  ถ้ามีอยู่แล้วแต่หัวคอลัมน์ไม่ครบ (เช่นเพิ่มฟิลด์ใหม่) จะต่อหัวให้อัตโนมัติ
 *  โดยลำดับคอลัมน์เดิมไม่เปลี่ยน ข้อมูลเก่าจึงไม่หาย */
function getSheet(name, cols) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.getRange(1, 1, 1, cols.length).setValues([cols]);
    return sheet;
  }
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, cols.length).setValues([cols]);
    return sheet;
  }
  // ตรวจหัวคอลัมน์ปัจจุบัน — ถ้าไม่ตรง/ไม่ครบ ให้เขียนหัวมาตรฐานทับ (ลำดับเดิมตรงกับ cols อยู่แล้ว)
  const header = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0].map(h => String(h).trim());
  let needs = false;
  for (let i = 0; i < cols.length; i++) { if (header[i] !== cols[i]) { needs = true; break; } }
  if (needs) sheet.getRange(1, 1, 1, cols.length).setValues([cols]);
  return sheet;
}

/** บันทึกรูป base64 ลง Google Drive แล้วคืนลิงก์ที่ฝังแสดงได้ */
function saveImage(data) {
  const folder  = getImageFolder();
  const bytes   = Utilities.base64Decode(data.dataBase64);
  const blob    = Utilities.newBlob(bytes, data.mimeType || "image/jpeg",
                    data.filename || ("img_" + Date.now() + ".jpg"));
  const file    = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return "https://drive.google.com/thumbnail?id=" + file.getId() + "&sz=w1600";
}

/** คืนโฟลเดอร์เก็บรูป (สร้างให้ถ้ายังไม่มี) */
function getImageFolder() {
  const it = DriveApp.getFoldersByName(IMAGE_FOLDER);
  return it.hasNext() ? it.next() : DriveApp.createFolder(IMAGE_FOLDER);
}

/**
 * ⭐ รันฟังก์ชันนี้ 1 ครั้งเพื่ออนุญาตสิทธิ์ Google Drive (จำเป็นสำหรับการอัปโหลดรูป)
 * วิธีรัน: เลือก "authorizeDrive" จากเมนูดรอปดาวน์ด้านบน แล้วกดปุ่ม ▶ Run
 *         จะมีหน้าต่างขออนุญาต → Review permissions → เลือกบัญชี → Advanced → Allow
 */
function authorizeDrive() {
  const f = getImageFolder();
  Logger.log("อนุญาต Drive สำเร็จ — โฟลเดอร์: " + f.getName());
  return "OK: " + f.getName();
}

function out(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
