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

app.post("/api/register", async (req,res)=>{
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) return bad(res, 400, "MISSING_FIELDS");
  try{
    const q = `
      INSERT INTO users (name, email, password, role)
      VALUES ($1,$2,$3,'USER')
      RETURNING id, name, email, role
    `;
    const r = await pool.query(q, [name, email.toLowerCase(), password]);
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
  const { user_id, insurance_id, full_name, phone, car_model, car_year, notes } = req.body || {};
  if (!user_id || !full_name || !phone || !car_model || !car_year) return bad(res, 400, "MISSING_FIELDS");
  const q = `
    INSERT INTO requests (user_id, insurance_id, full_name, phone, car_model, car_year, notes)
    VALUES ($1,$2,$3,$4,$5,$6,$7)
    RETURNING *
  `;
  const r = await pool.query(q, [
    Number(user_id),
    insurance_id ? Number(insurance_id) : null,
    full_name,
    phone,
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
  const { status } = req.body || {};
  if (!status) return bad(res, 400, "MISSING_STATUS");
  const r = await pool.query("UPDATE requests SET status=$1 WHERE id=$2 RETURNING *", [status, id]);
  ok(res, r.rows[0]);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log(`API running on http://localhost:${PORT}`));
