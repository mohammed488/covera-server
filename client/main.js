const API_BASE = "https://covera-server.onrender.com/api";

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getSession() {
  try {
    return JSON.parse(localStorage.getItem("covera_session") || "null");
  } catch {
    return null;
  }
}

function setSession(user) {
  localStorage.setItem("covera_session", JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem("covera_session");
}

function normalizeRole(role = "") {
  return String(role || "").trim().toLowerCase();
}

function isAdmin(user = getSession()) {
  return normalizeRole(user?.role) === "admin";
}

const AUTH_REQUIRED_PAGES = new Set(["request", "ai-risk", "license", "contact"]);

function isAuthRequiredPage(page = "") {
  return AUTH_REQUIRED_PAGES.has(String(page || "").trim());
}

function shouldHideForGuest(page = "") {
  return isAuthRequiredPage(page);
}

async function apiFetch(path, options = {}) {
  const session = getSession();
  const config = {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    ...options,
  };

  if (session?.role) config.headers["x-role"] = session.role;
  if (session?.id) config.headers["x-user-id"] = String(session.id);

  if (config.body && typeof config.body !== "string") {
    config.body = JSON.stringify(config.body);
  }

  const res = await fetch(`${API_BASE}${path}`, config);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "تعذر تنفيذ الطلب");
  return data;
}

function showToast(title, message = "", type = "success") {
  const toast = $("#toast");
  if (!toast) return;
  toast.className = `toast show ${type}`;
  toast.innerHTML = `
    <div class="toast-title">${escapeHtml(title)}</div>
    <div>${escapeHtml(message)}</div>
  `;
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => toast.classList.remove("show"), 2800);
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

function requestStatusArabic(status = "") {
  const value = String(status || "PENDING").toUpperCase();
  if (value === "APPROVED") return "تم التعامل معه ✔";
  if (value === "REJECTED") return "مرفوض";
  return "قيد المراجعة";
}

function requestStatusClass(status = "") {
  const value = String(status || "PENDING").toUpperCase();
  if (value === "APPROVED") return "approved";
  if (value === "REJECTED") return "rejected";
  return "pending";
}

function buildHeader(activePage = "") {
  return `
  <header class="site-header">
    <div class="container navbar">
      <a class="logo" href="index.html">
        <img src="assets/covera-logo.png" alt="Covera" class="logo-img" />
        <span>Covera</span>
      </a>

      <button class="menu-toggle" id="menuToggle" aria-label="فتح القائمة">☰</button>

      <ul class="nav-links" id="navLinks">
        <li><a href="index.html" class="${activePage === "home" ? "active" : ""}">الرئيسية</a></li>
        <li><a href="services.html" class="${activePage === "services" ? "active" : ""}">أنواع التأمين</a></li>
        <li class="auth-required"><a href="Request.html" class="${activePage === "request" ? "active" : ""}">طلب عرض سعر</a></li>
        <li class="auth-required"><a href="ai-risk.html" class="${activePage === "ai-risk" ? "active" : ""}">تحليل AI</a></li>
        <li><a href="about.html" class="${activePage === "about" ? "active" : ""}">من نحن</a></li>
        <li class="auth-required"><a href="license.html" class="${activePage === "license" ? "active" : ""}">مذكر انتهاء رخصة </a></li>
        <li class="auth-required"><a href="contact.html" class="${activePage === "contact" ? "active" : ""}">اتصل بنا</a></li>
        <li class="admin-only hidden"><a href="admin.html" class="${activePage === "admin" ? "active" : ""}">لوحة الأدمن</a></li>
        <li><a href="login.html" class="${activePage === "login" ? "active" : ""}" id="loginLink">تسجيل دخول</a></li>
        <li class="nav-user">
          <div class="user-chip" id="userChip">
            <span class="user-avatar" id="userAvatar">U</span>
            <span id="userNameChip">المستخدم</span>
          </div>
          <button id="logoutBtn" class="hidden">تسجيل خروج</button>
        </li>
      </ul>
    </div>
  </header>`;
}

function buildFooter() {
  return `
    <footer class="footer">
      <div class="container footer-inner">
        <div>جميع الحقوق محفوظة © <span id="yearNow">${new Date().getFullYear()}</span> Covera</div>
        <div class="footer-links">
          <a href="index.html">الرئيسية</a>
          <a href="services.html">الخدمات</a>
          <a class="auth-required" href="ai-risk.html">تحليل AI</a>
          <a class="auth-required" href="contact.html">اتصل بنا</a>
        </div>
      </div>
    </footer>
  `;
}

function initLayout(activePage) {
  const headerHost = $("#header-placeholder");
  const footerHost = $("#footer-placeholder");
  const toastHost = $("#toast");
  if (headerHost) headerHost.outerHTML = buildHeader(activePage);
  if (footerHost) footerHost.outerHTML = buildFooter();
  if (!toastHost) {
    const t = document.createElement("div");
    t.id = "toast";
    t.className = "toast";
    document.body.appendChild(t);
  }
  initNav();
  updateAuthUI();
}

function initNav() {
  const toggle = $("#menuToggle");
  const links = $("#navLinks");
  if (toggle && links) {
    toggle.addEventListener("click", () => links.classList.toggle("open"));
  }
}

function updateAuthUI() {
  const session = getSession();
  const chip = $("#userChip");
  const nameChip = $("#userNameChip");
  const avatar = $("#userAvatar");
  const loginLink = $("#loginLink");
  const logoutBtn = $("#logoutBtn");
  const adminOnly = $$(".admin-only");
  const authRequired = $$(".auth-required");

  if (session) {
    if (chip) chip.classList.add("show");
    if (nameChip) nameChip.textContent = session.name || session.email || "المستخدم";
    if (avatar) avatar.textContent = (session.name || session.email || "U").trim().charAt(0).toUpperCase();
    if (loginLink) loginLink.classList.add("hidden");
    if (logoutBtn) logoutBtn.classList.remove("hidden");
  } else {
    if (chip) chip.classList.remove("show");
    if (loginLink) loginLink.classList.remove("hidden");
    if (logoutBtn) logoutBtn.classList.add("hidden");
  }

  authRequired.forEach((el) => {
    if (session) el.classList.remove("hidden");
    else el.classList.add("hidden");
  });

  adminOnly.forEach((el) => {
    if (isAdmin(session)) el.classList.remove("hidden");
    else el.classList.add("hidden");
  });

  if (logoutBtn) {
    logoutBtn.onclick = () => {
      clearSession();
      showToast("تم تسجيل الخروج", "نراك قريباً");
      updateAuthUI();
      setTimeout(() => (window.location.href = "index.html"), 500);
    };
  }
}

