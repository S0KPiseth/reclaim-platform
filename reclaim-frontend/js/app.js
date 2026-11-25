import { api, session, imgSrc, ApiError } from "./api.js";
import { MAX_IMAGE_BYTES, IMAGE_TYPES } from "./config.js";

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = (d) => new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(d));
const localInput = (d) => { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 16); };
const app = $("#app");
const render = (html) => { app.innerHTML = html; app.focus({ preventScroll: true }); window.scrollTo(0, 0); };
const loading = () => render(`<p class="state">Loading…</p>`);
const go = (h) => { location.hash = h; };

function toast(msg, type = "ok") {
  const t = document.createElement("div");
  t.className = "toast " + type; t.textContent = msg;
  $("#toasts").append(t); setTimeout(() => t.remove(), 4500);
}
function confirmBox(title, text, ok) {
  return new Promise((res) => {
    const d = $("#confirm");
    $("#c-title").textContent = title; $("#c-text").textContent = text; $("#c-ok").textContent = ok;
    d.returnValue = ""; d.onclose = () => res(d.returnValue === "ok"); d.showModal();
  });
}
const alertBox = (m) => `<div class="alert" role="alert">${esc(m)}</div>`;
const badge = (s) => `<span class="badge ${esc(s.toLowerCase())}">${esc(s[0] + s.slice(1).toLowerCase())}</span>`;
const pic = (it) => { const u = imgSrc(it.images?.[0]?.url); return u ? `<img src="${esc(u)}" alt="${esc(it.title)}" loading="lazy">` : `<div class="ph">No photo yet</div>`; };
const card = (it) => `<a class="card" href="#/item/${esc(it.id)}"><div class="pic">${pic(it)}</div><div class="cb">
  <div class="row"><span class="pill">${esc(it.category?.name)}</span>${badge(it.status)}</div>
  <h3>${esc(it.title)}</h3><p class="meta">📍 ${esc(it.foundLocation)}</p><p class="meta">${esc(fmt(it.foundAt))}</p></div></a>`;

/* ---------- nav ---------- */
function nav() {
  const u = session.user;
  $("#nav").innerHTML = `<a class="brand" href="#/"><img src="img/reclaim-mark.svg" alt="" width="28" height="28">Reclaim</a>
  <div class="links"><a href="#/">Browse</a>${u ? `<a href="#/post">Post a find</a><a href="#/mine">My posts</a><a href="#/claims">My claims</a>` : ""}</div>
  <div class="auth">${u ? `<span class="hi">Hi, ${esc(u.name.split(" ")[0])}</span><button class="btn ghost sm" id="logout">Log out</button>`
    : `<a class="btn ghost sm" href="#/login">Log in</a><a class="btn sm" href="#/register">Sign up</a>`}</div>`;
  $("#logout")?.addEventListener("click", () => { session.clear(); toast("Logged out."); go("#/"); nav(); });
  document.querySelectorAll("#nav .links a").forEach((a) => a.toggleAttribute("aria-current", a.getAttribute("href") === (location.hash.split("?")[0] || "#/")));
}
const needAuth = () => { if (session.user) return false; toast("Log in to do that.", "err"); go("#/login?next=" + encodeURIComponent(location.hash)); return true; };

