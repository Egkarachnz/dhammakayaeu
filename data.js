/* ============================================================
   ข้อมูลวัดและศูนย์ปฏิบัติธรรมในทวีปยุโรป
   แก้ไขไฟล์นี้เพื่ออัปเดตข้อมูล แล้ว push ขึ้น GitHub
   ============================================================

   ฟิลด์ในแต่ละวัด:
     id          — รหัสเฉพาะ (ห้ามซ้ำ)
     name        — ชื่อวัดภาษาไทย
     country     — ชื่อประเทศ (ใช้กรองในดรอปดาวน์)
     abbot       — ชื่อเจ้าอาวาส
     abbot_photo — URL รูปเจ้าอาวาส (ใส่หรือเว้นว่างได้)
     logo        — URL โลโก้วัด (ใส่หรือเว้นว่างได้)
     address     — ที่อยู่ (คลิกเปิด Google Maps)
     map_url     — ลิงก์แผนที่โดยตรง (ถ้ามี)
     phone       — เบอร์โทรศัพท์
     monks       — รายชื่อพระ คั่นด้วย ; เช่น "พระมหา ก.; พระ ข."
   ============================================================ */

const DATA_TEMPLES = [
  {id:"t1",  name:"วัดพระธรรมกายเบลเยียม",           country:"เบลเยียม",        abbot:"", abbot_photo:"", logo:"", address:"", map_url:"", phone:"", monks:""},
  {id:"t2",  name:"วัดพระธรรมกายชวาร์ซวัลด์",         country:"เยอรมนี",         abbot:"", abbot_photo:"", logo:"", address:"", map_url:"", phone:"", monks:""},
  {id:"t3",  name:"วัดพระธรรมกายลอนดอน",              country:"อังกฤษ",          abbot:"", abbot_photo:"", logo:"", address:"", map_url:"", phone:"", monks:""},
  {id:"t4",  name:"วัดพระธรรมกายบาวาเรีย",             country:"เยอรมนี",         abbot:"", abbot_photo:"", logo:"", address:"", map_url:"", phone:"", monks:""},
  {id:"t5",  name:"วัดพระธรรมกายแมนเชสเตอร์",          country:"สหราชอาณาจักร",  abbot:"", abbot_photo:"", logo:"", address:"", map_url:"", phone:"", monks:""},
  {id:"t6",  name:"วัดพระธรรมกายบอร์คโด",              country:"ฝรั่งเศส",        abbot:"", abbot_photo:"", logo:"", address:"", map_url:"", phone:"", monks:""},
  {id:"t7",  name:"วัดพระธรรมกายปารีส",                country:"ฝรั่งเศส",        abbot:"", abbot_photo:"", logo:"", address:"", map_url:"", phone:"", monks:""},
  {id:"t8",  name:"วัดพระธรรมกายไรน์แลนด์",            country:"เยอรมนี",         abbot:"", abbot_photo:"", logo:"", address:"", map_url:"", phone:"", monks:""},
  {id:"t9",  name:"วัดพุทธไฮล์บรอนน์",                country:"เยอรมนี",         abbot:"", abbot_photo:"", logo:"", address:"", map_url:"", phone:"", monks:""},
  {id:"t10", name:"วัดพระธรรมกายเดนมาร์ก",             country:"เดนมาร์ก",        abbot:"", abbot_photo:"", logo:"", address:"", map_url:"", phone:"", monks:""},
  {id:"t11", name:"วัดพระธรรมกายบูโรส",                country:"สวีเดน",          abbot:"", abbot_photo:"", logo:"", address:"", map_url:"", phone:"", monks:""},
  {id:"t12", name:"วัดพระธรรมกายนอร์เวย์",             country:"นอร์เวย์",        abbot:"", abbot_photo:"", logo:"", address:"", map_url:"", phone:"", monks:""},
  {id:"t13", name:"วัดพระธรรมกายอิตาลี",               country:"อิตาลี",          abbot:"", abbot_photo:"", logo:"", address:"", map_url:"", phone:"", monks:""},
  {id:"t14", name:"วัดพระธรรมกายสวิตเซอร์แลนด์",       country:"สวิตเซอร์แลนด์", abbot:"", abbot_photo:"", logo:"", address:"", map_url:"", phone:"", monks:""},
  {id:"t15", name:"วัดพระธรรมกายเบอร์ลิน",             country:"เยอรมนี",         abbot:"", abbot_photo:"", logo:"", address:"", map_url:"", phone:"", monks:""},
  {id:"t16", name:"วัดพระธรรมกายนิวคาสเซิล",           country:"สหราชอาณาจักร",  abbot:"", abbot_photo:"", logo:"", address:"", map_url:"", phone:"", monks:""},
  {id:"t17", name:"วัดพระธรรมกายออสเตรีย",             country:"ออสเตรีย",        abbot:"", abbot_photo:"", logo:"", address:"", map_url:"", phone:"", monks:""},
  {id:"t18", name:"วัดพุทธนอร์ดไรน์ เวสท์ฟาเลน",      country:"เยอรมนี",         abbot:"", abbot_photo:"", logo:"", address:"", map_url:"", phone:"", monks:""},
  {id:"t19", name:"วัดพระธรรมกายฮัมบวร์ก",             country:"เยอรมนี",         abbot:"", abbot_photo:"", logo:"", address:"", map_url:"", phone:"", monks:""},
  {id:"t20", name:"วัดพระธรรมกายสตอกโฮล์ม",            country:"สวีเดน",          abbot:"", abbot_photo:"", logo:"", address:"", map_url:"", phone:"", monks:""},
  {id:"t21", name:"วัดพระธรรมกายคอร์ซัวร์ ลุสท์สโกว", country:"เดนมาร์ก",        abbot:"", abbot_photo:"", logo:"", address:"", map_url:"", phone:"", monks:""},
  {id:"t22", name:"วัดพุทธเวียนนา",                    country:"ออสเตรีย",        abbot:"", abbot_photo:"", logo:"", address:"", map_url:"", phone:"", monks:""},
  {id:"t23", name:"วัดพระธรรมกายสกอตแลนด์",            country:"สหราชอาณาจักร",  abbot:"", abbot_photo:"", logo:"", address:"", map_url:"", phone:"", monks:""},
  {id:"t24", name:"วัดพระธรรมกายเนเธอร์แลนด์",         country:"เนเธอร์แลนด์",   abbot:"", abbot_photo:"", logo:"", address:"", map_url:"", phone:"", monks:""},
  {id:"t25", name:"วัดพระธรรมกายนอร์ธสวีเดน",          country:"สวีเดน",          abbot:"", abbot_photo:"", logo:"", address:"", map_url:"", phone:"", monks:""},
  {id:"t26", name:"วัดพระธรรมกายเอกเกอร์ซุนด์",        country:"นอร์เวย์",        abbot:"", abbot_photo:"", logo:"", address:"", map_url:"", phone:"", monks:""},
  {id:"t27", name:"วัดพระธรรมกายไอซ์แลนด์",            country:"ไอซ์แลนด์",      abbot:"", abbot_photo:"", logo:"", address:"", map_url:"", phone:"", monks:""},
  {id:"t28", name:"วัดพุทธเวนิส",                      country:"อิตาลี",          abbot:"", abbot_photo:"", logo:"", address:"", map_url:"", phone:"", monks:""},
  {id:"t29", name:"วัดพุทธมอลต้า",                     country:"มอลต้า",          abbot:"", abbot_photo:"", logo:"", address:"", map_url:"", phone:"", monks:""},
  {id:"t30", name:"วัดพุทธบูเรียตเทีย",                country:"รัสเซีย",         abbot:"", abbot_photo:"", logo:"", address:"", map_url:"", phone:"", monks:""},
];

/* งานบุญ — เพิ่ม/แก้ไขได้เลย
   temple_id ต้องตรงกับ id ของวัดด้านบน */
const DATA_EVENTS = [
  // ตัวอย่าง:
  // {id:"e1", temple_id:"t1", date:"15 พ.ค. 2569", title:"งานบุญวันวิสาขบูชา", description:"พิธีเวียนเทียนและปฏิบัติธรรม"},
];
