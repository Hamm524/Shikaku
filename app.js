/* 資格ドリル: 簿記2級・ITパスポート・HTML5。1問ずつ解いて、○×を付ける。
   記録は端末と、合言葉(10文字)で Firebase に自動保存する。ログインは不要。 */

/* ---------- 科目とデータ ---------- */
var ONLY = window.ONLY || "";
var SUBJECTS = [
  { id: "boki", name: "日商簿記2級", short: "簿記", title: "簿記2級ドリル", units: typeof BOKI !== "undefined" ? BOKI : null, def: "2026-12-18", order: typeof BOKI_ORDER !== "undefined" ? BOKI_ORDER : null, kinds: [["net", "ネット試験"], ["paper", "統一試験(紙)"]] },
  { id: "itpass", name: "ITパスポート", short: "ITパス", title: "ITパスポートドリル", units: typeof ITPASS !== "undefined" ? ITPASS : null, note: "いまの問題はサンプルです。順に増やします。" },
  { id: "html5", name: "HTML5プロフェッショナル レベル2", short: "HTML5", title: "HTML5ドリル", units: typeof HTML5 !== "undefined" ? HTML5 : null, note: "いまの問題はサンプルです。記述問題は、書いたあとに模範解答と見比べて採点します。" }
].filter(function (s) { return s.units && (!ONLY || s.id === ONLY); });
var ROOT = ONLY ? "../" : "";
var UNITS = [];
SUBJECTS.forEach(function (s) { s.units.forEach(function (u) { u.subj = s.id; u.dm = u.dm || 5; UNITS.push(u); }); });
function subjById(id) { return SUBJECTS.filter(function (s) { return s.id === id; })[0] || SUBJECTS[0]; }
function unitById(id) { return UNITS.filter(function (u) { return u.id === id; })[0]; }
function orderOf(sid) {
  var S = subjById(sid), us = S.units;
  if (S.order) {
    var ids = S.order.filter(function (id) { return unitById(id); });
    us.forEach(function (u) { if (!u.mock && ids.indexOf(u.id) < 0) ids.push(u.id); });
    return ids.concat(us.filter(function (u) { return u.mock && ids.indexOf(u.id) < 0; }).map(function (u) { return u.id; }));
  }
  return us.filter(function (u) { return !u.mock; }).concat(us.filter(function (u) { return u.mock; })).map(function (u) { return u.id; });
}
var STEPS = [
  { s: [11, 6], e: [11, 12], name: "3級範囲と仕訳", ids: ["t1", "t2", "t3"] },
  { s: [11, 13], e: [11, 19], name: "工業簿記(前半)", ids: ["k1", "k2"] },
  { s: [11, 20], e: [11, 26], name: "商業の基礎と連結会計の入口、工業簿記(後半)", ids: ["s1", "s4", "k3"] },
  { s: [11, 27], e: [12, 3], name: "商業の2級論点と、連結・工業の大問", ids: ["s2", "d5", "d2", "d3"] },
  { s: [12, 4], e: [12, 10], name: "財務諸表と本試験形式の大問", ids: ["s3", "d1", "d4", "g"] }
];