/* ---------- browse ---------- */
async function home(q) {
  loading();
  const s = { q: q.get("q") || "", category: q.get("category") || "", status: q.get("status") === "RETURNED" ? "RETURNED" : "OPEN", page: Math.max(1, +q.get("page") || 1), smart: q.get("mode") === "semantic" };
  const href = (o) => { const n = { ...s, ...o }; const p = new URLSearchParams(); if (n.q) p.set("q", n.q); if (n.category) p.set("category", n.category); if (n.status !== "OPEN") p.set("status", n.status); if (n.smart) p.set("mode", "semantic"); if (n.page > 1) p.set("page", n.page); return "#/?" + p; };
  const p = new URLSearchParams({ status: s.status, page: s.page, limit: 12 });
  if (s.q) { p.set("q", s.q); if (s.smart) p.set("mode", "semantic"); }
  if (s.category) p.set("category", s.category);
  const [list, cats] = await Promise.all([api("/items?" + p), api("/categories")]);
  const pages = Math.max(1, Math.ceil(list.total / list.limit));
  render(`<section class="hero"><h1>Lost it?<br>Let’s find it.</h1><p>Campus finds, posted by people who picked them up. Search, spot yours, claim it.</p>
  <form id="search" class="searchbar" role="search"><label class="sr" for="q">Search found items</label>
  <input id="q" name="q" type="search" maxlength="200" placeholder="black charger, blue bottle, keys…" value="${esc(s.q)}">
  <button class="btn" type="submit">Search</button></form>
  <label class="check"><input type="checkbox" id="smart" ${s.smart ? "checked" : ""}> Smart search (matches similar words, needs the AI service)</label></section>
  <div class="filters"><div class="chips" aria-label="Category">
    <a class="chip" href="${href({ category: "", page: 1 })}" ${!s.category ? 'aria-current="true"' : ""}>All</a>
    ${cats.data.map((c) => `<a class="chip" href="${href({ category: c.slug, page: 1 })}" ${s.category === c.slug ? 'aria-current="true"' : ""}>${esc(c.name)} <small>${c.itemCount}</small></a>`).join("")}</div>
  <div class="tabs"><a href="${href({ status: "OPEN", page: 1 })}" ${s.status === "OPEN" ? 'aria-current="true"' : ""}>Open</a><a href="${href({ status: "RETURNED", page: 1 })}" ${s.status === "RETURNED" ? 'aria-current="true"' : ""}>Returned</a></div></div>
  ${list.searchMode === "semantic" ? `<p class="note">Showing smart-search results.</p>` : s.smart && s.q ? `<p class="note">Smart search is offline, so these are keyword results.</p>` : ""}
  ${list.data.length ? `<div class="grid">${list.data.map(card).join("")}</div>
  <nav class="pager" aria-label="Pages">${s.page > 1 ? `<a class="btn ghost sm" href="${href({ page: s.page - 1 })}">Previous</a>` : ""}<span>Page ${s.page} of ${pages}</span>${s.page < pages ? `<a class="btn ghost sm" href="${href({ page: s.page + 1 })}">Next</a>` : ""}</nav>`
  : `<div class="empty"><h2>Nothing here yet</h2><p>${s.q || s.category ? "No items match that search. Try fewer words or another category." : "No items in this list."}</p><a class="btn" href="#/post">Post a find</a></div>`}`);
  $("#search").addEventListener("submit", (e) => { e.preventDefault(); go(href({ q: $("#q").value.trim(), smart: $("#smart").checked, page: 1 })); });
}

/* ---------- detail ---------- */
async function detail(id) {
  loading();
  const { data: it } = await api("/items/" + encodeURIComponent(id));
  const me = session.user, owner = me && me.id === it.poster.id;
  const imgs = it.images.map((i) => imgSrc(i.url)).filter(Boolean);
  let claimsHtml = "";
  if (owner) {
    const { data: claims } = await api(`/items/${encodeURIComponent(id)}/claims`);
    claimsHtml = `<section class="panel"><h2>Claims (${claims.length})</h2>${claims.length ? claims.map((c) => `<article class="claim"><div class="row"><strong>${esc(c.claimant.name)}</strong>${badge(c.status)}</div>
      <p>${esc(c.message)}</p><p class="meta">${esc(c.claimant.email)}${c.claimant.phone ? " · " + esc(c.claimant.phone) : ""}</p>
      ${c.status === "PENDING" ? `<div class="actions"><button class="btn sm" data-claim="${esc(c.id)}" data-s="APPROVED">Approve</button><button class="btn ghost sm" data-claim="${esc(c.id)}" data-s="REJECTED">Reject</button></div>` : ""}</article>`).join("") : `<p class="meta">No claims yet. Check back soon.</p>`}</section>`;
  }
  const claimForm = !owner && it.status === "OPEN" ? (me ? `<section class="panel"><h2>Is this yours?</h2><form id="claim" novalidate><div id="cerr"></div>
    <label for="msg">Prove it. Describe something only the owner would know.</label><textarea id="msg" name="message" rows="4" maxlength="2000" required></textarea><button class="btn" type="submit">Send claim</button></form></section>`
    : `<section class="panel"><h2>Is this yours?</h2><p>Log in to send a claim.</p><a class="btn" href="#/login?next=${encodeURIComponent("#/item/" + id)}">Log in</a></section>`) : "";
  render(`<a class="back" href="#/">Back to browse</a><article class="detail"><div class="gallery">${imgs.length ? imgs.map((u) => `<img src="${esc(u)}" alt="${esc(it.title)}">`).join("") : `<div class="ph big">No photo yet</div>`}</div>
  <div class="info"><div class="row"><span class="pill">${esc(it.category.name)}</span>${badge(it.status)}</div><h1>${esc(it.title)}</h1>
  <p class="desc">${esc(it.description)}</p><dl><dt>Found at</dt><dd>${esc(it.foundLocation)}</dd><dt>When</dt><dd>${esc(fmt(it.foundAt))}</dd><dt>Posted by</dt><dd>${esc(it.poster.name)}</dd>
  ${it.handoverNote ? `<dt>Handover</dt><dd>${esc(it.handoverNote)}</dd>` : ""}</dl>
  ${owner && it.status !== "ARCHIVED" ? `<div class="actions"><a class="btn ghost" href="#/edit/${esc(it.id)}">Edit</a>${it.status !== "RETURNED" ? `<button class="btn" id="ret">Mark as returned</button>` : ""}<button class="btn danger" id="rm">Remove post</button></div>` : ""}</div></article>${claimForm}${claimsHtml}`);
  $("#ret")?.addEventListener("click", () => act(() => api("/items/" + id, { method: "PATCH", body: { status: "RETURNED" } }), "Marked as returned."));
  $("#rm")?.addEventListener("click", async () => { if (await confirmBox("Remove this post?", "It will disappear from the board. This can’t be undone from here.", "Remove post")) act(() => api("/items/" + id, { method: "DELETE" }), "Post removed.", "#/mine"); });
  document.querySelectorAll("[data-claim]").forEach((b) => b.addEventListener("click", () => act(() => api("/claims/" + b.dataset.claim, { method: "PATCH", body: { status: b.dataset.s } }), "Claim " + b.dataset.s.toLowerCase() + ".")));
  $("#claim")?.addEventListener("submit", async (e) => {
    e.preventDefault(); const m = $("#msg").value.trim();
    if (m.length < 10) return ($("#cerr").innerHTML = alertBox("Message must be at least 10 characters."));
    await act(() => api(`/items/${id}/claims`, { method: "POST", body: { message: m } }), "Claim sent.", null, "#cerr");
  });
}
async function act(fn, ok, to, errSel) {
  try { await fn(); toast(ok); to ? go(to) : route(); }
  catch (e) { if (errSel && $(errSel)) $(errSel).innerHTML = alertBox(e.message); else toast(e.message, "err"); }
}

