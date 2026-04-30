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
        <li><a href="Request.html" class="${activePage === "request" ? "active" : ""}">طلب عرض سعر</a></li>
        <li><a href="about.html" class="${activePage === "about" ? "active" : ""}">من نحن</a></li>
        <li><a href="license.html" class="${activePage === "license" ? "active" : ""}">مذكر انتهاء رخصة </a></li>
        <li><a href="contact.html" class="${activePage === "contact" ? "active" : ""}">اتصل بنا</a></li>
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
          <a href="contact.html">اتصل بنا</a>
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

function initHomePage() {
  const cta = $("#goServices");
  const quote = $("#goQuote");
  const contact = $("#goContactBtn");
  const quick = $("#goQuickRequestBtn");
  const coverage = $("#showCoverageBtn");
  const closeCoverage = $("#closeCoverageModal");
  const coverageModal = $("#coverageModal");

  if (cta) cta.addEventListener("click", () => (window.location.href = "services.html"));
  if (quote) quote.addEventListener("click", () => (window.location.href = "Request.html"));
  if (contact) contact.addEventListener("click", () => (window.location.href = "contact.html"));
  if (quick) quick.addEventListener("click", () => (window.location.href = "Request.html"));
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

function initLamp() {
  const lamp = $("#lamp");
  const string = $("#lampString");
  if (!lamp || !string) return;
  let dragging = false;
  let startY = 0;
  let pull = 0;

  string.addEventListener("mousedown", (e) => {
    dragging = true;
    startY = e.clientY;
    string.style.cursor = "grabbing";
  });

  window.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    pull = Math.min(40, Math.max(0, e.clientY - startY));
    string.style.height = `${110 + pull}px`;
  });

  function stopDrag() {
    if (!dragging) return;
    dragging = false;
    string.style.cursor = "grab";
    string.style.height = "110px";
    if (pull > 18) lamp.classList.toggle("on");
    pull = 0;
  }

  window.addEventListener("mouseup", stopDrag);
  window.addEventListener("mouseleave", stopDrag);
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
    const name = $("#registerName").value.trim();
    const email = $("#registerEmail").value.trim();
    const password = $("#registerPassword").value;
    const btn = $("#registerBtn");
    if (!name || !email || !password) {
      showToast("بيانات ناقصة", "أدخل جميع الحقول المطلوبة", "error");
      return;
    }
    btn.disabled = true;
    btn.textContent = "جاري الإنشاء...";
    try {
      const user = await apiFetch("/register", {
        method: "POST",
        body: { name, email, password },
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

  initLamp();
}

function serviceIcon(title = "") {
  if (title.includes("شامل")) return "🛡️";
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
  } else {
    if (name) name.removeAttribute("readonly");
    if (email) email.removeAttribute("readonly");
    setRequestFormLocked(true);
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
      "مساعدة على الطريق": 3
    };

    const payload = {
      user_id: user.id,
      insurance_id: insuranceMap[$("#insuranceType").value] || null,
      full_name: $("#name").value.trim(),
      phone: $("#phone").value.trim(),
      car_model: $("#carType").value,
      car_year: Number($("#year").value),
      notes: [
        `البريد الإلكتروني: ${$("#email").value.trim()}`,
        `قيمة المركبة: ${$("#price").value.trim()}`,
        `نوع التأمين المطلوب: ${$("#insuranceType").value.trim()}`,
        `ملاحظات: ${$("#notes").value.trim()}`
      ].join(" | ")
    };

    if (!payload.full_name || !payload.phone || !payload.car_model || !payload.car_year) {
      showToast("بيانات ناقصة", "يرجى تعبئة الحقول المطلوبة", "error");
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
    } catch (err) {
      showToast("فشل الإرسال", err.message, "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "إرسال الطلب";
    }
  });
}

function initContactPage() {
  $("#contactForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    showToast("تم استلام رسالتك", "سنقوم بالرد عليك في أقرب وقت");
    e.target.reset();
  });
}

function renderAdminRequests(items) {
  const wrap = $("#adminRequestsWrap");
  if (!wrap) return;
  if (!items.length) {
    wrap.innerHTML = '<div class="empty-state">لا توجد طلبات حالياً.</div>';
    return;
  }

  wrap.innerHTML = items.map((item) => `
    <article class="admin-request-card">
      <div class="admin-request-head">
        <h3>${escapeHtml(item.full_name || item.user_name || 'طلب جديد')}</h3>
        <span class="request-status">${escapeHtml(item.status || 'submitted')}</span>
      </div>
      <p><strong>البريد:</strong> ${escapeHtml(item.user_email || '-')}</p>
      <p><strong>الجوال:</strong> ${escapeHtml(item.phone || '-')}</p>
      <p><strong>المركبة:</strong> ${escapeHtml(item.car_model || '-')}</p>
      <p><strong>سنة الصنع:</strong> ${escapeHtml(item.car_year || '-')}</p>
      <p><strong>نوع التأمين:</strong> ${escapeHtml(item.ins_title_ar || item.ins_title_en || '-')}</p>
      <p><strong>الملاحظات:</strong> ${escapeHtml(item.notes || '-')}</p>
    </article>
  `).join('');
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

  apiFetch('/admin/requests')
    .then((items) => renderAdminRequests(Array.isArray(items) ? items : []))
    .catch((err) => {
      if (guard) {
        guard.textContent = `تعذر تحميل الطلبات: ${err.message}`;
        guard.classList.remove('hidden');
      }
      if (wrap) wrap.innerHTML = '';
    });
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
      renderLicenseStatus(data);
    })
    .catch(() => {
      renderLicenseStatus(null);
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
    "ما هي أنواع التأمين؟": "لدينا تأمين شامل، تأمين ضد الغير، ومساعدة على الطريق. يمكنك رؤية التفاصيل في صفحة أنواع التأمين.",
    "كيف أطلب عرض سعر؟": "سجل دخولك أولاً، ثم افتح صفحة طلب عرض سعر واملأ البيانات واضغط إرسال.",
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
    if (/نوع|تأمين|الخدمات/.test(q)) response = "يمكنك الاطلاع على أنواع التأمين من صفحة الخدمات، ولدينا تأمين شامل وضد الغير ومساعدة على الطريق.";
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
  if (page === "home") initHomePage();
  if (page === "login") initLoginPage();
  if (page === "services") initServicesPage();
  if (page === "request") initRequestPage();
  if (page === "contact") initContactPage();
  if (page === "admin") initAdminPage();
  if (page === "license") initLicensePage();
  checkLicenseExpiry();
  initChatbot();
});
