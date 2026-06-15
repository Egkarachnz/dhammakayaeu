/* ============================================================
   ⚙️ ตั้งค่าเว็บไซต์
   ============================================================ */
const CONFIG = {
  /* ── ฐานข้อมูลคลาวด์ (Google Sheets) ──
     วางลิงก์ Web App ที่ลงท้ายด้วย /exec จากการ Deploy ไฟล์ apps-script.gs
     • ถ้าใส่ลิงก์ → ข้อมูลที่บันทึกจะอยู่ถาวร แชร์ทุกอุปกรณ์ ไม่หายเมื่ออัปเดตโค้ด
     • ถ้าเว้นว่าง → เก็บเฉพาะในเครื่องนี้ (localStorage) เท่านั้น
     ดูวิธีติดตั้งใน apps-script.gs หรือ SETUP.md */
  DATA_URL: "https://script.google.com/macros/s/AKfycbyQcZMSS2ttCwCPNlS4lV4eSNLG3i8mcW4G9lmCcp46oaGtlrNo-wRium5ogfhRcyIY/exec",

  /* รหัสผ่านเข้าหลังบ้านแอดมิน (ต้องตรงกับ SECRET ใน apps-script.gs) */
  ADMIN_PASSWORD: "dhamma2569",

  /* โซเชียลมีเดียหลักของเพจ (ใส่ URL หรือเว้นว่างถ้ายังไม่มี) */
  SOCIAL: {
    facebook:  "",   /* https://facebook.com/... */
    youtube:   "",   /* https://youtube.com/...  */
    line:      "",   /* https://line.me/...       */
    instagram: "",   /* https://instagram.com/... */
  },
};