function requireLogin(redirect = "login.html") {
  const session = getSession();
  if (!session) {
    showToast("يلزم تسجيل الدخول", "سوف يتم تحويلك إلى صفحة الدخول", "error");
    setTimeout(() => (window.location.href = redirect), 900);
    return null;
  }
  return session;
}

function enforceProtectedPage(page = "") {
  if (!shouldHideForGuest(page)) return true;
  if (getSession()) return true;

  const main = document.querySelector("main");
  if (main) {
    main.innerHTML = `
      <section class="section">
        <div class="empty-state auth-guard-box">
          يلزم تسجيل الدخول أو إنشاء حساب للوصول إلى هذه الصفحة.
          <br><br>
          <a class="btn btn-primary" href="login.html">تسجيل الدخول / إنشاء حساب</a>
        </div>
      </section>
    `;
  }

  setTimeout(() => (window.location.href = "login.html"), 900);
  return false;
}

function requireAdminPage() {
  const user = requireLogin();
  if (!user) return null;
  if (!isAdmin(user)) {
    showToast("غير مصرح", "هذه الصفحة مخصصة للأدمن فقط", "error");
    setTimeout(() => (window.location.href = "index.html"), 900);
    return null;
  }
  return user;
}

function goProtected(url) {
  if (!getSession()) {
    showToast("يلزم تسجيل الدخول", "سجل دخولك أولاً للوصول إلى هذه الصفحة", "error");
    setTimeout(() => (window.location.href = "login.html"), 700);
    return;
  }
  window.location.href = url;
}

function initHomePage() {
  const cta = $("#goServices");
  const quote = $("#goQuote");
  const contact = $("#goContactBtn");
  const quick = $("#goQuickRequestBtn");
  const coverage = $("#showCoverageBtn");
  const closeCoverage = $("#closeCoverageModal");
  const coverageModal = $("#coverageModal");

  if (cta) cta.addEventListener("click", () => (window.location.href = "services.html"));
  if (quote) quote.addEventListener("click", () => goProtected("Request.html"));
  const aiBtn = $("#goAiRisk");
  if (aiBtn) aiBtn.addEventListener("click", () => goProtected("ai-risk.html"));
  if (contact) contact.addEventListener("click", () => goProtected("contact.html"));
  if (quick) quick.addEventListener("click", () => goProtected("Request.html"));
  if (coverage) coverage.addEventListener("click", () => coverageModal?.classList.remove("hidden"));
  if (closeCoverage) closeCoverage.addEventListener("click", () => coverageModal?.classList.add("hidden"));
  if (coverageModal) {
    coverageModal.addEventListener("click", (e) => {
      if (e.target === coverageModal) coverageModal.classList.add("hidden");
    });
  }
}

function switchAuth(mode = "login") {
  const loginForm = $("#loginForm");
  const registerForm = $("#registerForm");
  const loginTab = $("#loginTab");
  const registerTab = $("#registerTab");

  if (mode === "register") {
    loginForm?.classList.add("hidden");
    registerForm?.classList.remove("hidden");
    loginTab?.classList.remove("active");
    registerTab?.classList.add("active");
  } else {
    registerForm?.classList.add("hidden");
    loginForm?.classList.remove("hidden");
    registerTab?.classList.remove("active");
    loginTab?.classList.add("active");
  }
}

function initLoginPage() {
  const session = getSession();
  const already = $("#alreadyLogged");
  if (session && already) {
    already.textContent = `أنت مسجل الدخول حالياً باسم ${session.name || session.email}. يمكنك تسجيل الخروج من الأعلى إن أردت.`;
    already.classList.remove("hidden");
  }

  $("#loginTab")?.addEventListener("click", () => switchAuth("login"));
  $("#registerTab")?.addEventListener("click", () => switchAuth("register"));
  $("#showRegister")?.addEventListener("click", () => switchAuth("register"));
  $("#showLogin")?.addEventListener("click", () => switchAuth("login"));

  $("#loginForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("#loginEmail").value.trim();
    const password = $("#loginPassword").value;
    const btn = $("#loginBtn");
    if (!email || !password) {
      showToast("بيانات ناقصة", "أدخل البريد الإلكتروني وكلمة المرور", "error");
      return;
    }
    btn.disabled = true;
    btn.textContent = "جاري الدخول...";
    try {
      const user = await apiFetch("/login", {
        method: "POST",
        body: { email, password },
      });
      setSession(user);
      updateAuthUI();
      showToast("تم تسجيل الدخول", `أهلاً ${user.name}`);
      setTimeout(() => (window.location.href = isAdmin(user) ? "admin.html" : "index.html"), 700);
    } catch (err) {
      showToast("فشل تسجيل الدخول", err.message, "error");
    } finally {
      btn.disabled = false;
      btn.textContent = "دخول";
    }
  });

  $("#registerForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const firstName = $("#registerFirstName").value.trim();
    const lastName = $("#registerLastName").value.trim();
    const email = $("#registerEmail").value.trim();
    const password = $("#registerPassword").value;
    const btn = $("#registerBtn");

    if (!firstName || !lastName || !email || !password) {
      showToast("بيانات ناقصة", "أدخل الاسم الأول والاسم الأخير والبريد وكلمة المرور", "error");
      return;
    }
    if (!isCoveraEmail(email)) {
      showToast("بريد غير صحيح", "البريد يجب أن يكون مثل name123@covera.com فقط", "error");
      return;
    }
    if (!isStrongPassword(password)) {
      showToast("كلمة مرور ضعيفة", "يجب أن تكون 8 خانات على الأقل وتحتوي حرف كبير وصغير ورقم ورمز", "error");
      return;
    }

    btn.disabled = true;
    btn.textContent = "جاري الإنشاء...";
    try {
      const user = await apiFetch("/register", {
        method: "POST",
        body: { first_name: firstName, last_name: lastName, email, password },
      });
      setSession(user);
      updateAuthUI();
      showToast("تم إنشاء الحساب", `أهلاً ${user.name}`);
      setTimeout(() => (window.location.href = "index.html"), 700);
    } catch (err) {
      showToast("تعذر إنشاء الحساب", err.message, "error");
    } finally {
      btn.disabled = false;
      btn.textContent = "إنشاء الحساب";
    }
  });
}

