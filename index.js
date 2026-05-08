const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
});

function ok(res, payload){ res.json(payload); }
function bad(res, code, error){ res.status(code).json({ error }); }

app.get("/api/health", (req,res)=> ok(res, { ok:true }));

function requireAdmin(req,res,next){
  const role = (req.headers["x-role"] || "").toString();
  if (role !== "ADMIN") return bad(res, 403, "ADMIN_ONLY");
  next();
}

function requireUser(req,res,next){
  const userId = Number(req.headers["x-user-id"] || 0);
  if (!userId) return bad(res, 401, "LOGIN_REQUIRED");
  req.userId = userId;
  next();
}

function isCoveraEmail(email = "") {
  return /^[a-zA-Z][a-zA-Z0-9]*@covera\.com$/.test(String(email).trim());
}

function isStrongPassword(password = "") {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(String(password));
}

function isValidLocalPhone(phone = "") {
  return /^(059|056)\d{7}$/.test(String(phone).trim());
}

function isValidCountryCode(code = "") {
  return ["00970", "00972"].includes(String(code).trim());
}

function normalizeRequestStatus(status = "") {
  const value = String(status).trim().toUpperCase();
  if (["PENDING", "APPROVED", "REJECTED"].includes(value)) return value;
  if (value === "SUBMITTED") return "PENDING";
  return "PENDING";
}

app.post("/api/register", async (req,res)=>{
  const { first_name, last_name, name, email, password } = req.body || {};
  const firstName = String(first_name || "").trim();
  const lastName = String(last_name || "").trim();
  const finalName = firstName && lastName ? `${firstName} ${lastName}` : String(name || "").trim();

  if (!firstName || !lastName || !email || !password) return bad(res, 400, "FIRST_LAST_EMAIL_PASSWORD_REQUIRED");
  if (!isCoveraEmail(email)) return bad(res, 400, "EMAIL_MUST_BE_COVERA_DOMAIN");
  if (!isStrongPassword(password)) return bad(res, 400, "WEAK_PASSWORD");

  try{
    const q = `
      INSERT INTO users (name, email, password, role)
      VALUES ($1,$2,$3,'USER')
      RETURNING id, name, email, role
    `;
    const r = await pool.query(q, [finalName, email.toLowerCase(), password]);
    ok(res, r.rows[0]);
  }catch(e){
    const msg = String(e).toLowerCase();
    if (msg.includes("unique")) return bad(res, 409, "EMAIL_EXISTS");
    return bad(res, 500, "SERVER_ERROR");
  }
});

app.post("/api/login", async (req,res)=>{
  const { email, password } = req.body || {};
  if (!email || !password) return bad(res, 400, "MISSING_FIELDS");
  try{
    const q = `SELECT id, name, email, role FROM users WHERE email=$1 AND password=$2`;
    const r = await pool.query(q, [email.toLowerCase(), password]);
    if (!r.rows.length) return bad(res, 401, "INVALID");
    ok(res, r.rows[0]);
  }catch(e){
    return bad(res, 500, "SERVER_ERROR");
  }
});

app.get("/api/insurance", async (req,res)=>{
  const r = await pool.query("SELECT * FROM insurance ORDER BY id DESC");
  ok(res, r.rows);
});
app.get("/api/laws", async (req,res)=>{
  const r = await pool.query("SELECT * FROM laws ORDER BY id DESC");
  ok(res, r.rows);
});
app.get("/api/faq", async (req,res)=>{
  const r = await pool.query("SELECT * FROM faq ORDER BY id DESC");
  ok(res, r.rows);
});

app.post("/api/requests", async (req,res)=>{
  const { user_id, insurance_id, full_name, phone, country_code, car_model, car_year, notes } = req.body || {};
  const localPhone = String(phone || "").trim();
  const countryCode = String(country_code || "").trim();

  if (!user_id || !full_name || !localPhone || !countryCode || !car_model || !car_year) return bad(res, 400, "MISSING_FIELDS");
  if (!isValidCountryCode(countryCode)) return bad(res, 400, "INVALID_COUNTRY_CODE");
  if (!isValidLocalPhone(localPhone)) return bad(res, 400, "INVALID_PHONE_NUMBER");

  const q = `
    INSERT INTO requests (user_id, insurance_id, full_name, phone, country_code, car_model, car_year, notes, status)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'PENDING')
    RETURNING *
  `;
  const r = await pool.query(q, [
    Number(user_id),
    insurance_id ? Number(insurance_id) : null,
    full_name,
    localPhone,
    countryCode,
    car_model,
    Number(car_year),
    notes || null
  ]);
  ok(res, r.rows[0]);
});