/* ---------- 保存(端末) ---------- */
var KEY = "shikaku-v1";
function normalize(o) {
  o = o || {};
  var s = { res: o.res || {}, memo: o.memo || {}, time: o.time || {}, plans: o.plans || {}, pts: o.pts || {}, rev: o.rev || {}, ts: o.ts || 0 };
  if (o.plan && !s.plans.boki) s.plans.boki = o.plan;
  return s;
}
var store = normalize(null);
try { var raw = localStorage.getItem(KEY); if (raw) store = normalize(JSON.parse(raw)); } catch (e) {}
function lget(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lset(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
function persistLocal() { lset(KEY, JSON.stringify(store)); }
function save() {
  store.ts = Date.now();
  persistLocal();
  cloud.dirty = true;
  scheduleSync(1500);
}

/* ---------- 間隔をあけた復習 ---------- */
var INTERVALS = [1, 3, 7, 14];
function addDays(n) { var d = today0(); d.setDate(d.getDate() + n); return fd(d); }
function recordResult(key, good) {
  store.res[key] = good ? 1 : 0;
  var r = store.rev[key];
  if (!good) store.rev[key] = { s: 0, d: addDays(INTERVALS[0]) };
  else if (r) { var n = r.s + 1; if (n >= INTERVALS.length) delete store.rev[key]; else store.rev[key] = { s: n, d: addDays(INTERVALS[n]) }; }
}
function dueIndices(u) {
  var t = fd(today0()), out = [];
  u.ps.forEach(function (p, i) { var r = store.rev[rkey(u, i)]; if (r && r.d <= t) out.push(i); });
  return out;
}
function dueSummary(sid) {
  var list = [], total = 0;
  subjById(sid).units.forEach(function (u) { var n = dueIndices(u).length; if (n) { list.push({ u: u, n: n }); total += n; } });
  return { list: list, total: total };
}
(function migrateRev() {
  var changed = false, t = fd(today0());
  for (var k in store.res) { if (store.res[k] === 0 && !store.rev[k]) { store.rev[k] = { s: 0, d: t }; changed = true; } }
  if (changed) persistLocal();
})();

/* ---------- 保存(合言葉・Firebase) ---------- */
var FS = { projectId: "keisan-suzu", apiKey: "AIzaSyCv0vvfBwyjInAZV9cBRfVaRAn5zTEtCrg" };
var ABC = "abcdefghjkmnpqrstuvwxyz23456789";
var cloud = { err: "", code: lget("shk_code") || "", state: "idle", dirty: false, busy: false, baseTs: +(lget("shk_base") || 0), timer: null };
function newCode() {
  var a = new Uint8Array(10), s = "";
  (window.crypto || window.msCrypto).getRandomValues(a);
  for (var i = 0; i < 10; i++) s += ABC.charAt(a[i] % ABC.length);
  return s;
}
function showCode(c) { return c ? c.slice(0, 5) + "-" + c.slice(5) : ""; }
function cleanCode(t) { return String(t || "").toLowerCase().replace(/[^a-z0-9]/g, ""); }
function codeOk(c) { if (c.length !== 10) return false; for (var i = 0; i < c.length; i++) if (ABC.indexOf(c.charAt(i)) < 0) return false; return true; }
if (!cloud.code) { cloud.code = newCode(); lset("shk_code", cloud.code); cloud.dirty = true; }
function docUrl(code) { return "https://firestore.googleapis.com/v1/projects/" + FS.projectId + "/databases/(default)/documents/kids/" + code + "/kv/shikaku-drill-v1?key=" + encodeURIComponent(FS.apiKey); }
function fsGet(code) {
  return fetch(docUrl(code)).then(function (r) {
    if (r.status === 404) return null;
    if (!r.ok) throw new Error("fs " + r.status);
    return r.json().then(function (j) { var v = j && j.fields && j.fields.v && j.fields.v.stringValue; return v ? JSON.parse(v) : null; });
  });
}
function fsPut(code, obj) {
  var body = { fields: { v: { stringValue: JSON.stringify(obj) }, n: { integerValue: "1" } } };
  return fetch(docUrl(code), { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(function (r) { if (!r.ok) throw new Error("fs " + r.status); });
}
function setState(s) { cloud.state = s; var el = document.getElementById("cstat"); if (el) el.textContent = stateText(); }
function stateText() {
  return cloud.state === "ok" ? "☁ 自動で保存中" : cloud.state === "sync" ? "☁ 保存しています…" : cloud.state === "err" ? "☁ 保存できません" + (cloud.err ? "(" + cloud.err.replace("fs ", "") + ")" : "") : "☁ 準備中";
}
function scheduleSync(ms) { clearTimeout(cloud.timer); cloud.timer = setTimeout(syncNow, ms); }
function adoptStore(o) { store = normalize(o); persistLocal(); }
function mergeIn(rem) {
  ["res", "memo", "time", "pts", "rev"].forEach(function (k) { var m = {}, kk; for (kk in rem[k]) m[kk] = rem[k][kk]; for (kk in store[k]) m[kk] = store[k][kk]; store[k] = m; });
  for (var s in rem.plans) if (!store.plans[s]) store.plans[s] = rem.plans[s];
}
function syncNow() {
  if (cloud.busy || !cloud.code) return Promise.resolve();
  cloud.busy = true; setState("sync");
  return fsGet(cloud.code).then(function (rem) {
    var changed = false;
    if (rem) {
      rem = normalize(rem);
      if (rem.ts > cloud.baseTs) {
        if (cloud.dirty) { mergeIn(rem); changed = true; }
        else if (rem.ts > store.ts) { adoptStore(rem); cloud.dirty = false; changed = true; }
      }
      if (!cloud.dirty) { cloud.baseTs = Math.max(cloud.baseTs, rem.ts); lset("shk_base", String(cloud.baseTs)); }
    }
    if (cloud.dirty || !rem) {
      store.ts = Date.now(); persistLocal();
      return fsPut(cloud.code, store).then(function () { cloud.baseTs = store.ts; lset("shk_base", String(store.ts)); cloud.dirty = false; return changed; });
    }
    return changed;
  }).then(function (changed) {
    setState("ok");
    if (changed && (view.name === "home" || view.name === "data" || view.name === "plan")) render();
  }, function (e) { cloud.err = e && e.message ? e.message : "通信エラー"; setState("err"); }).then(function () { cloud.busy = false; });
}
setInterval(function () { if (document.visibilityState === "visible") syncNow(); }, 30000);
document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") syncNow(); });
window.addEventListener("online", function () { syncNow(); });

/* ---------- 共通の部品 ---------- */
var view = { name: "home", subj: ONLY || lget("shk_subj") || "boki", unit: null, list: [], pos: 0, revealed: false, picked: -1, elapsed: 0, last: 0, running: false };
if (!SUBJECTS.some(function (s) { return s.id === view.subj; })) view.subj = SUBJECTS[0].id;
var app = document.getElementById("app");
var bar = document.getElementById("bar");
var barin = document.getElementById("barin");
function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
function rkey(u, i) { return u.id + "-" + i; }
function mins(u, p) { return p.m || u.dm; }
function unitMins(u) { var s = 0; u.ps.forEach(function (p) { s += mins(u, p); }); return s; }
function fmtMin(n) { return (Math.round(n * 10) / 10) + "分"; }
function fmt(ms) { var s = Math.floor(ms / 1000), m = Math.floor(s / 60); s = s % 60; return m + ":" + (s < 10 ? "0" : "") + s; }
function counts(u) {
  var ok = 0, ng = 0;
  u.ps.forEach(function (p, i) { var r = store.res[rkey(u, i)]; if (r === 1) ok++; else if (r === 0) ng++; });
  return { ok: ok, ng: ng, rest: u.ps.length - ok - ng, n: u.ps.length };
}
function subjCounts(sid) {
  var t = { ok: 0, ng: 0, rest: 0, n: 0 };
  subjById(sid).units.forEach(function (u) { var c = counts(u); t.ok += c.ok; t.ng += c.ng; t.rest += c.rest; t.n += c.n; });
  return t;
}
function journalHTML(line) {
  var d = line.indexOf("(借)"), c = line.indexOf("(貸)");
  if (d < 0 && c < 0) return '<p class="plain">' + esc(line) + "</p>";
  var first = Math.min.apply(null, [d, c].filter(function (x) { return x >= 0; }));
  var label = line.slice(0, first).trim();
  var rest = line.slice(first);
  var re = /\((借|貸)\)(.+?)\s+(\d[\d,]*)/g, m, debit = [], credit = [];
  while ((m = re.exec(rest))) { (m[1] === "借" ? debit : credit).push([m[2], m[3]]); }
  var n = Math.max(debit.length, credit.length), rows = "";
  for (var i = 0; i < n; i++) {
    var a = debit[i] || ["", ""], b = credit[i] || ["", ""];
    rows += "<tr><td>" + esc(a[0]) + '</td><td class="amt">' + esc(a[1]) + '</td><td class="sep">' + esc(b[0]) + '</td><td class="amt">' + esc(b[1]) + "</td></tr>";
  }
  return '<div class="jrnl">' + (label ? '<div class="jl">' + esc(label) + "</div>" : "") +
    '<div class="tbl-scroll"><table><tr><th>借方</th><th>金額</th><th class="sep">貸方</th><th>金額</th></tr>' + rows + "</table></div></div>";
}
function curElapsed() { return view.elapsed + (view.running ? Date.now() - view.last : 0); }
function resetTimer() { view.elapsed = 0; view.last = Date.now(); view.running = true; }
function go(name, extra) {
  for (var k in extra) view[k] = extra[k];
  view.name = name;
  if (name === "quiz" && extra && extra.revealed === false) { view.picked = -1; resetTimer(); }
  render(); window.scrollTo(0, 0);
}
function render() {
  if (view.name === "home") renderHome();
  else if (view.name === "quiz") renderQuiz();
  else if (view.name === "plan") renderPlan();
  else if (view.name === "data") renderData();
  else renderDone();
}
setInterval(function () {
  if (view.name !== "quiz" || view.revealed || !view.running) return;
  var el = document.getElementById("tm");
  if (!el) return;
  var u = view.unit, p = u.ps[view.list[view.pos]], ms = curElapsed();
  el.textContent = fmt(ms);
  el.className = "tm" + (ms > mins(u, p) * 60000 ? " over" : "");
}, 500);

/* ---------- 学習計画(科目ごと) ---------- */
var W = ["日", "月", "火", "水", "木", "金", "土"];
function pad(n) { return (n < 10 ? "0" : "") + n; }
function pd(s) { var a = s.split("-"); return new Date(+a[0], +a[1] - 1, +a[2]); }
function fd(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
function today0() { var n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); }
function jd(s) { var d = pd(s); return (d.getMonth() + 1) + "/" + d.getDate() + "(" + W[d.getDay()] + ")"; }
function md(a) { return a[0] + "/" + a[1]; }
function remMins(u) { var c = counts(u); return Math.ceil(unitMins(u) * c.rest / c.n); }
function getPlan(sid) {
  var p = store.plans[sid];
  if (p) return p;
  return { exam: subjById(sid).def || "", daily: 120, off: [], dates: {} };
}
function daysLeft(p) { return p.exam ? Math.max(0, Math.round((pd(p.exam) - today0()) / 86400000)) : 0; }
function studyDays(p) {
  var t = today0(), days = [];
  if (!p.exam) return days;
  var ex = pd(p.exam);
  for (var d = new Date(t); d < ex; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) { if (p.off.indexOf(d.getDay()) < 0) days.push(fd(d)); }
  return days;
}
function autoPlan(sid, p) {
  var days = studyDays(p), n = days.length, dates = {};
  if (!n) return dates;
  var us = subjById(sid).units, mocks = us.filter(function (u) { return u.mock; }), mi = {}, back = [n - 1, n - 4, n - 9];
  mocks.forEach(function (u, i) { var j = mocks.length - 1 - i; mi[u.id] = Math.max(0, back[Math.min(j, 2)]); if (counts(u).rest > 0) dates[u.id] = days[mi[u.id]]; });
  var firstMock = mocks.length ? Math.max(1, Math.min.apply(null, mocks.map(function (u) { return mi[u.id]; }))) : n;
  var nm = orderOf(sid).map(unitById).filter(function (u) { return !u.mock && counts(u).rest > 0; }), T = 0, c = 0;
  nm.forEach(function (u) { T += remMins(u); });
  nm.forEach(function (u) { dates[u.id] = days[Math.min(firstMock - 1, Math.floor(c / T * firstMock))]; c += remMins(u); });
  return dates;
}
function planEntries(sid) {
  var p = store.plans[sid], out = [];
  if (!p || !p.dates) return out;
  orderOf(sid).forEach(function (id) { var u = unitById(id); if (counts(u).rest > 0 && p.dates[id]) out.push({ u: u, date: p.dates[id], mins: remMins(u) * 2 }); });
  out.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
  return out;
}
function renderPlan() {
  var sid = view.subj, S = subjById(sid), p = getPlan(sid), days = studyDays(p), n = days.length, need = 0, i;
  S.units.forEach(function (u) { if (counts(u).rest > 0) need += remMins(u) * 2; });
  var avail = n * p.daily;
  var h = '<div class="topbar"><button class="btn" data-act="home">← ホーム</button></div><div><h1>学習計画</h1><p class="sub">受験日と1日の勉強時間を入れると、残りの問題を日ごとに割り振ります。予定日は、あとから1つずつ自由に変えられます。</p></div>';
  if (SUBJECTS.length > 1) h += subjTabs(sid, "ptab");
  h += '<div class="card pform">';
  if (S.kinds) {
    h += '<div class="fld"><span>試験の種類</span><div class="offs">';
    S.kinds.forEach(function (k) { h += '<label class="chk"><input type="radio" name="kind" data-pf="kind" value="' + k[0] + '"' + ((p.kind || S.kinds[0][0]) === k[0] ? " checked" : "") + ">" + esc(k[1]) + "</label>"; });
    h += "</div></div>";
    h += '<p class="sub">' + ((p.kind || S.kinds[0][0]) === "net" ? "ネット試験は、テストセンターで日時を自分で選べます。予約した日(まだなら受けたい日)を入れてください。" : "統一試験は、決まった日に全国一斉に行われます。日本商工会議所の試験日を入れてください。") + "</p>";
  }
  h += '<label class="fld"><span>' + esc(S.name) + 'の受験日</span><input type="date" data-pf="exam" value="' + esc(p.exam) + '"></label>' +
    '<label class="fld"><span>1日の勉強時間</span><select data-pf="daily">';
  for (i = 30; i <= 420; i += 30) h += '<option value="' + i + '"' + (i === p.daily ? " selected" : "") + ">" + (i < 60 ? "30分" : Math.floor(i / 60) + "時間" + (i % 60 ? "30分" : "")) + "</option>";
  h += '</select></label><div class="fld"><span>休む曜日</span><div class="offs">';
  for (i = 0; i < 7; i++) h += '<label class="chk"><input type="checkbox" data-pf="off" data-d="' + i + '"' + (p.off.indexOf(i) >= 0 ? " checked" : "") + ">" + W[i] + "</label>";
  h += '</div></div><button class="btn primary" data-act="autoplan">この条件で予定を組む</button></div>';
  if (!p.exam) h += '<p class="sub">受験日を入れてください。まだ決まっていなければ、目標の日でも構いません。</p>';
  else {
    var ok = avail >= need;
    h += '<div class="card" style="gap:6px"><strong>試験まで あと ' + daysLeft(p) + "日(勉強できる日 " + n + "日)</strong>" +
      '<div class="sub">残りの問題(解説の確認や復習を含め、目安時間の2倍で見積もり)で約 ' + Math.round(need / 6) / 10 + "時間 / 使える時間 " + Math.round(avail / 6) / 10 + "時間</div>" +
      '<div class="' + (ok ? "okmsg" : "ngmsg") + '">' + (ok ? "時間は足りています。余った時間は、×の問題の解き直しと要点の復習に使えます(余裕は約" + Math.round((avail - need) / 6) / 10 + "時間)。" : "約" + Math.round((need - avail) / 6) / 10 + "時間足りません。1日あたり約" + Math.ceil(need / Math.max(n, 1) / 10) * 10 + "分に増やすか、休む日を減らしてください。") + "</div></div>";
  }
  var es = planEntries(sid), planned = {};
  es.forEach(function (e) { planned[e.u.id] = 1; });
  if (!es.length) h += '<p class="sub">まだ予定がありません。上のボタンで自動で組むと、ここに日ごとの予定が出ます。</p>';
  var cur = "", load = {}; es.forEach(function (e) { load[e.date] = (load[e.date] || 0) + e.mins; });
  es.forEach(function (e) {
    if (e.date !== cur) { cur = e.date; h += '<h2 class="dayh">' + jd(cur) + '<span class="' + (load[cur] > p.daily * 1.25 ? "ngmsg" : "sub") + '">合計 ' + Math.round(load[cur]) + "分</span></h2>"; }
    h += planRow(e.u, e.date, e.mins);
  });
  var un = orderOf(sid).filter(function (id) { return !planned[id] && counts(unitById(id)).rest > 0; });
  if (un.length) { h += '<h2 class="dayh">予定日が未設定</h2>'; un.forEach(function (id) { var u = unitById(id); h += planRow(u, "", remMins(u) * 2); }); }
  app.innerHTML = h; bar.hidden = true;
}
function planRow(u, date, m) {
  return '<div class="prow"><div class="pn"><span class="name">' + (u.mock ? '<em class="mtag2">模擬</em>' : "") + esc(u.name) + '</span><span class="sub">' + Math.round(m) + '分(解説の確認を含む)</span></div>' +
    '<input type="date" data-pf="date" data-id="' + u.id + '" value="' + esc(date) + '"></div>';
}
function onChange(e) {
  var t = e.target, f = t.getAttribute && t.getAttribute("data-pf");
  if (!f) return;
  var sid = view.subj, p = getPlan(sid); store.plans[sid] = p;
  if (f === "exam") p.exam = t.value || "";
  else if (f === "kind") p.kind = t.value;
  else if (f === "daily") p.daily = +t.value;
  else if (f === "off") { var d = +t.getAttribute("data-d"), k = p.off.indexOf(d); if (t.checked && k < 0) p.off.push(d); if (!t.checked && k >= 0) p.off.splice(k, 1); }
  else if (f === "date") { var id = t.getAttribute("data-id"); if (t.value) p.dates[id] = t.value; else delete p.dates[id]; }
  save(); render();
}

/* ---------- ホーム ---------- */
function subjTabs(cur, cls) {
  var h = '<div class="subjtabs" role="tablist">';
  SUBJECTS.forEach(function (s) {
    var c = subjCounts(s.id);
    h += '<button class="stab' + (s.id === cur ? " on" : "") + '" role="tab" aria-selected="' + (s.id === cur) + '" data-act="' + (cls === "ptab" ? "psubj" : "subj") + '" data-id="' + s.id + '"><b>' + esc(s.short) + "</b><small>" + (c.rest ? "残り " + c.rest + "問" : "完了") + "</small></button>";
  });
  return h + "</div>";
}
function unitBtn(u) {
  var c = counts(u);
  return '<button class="unit" data-act="open" data-id="' + u.id + '"><div class="top"><span class="name">' + (u.lv ? '<em class="lv lv-b">' + esc(u.lv) + "</em>" : "") + esc(u.name) + '</span><span class="weeks">' + (c.rest === 0 ? "完了" : "") + "</span></div>" +
    '<div class="bar"><i class="ok" style="width:' + (c.ok / c.n * 100) + '%"></i><i class="ng" style="width:' + (c.ng / c.n * 100) + '%"></i></div>' +
    '<div class="stat"><span>' + c.n + "問・目安 " + fmtMin(unitMins(u)) + "</span><span>○ " + c.ok + "</span><span>× " + c.ng + "</span><span>未解答 " + c.rest + "</span></div></button>";
}
function curStep() {
  var now = new Date(), y = now.getFullYear();
  if (y !== 2026) return 0;
  var t = new Date(y, now.getMonth(), now.getDate()).getTime();
  for (var i = 0; i < STEPS.length; i++) { if (t <= new Date(2026, STEPS[i].e[0] - 1, STEPS[i].e[1]).getTime()) return i; }
  return STEPS.length;
}
function findNext(sid) {
  var ids = orderOf(sid);
  for (var j = 0; j < ids.length; j++) { var u = unitById(ids[j]), c = counts(u); if (c.rest > 0) return { u: u, c: c }; }
  return null;
}
function todayItems() {
  var tdy = fd(today0()), od = [], td = [], up = [];
  SUBJECTS.forEach(function (s) {
    planEntries(s.id).forEach(function (e) {
      e.s = s;
      if (e.date < tdy) od.push(e); else if (e.date === tdy) td.push(e); else up.push(e);
    });
  });
  var by = function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; };
  od.sort(by); up.sort(by);
  return { od: od, td: td, up: up };
}
function renderHome() {
  var sid = view.subj, S = subjById(sid), sc = subjCounts(sid), i;
  var h = '<div class="head"><h1>' + esc(ONLY ? S.title : "資格ドリル") + '</h1><button class="link" data-act="data" id="cstat">' + esc(stateText()) + "</button></div>";
  if (!lget("shk_noted")) {
    h += '<div class="codebox"><b>この合言葉を、メモしてください</b><div class="code">' + esc(showCode(cloud.code)) + '</div><span class="sub">記録は、この合言葉で自動保存されます。端末が変わったり、記録が消えたりしたときは、この合言葉で戻せます。ログインは不要です。</span>' +
      '<div class="row"><button class="btn" data-act="code-copy">合言葉をコピー</button><button class="btn primary" data-act="noted">メモした</button></div><button class="link" data-act="data">すでに合言葉がある(別の端末や、ほかの科目で使っている)</button><span class="sub" id="cmsg"></span></div>';
  }
  if (SUBJECTS.length > 1) h += subjTabs(sid, "tab");
  if (S.note) h += '<p class="sub">' + esc(S.note) + "</p>";
  // 今日やること
  var T = todayItems(), items = T.od.concat(T.td), label = "";
  h += '<section class="hero"><div class="eyebrow">今日やること</div>';
  if (items.length) label = T.od.length ? "予定より遅れている分があります" : "今日の予定";
  else if (T.up.length) { items = [T.up[0]]; label = "今日の予定は完了。次は " + jd(T.up[0].date); }
  if (items.length) {
    var e0 = items[0], c0 = counts(e0.u), sum = 0; items.forEach(function (e) { sum += e.mins; });
    h += '<div class="hname">' + esc(e0.u.name) + '</div><div class="hsub">' + esc(e0.s.short) + " ・ " + label + " ・ 残り " + c0.rest + "問(約" + Math.round(e0.mins) + "分)</div>" +
      '<button class="btn hbtn" data-act="open" data-id="' + e0.u.id + '">' + (c0.ok + c0.ng ? "続きから始める" : "始める") + "</button>";
    if (items.length > 1) { h += '<div class="hsub">このあとの予定(合計 ' + Math.round(sum) + "分)</div>"; items.slice(1, 5).forEach(function (e) { h += '<button class="hl" data-act="open" data-id="' + e.u.id + '">' + esc(e.s.short) + " ・ " + esc(e.u.name) + "(" + Math.round(e.mins) + "分)</button>"; }); }
  } else {
    var nx = findNext(sid);
    if (nx) h += '<div class="hname">' + esc(nx.u.name) + '</div><div class="hsub">予定はまだありません。おすすめの順では、次はこの単元です。 ・ 残り ' + nx.c.rest + "問</div>" +
      '<button class="btn hbtn" data-act="open" data-id="' + nx.u.id + '">' + (nx.c.ok + nx.c.ng ? "続きから始める" : "始める") + "</button>";
    else h += '<div class="hname">' + esc(S.short) + "は全部解きました</div><div class=\"hsub\">×の問題を解き直しましょう。</div>";
  }
  if (sc.ng) h += '<button class="hlink" data-act="review-all">× の問題だけ解き直す(' + esc(S.short) + " " + sc.ng + "問)</button>";
  h += "</section>";
  var dsum = dueSummary(sid);
  if (dsum.total) {
    h += '<section class="card"><b>今日の復習 ' + dsum.total + '問</b><span class="sub">間違えた問題を、間をあけて解き直すと忘れにくくなります。</span>';
    dsum.list.forEach(function (x) { h += '<button class="hl" data-act="due" data-id="' + x.u.id + '">' + esc(x.u.name) + "(" + x.n + "問)</button>"; });
    h += "</section>";
  }
  // 計画
  var p = store.plans[sid], has = p && planEntries(sid).length > 0;
  h += '<button class="plancta" data-act="plan"><span><b>' + esc(S.short) + "の学習計画を" + (has ? "見る・変える" : "立てる") + "</b><small>" + (p && p.exam ? "受験日 " + jd(p.exam) + (S.kinds ? "(" + (S.kinds.filter(function (k) { return k[0] === (p.kind || S.kinds[0][0]); })[0] || S.kinds[0])[1] + ")" : "") + "・あと" + daysLeft(p) + "日" : "受験日と勉強時間を入れると、日ごとの予定を作ります") + "</small></span><i>›</i></button>";
  // 模擬試験
  var mocks = S.units.filter(function (u) { return u.mock; });
  if (mocks.length) {
    h += '<section class="mockbox"><div class="mhead"><h2>模擬試験</h2><span class="mtag">本番と同じ90分・5大問</span></div><p class="sub">仕上げに使います。通しで解いて、間違いを見直してください。</p><div class="mgrid">';
    mocks.forEach(function (u, k) {
      var c = counts(u), d = has && p.dates[u.id] && c.rest > 0 ? jd(p.dates[u.id]) : "";
      h += '<button class="mock" data-act="open" data-id="' + u.id + '"><span class="mn">第' + (k + 1) + '回</span><span class="mm">90分</span><span class="ms">' + (c.rest === c.n ? "未挑戦" : c.rest === 0 ? (u.ps[0].pt ? mockScore(u).got + " / " + mockScore(u).max + "点" : "○ " + c.ok + " / " + c.n) : "途中 " + (c.n - c.rest) + " / " + c.n) + "</span>" + (d ? '<span class="mm">予定 ' + d + "</span>" : "") + "</button>";
    });
    h += "</div></section>";
  }
  h += '<div class="card" style="gap:10px"><div class="row" style="justify-content:space-between"><strong>' + esc(S.name) + " " + sc.n + '問</strong><span class="sub">○ ' + sc.ok + " / × " + sc.ng + " / 未解答 " + sc.rest + "</span></div>" +
    '<div class="bar"><i class="ok" style="width:' + (sc.ok / sc.n * 100) + '%"></i><i class="ng" style="width:' + (sc.ng / sc.n * 100) + '%"></i></div></div>';
  // 単元
  h += '<section class="group"><h2>単元の一覧</h2>';
  if (sid === "boki") {
    var cur = curStep();
    STEPS.forEach(function (St, i) {
      var left = 0; St.ids.forEach(function (id) { left += counts(unitById(id)).rest; });
      h += '<details class="step"' + (!has && i === Math.min(cur, STEPS.length - 1) ? " open" : "") + '><summary><span class="sn">' + (i + 1) + '</span><span class="stext"><b>' + esc(St.name) + "</b>" + (has ? "" : "<small>" + md(St.s) + "〜" + md(St.e) + "</small>") + "</span>" +
        '<span class="sleft">' + (left ? "残り " + left + "問" : "完了") + "</span></summary>";
      St.ids.forEach(function (id) { h += unitBtn(unitById(id)); });
      h += "</details>";
    });
  } else {
    S.units.forEach(function (u) { h += unitBtn(u); });
  }
  h += "</section>";
  h += '<button class="btn" data-act="data">データの保存・バックアップ・合言葉</button>';
  if (ONLY) {
    h += '<div class="others"><span class="sub">ほかの科目</span>';
    [["boki", "簿記2級"], ["itpass", "ITパスポート"], ["html5", "HTML5"]].forEach(function (x) { if (x[0] !== ONLY) h += '<a class="olink" href="../' + x[0] + '/">' + x[1] + "</a>"; });
    h += "</div>";
  }
  app.innerHTML = h; bar.hidden = true;
}

/* ---------- 問題を解く ---------- */
function startUnit(u, onlyNg) {
  var due = onlyNg === "due";
  view.subj = u.subj; lset("shk_subj", u.subj);
  var list = [];
  var dueSet = due ? dueIndices(u) : [];
  u.ps.forEach(function (p, i) { if (due ? dueSet.indexOf(i) >= 0 : (!onlyNg || store.res[rkey(u, i)] === 0)) list.push(i); });
  if (!list.length) list = u.ps.map(function (p, i) { return i; });
  view.mode = due ? "due" : "";
  var first = 0;
  if (!onlyNg && !due) { for (var n = 0; n < list.length; n++) { if (store.res[rkey(u, list[n])] === undefined) { first = n; break; } } }
  go("quiz", { unit: u, list: list, pos: first, revealed: false });
}
function move(d) {
  var np = view.pos + d;
  if (np < 0) return;
  if (np >= view.list.length) { go("done", {}); return; }
  go("quiz", { pos: np, revealed: false });
}
function renderQuiz() {
  var u = view.unit, idx = view.list[view.pos], p = u.ps[idx], k = rkey(u, idx), isChoice = !!p.c, isCode = !!p.code;
  var h = '<div class="topbar"><button class="link" data-act="home">← 単元一覧</button><span class="sub">' + (view.pos + 1) + " / " + view.list.length + "</span></div>";
  h += '<div class="progress"><i style="width:' + ((view.pos + (view.revealed ? 1 : 0)) / view.list.length * 100) + '%"></i></div>';
  h += '<div><div class="sub">' + esc(u.name) + "</div>" + '<div class="dots">';
  view.list.forEach(function (j, n) {
    var r = store.res[rkey(u, j)];
    h += '<button class="dot ' + (n === view.pos ? "cur " : "") + (r === 1 ? "ok" : r === 0 ? "ng" : "") + '" data-act="jump" data-n="' + n + '" aria-label="問' + (j + 1) + '">' + (j + 1) + "</button>";
  });
  h += "</div></div>";
  var target = mins(u, p), took = store.time[k];
  var timer = view.revealed
    ? '<p class="took' + (view.elapsed > target * 60000 ? " over" : "") + '">所要時間 <b>' + fmt(view.elapsed) + "</b>(目安 " + fmtMin(target) + ")</p>"
    : '<div class="timerrow"><span class="tm" id="tm" role="timer">' + fmt(curElapsed()) + '</span><span class="target">目安 ' + fmtMin(target) + (took ? "(前回 " + fmt(took * 1000) + ")" : "") + '</span><button class="link" data-act="tpause" id="tpause">' + (view.running ? "一時停止" : "再開") + "</button></div>";
  h += '<article class="card">' + (u.lv ? '<em class="lv lv-b">' + esc(u.lv) + "</em>" : "") + '<span class="tag">問' + (idx + 1) + " " + esc(p.t) + "</span>" + timer + (p.lvx ? '<div class="lvnote lv-e"><b>範囲外かも</b> ' + esc(p.lvx) + "</div>" : "") + '<p class="qtext">' + esc(p.q) + "</p>";
  if (isChoice) {
    h += '<div class="choices" role="group" aria-label="選択肢">';
    p.c.forEach(function (c, n) {
      var cls = "choice";
      if (view.revealed) cls += n === p.k ? " right" : n === view.picked ? " wrong" : "";
      h += '<button class="' + cls + '" data-act="pick" data-n="' + n + '"' + (view.revealed ? " disabled" : "") + '><span class="cn">' + (n + 1) + "</span><span>" + esc(c) + "</span></button>";
    });
    h += "</div>";
    if (view.revealed) h += '<p class="verdict ' + (view.picked === p.k ? "good" : "bad") + '">' + (view.picked === p.k ? "○ 正解です" : "× 不正解です。正解は " + (p.k + 1) + " 番") + "</p>";
  } else {
    h += '<div><label class="memo" for="memo">' + (isCode ? "自分の答え(コードを書く。この端末と合言葉に保存)" : "自分の答え・計算メモ(保存されます)") + '</label><textarea id="memo" class="' + (isCode ? "mono" : "") + '" spellcheck="false" placeholder="' + (isCode ? "ここにコードを書いてから、答えを見ましょう" : "ここに仕訳や計算を書いてから、答えを見ましょう") + '">' + esc(store.memo[k] || "") + "</textarea></div>";
  }
  if (view.revealed) {
    h += '<div class="answer">';
    if (!isChoice) h += "<h3>" + (isCode ? "模範解答" : "解答") + "</h3>" + (isCode ? '<pre class="codeans">' + esc(p.code) + "</pre>" : p.a.map(journalHTML).join(""));
    h += '<div class="expl"><b>解説</b>' + esc(p.e) + "</div>";
    if (p.w) h += '<div class="trap' + (store.res[k] === 0 ? " miss" : "") + '"><b>' + (store.res[k] === 0 ? "ここで間違えやすい" : "ひっかけポイント・覚え方") + "</b>" + esc(p.w) + "</div>";
    h += "</div>";
  }
  h += "</article>";
  if (window.matchMedia && window.matchMedia("(hover:hover) and (pointer:fine)").matches) {
    h += '<p class="kbd">キーボード: ' + (isChoice ? "1〜4で選ぶ・" : "Enterで答えを見る・o で○・x で×・") + "← → で前後の問題・Esc で一覧へ</p>";
  }
  app.innerHTML = h;
  var b = '<button class="btn nav" data-act="prev" aria-label="前の問題"' + (view.pos === 0 ? " disabled" : "") + ">‹</button>";
  if (isChoice) b += view.revealed ? '<button class="btn primary" data-act="next">次の問題へ ›</button>' : '<span class="hintbar">選択肢を選んでください</span>';
  else if (!view.revealed) b += '<button class="btn primary" data-act="reveal">答えを見る</button>';
  else if (p.pt) { var pv = store.pts[k]; b += '<label class="ptlab">得点<input id="ptin" class="ptin" type="number" inputmode="numeric" min="0" max="' + p.pt + '" value="' + (pv === undefined ? "" : pv) + '" placeholder="0">/ ' + p.pt + '点</label><button class="btn primary" data-act="score">次へ ›</button>'; }
  else b += '<button class="btn ng" data-act="grade" data-v="0">× 違った</button><button class="btn ok" data-act="grade" data-v="1">○ できた</button>';
  if (!(isChoice && view.revealed)) b += '<button class="btn nav" data-act="next" aria-label="次の問題">›</button>';
  barin.innerHTML = b; bar.hidden = false;
  var ta = document.getElementById("memo");
  if (ta) ta.addEventListener("input", function () { store.memo[k] = ta.value; save(); });
}
function renderDone() {
  var u = view.unit, ok = 0, ng = 0;
  view.list.forEach(function (j) { var r = store.res[rkey(u, j)]; if (r === 1) ok++; else if (r === 0) ng++; });
  var h = '<div class="topbar"><button class="link" data-act="home">← 単元一覧</button></div>';
  if (u.mock && u.ps[0].pt) {
    var ms = mockScore(u), pass = Math.round(ms.max * 0.7), need = Math.max(0, pass - ms.got);
    h += '<div class="card result"><span class="tag">' + esc(u.name) + '</span><div class="big">' + ms.got + " / " + ms.max + '点</div><p class="sub">' +
      (ms.done < ms.n ? "採点していない問題が" + (ms.n - ms.done) + "つあります。" : ms.got >= pass ? "合格ライン(" + pass + "点)を超えました。" : "合格ラインの" + pass + "点まで、あと" + need + "点です。") + '</p><div class="steps">';
    u.ps.forEach(function (p, i) { var v = store.pts[rkey(u, i)]; h += '<div class="sub">第' + (i + 1) + "問 " + (v === undefined ? "未採点" : v + " / " + p.pt + "点") + "</div>"; });
    h += '</div><p class="sub">点が低かった大問から、解説を読み直しましょう。</p><div class="row"><button class="btn primary" data-act="retry">点が足りない問題だけ解き直す</button><button class="btn" data-act="home">一覧へ</button></div></div>';
    app.innerHTML = h; bar.hidden = true; return;
  }
  h += '<div class="card result"><span class="tag">' + esc(u.name) + '</span><div class="big">' + ok + " / " + view.list.length + '問 できた</div>' +
    '<p class="sub">' + (ng ? "× の問題が" + ng + "問あります。解説を読んでから、もう一度解いてみましょう。" : "すべて○です。次の単元に進みましょう。") + "</p>" +
    '<div class="row">' + (ng ? '<button class="btn primary" data-act="retry">× だけ解き直す</button>' : "") + '<button class="btn" data-act="restart">最初から解く</button><button class="btn" data-act="home">一覧へ</button></div></div>';
  app.innerHTML = h; bar.hidden = true;
}
function doPick(n) {
  if (view.revealed) return;
  var u = view.unit, idx = view.list[view.pos], p = u.ps[idx];
  view.elapsed = curElapsed(); view.running = false; view.revealed = true; view.picked = n;
  recordResult(rkey(u, idx), n === p.k); store.time[rkey(u, idx)] = Math.round(view.elapsed / 1000); save();
  render();
}
function doReveal() {
  view.elapsed = curElapsed(); view.running = false; view.revealed = true;
  store.time[rkey(view.unit, view.list[view.pos])] = Math.round(view.elapsed / 1000); save();
  render(); var a = document.querySelector(".answer"); if (a) a.scrollIntoView({ behavior: "smooth", block: "start" });
}
function doGrade(v) { recordResult(rkey(view.unit, view.list[view.pos]), v === 1); save(); move(1); }
function doScore() {
  var u = view.unit, idx = view.list[view.pos], p = u.ps[idx], el = document.getElementById("ptin"), v = Math.round(+(el && el.value));
  if (isNaN(v)) v = 0;
  v = Math.max(0, Math.min(p.pt, v));
  store.pts[rkey(u, idx)] = v; recordResult(rkey(u, idx), v >= p.pt * 0.7); save(); move(1);
}
function mockScore(u) {
  var got = 0, max = 0, done = 0;
  u.ps.forEach(function (p, i) { max += p.pt || 0; var v = store.pts[rkey(u, i)]; if (v !== undefined) { got += v; done++; } });
  return { got: got, max: max, done: done, n: u.ps.length };
}

/* ---------- データの保存・バックアップ ---------- */
function backupSummary(o) {
  var ok = 0, ng = 0, k;
  for (k in o.res) { if (o.res[k] === 1) ok++; else ng++; }
  return "○ " + ok + "問 / × " + ng + "問";
}
function renderData() {
  var h = '<div class="topbar"><button class="btn" data-act="home">← ホーム</button></div><div><h1>データの保存</h1><p class="sub">ログインは不要です。記録は、この端末と、合言葉の保存先に自動で保存されます。</p></div>';
  h += '<div class="card"><span class="sub" id="cstat">' + esc(stateText()) + '</span><b>あなたの合言葉</b><div class="code">' + esc(showCode(cloud.code)) + '</div><span class="sub">別の端末や、記録が消えたときは、この合言葉で戻せます。他の人には教えないでください。</span><div class="row"><button class="btn" data-act="code-copy">合言葉をコピー</button><button class="btn" data-act="sync-now">いま保存する</button></div><span class="sub" id="cmsg"></span></div>';
  h += '<div class="card"><b>合言葉で戻す</b><span class="sub">メモしておいた合言葉(10文字)を入れると、その記録に入れかえます。</span><input class="txt" id="codein" type="text" inputmode="latin" autocapitalize="none" autocomplete="off" spellcheck="false" placeholder="例: abcde-fghjk"><button class="btn primary" data-act="code-restore">この合言葉で戻す</button><span class="sub" id="rmsg"></span></div>';
  h += '<div class="card"><b>手元のバックアップ</b><span class="sub">念のため、進み具合を文字として控えておけます。</span><button class="btn" data-act="bk-copy">進み具合をコピーする</button><textarea id="bkbox" class="bkbox" placeholder="復元するときは、コピーした文字をここに貼り付けます"></textarea><button class="btn" data-act="bk-restore">貼り付けた内容から復元する</button><span class="sub" id="bkmsg"></span></div>';
  h += '<div class="card"><b>新しい記録で始める</b><span class="sub">別の人が使うときなどに。今の記録は消えず、いまの合言葉で戻せます。</span><button class="btn" data-act="new-record">新しい記録で始める</button></div>';
  app.innerHTML = h; bar.hidden = true;
}
function setMsg(id, t) { var el = document.getElementById(id); if (el) el.textContent = t; }
function copyText(t, done, fail) {
  try { navigator.clipboard.writeText(t).then(done, fail); } catch (e) { fail(); }
}
function restoreByCode() {
  var inp = document.getElementById("codein"), c = cleanCode(inp ? inp.value : "");
  if (!codeOk(c)) { setMsg("rmsg", "合言葉は10文字です。もう一度たしかめてください。"); return; }
  if (c === cloud.code) { setMsg("rmsg", "いま使っている合言葉です。"); return; }
  setMsg("rmsg", "さがしています…");
  fsGet(c).then(function (rem) {
    if (!rem) { setMsg("rmsg", "その合言葉の記録が見つかりません。"); return; }
    rem = normalize(rem);
    if (!window.confirm("今の記録を、この合言葉の記録に入れかえますか?\n\n今: " + backupSummary(store) + "\n合言葉の記録: " + backupSummary(rem) + "\n\n今の記録は、いまの合言葉(" + showCode(cloud.code) + ")で戻せます。")) { setMsg("rmsg", ""); return; }
    cloud.code = c; lset("shk_code", c); lset("shk_noted", "1");
    adoptStore(rem); cloud.baseTs = rem.ts; lset("shk_base", String(rem.ts)); cloud.dirty = false;
    setState("ok"); go("home", {});
  }, function () { setMsg("rmsg", "つながりませんでした。通信をたしかめて、もう一度試してください。"); });
}
function newRecord() {
  if (!window.confirm("新しい記録で始めますか?\n今の記録は消えず、いまの合言葉(" + showCode(cloud.code) + ")で戻せます。必ずメモしてください。")) return;
  var old = cloud.code;
  // 今の記録は、保存先に残してから切りかえる
  var done = function () {
    cloud.code = newCode(); lset("shk_code", cloud.code); lset("shk_noted", ""); lset("shk_base", "0"); cloud.baseTs = 0;
    store = normalize(null); persistLocal(); cloud.dirty = true;
    window.alert("新しい記録を始めます。前の合言葉は " + showCode(old) + " です。メモしてください。");
    go("home", {}); scheduleSync(300);
  };
  if (cloud.dirty) { syncNow().then(done, done); } else done();
}

/* ---------- 操作 ---------- */
app.addEventListener("click", handle);
bar.addEventListener("click", handle);
app.addEventListener("change", onChange);
function handle(e) {
  var t = e.target.closest("[data-act]");
  if (!t) return;
  var act = t.getAttribute("data-act");
  if (act === "open") startUnit(unitById(t.getAttribute("data-id")), false);
  else if (act === "due") startUnit(unitById(t.getAttribute("data-id")), "due");
  else if (act === "score") doScore();
  else if (act === "home") go("home", {});
  else if (act === "data") go("data", {});
  else if (act === "plan") go("plan", {});
  else if (act === "subj") { view.subj = t.getAttribute("data-id"); lset("shk_subj", view.subj); render(); }
  else if (act === "psubj") { view.subj = t.getAttribute("data-id"); lset("shk_subj", view.subj); render(); }
  else if (act === "autoplan") { var pp = getPlan(view.subj); pp.dates = autoPlan(view.subj, pp); store.plans[view.subj] = pp; save(); render(); }
  else if (act === "jump") go("quiz", { pos: +t.getAttribute("data-n"), revealed: false });
  else if (act === "tpause") {
    if (view.running) { view.elapsed = curElapsed(); view.running = false; } else { view.last = Date.now(); view.running = true; }
    render();
  }
  else if (act === "reveal") doReveal();
  else if (act === "pick") doPick(+t.getAttribute("data-n"));
  else if (act === "grade") doGrade(+t.getAttribute("data-v"));
  else if (act === "prev") move(-1);
  else if (act === "next") move(1);
  else if (act === "retry") startUnit(view.unit, true);
  else if (act === "restart") go("quiz", { pos: 0, revealed: false });
  else if (act === "review-all") {
    var us = subjById(view.subj).units;
    for (var i = 0; i < us.length; i++) { var c = counts(us[i]); if (c.ng) { startUnit(us[i], true); break; } }
  }
  else if (act === "noted") { lset("shk_noted", "1"); render(); }
  else if (act === "code-copy") copyText(cloud.code, function () { setMsg("cmsg", "コピーしました。メモに貼り付けてください。"); }, function () { setMsg("cmsg", "コピーできませんでした。表示の文字を書き写してください。"); });
  else if (act === "sync-now") syncNow();
  else if (act === "code-restore") restoreByCode();
  else if (act === "new-record") newRecord();
  else if (act === "bk-copy") {
    var txt = JSON.stringify(store);
    copyText(txt, function () { setMsg("bkmsg", "コピーしました。メモなどに貼り付けて保管してください。"); }, function () { document.getElementById("bkbox").value = txt; setMsg("bkmsg", "自動でコピーできなかったので、下の欄の文字を全部コピーしてください。"); });
  }
  else if (act === "bk-restore") {
    try { var o = JSON.parse(document.getElementById("bkbox").value); if (!o || typeof o.res !== "object") throw 0; adoptStore(o); save(); render(); setMsg("bkmsg", "復元しました。"); }
    catch (er) { setMsg("bkmsg", "読み取れませんでした。コピーした文字をそのまま貼り付けてください。"); }
  }
}
document.addEventListener("keydown", function (e) {
  if (e.metaKey || e.altKey) return;
  var tag = (e.target && e.target.tagName) || "";
  var typing = tag === "TEXTAREA" || tag === "INPUT" || tag === "SELECT";
  if (view.name !== "quiz") return;
  var p = view.unit.ps[view.list[view.pos]];
  if (typing) { if (e.key === "Enter" && e.target.id === "ptin") { e.preventDefault(); doScore(); return; } if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && !view.revealed && !p.c) { e.preventDefault(); doReveal(); } return; }
  if (e.ctrlKey) return;
  if (e.key === "Escape") go("home", {});
  else if (e.key === "ArrowLeft") move(-1);
  else if (e.key === "ArrowRight") move(1);
  else if (p.c && !view.revealed && /^[1-4]$/.test(e.key) && +e.key <= p.c.length) doPick(+e.key - 1);
  else if (p.c && view.revealed && e.key === "Enter") move(1);
  else if (!p.c && !view.revealed && e.key === "Enter") { e.preventDefault(); doReveal(); }
  else if (!p.c && view.revealed && (e.key === "o" || e.key === "O")) doGrade(1);
  else if (!p.c && view.revealed && (e.key === "x" || e.key === "X")) doGrade(0);
});

render();
syncNow();
if ("serviceWorker" in navigator && /^https?:/.test(location.protocol)) { navigator.serviceWorker.register(ROOT + "sw.js").catch(function () {}); }