function serviceIcon(title = "") {
  if (title.includes("شامل")) return "🛡️";
  if (title.includes("طرف ثالث")) return "🤝";
  if (title.includes("الغير")) return "🚗";
  if (title.includes("طريق")) return "🆘";
  return "📋";
}

function renderServicesCards(items) {
  const wrap = $("#servicesGrid");
  if (!wrap) return;

  if (!items.length) {
    wrap.innerHTML = `<div class="empty-state">لا توجد بيانات حالياً.</div>`;
    return;
  }

  wrap.innerHTML = items.map(item => {
    const title = item.title_ar || item.title_en || "تأمين";
    const cat = item.category_ar || item.category_en || "خدمة";
    const desc = item.description_ar || item.description_en || "";
    return `
      <article class="service-card">
        <div class="service-icon">${serviceIcon(title)}</div>
        <h3>${escapeHtml(title)}</h3>
        <p class="muted">${escapeHtml(cat)}</p>
        <p class="muted">${escapeHtml(desc)}</p>
        <div class="service-bottom">
          <div class="price">${escapeHtml(item.price_from ?? 0)} <span>شيكل / ابتداءً من</span></div>
          <a class="btn btn-primary" href="Request.html">اطلب عرض سعر</a>
        </div>
      </article>
    `;
  }).join("");
}

function initServicesPage() {
  const fallback = [
    {
      title_ar: "تأمين شامل",
      category_ar: "اختياري",
      price_from: 240,
      description_ar: "يغطي السرقة والحريق وبعض أضرار الحوادث حسب الوثيقة."
    },
    {
      title_ar: "تأمين ضد الغير",
      category_ar: "إلزامي",
      price_from: 120,
      description_ar: "يغطي الأضرار التي تسببها للغير في المركبات أو الممتلكات."
    },
    {
      title_ar: "تأمين طرف ثالث",
      category_ar: "إلزامي",
      price_from: 150,
      description_ar: "يغطي مسؤولية الطرف الثالث عند وقوع ضرر للطرف الآخر حسب شروط الوثيقة."
    },
    {
      title_ar: "مساعدة على الطريق",
      category_ar: "إضافة",
      price_from: 30,
      description_ar: "سحب المركبة، بطارية، تبديل إطار، ومساعدة طارئة."
    }
  ];

  apiFetch("/insurance")
    .then((items) => renderServicesCards(Array.isArray(items) ? items : fallback))
    .catch(() => renderServicesCards(fallback));
}

function setRequestFormLocked(isLocked) {
  const form = $("#quoteForm");
  const loginNotice = $("#requestLoginNotice");
  const requestBtn = $("#requestBtn");
  if (!form || !requestBtn) return;

  const fields = $$("input, textarea, select", form).filter((el) => el.id !== "name" && el.id !== "email");

  if (isLocked) {
    loginNotice?.classList.remove("hidden");
    requestBtn.textContent = "سجل الدخول أولاً";
    requestBtn.dataset.locked = "true";
    fields.forEach((field) => field.setAttribute("disabled", "disabled"));
  } else {
    loginNotice?.classList.add("hidden");
    requestBtn.textContent = "إرسال الطلب";
    requestBtn.dataset.locked = "false";
    fields.forEach((field) => field.removeAttribute("disabled"));
  }
}

function parseRequestNotes(notes = "") {
  const data = {};
  String(notes || "")
    .split(" | ")
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((part) => {
      const index = part.indexOf(":");
      if (index === -1) return;
      const key = part.slice(0, index).trim();
      const value = part.slice(index + 1).trim();
      data[key] = value || "-";
    });
  return data;
}

function renderMyRequests(items) {
  const wrap = $("#myRequestsWrap");
  if (!wrap) return;
  if (!items || !items.length) {
    wrap.innerHTML = '<div class="empty-state">لا توجد طلبات مرسلة حتى الآن.</div>';
    return;
  }

  wrap.innerHTML = items.map((item) => {
    const status = String(item.status || "PENDING").toUpperCase();
    const phoneText = `${item.country_code || ""} ${item.phone || "-"}`.trim();
    const notesData = parseRequestNotes(item.notes);
    const insuranceType = notesData["نوع التأمين المطلوب"] || item.title_ar || item.title_en || "-";
    const emailText = notesData["البريد الإلكتروني"] || "-";
    const countryCodeText = notesData["مقدمة الدولة"] || item.country_code || "-";
    const vehicleValue = notesData["قيمة المركبة"] || "-";
    const userNotes = notesData["ملاحظات"] || "-";
    const createdAt = item.created_at ? new Date(item.created_at).toLocaleDateString("ar") : "-";

    return `
      <article class="admin-request-card user-request-card">
        <div class="admin-request-head">
          <h3>${escapeHtml(insuranceType)}</h3>
          <span class="request-status ${requestStatusClass(status)}">${requestStatusArabic(status)}</span>
        </div>
        <div class="request-details-grid">
          <p><strong>الاسم:</strong> ${escapeHtml(item.full_name || "-")}</p>
          <p><strong>البريد الإلكتروني:</strong> ${escapeHtml(emailText)}</p>
          <p><strong>مقدمة الدولة:</strong> ${escapeHtml(countryCodeText)}</p>
          <p><strong>رقم الجوال:</strong> ${escapeHtml(phoneText)}</p>
          <p><strong>نوع التأمين:</strong> ${escapeHtml(insuranceType)}</p>
          <p><strong>المركبة:</strong> ${escapeHtml(item.car_model || "-")}</p>
          <p><strong>سنة الصنع:</strong> ${escapeHtml(item.car_year || "-")}</p>
          <p><strong>قيمة المركبة:</strong> ${escapeHtml(vehicleValue)}</p>
          <p><strong>تاريخ الإرسال:</strong> ${escapeHtml(createdAt)}</p>
          <p class="request-details-full"><strong>الملاحظات:</strong> ${escapeHtml(userNotes)}</p>
        </div>
        ${status === "REJECTED" ? `<p class="rejection-text"><strong>سبب الرفض:</strong> ${escapeHtml(item.rejection_reason || "لم يتم توضيح السبب")}</p>` : ""}
      </article>
    `;
  }).join("");
}

function loadMyRequests(userId) {
  if (!userId) return renderMyRequests([]);
  apiFetch(`/requests/my/${userId}`)
    .then((items) => renderMyRequests(Array.isArray(items) ? items : []))
    .catch(() => renderMyRequests([]));
}

