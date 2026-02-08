// Golf Licenses Admin (GitHub Pages)
// FIXED: sends token as ?token=... because your backend checks req.query.token
// ALSO sends Authorization header for future compatibility.

(function () {
  const els = {
    baseUrl: document.getElementById("baseUrl"),
    adminToken: document.getElementById("adminToken"),
    btnSave: document.getElementById("btnSave"),
    btnTest: document.getElementById("btnTest"),
    btnStats: document.getElementById("btnStats"),
    btnEvents: document.getElementById("btnEvents"),
    btnSessions: document.getElementById("btnSessions"),
    connectStatus: document.getElementById("connectStatus"),
    statsStatus: document.getElementById("statsStatus"),
    statsOut: document.getElementById("statsOut"),
    pillApi: document.getElementById("pillApi"),
    pillAuth: document.getElementById("pillAuth"),
    table: document.getElementById("table"),
  };

  function cleanBaseUrl(url) {
    return (url || "").trim().replace(/\/+$/, "");
  }

  function getSaved() {
    return {
      baseUrl: cleanBaseUrl(localStorage.getItem("gl_baseUrl") || ""),
      token: (localStorage.getItem("gl_adminToken") || "").trim(),
    };
  }

  function save(baseUrl, token) {
    localStorage.setItem("gl_baseUrl", cleanBaseUrl(baseUrl));
    localStorage.setItem("gl_adminToken", (token || "").trim());
  }

  function setPills() {
    const { baseUrl, token } = getSaved();
    els.pillApi.textContent = baseUrl ? `API: ${baseUrl}` : "API: not set";
    els.pillAuth.textContent = token ? "Auth: set" : "Auth: not set";
  }

  function qs(params) {
    const s = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v === undefined || v === null || v === "") return;
      s.set(k, String(v));
    });
    return s.toString();
  }

  // Builds URL and ALWAYS adds token as query string because backend checks req.query.token
  function buildUrl(path, extraParams = {}) {
    const { baseUrl, token } = getSaved();
    if (!baseUrl) throw new Error("API base URL not set");
    if (!token) throw new Error("Admin token not set");

    const params = { ...extraParams, token }; // IMPORTANT
    const query = qs(params);
    return `${baseUrl}${path}${query ? "?" + query : ""}`;
  }

  async function apiGet(path, params) {
    const { token } = getSaved();
    const url = buildUrl(path, params);
    const res = await fetch(url, {
      method: "GET",
      headers: {
        // Future proof (if you later switch backend to Bearer header)
        "Authorization": `Bearer ${token}`,
        "Accept": "application/json",
      },
    });

    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { json = { raw: text }; }

    if (!res.ok) {
      const msg = json && (json.error || json.message) ? (json.error || json.message) : `${res.status}`;
      const err = new Error(`${res.status} : ${msg}`);
      err.status = res.status;
      err.payload = json;
      throw err;
    }
    return json;
  }

  function pretty(obj) {
    return JSON.stringify(obj, null, 2);
  }

  function showStatus(el, ok, msg) {
    el.className = "status " + (ok ? "ok" : "bad");
    el.textContent = msg;
  }

  function renderTable(rows) {
    if (!Array.isArray(rows) || rows.length === 0) {
      els.table.innerHTML = `<tr><th>Empty</th></tr><tr><td class="muted">No rows returned.</td></tr>`;
      return;
    }

    // Pick columns from first row
    const cols = Object.keys(rows[0]);
    const thead = `<tr>${cols.map(c => `<th>${c}</th>`).join("")}</tr>`;
    const tbody = rows.slice(0, 100).map(r => {
      return `<tr>${cols.map(c => `<td>${escapeHtml(formatCell(r[c]))}</td>`).join("")}</tr>`;
    }).join("");

    els.table.innerHTML = thead + tbody;
  }

  function formatCell(v) {
    if (v === null || v === undefined) return "";
    if (typeof v === "object") return JSON.stringify(v);
    return String(v);
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  async function testConnection() {
    try {
      // Your backend root "/" returns: {status:"ok", service:"license-server", time:"..."}
      const { baseUrl, token } = getSaved();
      if (!baseUrl || !token) throw new Error("Set API base URL + Admin token first");

      // Try an admin endpoint first (more meaningful than /)
      // If /admin/stats doesn't exist yet, we'll fall back to /admin/events.
      try {
        await apiGet("/admin/stats");
        showStatus(els.connectStatus, true, `✅ Connected (admin ok) @ ${new Date().toISOString()}`);
      } catch (e) {
        // fallback to events (exists in your uploaded backend)
        await apiGet("/admin/events", { limit: 1 });
        showStatus(els.connectStatus, true, `✅ Connected (events ok) @ ${new Date().toISOString()}`);
      }
      setPills();
    } catch (e) {
      showStatus(els.connectStatus, false, `❌ ${e.message}`);
    }
  }

  async function loadStats() {
    els.statsOut.textContent = "{}";
    try {
      const data = await apiGet("/admin/stats");
      showStatus(els.statsStatus, true, "✅ Stats loaded");
      els.statsOut.textContent = pretty(data);
      // If it returns a single object, show it as JSON only
      els.table.innerHTML = "";
    } catch (e) {
      showStatus(els.statsStatus, false, `❌ ${e.message}`);
      els.statsOut.textContent = pretty(e.payload || { error: e.message });
    }
  }

  async function loadEvents() {
    els.statsOut.textContent = "{}";
    try {
      const data = await apiGet("/admin/events", { limit: 50 });
      showStatus(els.statsStatus, true, "✅ Events loaded");
      els.statsOut.textContent = pretty(data);
      renderTable(data);
    } catch (e) {
      showStatus(els.statsStatus, false, `❌ ${e.message}`);
      els.statsOut.textContent = pretty(e.payload || { error: e.message });
    }
  }

  async function loadSessions() {
    els.statsOut.textContent = "{}";
    try {
      const data = await apiGet("/admin/sessions", { limit: 50 });
      showStatus(els.statsStatus, true, "✅ Sessions loaded");
      els.statsOut.textContent = pretty(data);
      renderTable(data);
    } catch (e) {
      showStatus(els.statsStatus, false, `❌ ${e.message}`);
      els.statsOut.textContent = pretty(e.payload || { error: e.message });
    }
  }

  // Init
  (function init() {
    const saved = getSaved();
    els.baseUrl.value = saved.baseUrl || "https://golf-licenses-production.up.railway.app";
    els.adminToken.value = saved.token || "";
    setPills();

    els.btnSave.addEventListener("click", () => {
      save(els.baseUrl.value, els.adminToken.value);
      setPills();
      showStatus(els.connectStatus, true, "✅ Saved.");
    });

    els.btnTest.addEventListener("click", testConnection);
    els.btnStats.addEventListener("click", loadStats);
    els.btnEvents.addEventListener("click", loadEvents);
    els.btnSessions.addEventListener("click", loadSessions);
  })();
})();