app.get("/api/requests/my/:userId", async (req,res)=>{
  const userId = Number(req.params.userId);
  const q = `
    SELECT r.*, i.title_en, i.title_ar
    FROM requests r
    LEFT JOIN insurance i ON i.id = r.insurance_id
    WHERE r.user_id=$1
    ORDER BY r.id DESC
  `;
  const r = await pool.query(q, [userId]);
  ok(res, r.rows);
});

app.post("/api/admin/insurance", requireAdmin, async (req,res)=>{
  const { title_ar, title_en, category_ar, category_en, price_from, description_ar, description_en } = req.body || {};
  if (price_from === undefined || price_from === null) return bad(res, 400, "MISSING_FIELDS");
  const q = `
    INSERT INTO insurance (title_ar,title_en,category_ar,category_en,price_from,description_ar,description_en)
    VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *
  `;
  const r = await pool.query(q, [title_ar||null, title_en||null, category_ar||null, category_en||null, Number(price_from), description_ar||null, description_en||null]);
  ok(res, r.rows[0]);
});

app.post("/api/admin/laws", requireAdmin, async (req,res)=>{
  const { title_ar, title_en, description_ar, description_en } = req.body || {};
  const q = `
    INSERT INTO laws (title_ar,title_en,description_ar,description_en)
    VALUES ($1,$2,$3,$4) RETURNING *
  `;
  const r = await pool.query(q, [title_ar||null, title_en||null, description_ar||null, description_en||null]);
  ok(res, r.rows[0]);
});

app.post("/api/admin/faq", requireAdmin, async (req,res)=>{
  const { question_ar, question_en, answer_ar, answer_en } = req.body || {};
  const q = `
    INSERT INTO faq (question_ar,question_en,answer_ar,answer_en)
    VALUES ($1,$2,$3,$4) RETURNING *
  `;
  const r = await pool.query(q, [question_ar||null, question_en||null, answer_ar||null, answer_en||null]);
  ok(res, r.rows[0]);
});

app.get("/api/admin/users", requireAdmin, async (req,res)=>{
  const r = await pool.query("SELECT id,name,email,role FROM users ORDER BY id DESC");
  ok(res, r.rows);
});

app.patch("/api/admin/users/:id/role", requireAdmin, async (req,res)=>{
  const id = Number(req.params.id);
  const { role } = req.body || {};
  if (!role || !["ADMIN","USER"].includes(role)) return bad(res, 400, "BAD_ROLE");
  const r = await pool.query("UPDATE users SET role=$1 WHERE id=$2 RETURNING id,name,email,role", [role, id]);
  ok(res, r.rows[0]);
});

app.get("/api/admin/requests", requireAdmin, async (req,res)=>{
  const q = `
    SELECT r.*,
           u.name as user_name, u.email as user_email,
           i.title_en as ins_title_en, i.title_ar as ins_title_ar
    FROM requests r
    JOIN users u ON u.id = r.user_id
    LEFT JOIN insurance i ON i.id = r.insurance_id
    ORDER BY r.id DESC
  `;
  const r = await pool.query(q);
  ok(res, r.rows);
});

app.patch("/api/admin/requests/:id/status", requireAdmin, async (req,res)=>{
  const id = Number(req.params.id);
  const { status, rejection_reason } = req.body || {};
  if (!status) return bad(res, 400, "MISSING_STATUS");

  const nextStatus = normalizeRequestStatus(status);
  const reason = String(rejection_reason || "").trim();
  if (nextStatus === "REJECTED" && !reason) return bad(res, 400, "REJECTION_REASON_REQUIRED");

  const q = `
    UPDATE requests
    SET status=$1,
        rejection_reason=$2,
        updated_at=NOW()
    WHERE id=$3
    RETURNING *
  `;
  const r = await pool.query(q, [nextStatus, nextStatus === "REJECTED" ? reason : null, id]);
  ok(res, r.rows[0]);
});