function initRequestPage() {
  const session = getSession();
  const name = $("#name");
  const email = $("#email");
  const requestBtn = $("#requestBtn");
  const loginBtn = $("#requestLoginBtn");

  if (session) {
    if (name && !name.value) name.value = session.name || "";
    if (email && !email.value) email.value = session.email || "";
    if (name) name.setAttribute("readonly", "readonly");
    if (email) email.setAttribute("readonly", "readonly");
    setRequestFormLocked(false);
    loadMyRequests(session.id);
  } else {
    if (name) name.removeAttribute("readonly");
    if (email) email.removeAttribute("readonly");
    setRequestFormLocked(true);
    renderMyRequests([]);
  }

  loginBtn?.addEventListener("click", () => {
    window.location.href = "login.html";
  });

  requestBtn?.addEventListener("click", (e) => {
    if (requestBtn.dataset.locked === "true") {
      e.preventDefault();
      requireLogin();
    }
  });

  $("#quoteForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const user = requireLogin();
    if (!user) return;

    const submitBtn = $("#requestBtn");
    submitBtn.disabled = true;
    submitBtn.textContent = "جاري الإرسال...";

    const insuranceMap = {
      "شامل": 2,
      "ضد الغير": 1,
      "طرف ثالث": 4,
      "مساعدة على الطريق": 3
    };

    const countryCode = $("#countryCode").value;
    const phone = $("#phone").value.trim();
    const payload = {
      user_id: user.id,
      insurance_id: insuranceMap[$("#insuranceType").value] || null,
      full_name: $("#name").value.trim(),
      country_code: countryCode,
      phone,
      car_model: $("#carType").value,
      car_year: Number($("#year").value),
      notes: [
        `البريد الإلكتروني: ${$("#email").value.trim()}`,
        `مقدمة الدولة: ${countryCode}`,
        `قيمة المركبة: ${$("#price").value.trim()}`,
        `نوع التأمين المطلوب: ${$("#insuranceType").value.trim()}`,
        `ملاحظات: ${$("#notes").value.trim()}`
      ].join(" | ")
    };

    if (!payload.full_name || !payload.phone || !payload.country_code || !payload.car_model || !payload.car_year) {
      showToast("بيانات ناقصة", "يرجى تعبئة الحقول المطلوبة", "error");
      submitBtn.disabled = false;
      submitBtn.textContent = "إرسال الطلب";
      return;
    }
    if (!isValidCountryCode(payload.country_code) || !isValidLocalPhone(payload.phone)) {
      showToast("رقم غير صحيح", "اختر 00970 أو 00972، واكتب رقم يبدأ بـ 059 أو 056 ويتكون من 10 خانات", "error");
      submitBtn.disabled = false;
      submitBtn.textContent = "إرسال الطلب";
      return;
    }

    try {
      await apiFetch("/requests", { method: "POST", body: payload });
      showToast("تم إرسال الطلب", "سيتم التواصل معك قريباً");
      e.target.reset();
      $("#name").value = user.name || "";
      $("#email").value = user.email || "";
      loadMyRequests(user.id);
    } catch (err) {
      const message = err.message === "DUPLICATE_REQUEST_SAME_DATA"
        ? "لا يمكنك إرسال طلب آخر بنفس البيانات. غيّر بيانات الطلب أو انتظر متابعة الطلب الحالي."
        : err.message;
      showToast("فشل الإرسال", message, "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "إرسال الطلب";
    }
  });
}


function riskLevelClass(level = "") {
  const v = String(level).toLowerCase();
  if (v.includes("low")) return "low";
  if (v.includes("high")) return "high";
  return "medium";
}

function riskLevelArabic(level = "") {
  const v = String(level).toLowerCase();
  if (v.includes("low")) return "منخفض";
  if (v.includes("high")) return "مرتفع";
  return "متوسط";
}


function displayValue(map, value) {
  const key = String(value || "").trim().toLowerCase();
  return map[key] || value || "-";
}

const usageTypeMap = {
  personal: "استخدام شخصي",
  family: "استخدام عائلي",
  commercial: "استخدام تجاري",
  delivery: "توصيل وطلبات",
  "استخدام شخصي": "استخدام شخصي",
  "استخدام عائلي": "استخدام عائلي",
  "استخدام تجاري": "استخدام تجاري",
  "توصيل وطلبات": "توصيل وطلبات"
};

const vehicleTypeMap = {
  sedan: "سيارة سيدان",
  suv: "سيارة SUV",
  truck: "شاحنة",
  motorcycle: "دراجة نارية",
  electric: "مركبة كهربائية"
};

const cityLevelMap = {
  low: "منطقة قليلة الازدحام",
  medium: "منطقة متوسطة الازدحام",
  high: "منطقة عالية الازدحام"
};

const parkingTypeMap = {
  garage: "كراج خاص",
  private: "موقف خاص",
  street: "موقف شارع",
  open: "موقف مفتوح"
};

function renderRiskResult(result) {
  const box = $("#riskResult");
  if (!box || !result) return;
  const cls = riskLevelClass(result.risk_level);
  const advices = Array.isArray(result.advice) ? result.advice : [];
  const factors = Array.isArray(result.factors) ? result.factors : [];

  box.classList.remove("hidden");
  box.innerHTML = `
    <div class="risk-result-head">
      <div>
        <span class="risk-kicker">AI Result</span>
        <h2>نتيجة تحليل المخاطر</h2>
      </div>
      <span class="risk-badge ${cls}">${riskLevelArabic(result.risk_level)}</span>
    </div>

    <div class="risk-score-wrap">
      <div class="risk-score-circle ${cls}">
        <strong>${escapeHtml(result.risk_score)}</strong>
        <span>/100</span>
      </div>
      <div class="risk-summary">
        <h3>${escapeHtml(result.recommended_insurance || "تأمين مناسب")}</h3>
        <p>${escapeHtml(result.summary || "تم تحليل بيانات المركبة والسائق بنجاح.")}</p>
        <div class="estimated-price">السعر التقديري: <strong>${escapeHtml(result.estimated_price)} شيكل</strong></div>
        <div class="risk-meta-line">
          <span>المركبة: <strong>${escapeHtml(displayValue(vehicleTypeMap, result.vehicle_type))}</strong></span>
          <span>الاستخدام: <strong>${escapeHtml(displayValue(usageTypeMap, result.usage_type))}</strong></span>
        </div>
      </div>
    </div>

    <div class="grid grid-2 risk-details-grid">
      <div class="risk-mini-card">
        <h3>أسباب النتيجة</h3>
        <ul>${factors.map(x => `<li>${escapeHtml(x)}</li>`).join("") || "<li>لا توجد عوامل خطورة عالية.</li>"}</ul>
      </div>
      <div class="risk-mini-card">
        <h3>نصائح AI لتقليل المخاطر</h3>
        <ul>${advices.map(x => `<li>${escapeHtml(x)}</li>`).join("")}</ul>
      </div>
    </div>
  `;
  box.scrollIntoView({ behavior: "smooth", block: "start" });
}