/* ---------- create / edit ---------- */
async function form(id) {
  if (needAuth()) return;
  loading();
  const [cats, existing] = await Promise.all([api("/categories"), id ? api("/items/" + encodeURIComponent(id)) : null]);
  const it = existing?.data;
  if (it && it.poster.id !== session.user.id) { toast("Only the poster can edit this.", "err"); return go("#/item/" + id); }
  const v = (k) => esc(it?.[k] ?? "");
  render(`<section class="formwrap"><h1>${it ? "Edit post" : "Post a find"}</h1><form id="f" novalidate><div id="ferr"></div>
  <label for="title">Title</label><input id="title" name="title" maxlength="150" required value="${v("title")}">
  <label for="description">Description</label><textarea id="description" name="description" rows="5" maxlength="5000" required>${v("description")}</textarea>
  <div class="two"><div><label for="category">Category</label><input id="category" name="category" list="cats" maxlength="40" required value="${esc(it?.category.name ?? "")}"><datalist id="cats">${cats.data.map((c) => `<option value="${esc(c.name)}">`).join("")}</datalist></div>
  <div><label for="foundAt">When did you find it?</label><input id="foundAt" name="foundAt" type="datetime-local" max="${localInput(Date.now())}" required value="${it ? localInput(it.foundAt) : localInput(Date.now())}"></div></div>
  <label for="foundLocation">Where did you find it?</label><input id="foundLocation" name="foundLocation" maxlength="200" required value="${v("foundLocation")}">
  <label for="handoverNote">Handover note <span class="opt">(optional)</span></label><input id="handoverNote" name="handoverNote" maxlength="1000" value="${v("handoverNote")}">
  <label for="images">Photo <span class="opt">(optional · JPEG or PNG · max 2 MB)</span></label><input id="images" name="images" type="file" accept="image/jpeg,image/png">
  <img id="prev" class="prev" alt="Photo preview" hidden>${it?.images.length ? `<p class="meta">Uploading a new photo replaces the current one.</p>` : ""}
  <div class="actions"><button class="btn" type="submit">${it ? "Save changes" : "Post"}</button><a class="btn ghost" href="#/${it ? "item/" + esc(it.id) : ""}">Cancel</a></div></form></section>`);
  const file = $("#images");
  file.addEventListener("change", () => {
    const f = file.files[0], prev = $("#prev"); prev.hidden = true;
    if (!f) return;
    if (!IMAGE_TYPES.includes(f.type)) { file.value = ""; return ($("#ferr").innerHTML = alertBox("Photo must be a JPEG or PNG.")); }
    if (f.size > MAX_IMAGE_BYTES) { file.value = ""; return ($("#ferr").innerHTML = alertBox("Photo must be 2 MB or smaller.")); }
    $("#ferr").innerHTML = ""; prev.src = URL.createObjectURL(f); prev.hidden = false;
  });
  $("#f").addEventListener("submit", async (e) => {
    e.preventDefault();
    const g = (n) => $("#" + n).value.trim(), btn = e.submitter; $("#ferr").innerHTML = "";
    if (g("title").length < 3) return ($("#ferr").innerHTML = alertBox("Title must be at least 3 characters."));
    if (g("description").length < 10) return ($("#ferr").innerHTML = alertBox("Description must be at least 10 characters."));
    if (g("category").length < 2) return ($("#ferr").innerHTML = alertBox("Choose or type a category."));
    if (!g("foundLocation") || !g("foundAt")) return ($("#ferr").innerHTML = alertBox("Location and date are required."));
    btn.disabled = true;
    try {
      const base = { title: g("title"), description: g("description"), category: g("category"), foundLocation: g("foundLocation"), foundAt: new Date(g("foundAt")).toISOString() };
      const pick = file.files[0]; let newId = id;
      if (it) {
        await api("/items/" + id, { method: "PATCH", body: { ...base, handoverNote: g("handoverNote") || null } });
        if (pick) { for (const i of it.images) await api("/images/" + encodeURIComponent(i.id), { method: "DELETE" }); const fd = new FormData(); fd.append("images", pick); await api(`/items/${id}/images`, { method: "POST", form: fd }); }
      } else {
        const fd = new FormData(); Object.entries(base).forEach(([k, val]) => fd.append(k, val));
        if (g("handoverNote")) fd.append("handoverNote", g("handoverNote"));
        if (pick) fd.append("images", pick);
        newId = (await api("/items", { method: "POST", form: fd })).data.id;
      }
      toast(it ? "Saved." : "Posted."); go("#/item/" + newId);
    } catch (err) { $("#ferr").innerHTML = alertBox(err.message); btn.disabled = false; }
  });
}