// ===== AI Risk Analyzer API =====
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function vehicleLabel(type) {
  const labels = {
    sedan: "تأمين مركبة خاصة",
    truck: "تأمين شاحنات ومركبات تجارية",
    motorcycle: "تأمين دراجات نارية",
    electric: "تأمين مركبة كهربائية",
    luxury: "تأمين مركبة فاخرة"
  };
  return labels[type] || "تأمين مركبات";
}

function calculateRiskAnalysis(input) {
  const currentYear = new Date().getFullYear();
  const driverAge = Number(input.driver_age);
  const drivingYears = Number(input.driving_years);
  const accidents = Number(input.accidents_count || 0);
  const violations = Number(input.traffic_violations || 0);
  const carYear = Number(input.car_year);
  const vehicleValue = Number(input.vehicle_value || 0);
  const annualKm = Number(input.annual_km || 0);
  const vehicleType = String(input.vehicle_type || "sedan");
  const usageType = String(input.usage_type || "personal");
  const cityLevel = String(input.city_level || "medium");
  const parkingType = String(input.parking_type || "street");
  const carAge = Math.max(0, currentYear - carYear);

  let score = 18;
  const factors = [];
  const advice = [];

  if (driverAge < 23) { score += 18; factors.push("عمر السائق صغير نسبياً، وهذا يرفع مستوى المخاطر."); }
  else if (driverAge < 30) { score += 8; factors.push("السائق ضمن فئة عمرية تحتاج متابعة أعلى نسبياً."); }
  else if (driverAge > 65) { score += 10; factors.push("العمر المتقدم قد يحتاج احتياطات قيادة إضافية."); }

  if (drivingYears < 2) { score += 18; factors.push("خبرة القيادة قليلة."); }
  else if (drivingYears < 5) { score += 8; factors.push("خبرة القيادة متوسطة وليست طويلة."); }

  if (accidents > 0) { score += accidents * 14; factors.push(`وجود ${accidents} حادث/حوادث سابقة يرفع درجة الخطورة.`); }
  if (violations > 0) { score += violations * 5; factors.push(`وجود ${violations} مخالفة/مخالفات مرورية يؤثر على التقييم.`); }

  if (carAge > 12) { score += 14; factors.push("المركبة قديمة نسبياً وقد تحتاج صيانة أكثر."); }
  else if (carAge > 7) { score += 7; factors.push("عمر المركبة متوسط وقد يؤثر على تكلفة الصيانة."); }

  if (["truck", "motorcycle"].includes(vehicleType)) { score += 12; factors.push("نوع المركبة يحمل مستوى خطورة أعلى من السيارة الخاصة."); }
  if (vehicleType === "luxury") { score += 10; factors.push("قيمة المركبة الفاخرة ترفع تكلفة الإصلاح والتغطية."); }
  if (vehicleType === "electric") { score += 5; factors.push("المركبات الكهربائية قد تحتاج صيانة وقطعاً متخصصة."); }

  if (["commercial", "delivery"].includes(usageType)) { score += 15; factors.push("الاستخدام التجاري أو التوصيل يزيد ساعات القيادة والتعرض للمخاطر."); }
  if (cityLevel === "high") { score += 10; factors.push("القيادة في منطقة مزدحمة ترفع احتمال الحوادث البسيطة."); }
  else if (cityLevel === "medium") { score += 5; }
  if (["street", "open"].includes(parkingType)) { score += 7; factors.push("الاصطفاف خارج كراج خاص قد يزيد احتمالية الضرر أو السرقة."); }
  if (annualKm > 25000) { score += 10; factors.push("المسافة السنوية العالية تعني تعرضاً أكبر للطريق."); }
  else if (annualKm > 15000) { score += 5; }

  score = clamp(Math.round(score), 5, 100);

  let riskLevel = "LOW";
  if (score >= 70) riskLevel = "HIGH";
  else if (score >= 40) riskLevel = "MEDIUM";

  let recommendedInsurance = "تأمين ضد الغير + مساعدة على الطريق";
  if (riskLevel === "HIGH" || vehicleValue >= 70000 || ["luxury", "electric"].includes(vehicleType)) {
    recommendedInsurance = "تأمين شامل";
  } else if (riskLevel === "MEDIUM") {
    recommendedInsurance = "تأمين ضد الغير مع توسعة تغطية اختيارية";
  }

  const baseRate = riskLevel === "HIGH" ? 0.045 : riskLevel === "MEDIUM" ? 0.032 : 0.022;
  const estimatedPrice = Math.max(180, Math.round(vehicleValue * baseRate + score * 3));

  if (accidents > 0 || violations > 0) advice.push("حاول تحسين سجل القيادة وتقليل المخالفات لخفض درجة المخاطر مستقبلاً.");
  if (["street", "open"].includes(parkingType)) advice.push("استخدم كراجاً أو موقفاً آمناً عندما يكون ذلك ممكناً.");
  if (annualKm > 15000) advice.push("قلل الرحلات غير الضرورية أو خطط لمسارات أقل ازدحاماً.");
  if (carAge > 7) advice.push("التزم بالصيانة الدورية وفحص المكابح والإطارات بانتظام.");
  if (!advice.length) advice.push("حافظ على سجل قيادة نظيف واستمر بالصيانة الدورية للمركبة.");
  advice.push("احتفظ بصور ووثائق المركبة لتسريع إجراءات الطلب عند الحاجة.");

  const summary = `تم تصنيف ${vehicleLabel(vehicleType)} بدرجة خطورة ${score}/100 بناءً على بيانات السائق، سجل الحوادث، عمر المركبة، طبيعة الاستخدام، ومكان الاصطفاف.`;

  return { score, riskLevel, recommendedInsurance, estimatedPrice, factors, advice, summary };
}