function setRiskFormLocked(isLocked) {
  const form = $("#riskForm");
  const notice = $("#riskLoginNotice");
  const btn = $("#riskAnalyzeBtn");
  if (!form || !btn) return;
  const fields = $$("input, textarea, select", form);
  if (isLocked) {
    notice?.classList.remove("hidden");
    btn.textContent = "سجل الدخول أولاً";
    btn.dataset.locked = "true";
    fields.forEach((field) => field.setAttribute("disabled", "disabled"));
  } else {
    notice?.classList.add("hidden");
    btn.textContent = "تحليل المخاطر بالذكاء الاصطناعي";
    btn.dataset.locked = "false";
    fields.forEach((field) => field.removeAttribute("disabled"));
  }
}

function fillRiskFromRequestForm() {
  const year = $("#year")?.value;
  const value = $("#price")?.value;
  const carType = $("#carType")?.value;
  const insurance = $("#insuranceType")?.value;
  const map = {
    "سيارة": "sedan",
    "شاحنة": "truck",
    "دراجة": "motorcycle",
    "مركبة كهربائية": "electric"
  };
  localStorage.setItem("covera_risk_prefill", JSON.stringify({ year, value, carType: map[carType] || "sedan", insurance }));
}

function initRiskPage() {
  const session = getSession();
  const form = $("#riskForm");
  const btn = $("#riskAnalyzeBtn");
  const loginBtn = $("#riskLoginBtn");

  loginBtn?.addEventListener("click", () => (window.location.href = "login.html"));

  if (!session?.id) {
    setRiskFormLocked(true);
    btn?.addEventListener("click", (e) => {
      if (btn.dataset.locked === "true") {
        e.preventDefault();
        requireLogin();
      }
    });
    return;
  }

  setRiskFormLocked(false);

  try {
    const prefill = JSON.parse(localStorage.getItem("covera_risk_prefill") || "null");
    if (prefill) {
      if (prefill.year) $("#riskCarYear").value = prefill.year;
      if (prefill.value) $("#riskVehicleValue").value = prefill.value;
      if (prefill.carType) $("#riskVehicleType").value = prefill.carType;
      localStorage.removeItem("covera_risk_prefill");
    }
  } catch {}

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const payload = {
      user_id: session.id,
      driver_age: Number($("#riskDriverAge").value),
      driving_years: Number($("#riskDrivingYears").value),
      accidents_count: Number($("#riskAccidents").value),
      traffic_violations: Number($("#riskViolations").value),
      vehicle_type: $("#riskVehicleType").value,
      car_year: Number($("#riskCarYear").value),
      vehicle_value: Number($("#riskVehicleValue").value),
      usage_type: $("#riskUsageType").value,
      city_level: $("#riskCityLevel").value,
      parking_type: $("#riskParkingType").value,
      annual_km: Number($("#riskAnnualKm").value),
      notes: $("#riskNotes").value.trim()
    };

    if (!payload.driver_age || !payload.driving_years && payload.driving_years !== 0 || !payload.car_year || !payload.vehicle_value || !payload.vehicle_type) {
      showToast("بيانات ناقصة", "يرجى تعبئة الحقول المطلوبة قبل التحليل", "error");
      return;
    }

    btn.disabled = true;
    btn.textContent = "جاري التحليل...";

    try {
      const result = await apiFetch("/ai/risk-analysis", {
        method: "POST",
        body: payload
      });
      showToast("تم التحليل", "تم إنشاء نتيجة المخاطر والتوصية المناسبة");
      renderRiskResult(result);
    } catch (err) {
      const message = err.message === "RISK_ANALYSIS_YEARLY_LIMIT_REACHED" || err.message === "RISK_ANALYSIS_LIMIT_REACHED"
        ? "مسموح لكل مستخدم إجراء تحليل المخاطر مرتين فقط خلال كل سنة."
        : err.message === "DUPLICATE_RISK_ANALYSIS"
          ? "لا يمكن إرسال نفس معلومات تحليل المخاطر أكثر من مرة."
          : (err.message || "تعذر تحليل البيانات");
      showToast("فشل التحليل", message, "error");
    } finally {
      btn.disabled = false;
      btn.textContent = "تحليل المخاطر بالذكاء الاصطناعي";
    }
  });

  apiFetch(`/ai/risk-analysis/my/${session.id}`)
    .then((items) => {
      if (Array.isArray(items) && items.length) renderRiskResult(items[0]);
    })
    .catch(() => {});
}

let adminRequestsCache = [];
let adminRiskAnalysesCache = [];

function normalizeSearchText(value) {
  return String(value || "").trim().toLowerCase();
}

function filterByNameOrEmail(items, query) {
  const q = normalizeSearchText(query);
  if (!q) return items;
  return items.filter((item) => {
    const name = normalizeSearchText(item.full_name || item.user_name || item.name);
    const email = normalizeSearchText(item.user_email || item.email);
    return name.includes(q) || email.includes(q);
  });
}

function applyAdminRequestSearch() {
  const input = $("#adminRequestSearch");
  renderAdminRequests(filterByNameOrEmail(adminRequestsCache, input?.value || ""));
}

function applyAdminRiskSearch() {
  const input = $("#adminRiskSearch");
  renderAdminRiskAnalyses(filterByNameOrEmail(adminRiskAnalysesCache, input?.value || ""));
}

