function $(id){ return document.getElementById(id); }

const DEFAULT_BASE = "https://golf-licenses-production.up.railway.app";

function load(){
  $("baseUrl").value = sessionStorage.getItem("base") || DEFAULT_BASE;
  $("token").value = sessionStorage.getItem("token") || "";
}
load();

function save(){
  sessionStorage.setItem("base", $("baseUrl").value.trim());
  sessionStorage.setItem("token", $("token").value.trim());
  $("connMsg").innerText = "Saved (this browser session only)";
}

function clearSaved(){
  sessionStorage.clear();
  load();
  $("connMsg").innerText = "Cleared";
}

async function api(method, path, body){
  const base = sessionStorage.getItem("base");
  const token = sessionStorage.getItem("token");
  if(!token) throw "ADMIN_TOKEN missing";

  let url = `${base}${path}${path.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}`;
  let res = await fetch(url, {
    method,
    headers: {"Content-Type":"application/json"},
    body: body ? JSON.stringify(body) : null
  });

  let txt = await res.text();
  try { txt = JSON.parse(txt); } catch {}
  if(!res.ok) throw txt.error || "Request failed";
  return txt;
}

function show(data){
  $("out").textContent = JSON.stringify(data, null, 2);
}

async function loadStats(){
  show(await api("GET","/admin/stats"));
}

async function loadLicenses(){
  show(await api("GET","/admin/licenses?limit=500"));
}

async function loadSessions(){
  show(await api("GET","/admin/sessions?limit=200"));
}

async function loadEvents(){
  show(await api("GET","/admin/events?limit=200"));
}

async function addLicense(){
  show(await api("POST","/admin/licenses",{
    device_id:$("licDevice").value,
    username:$("licUser").value,
    level:$("licLevel").value,
    expiry:$("licExpiry").value,
    status:$("licStatus").value
  }));
}

async function updateLicense(){
  show(await api("PUT",`/admin/licenses?device_id=${$("licDevice").value}`,{
    username:$("licUser").value,
    level:$("licLevel").value,
    expiry:$("licExpiry").value,
    status:$("licStatus").value
  }));
}

async function deleteLicense(){
  show(await api("DELETE",`/admin/licenses?device_id=${$("licDevice").value}`));
}