/* ---------- my posts / my claims ---------- */
async function mine() {
  if (needAuth()) return; loading();
  const { data } = await api("/items/mine");
  render(`<section class="formwrap wide"><div class="row"><h1>My posts</h1><a class="btn" href="#/post">Post a find</a></div>${data.length ? `<ul class="rows">${data.map((it) => `<li class="rowitem"><a class="thumb" href="#/item/${esc(it.id)}">${pic(it)}</a>
  <div class="grow"><a href="#/item/${esc(it.id)}"><strong>${esc(it.title)}</strong></a><p class="meta">${esc(it.category.name)} · ${esc(fmt(it.foundAt))} · ${it.claimCount ?? 0} claim(s)</p></div>${badge(it.status)}
  ${it.status !== "ARCHIVED" ? `<div class="actions"><a class="btn ghost sm" href="#/edit/${esc(it.id)}">Edit</a><button class="btn danger sm" data-rm="${esc(it.id)}">Remove</button></div>` : ""}</li>`).join("")}</ul>`
  : `<div class="empty"><h2>No posts yet</h2><p>Found something? Put it on the board so its owner can find it.</p><a class="btn" href="#/post">Post a find</a></div>`}</section>`);
  document.querySelectorAll("[data-rm]").forEach((b) => b.addEventListener("click", async () => { if (await confirmBox("Remove this post?", "It will disappear from the board.", "Remove post")) act(() => api("/items/" + b.dataset.rm, { method: "DELETE" }), "Post removed."); }));
}
async function claims() {
  if (needAuth()) return; loading();
  const { data } = await api("/claims/mine");
  render(`<section class="formwrap wide"><h1>My claims</h1>${data.length ? `<ul class="rows">${data.map((c) => `<li class="rowitem"><a class="thumb" href="#/item/${esc(c.item.id)}">${pic(c.item)}</a>
  <div class="grow"><a href="#/item/${esc(c.item.id)}"><strong>${esc(c.item.title)}</strong></a><p class="meta">${esc(c.message)}</p>
  ${c.posterContact ? `<p class="ok-note">Approved. Contact ${esc(c.item.poster.name)}: ${esc(c.posterContact.email)}${c.posterContact.phone ? " · " + esc(c.posterContact.phone) : ""}</p>` : ""}</div>${badge(c.status)}
  ${c.status === "PENDING" ? `<button class="btn ghost sm" data-w="${esc(c.id)}">Withdraw</button>` : ""}</li>`).join("")}</ul>`
  : `<div class="empty"><h2>No claims yet</h2><p>See something that’s yours? Open it and send a claim.</p><a class="btn" href="#/">Browse items</a></div>`}</section>`);
  document.querySelectorAll("[data-w]").forEach((b) => b.addEventListener("click", async () => { if (await confirmBox("Withdraw this claim?", "The poster won’t see it anymore.", "Withdraw")) act(() => api("/claims/" + b.dataset.w, { method: "PATCH", body: { status: "WITHDRAWN" } }), "Claim withdrawn."); }));
}