function renderAdminRiskAnalyses(items) {
  const wrap = $("#adminRiskWrap");
  if (!wrap) return;
  if (!items.length) {
    wrap.innerHTML = '<div class="empty-state">لا توجد نتائج مطابقة.</div>';
    return;
  }
  wrap.innerHTML = items.map((item) => `
    <article class="admin-request-card risk-admin-card">
      <div class="admin-request-head">
        <h3>${escapeHtml(item.user_name || "مستخدم")}</h3>
        <span class="risk-badge ${riskLevelClass(item.risk_level)}">${riskLevelArabic(item.risk_level)} - ${escapeHtml(item.risk_score)}/100</span>
      </div>
      <p><strong>البريد:</strong> ${escapeHtml(item.user_email || "-")}</p>
      <p><strong>المركبة:</strong> ${escapeHtml(displayValue(vehicleTypeMap, item.vehicle_type))} / ${escapeHtml(item.car_year || "-")}</p>
      <p><strong>الاستخدام:</strong> ${escapeHtml(displayValue(usageTypeMap, item.usage_type))}</p>
      <p><strong>التأمين المقترح:</strong> ${escapeHtml(item.recommended_insurance || "-")}</p>
      <p><strong>السعر التقديري:</strong> ${escapeHtml(item.estimated_price || "-")} شيكل</p>
      <p><strong>الملخص:</strong> ${escapeHtml(item.summary || "-")}</p>
    </article>
  `).join("");
}

function initContactPage() {
  const session = requireLogin();
  if (!session) return;

  const nameField = $("#contactName");
  const emailField = $("#contactEmail");

  if (nameField) {
    nameField.value = session.name || "";
    nameField.setAttribute("readonly", "readonly");
    nameField.classList.add("readonly-field");
  }

  if (emailField) {
    emailField.value = session.email || "";
    emailField.setAttribute("readonly", "readonly");
    emailField.classList.add("readonly-field");
  }

  $("#contactForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const payload = {
      user_id: session.id,
      name: session.name || nameField?.value.trim() || "",
      country_code: $("#contactCountryCode").value,
      phone: $("#contactPhone").value.trim(),
      email: session.email || emailField?.value.trim() || "",
      subject: $("#contactSubject").value.trim(),
      message: $("#contactMessage").value.trim()
    };

    if (!payload.name || !payload.email || !payload.subject || !payload.message) {
      showToast("بيانات ناقصة", "يرجى تعبئة الموضوع والرسالة ورقم الجوال", "error");
      return;
    }

    if (!isValidCountryCode(payload.country_code) || !isValidLocalPhone(payload.phone)) {
      showToast("رقم غير صحيح", "اختر 00970 أو 00972، واكتب رقم يبدأ بـ 059 أو 056 ويتكون من 10 خانات", "error");
      return;
    }

    try {
      await apiFetch("/contact", {
        method: "POST",
        body: payload
      });

      showToast("تم الإرسال", "تم حفظ رسالتك في قاعدة البيانات");
      $("#contactSubject").value = "";
      $("#contactMessage").value = "";
      $("#contactPhone").value = "";
      $("#contactCountryCode").value = "00970";
      if (nameField) nameField.value = session.name || "";
      if (emailField) emailField.value = session.email || "";
    } catch (err) {
      showToast("فشل الإرسال", err.message, "error");
    }
  });
}

function renderAdminRequests(items) {
  const wrap = $("#adminRequestsWrap");
  if (!wrap) return;
  if (!items.length) {
    wrap.innerHTML = '<div class="empty-state">لا توجد طلبات مطابقة.</div>';
    return;
  }

  wrap.innerHTML = items.map((item) => {
    const status = String(item.status || "PENDING").toUpperCase();
    const phoneText = `${item.country_code || ""} ${item.phone || "-"}`.trim();
    return `
      <article class="admin-request-card" data-request-id="${escapeHtml(item.id)}">
        <div class="admin-request-head">
          <h3>${escapeHtml(item.full_name || item.user_name || 'طلب جديد')}</h3>
          <span class="request-status ${requestStatusClass(status)}">${requestStatusArabic(status)}</span>
        </div>
        <p><strong>البريد:</strong> ${escapeHtml(item.user_email || '-')}</p>
        <p><strong>الجوال:</strong> ${escapeHtml(phoneText)}</p>
        <p><strong>المركبة:</strong> ${escapeHtml(item.car_model || '-')}</p>
        <p><strong>سنة الصنع:</strong> ${escapeHtml(item.car_year || '-')}</p>
        <p><strong>نوع التأمين:</strong> ${escapeHtml(item.ins_title_ar || item.ins_title_en || '-')}</p>
        <p><strong>الملاحظات:</strong> ${escapeHtml(item.notes || '-')}</p>
        ${status === "REJECTED" ? `<p class="rejection-text"><strong>سبب الرفض:</strong> ${escapeHtml(item.rejection_reason || '-')}</p>` : ''}
        <div class="admin-actions">
          <button class="btn btn-success approve-request-btn" type="button" data-id="${escapeHtml(item.id)}">✔ تم التعامل معه</button>
          <button class="btn btn-danger reject-request-btn" type="button" data-id="${escapeHtml(item.id)}">رفض الطلب</button>
          <button class="btn btn-outline delete-request-btn" type="button" data-id="${escapeHtml(item.id)}">حذف الطلب</button>
        </div>
      </article>
    `;
  }).join('');
}

async function updateRequestStatus(id, status, rejectionReason = "") {
  const body = { status };
  if (status === "REJECTED") body.rejection_reason = rejectionReason;
  return apiFetch(`/admin/requests/${id}/status`, { method: "PATCH", body });
}

async function deleteAdminRequest(id) {
  return apiFetch(`/admin/requests/${id}`, { method: "DELETE" });
}

async function reloadAdminRequests() {
  const items = await apiFetch('/admin/requests');
  adminRequestsCache = Array.isArray(items) ? items : [];
  applyAdminRequestSearch();
}

function attachAdminRequestActions() {
  const wrap = $("#adminRequestsWrap");
  if (!wrap) return;

  wrap.addEventListener("click", async (e) => {
    const approveBtn = e.target.closest(".approve-request-btn");
    const rejectBtn = e.target.closest(".reject-request-btn");
    const deleteBtn = e.target.closest(".delete-request-btn");
    if (!approveBtn && !rejectBtn && !deleteBtn) return;

    const id = (approveBtn || rejectBtn || deleteBtn).dataset.id;
    if (!id) return;

    try {
      if (deleteBtn) {
        const confirmed = confirm("هل أنت متأكد من حذف هذا الطلب نهائيًا؟");
        if (!confirmed) return;
        await deleteAdminRequest(id);
        showToast("تم الحذف", "تم حذف الطلب من قاعدة البيانات");
      } else if (approveBtn) {
        await updateRequestStatus(id, "APPROVED");
        showToast("تم التحديث", "تم وضع شارة صح على الطلب");
      } else {
        const reason = prompt("اكتب سبب رفض الطلب ليظهر للمستخدم:");
        if (!reason || !reason.trim()) {
          showToast("سبب الرفض مطلوب", "لا يمكن رفض الطلب بدون كتابة سبب واضح", "error");
          return;
        }
        await updateRequestStatus(id, "REJECTED", reason.trim());
        showToast("تم رفض الطلب", "سيظهر سبب الرفض للمستخدم داخل طلباته", "error");
      }

      await reloadAdminRequests();
    } catch (err) {
      showToast("فشل التحديث", err.message || "تعذر تحديث حالة الطلب", "error");
    }
  });
}