app.post("/api/ai/risk-analysis", async (req, res) => {
  const body = req.body || {};
  const required = ["user_id", "driver_age", "driving_years", "vehicle_type", "car_year", "vehicle_value"];
  if (required.some((key) => body[key] === undefined || body[key] === null || body[key] === "")) {
    return bad(res, 400, "MISSING_RISK_FIELDS");
  }

  try {
    const result = calculateRiskAnalysis(body);
    const q = `
      INSERT INTO ai_risk_analyses (
        user_id, driver_age, driving_years, accidents_count, traffic_violations,
        vehicle_type, car_year, vehicle_value, usage_type, city_level, parking_type,
        annual_km, notes, risk_score, risk_level, recommended_insurance,
        estimated_price, factors, advice, summary
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18::jsonb,$19::jsonb,$20)
      RETURNING *
    `;
    const values = [
      Number(body.user_id), Number(body.driver_age), Number(body.driving_years), Number(body.accidents_count || 0),
      Number(body.traffic_violations || 0), String(body.vehicle_type), Number(body.car_year), Number(body.vehicle_value),
      String(body.usage_type || "personal"), String(body.city_level || "medium"), String(body.parking_type || "street"),
      Number(body.annual_km || 0), body.notes || null, result.score, result.riskLevel, result.recommendedInsurance,
      result.estimatedPrice, JSON.stringify(result.factors), JSON.stringify(result.advice), result.summary
    ];
    const r = await pool.query(q, values);
    ok(res, r.rows[0]);
  } catch (e) {
    console.error("AI_RISK_ERROR:", e);
    return bad(res, 500, "AI_RISK_ERROR");
  }
});

app.get("/api/ai/risk-analysis/my/:userId", async (req, res) => {
  const userId = Number(req.params.userId);
  if (!userId) return bad(res, 400, "BAD_USER_ID");
  try {
    const r = await pool.query("SELECT * FROM ai_risk_analyses WHERE user_id=$1 ORDER BY created_at DESC LIMIT 10", [userId]);
    ok(res, r.rows);
  } catch (e) {
    console.error("AI_RISK_MY_ERROR:", e);
    return bad(res, 500, "AI_RISK_MY_ERROR");
  }
});

app.get("/api/admin/ai/risk-analyses", requireAdmin, async (req, res) => {
  try {
    const q = `
      SELECT a.*, u.name AS user_name, u.email AS user_email
      FROM ai_risk_analyses a
      JOIN users u ON u.id = a.user_id
      ORDER BY a.created_at DESC
      LIMIT 100
    `;
    const r = await pool.query(q);
    ok(res, r.rows);
  } catch (e) {
    console.error("ADMIN_AI_RISK_ERROR:", e);
    return bad(res, 500, "ADMIN_AI_RISK_ERROR");
  }
});