/* ---------- auth ---------- */
function authView(mode, q) {
  const reg = mode === "register", next = q.get("next");
  render(`<section class="formwrap narrow"><h1>${reg ? "Join Reclaim" : "Welcome back"}</h1><form id="a" novalidate><div id="aerr"></div>
  ${reg ? `<label for="name">Name</label><input id="name" name="name" autocomplete="name" maxlength="100" required>` : ""}
  <label for="email">Email</label><input id="email" type="email" autocomplete="email" required>
  <label for="password">Password ${reg ? `<span class="opt">(8+ characters)</span>` : ""}</label><input id="password" type="password" autocomplete="${reg ? "new-password" : "current-password"}" required>
  ${reg ? `<label for="phone">Phone <span class="opt">(optional, only shown to people you approve)</span></label><input id="phone" type="tel" autocomplete="tel" maxlength="30">` : ""}
  <button class="btn block" type="submit">${reg ? "Sign up" : "Log in"}</button></form>
  <p class="swap">${reg ? `Have an account? <a href="#/login">Log in</a>` : `New here? <a href="#/register">Sign up</a>`}</p></section>`);
  $("#a").addEventListener("submit", async (e) => {
    e.preventDefault(); const g = (n) => $("#" + n)?.value.trim() ?? "", btn = e.submitter;
    if (!/^\S+@\S+\.\S+$/.test(g("email"))) return ($("#aerr").innerHTML = alertBox("Enter a valid email."));
    if (reg && !g("name")) return ($("#aerr").innerHTML = alertBox("Name is required."));
    if (reg && $("#password").value.length < 8) return ($("#aerr").innerHTML = alertBox("Password must be at least 8 characters."));
    if (!$("#password").value) return ($("#aerr").innerHTML = alertBox("Password is required."));
    btn.disabled = true;
    try {
      const body = { email: g("email"), password: $("#password").value };
      if (reg) { body.name = g("name"); if (g("phone")) body.phone = g("phone"); }
      const r = await api(reg ? "/auth/register" : "/auth/login", { method: "POST", body });
      session.set(r.token, r.user); toast(reg ? "Account created." : "Logged in.");
      go(next && next.startsWith("#/") ? next : "#/");
    } catch (err) { $("#aerr").innerHTML = alertBox(err.message); btn.disabled = false; }
  });
}

/* ---------- errors + router ---------- */
function problem(e) {
  const nf = e.status === 404, net = e.status === 0;
  render(`<div class="empty"><h2>${nf ? "We can’t find that" : net ? "Server unreachable" : "That didn’t work"}</h2><p>${esc(nf ? "This post doesn’t exist or was removed." : e.message)}</p><a class="btn" href="#/">Back to browse</a></div>`);
}
async function route() {
  const [path, qs] = location.hash.slice(1).split("?"), p = (path || "/").split("/").filter(Boolean), q = new URLSearchParams(qs || "");
  nav();
  try {
    if (!p.length) return await home(q);
    if (p[0] === "item" && p[1]) return await detail(p[1]);
    if (p[0] === "post") return await form();
    if (p[0] === "edit" && p[1]) return await form(p[1]);
    if (p[0] === "mine") return await mine();
    if (p[0] === "claims") return await claims();
    if (p[0] === "login" || p[0] === "register") return authView(p[0], q);
    problem(new ApiError(404, "NOT_FOUND", "Page not found"));
  } catch (e) { problem(e instanceof ApiError ? e : new ApiError(500, "", "Something went wrong.")); }
}
addEventListener("hashchange", route);
route();