function initAdminPage() {
  const user = requireAdminPage();
  const guard = $("#adminGuardMessage");
  const wrap = $("#adminRequestsWrap");
  if (!user) {
    if (guard) {
      guard.textContent = 'لا يمكنك الوصول إلى هذه الصفحة.';
      guard.classList.remove('hidden');
    }
    if (wrap) wrap.innerHTML = '';
    return;
  }

  attachAdminRequestActions();
  $("#adminRequestSearch")?.addEventListener("input", applyAdminRequestSearch);
  $("#adminRiskSearch")?.addEventListener("input", applyAdminRiskSearch);

  apiFetch('/admin/requests')
    .then((items) => {
      adminRequestsCache = Array.isArray(items) ? items : [];
      applyAdminRequestSearch();
    })
    .catch((err) => {
      if (guard) {
        guard.textContent = `تعذر تحميل الطلبات: ${err.message}`;
        guard.classList.remove('hidden');
      }
      if (wrap) wrap.innerHTML = '';
    });

  apiFetch('/admin/ai/risk-analyses')
    .then((items) => {
      adminRiskAnalysesCache = Array.isArray(items) ? items : [];
      applyAdminRiskSearch();
    })
    .catch(() => renderAdminRiskAnalyses([]));
}


function getDateOnly(value) {
  if (!value) return "";
  return String(value).split("T")[0];
}

function daysUntil(dateValue) {
  if (!dateValue) return null;
  const today = new Date();
  const expiry = new Date(dateValue);
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  return Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
}

function setLicenseFormLocked(isLocked) {
  const form = $("#licenseForm");
  const notice = $("#licenseLoginNotice");
  const btn = $("#licenseSaveBtn");
  if (!form || !btn) return;

  const fields = $$("input, textarea, select", form);
  if (isLocked) {
    notice?.classList.remove("hidden");
    btn.textContent = "سجل الدخول أولاً";
    btn.dataset.locked = "true";
    fields.forEach((field) => field.setAttribute("disabled", "disabled"));
  } else {
    notice?.classList.add("hidden");
    btn.textContent = "حفظ بيانات الرخصة";
    btn.dataset.locked = "false";
    fields.forEach((field) => field.removeAttribute("disabled"));
  }
}

function renderLicenseStatus(data) {
  const note = $("#licenseNote");
  if (!note) return;

  if (!data || !data.expiry_date) {
    note.innerHTML = "عند اقتراب موعد انتهاء الرخصة بثلاثة أيام سيظهر تنبيه أعلى الصفحة بجانب اسم المستخدم.";
    return;
  }

  const expiryDate = getDateOnly(data.expiry_date);
  const left = Number(data.days_left ?? daysUntil(expiryDate));
  let status = "";

  if (left < 0) status = `انتهت الرخصة منذ ${Math.abs(left)} يوم.`;
  else if (left === 0) status = "تنتهي الرخصة اليوم.";
  else status = `متبقي على انتهاء الرخصة ${left} يوم.`;

  note.innerHTML = `
    <strong>بياناتك الحالية:</strong><br>
    نوع الدم: ${escapeHtml(data.blood_type || "-")}<br>
    درجة الرخصة: ${escapeHtml(data.license_degree || "-")}<br>
    تاريخ الانتهاء: ${escapeHtml(expiryDate)}<br>
    ${escapeHtml(status)}
  `;
}

function showLicenseNotification(daysLeft) {
  const chip = $("#userChip");
  if (!chip) return;

  let badge = $("#licenseAlert");
  if (!badge) {
    badge = document.createElement("span");
    badge.id = "licenseAlert";
    badge.className = "license-alert-badge";
    chip.prepend(badge);
  }

  if (daysLeft < 0) badge.textContent = "الرخصة منتهية";
  else if (daysLeft === 0) badge.textContent = "تنتهي اليوم";
  else badge.textContent = `${daysLeft} أيام`;

  badge.title = "تنبيه انتهاء رخصة القيادة";
}

function clearLicenseNotification() {
  const badge = $("#licenseAlert");
  if (badge) badge.remove();
}

async function checkLicenseExpiry() {
  const user = getSession();
  if (!user?.id) {
    clearLicenseNotification();
    return;
  }

  try {
    const data = await apiFetch(`/license/${user.id}`);
    if (!data || !data.expiry_date) {
      clearLicenseNotification();
      return;
    }

    const left = Number(data.days_left ?? daysUntil(data.expiry_date));
    if (left <= 3) showLicenseNotification(left);
    else clearLicenseNotification();
  } catch {
    clearLicenseNotification();
  }
}