// ===== License Reminder API =====
app.post("/api/license", async (req, res) => {
  const { user_id, blood_type, license_degree, expiry_date } = req.body || {};

  if (!user_id || !blood_type || !license_degree || !expiry_date) {
    return bad(res, 400, "MISSING_LICENSE_FIELDS");
  }

  try {
    const q = `
      INSERT INTO license_info (user_id, blood_type, license_degree, expiry_date, updated_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET
        blood_type = EXCLUDED.blood_type,
        license_degree = EXCLUDED.license_degree,
        expiry_date = EXCLUDED.expiry_date,
        updated_at = NOW()
      RETURNING *, (expiry_date - CURRENT_DATE) AS days_left
    `;
    const r = await pool.query(q, [Number(user_id), blood_type, license_degree, expiry_date]);
    ok(res, r.rows[0]);
  } catch (e) {
    console.error("LICENSE_SAVE_ERROR:", e);
    return bad(res, 500, "LICENSE_SAVE_ERROR");
  }
});

app.get("/api/license/:userId", async (req, res) => {
  const userId = Number(req.params.userId);
  if (!userId) return bad(res, 400, "BAD_USER_ID");

  try {
    const q = `
      SELECT li.*, u.name AS user_name, u.email AS user_email,
             (li.expiry_date - CURRENT_DATE) AS days_left
      FROM license_info li
      JOIN users u ON u.id = li.user_id
      WHERE li.user_id = $1
      LIMIT 1
    `;
    const r = await pool.query(q, [userId]);
    ok(res, r.rows[0] || null);
  } catch (e) {
    console.error("LICENSE_LOAD_ERROR:", e);
    return bad(res, 500, "LICENSE_LOAD_ERROR");
  }
});

app.delete("/api/license/:userId", async (req, res) => {
  const userId = Number(req.params.userId);
  const headerUserId = Number(req.headers["x-user-id"] || 0);
  const role = String(req.headers["x-role"] || "");

  if (!userId) return bad(res, 400, "BAD_USER_ID");
  if (role !== "ADMIN" && headerUserId !== userId) return bad(res, 403, "FORBIDDEN");

  try {
    const r = await pool.query("DELETE FROM license_info WHERE user_id=$1 RETURNING *", [userId]);
    ok(res, { deleted: r.rowCount > 0 });
  } catch (e) {
    console.error("LICENSE_DELETE_ERROR:", e);
    return bad(res, 500, "LICENSE_DELETE_ERROR");
  }
});

app.get("/api/admin/licenses", requireAdmin, async (req, res) => {
  try {
    const q = `
      SELECT li.*, u.name AS user_name, u.email AS user_email,
             (li.expiry_date - CURRENT_DATE) AS days_left
      FROM license_info li
      JOIN users u ON u.id = li.user_id
      ORDER BY li.expiry_date ASC
    `;
    const r = await pool.query(q);
    ok(res, r.rows);
  } catch (e) {
    console.error("ADMIN_LICENSES_ERROR:", e);
    return bad(res, 500, "ADMIN_LICENSES_ERROR");
  }
});


// ===== Contact Messages API =====
app.post("/api/contact", requireUser, async (req, res) => {
  const { name, phone, country_code, email, subject, message, user_id } = req.body || {};
  const localPhone = String(phone || "").trim();
  const countryCode = String(country_code || "").trim();
  const bodyUserId = Number(user_id || req.userId);

  if (!bodyUserId || bodyUserId !== req.userId) return bad(res, 403, "FORBIDDEN_USER");
  if (!name || !localPhone || !countryCode || !email || !subject || !message) {
    return bad(res, 400, "MISSING_CONTACT_FIELDS");
  }
  if (!isValidCountryCode(countryCode)) return bad(res, 400, "INVALID_COUNTRY_CODE");
  if (!isValidLocalPhone(localPhone)) return bad(res, 400, "INVALID_PHONE_NUMBER");

  try {
    const q = `
      INSERT INTO contact_messages (user_id, name, phone, email, subject, message)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const r = await pool.query(q, [bodyUserId, name, `${countryCode} ${localPhone}`, email, subject, message]);
    ok(res, r.rows[0]);
  } catch (e) {
    console.error("CONTACT_SAVE_ERROR:", e);
    return bad(res, 500, "CONTACT_SAVE_ERROR");
  }
});

app.get("/api/admin/contact", requireAdmin, async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT *
      FROM contact_messages
      ORDER BY created_at DESC
    `);
    ok(res, r.rows);
  } catch (e) {
    console.error("CONTACT_LOAD_ERROR:", e);
    return bad(res, 500, "CONTACT_LOAD_ERROR");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log(`API running on http://localhost:${PORT}`));
