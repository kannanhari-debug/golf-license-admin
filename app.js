// Simple Admin UI (no frameworks) - works on GitHub Pages

function getConfig() {
  return {
    apiBase: localStorage.getItem("apiBase") || "",
    adminToken: localStorage.getItem("adminToken") || ""
  };
}
function setConfig(apiBase, adminToken) {
  localStorage.setItem("apiBase", apiBase.trim());
  localStorage.setItem("adminToken", adminToken.trim());
}

function badge() {
  const { apiBase } = getConfig();
  const el = document.getElementById("apiBadge");
  el.textContent = apiBase ? `API: ${apiBase}` : "API: not set";
}

async function api(path, opts = {}) {
  const { apiBase, adminToken } = getConfig();
  if (!apiBase) throw new Error("API base URL not set");
  const url = apiBase.replace(/\/$/, "") + path;

  const headers = Object.assign(
    { "Content-Type": "application/json", "x-admin-token": adminToken || "" },
    opts.headers || {}
  );

  const res = await fetch(url, { ...opts, headers });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }

  if (!res.ok) {
    const msg = typeof data === "string" ? data : (data.error || JSON.stringify(data));
    throw new Error(`${res.status} ${res.statusText}: ${msg}`);
  }
  return data;
}

function pillForStatus(status) {
  status = (status || "").toLowerCase();
  if (status === "active" || status === "valid" || status === "ok") return `<span class="pill ok">${status}</span>`;
  if (status === "expired") return `<span class="pill warn">expired</span>`;
  return `<span class="pill bad">${status || "unknown"}</span>`;
}

function fmt(v) {
  if (v == null) return "";
  return String(v);
}

async function testConnection() {
  const msg = document.getElementById("connectMsg");
  msg.textContent = "Testing...";
  try {
    const r = await api("/", { method: "GET" });
    msg.textContent = `✅ Connected: ${r.service} @ ${r.time}`;
  } catch (e) {
    msg.textContent = `❌ ${e.message}`;
  }
}

async function loadStats() {
  const box = document.getElementById("statsBox");
  box.textContent = "Loading...";
  try {
    // These endpoints must exist in your backend.
    // If your backend uses different paths, tell me and I’ll adapt the JS.
    const s = await api("/admin/stats", { method: "GET" });

    box.innerHTML = `
      <div class="grid">
        <div class="card"><div class="muted">Total licenses</div><div style="font-size:26px;font-weight:800;">${fmt(s.total_licenses)}</div></div>
        <div class="card"><div class="muted">Active</div><div style="font-size:26px;font-weight:800;">${fmt(s.active_licenses)}</div></div>
        <div class="card"><div class="muted">Expired</div><div style="font-size:26px;font-weight:800;">${fmt(s.expired_licenses)}</div></div>
        <div class="card"><div class="muted">Lite</div><div style="font-size:26px;font-weight:800;">${fmt(s.lite_licenses)}</div></div>
        <div class="card"><div class="muted">Premium</div><div style="font-size:26px;font-weight:800;">${fmt(s.premium_licenses)}</div></div>
        <div class="card"><div class="muted">Unauthorised attempts (24h)</div><div style="font-size:26px;font-weight:800;">${fmt(s.unauthorised_24h)}</div></div>
      </div>
      <div class="muted" style="margin-top:10px;">Sessions today: <b>${fmt(s.sessions_today)}</b> • Total duration today: <b>${fmt(s.duration_sec_today)}</b> sec</div>
    `;
  } catch (e) {
    box.textContent = `❌ ${e.message}`;
  }
}

async function loadEvents() {
  const box = document.getElementById("eventsTable");
  box.textContent = "Loading...";
  try {
    const rows = await api("/admin/events?limit=50", { method: "GET" });
    box.innerHTML = renderEvents(rows);
  } catch (e) {
    box.textContent = `❌ ${e.message}`;
  }
}

function renderEvents(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return `<div class="muted">No events.</div>`;
  const html = rows.map(r => `
    <tr>
      <td>${fmt(r.created_at)}</td>
      <td>${fmt(r.device_id)}</td>
      <td>${fmt(r.event)}</td>
      <td>${pillForStatus(r.result)}</td>
      <td class="muted">${fmt(r.ip || "")}</td>
    </tr>
  `).join("");
  return `
    <table>
      <thead><tr>
        <th>time</th><th>device</th><th>event</th><th>result</th><th>ip</th>
      </tr></thead>
      <tbody>${html}</tbody>
    </table>
  `;
}

async function loadLicenses() {
  const box = document.getElementById("licensesTable");
  box.textContent = "Loading...";
  try {
    const q = document.getElementById("searchQ").value.trim();
    const status = document.getElementById("filterStatus").value;
    const level = document.getElementById("filterLevel").value;

    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (level) params.set("level", level);

    const rows = await api(`/admin/licenses?${params.toString()}`, { method: "GET" });
    box.innerHTML = renderLicenses(rows);
  } catch (e) {
    box.textContent = `❌ ${e.message}`;
  }
}

function renderLicenses(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return `<div class="muted">No licenses found.</div>`;
  const html = rows.map(r => `
    <tr>
      <td><code>${fmt(r.device_id)}</code></td>
      <td>${fmt(r.username)}</td>
      <td>${fmt(r.level)}</td>
      <td>${fmt(r.expiry)}</td>
      <td>${pillForStatus(r.status)}</td>
      <td class="muted">${fmt(r.updated_at || r.created_at || "")}</td>
    </tr>
  `).join("");

  return `
    <table>
      <thead><tr>
        <th>device_id</th><th>username</th><th>level</th><th>expiry</th><th>status</th><th>updated</th>
      </tr></thead>
      <tbody>${html}</tbody>
    </table>
    <div class="muted" style="margin-top:10px;">
      Editing/creating licenses needs backend admin endpoints (we’ll add next).
    </div>
  `;
}

function wire() {
  // Load saved config into inputs
  const cfg = getConfig();
  document.getElementById("apiBase").value = cfg.apiBase;
  document.getElementById("adminToken").value = cfg.adminToken;
  badge();

  document.getElementById("btnSave").addEventListener("click", () => {
    setConfig(
      document.getElementById("apiBase").value,
      document.getElementById("adminToken").value
    );
    badge();
    document.getElementById("connectMsg").textContent = "✅ Saved.";
  });

  document.getElementById("btnTest").addEventListener("click", testConnection);
  document.getElementById("btnLoadStats").addEventListener("click", loadStats);
  document.getElementById("btnLoadEvents").addEventListener("click", loadEvents);
  document.getElementById("btnLoadLicenses").addEventListener("click", loadLicenses);

  document.getElementById("btnNewLicense").addEventListener("click", () => {
    alert("Next step: we’ll add create/edit/delete license endpoints in your backend, then wire a form here.");
  });
}

wire();