function initLicensePage() {
  const session = getSession();
  const form = $("#licenseForm");
  const loginBtn = $("#licenseLoginBtn");
  const saveBtn = $("#licenseSaveBtn");
  const deleteBtn = $("#licenseDeleteBtn");

  loginBtn?.addEventListener("click", () => {
    window.location.href = "login.html";
  });

  if (!session?.id) {
    setLicenseFormLocked(true);
    saveBtn?.addEventListener("click", (e) => {
      if (saveBtn.dataset.locked === "true") {
        e.preventDefault();
        requireLogin();
      }
    });
    return;
  }

  setLicenseFormLocked(false);

  apiFetch(`/license/${session.id}`)
    .then((data) => {
      if (!data) return;
      $("#bloodType").value = data.blood_type || "";
      $("#licenseDegree").value = data.license_degree || "";
      $("#licenseExpiryDate").value = getDateOnly(data.expiry_date);
      deleteBtn?.classList.remove("hidden");
      renderLicenseStatus(data);
    })
    .catch(() => {
      renderLicenseStatus(null);
    });

  deleteBtn?.addEventListener("click", async () => {
    if (!confirm("هل أنت متأكد من حذف معلومات الرخصة؟")) return;

    deleteBtn.disabled = true;
    deleteBtn.textContent = "جاري الحذف...";
    try {
      await apiFetch(`/license/${session.id}`, { method: "DELETE" });
      form?.reset();
      deleteBtn.classList.add("hidden");
      renderLicenseStatus(null);
      clearLicenseNotification();
      showToast("تم الحذف", "تم حذف معلومات الرخصة من قاعدة البيانات");
    } catch (err) {
      showToast("فشل الحذف", err.message || "تعذر حذف معلومات الرخصة", "error");
    } finally {
      deleteBtn.disabled = false;
      deleteBtn.textContent = "حذف معلومات الرخصة";
    }
  });

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const payload = {
      user_id: session.id,
      blood_type: $("#bloodType").value,
      license_degree: $("#licenseDegree").value,
      expiry_date: $("#licenseExpiryDate").value
    };

    if (!payload.blood_type || !payload.license_degree || !payload.expiry_date) {
      showToast("بيانات ناقصة", "يرجى تعبئة جميع حقول الرخصة", "error");
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = "جاري الحفظ...";

    try {
      const saved = await apiFetch("/license", {
        method: "POST",
        body: payload
      });
      showToast("تم الحفظ", "تم حفظ بيانات الرخصة في قاعدة البيانات");
      deleteBtn?.classList.remove("hidden");
      renderLicenseStatus(saved);
      checkLicenseExpiry();
    } catch (err) {
      showToast("فشل الحفظ", err.message || "تعذر حفظ بيانات الرخصة", "error");
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = "حفظ بيانات الرخصة";
    }
  });
}
function initChatbot() {
  const existing = $("#chat-toggle");
  if (existing) return;

  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
    <button id="chat-toggle" aria-label="فتح الشات">💬</button>
    <div id="chat-box">
      <div class="chat-header">
        <span>مساعد Covera</span>
        <button id="close-chat" aria-label="إغلاق">✖</button>
      </div>
      <div class="chat-body" id="chat-body">
        <div class="chat-msg bot">مرحباً! أنا مساعد Covera. اسألني عن أنواع التأمين أو طريقة تقديم الطلب.</div>
        <div class="chat-suggestions">
          <button data-msg="ما هي أنواع التأمين؟">أنواع التأمين</button>
          <button data-msg="كيف أطلب عرض سعر؟">عرض سعر</button>
          <button data-msg="ما هو تحليل AI؟">تحليل AI</button>
          <button data-msg="كيف أسجل دخول؟">تسجيل الدخول</button>
        </div>
      </div>
      <div class="chat-input">
        <input id="chat-input-field" type="text" placeholder="اكتب سؤالك هنا..." />
        <button class="btn btn-primary" id="chat-send">إرسال</button>
      </div>
    </div>
  `;
  document.body.appendChild(wrapper);

  const toggle = $("#chat-toggle");
  const box = $("#chat-box");
  const close = $("#close-chat");
  const field = $("#chat-input-field");
  const send = $("#chat-send");
  const body = $("#chat-body");

  const answers = {
    "ما هي أنواع التأمين؟": "لدينا تأمين شامل، تأمين ضد الغير، تأمين طرف ثالث، ومساعدة على الطريق. يمكنك رؤية التفاصيل في صفحة أنواع التأمين.",
    "كيف أطلب عرض سعر؟": "سجل دخولك أولاً، ثم افتح صفحة طلب عرض سعر واملأ البيانات واضغط إرسال.",
    "ما هو تحليل AI؟": "تحليل AI يحسب درجة مخاطر المركبة والسائق، ثم يقترح نوع التأمين والسعر التقديري ونصائح لتقليل المخاطر.",
    "كيف أسجل دخول؟": "من صفحة تسجيل الدخول يمكنك إدخال البريد الإلكتروني وكلمة المرور، أو إنشاء حساب جديد.",
    "مرحبا": "أهلاً بك! كيف أستطيع مساعدتك؟"
  };

  function addMsg(text, type) {
    body.insertAdjacentHTML("beforeend", `<div class="chat-msg ${type}">${escapeHtml(text)}</div>`);
    body.scrollTop = body.scrollHeight;
  }

  function replyTo(text) {
    const q = text.trim();
    if (!q) return;
    addMsg(q, "user");

    let response = "أستطيع مساعدتك في التأمين، تسجيل الدخول، أو طلب عرض سعر.";
    if (/نوع|تأمين|الخدمات/.test(q)) response = "يمكنك الاطلاع على أنواع التأمين من صفحة الخدمات، ولدينا تأمين شامل، ضد الغير، طرف ثالث، ومساعدة على الطريق.";
    else if (/ai|ذكاء|مخاطر|تحليل|risk/i.test(q)) response = "افتح صفحة تحليل AI، أدخل عمر السائق وبيانات المركبة والحوادث السابقة، وسيظهر لك Risk Score مع توصية التأمين المناسبة.";
    else if (/عرض|طلب/.test(q)) response = "لإرسال طلب عرض سعر يلزمك تسجيل الدخول أولاً، ثم فتح صفحة طلب عرض سعر وإرسال البيانات.";
    else if (/دخول|تسجيل|حساب/.test(q)) response = "يمكنك تسجيل الدخول أو إنشاء حساب من صفحة تسجيل الدخول.";
    else if (/اتصال|تواصل|رسالة/.test(q)) response = "من صفحة اتصل بنا تستطيع إرسال رسالة مباشرة أو استخدام بيانات التواصل المعروضة.";
    else if (answers[q]) response = answers[q];

    setTimeout(() => addMsg(response, "bot"), 350);
  }

  toggle.addEventListener("click", () => {
    box.style.display = box.style.display === "flex" ? "none" : "flex";
  });
  close.addEventListener("click", () => {
    box.style.display = "none";
  });
  send.addEventListener("click", () => {
    replyTo(field.value);
    field.value = "";
    field.focus();
  });
  field.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      send.click();
    }
  });

  $$(".chat-suggestions button", wrapper).forEach((btn) => {
    btn.addEventListener("click", () => replyTo(btn.dataset.msg || btn.textContent));
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page || "";
  initLayout(page);
  const allowed = enforceProtectedPage(page);
  if (!allowed) return;
  if (page === "home") initHomePage();
  if (page === "login") initLoginPage();
  if (page === "services") initServicesPage();
  if (page === "request") initRequestPage();
  if (page === "ai-risk") initRiskPage();
  if (page === "contact") initContactPage();
  if (page === "admin") initAdminPage();
  if (page === "license") initLicensePage();
  checkLicenseExpiry();
  initChatbot();
});
