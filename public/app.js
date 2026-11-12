/* Spicy Studio — browser client (no framework, no build step). */

const ICONS = {
  spark: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/><circle cx="12" cy="12" r="2.6"/></svg>',
  video: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="6" width="13" height="12" rx="2.5"/><path d="m16 10 5-3v10l-5-3"/></svg>',
  image: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="m4 18 5-5 4 4 2.5-2.5L20 19"/></svg>',
  download: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M12 3v11m0 0 4-4m-4 4-4-4"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>',
  copy: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
  trash: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h16M10 11v6M14 11v6"/><path d="M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  reuse: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.5 6.2L3 16"/><path d="M3 21v-5h5"/></svg>',
  reference: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M10.5 13.5a3.5 3.5 0 0 0 5 0l2.5-2.5a3.5 3.5 0 0 0-5-5L11 8"/><path d="M13.5 10.5a3.5 3.5 0 0 0-5 0L6 13a3.5 3.5 0 0 0 5 5l2-2"/></svg>',
  grip: '<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><circle cx="9" cy="6" r="1.4"/><circle cx="15" cy="6" r="1.4"/><circle cx="9" cy="12" r="1.4"/><circle cx="15" cy="12" r="1.4"/><circle cx="9" cy="18" r="1.4"/><circle cx="15" cy="18" r="1.4"/></svg>',
  upload: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 16V4m0 0L8 8m4-4 4 4"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg>',
  check: '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 12 4 4L19 6"/></svg>',
  alert: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M12 8v5M12 17h.01"/><path d="M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>',
  chevron: '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 5 7 7-7 7"/></svg>',
  play: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M8 5.5v13l11-6.5-11-6.5Z"/></svg>',
  book: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v18H6.5A2.5 2.5 0 0 1 4 18.5v-13Z"/><path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H20"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14m0 0-6-6m6 6-6 6"/></svg>',
  chevronDown: '<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.2"><path d="m5 9 7 7 7-7"/></svg>',
};

const STORAGE_KEY = "spicy-studio.v1";
const saved = (() => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
})();

/* Reject mismatched cached HTML/JS pairs after a deploy. */
const BUILD = "13";
const REFERENCE_MIME = "application/x-spicy-studio-reference";
try {
  const htmlBuild = document.querySelector('meta[name="spicy-build"]')?.content;
  if (htmlBuild !== BUILD && sessionStorage.getItem("spicy-build-reload") !== BUILD) {
    sessionStorage.setItem("spicy-build-reload", BUILD);
    location.replace(`/?v=${BUILD}`);
  }
} catch {
  /* storage unavailable */
}

const state = {
  models: [],
  tasks: [],
  selectedId: saved.selectedId || null,
  filter: saved.filter || "all",
  quantity: Math.min(4, Math.max(1, Number(saved.quantity) || 1)),
  activityView: saved.activityView === "grid" ? "grid" : "list",
  query: "",
  forms: {},
  optimizeResults: {},
  originals: {},
  optimizing: false,
  submitting: false,
  uploading: {},
  configured: false,
  optimizer: null,
  hydrated: false,
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const ELS = {
  modelList: $("#model-list"),
  modelCount: $("#model-count"),
  modelDialog: $("#model-dialog"),
  openModels: $("#open-models"),
  search: $("#model-search"),
  filters: $("#model-filters"),
  composer: $("#composer"),
  activity: $("#activity-list"),
  activityCount: $("#activity-count"),
  activityTitle: $("#activity-title"),
  activityLive: $("#activity-live"),
  activityView: $("#activity-view"),
  openGallery: $("#open-gallery"),
  expandGallery: $("#expand-gallery"),
  galleryDialog: $("#gallery-dialog"),
  galleryDialogGrid: $("#gallery-dialog-grid"),
  galleryCount: $("#gallery-count"),
  balance: $("#balance-value"),
  balanceChip: $("#balance-chip"),
  keyChip: $("#key-chip"),
  engineLabel: $("#engine-label"),
  toasts: $("#toasts"),
  guideDialog: $("#guide-dialog"),
  guideBody: $("#guide-body"),
  guideTitle: $("#guide-title"),
  lightbox: $("#lightbox"),
  lightboxBody: $("#lightbox-body"),
};

/* ───────────────────────── utilities ───────────────────────── */

const esc = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);

function safeUrl(value) {
  if (!value) return "";
  try {
    const url = new URL(value, location.origin);
    if (url.protocol === "http:" || url.protocol === "https:") return url.href;
  } catch {
    /* ignore */
  }
  return "";
}

function formatMoney(n) {
  const value = Number(n);
  if (!Number.isFinite(value)) return "—";
  if (value === 0) return "$0";
  if (value < 0.01) return `$${value.toFixed(4)}`;
  if (value < 1) return `$${value.toFixed(3)}`;
  return `$${value.toFixed(2)}`;
}

function formatElapsed(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function modelById(id) {
  return state.models.find((model) => model.id === id) || null;
}

function currentModel() {
  return modelById(state.selectedId) || state.models[0] || null;
}

function currentForm() {
  const model = currentModel();
  return model ? state.forms[model.id] : null;
}

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const method = String(options.method || "GET").toUpperCase();
  if (options.body && !(options.body instanceof FormData)) headers["Content-Type"] = "application/json";
  if (!["GET", "HEAD"].includes(method) && window.__SPICY_CSRF__) headers["X-CSRF-Token"] = window.__SPICY_CSRF__;
  const response = await fetch(path, { ...options, headers, credentials: "same-origin" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith("/api/auth/")) {
      location.replace("/login");
    }
    const error = new Error(data.error || `Request failed (${response.status})`);
    error.field = data.field;
    throw error;
  }
  return data;
}

function toast(message, kind = "info", icon = "alert") {
  const node = document.createElement("div");
  node.className = `toast ${kind}`;
  node.innerHTML = `${ICONS[icon] || ICONS.alert}<span>${esc(message)}</span>`;
  ELS.toasts.append(node);
  while (ELS.toasts.children.length > 3) ELS.toasts.firstElementChild.remove();
  setTimeout(() => {
    node.style.opacity = "0";
    node.style.transform = "translateY(4px)";
    node.style.transition = "opacity .2s, transform .2s";
    setTimeout(() => node.remove(), 220);
  }, 4600);
}

function savePrefs() {
  try {
    const model = currentModel();
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        selectedId: state.selectedId,
        filter: state.filter,
        quantity: state.quantity,
        activityView: state.activityView,
        form: model ? state.forms[model.id] : saved.form ?? null,
      })
    );
  } catch {
    /* storage may be full or disabled */
  }
}

let saveTimer = null;
function savePrefsSoon() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(savePrefs, 350);
}

/* ───────────────────────── boot ───────────────────────── */

const CATALOG_RETRY_MS = [1500, 4000, 9000, 16000];

async function init() {
  bindGlobal();

  try {
    const tasksRes = await api("/api/tasks");
    state.tasks = tasksRes.tasks || [];
  } catch (error) {
    toast(`Could not load activity: ${error.message}`, "error");
  }
  renderActivity();
  renderGalleryDialog();

  state.hydrated = true;
  startPolling();
  setInterval(tickElapsed, 1000);
  loadBalance();

  try {
    await loadModels();
  } catch (error) {
    renderComposerError(error);
  }
}

async function loadModels({ quiet = false, attempt = 0 } = {}) {
  const wasConfigured = state.configured;
  const hadComposer = Boolean(currentModel()?.contract);
  const res = await api("/api/models");

  state.models = res.models || [];
  state.configured = Boolean(res.configured);
  state.optimizer = res.optimizer || null;

  updateHeader();
  syncFilterUI();
  renderModelList();
  chooseModel();

  if (!quiet || !hadComposer || (!wasConfigured && state.configured) || !currentModel()) {
    renderComposer();
  } else {
    refreshComposerPrice();
    updateFooter();
  }

  if (res.catalog?.source === "fallback" && attempt < CATALOG_RETRY_MS.length) {
    setTimeout(() => {
      loadModels({ quiet: true, attempt: attempt + 1 }).catch(() => {
        /* keep the local fallback catalog */
      });
    }, CATALOG_RETRY_MS[attempt]);
  }

  return res;
}

function chooseModel() {
  const exists = state.models.some((model) => model.id === state.selectedId);
  if (!exists) {
    const firstVideo = state.models.find((model) => model.kind === "video" && model.supported);
    state.selectedId = (firstVideo || state.models.find((model) => model.supported) || state.models[0])?.id || null;
  }
  const model = modelById(state.selectedId);
  if (model) ensureForm(model);
}

function ensureForm(model, seedForm = null) {
  if (!state.forms[model.id]) {
    state.forms[model.id] = defaultsFor(model, seedForm);
  }
  return state.forms[model.id];
}

function defaultsFor(model, seedForm = null) {
  const form = {};
  for (const [key, prop] of Object.entries(model.contract?.properties || {})) {
    if (prop.type === "array") form[key] = [];
    else if (prop.type === "boolean") form[key] = prop.default ?? false;
    else if (prop.default !== undefined) form[key] = prop.default;
    else form[key] = "";
  }
  if (seedForm && typeof seedForm === "object") {
    for (const key of Object.keys(form)) {
      if (seedForm[key] !== undefined) form[key] = seedForm[key];
    }
  }
  for (const key of Object.keys(form)) {
    if (Array.isArray(form[key])) form[key] = form[key].filter((item) => typeof item === "string" && item);
  }
  return form;
}

function selectModel(id, { render = true } = {}) {
  if (!modelById(id)) return;
  state.selectedId = id;
  const model = modelById(id);
  ensureForm(model, saved.selectedId === id ? saved.form : null);
  if (render) {
    renderModelList();
    renderComposer();
    savePrefsSoon();
  }
}

/* ───────────────────────── model catalog ───────────────────────── */

function filteredModels() {
  const query = state.query.trim().toLowerCase();
  return state.models.filter((model) => {
    if (state.filter !== "all" && model.kind !== state.filter) return false;
    if (!query) return true;
    const haystack = [model.id, model.title, model.summary, model.guide?.label, ...(model.tags || [])]
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  });
}

function syncFilterUI() {
  if (!ELS.filters) return;
  $$(".seg", ELS.filters).forEach((seg) => {
    const active = seg.dataset.filter === state.filter;
    seg.classList.toggle("is-active", active);
    seg.setAttribute("aria-selected", String(active));
  });
}

function renderModelList() {
  if (!ELS.modelList) return;
  const list = filteredModels();
  const groups = [
    { kind: "video", label: "Video" },
    { kind: "image", label: "Image" },
  ];
  let html = "";
  for (const group of groups) {
    const models = list.filter((model) => model.kind === group.kind);
    if (!models.length) continue;
    html += `<div class="model-group-label">${group.label} · ${models.length}</div>`;
    html += models.map(modelCardHTML).join("");
  }
  if (!html) {
    html = `<div class="empty-mini"><p>No models match “${esc(state.query)}”.</p><small>Try a family name like Seedance or Wan.</small></div>`;
  }
  ELS.modelList.innerHTML = html;
  if (ELS.modelCount) ELS.modelCount.textContent = state.models.length;
}

function openModelPicker() {
  if (!ELS.modelDialog) return;
  state.query = "";
  if (ELS.search) ELS.search.value = "";
  renderModelList();
  if (!ELS.modelDialog.open) ELS.modelDialog.showModal();
  requestAnimationFrame(() => {
    ELS.search?.focus();
    $(".model-card.is-active", ELS.modelList)?.scrollIntoView({ block: "center" });
  });
}

function modelCardHTML(model) {
  const price = model.price ? `${model.price.display}/${model.price.unit}` : "";
  const tag = (model.tags || [])[0] || (model.kind === "video" ? "video" : "image");
  const active = model.id === state.selectedId ? "is-active" : "";
  const cover = safeUrl(model.cover);
  return `
    <button class="model-card ${active}" data-model="${esc(model.id)}" title="${esc(model.title)}" ${model.supported ? "" : "disabled"}>
      <span class="model-cover">${cover ? `<img src="${esc(cover)}" alt="" loading="lazy" />` : ""}</span>
      <span class="model-main">
        <span class="model-name">${esc(model.title)}</span>
        <span class="model-meta">
          <span class="kind-pill ${model.kind}">${model.kind === "video" ? "VID" : "IMG"}</span>
          <span>${esc(String(tag).replace(/-/g, " "))}</span>
        </span>
      </span>
      <span class="model-price">${esc(price)}</span>
    </button>`;
}

/* ───────────────────────── composer ───────────────────────── */

function isMediaField(key, prop) {
  return (
    (prop.type === "array" && prop.items?.format === "uri") ||
    (prop.type === "string" && prop.format === "uri")
  );
}

function mediaFieldKind(field) {
  if (/audio/i.test(field)) return "audio";
  if (field === "video" || /video/i.test(field)) return "video";
  return "image";
}

function referenceFieldFor(model, kind) {
  const entries = Object.entries(model?.contract?.properties || {}).filter(
    ([key, prop]) => isMediaField(key, prop) && mediaFieldKind(key) === kind
  );
  if (!entries.length) return null;

  const rank = ([key]) => {
    if (/reference/i.test(key)) return 100;
    if (kind === "video" && key === "video") return 90;
    if (key === "images") return 80;
    if (key === "image") return 70;
    if (/source/i.test(key)) return 50;
    if (/first/i.test(key)) return 40;
    if (/last/i.test(key)) return 30;
    return 0;
  };

  entries.sort((a, b) => rank(b) - rank(a));
  return entries[0];
}

function mediaAccept(field) {
  if (/audio/i.test(field)) return "audio/*";
  if (field === "video" || /video/i.test(field)) return "video/*";
  return "image/*";
}

function mediaPlaceholder(field) {
  if (/audio/i.test(field)) return "Paste a public audio URL (WAV / MP3)";
  if (field === "video" || /video/i.test(field)) return "Paste a public video URL (MP4 / MOV)";
  return "Paste a public image URL";
}

function mediaLabel(prop, field) {
  return prop.title || field.replace(/_/g, " ");
}

function mediaValue(form, field) {
  const value = form[field];
  return Array.isArray(value) ? value : value ? [value] : [];
}

function mediaUrlParts(url) {
  try {
    const parsed = new URL(url, location.origin);
    const file = decodeURIComponent(parsed.pathname.split("/").filter(Boolean).pop() || "");
    return { host: parsed.hostname, file: file || parsed.hostname };
  } catch {
    return { host: "", file: url || "" };
  }
}

function mediaRowHTML(url, field, index, single) {
  const safe = safeUrl(url);
  const { host, file } = mediaUrlParts(url);
  const video = field === "video" || /\.(mp4|mov|webm|m4v)(\?|$)/i.test(url);
  const audio = /audio/i.test(field);
  const image = !video && !audio;
  const thumb = video && safe
    ? `<video src="${esc(safe)}" muted playsinline preload="metadata"></video>`
    : image && safe
      ? `<img src="${esc(safe)}" alt="" loading="lazy" />`
      : audio
        ? ICONS.play
        : video
          ? ICONS.video
          : ICONS.image;
  const label = single ? mediaLabelFromUrl(file) : `Reference ${index + 1}`;
  return `
    <div class="media-row">
      <button class="media-thumb" type="button" data-action="media-open" data-field="${esc(field)}" data-index="${index}" aria-label="Preview ${esc(label)}" title="Preview ${esc(file)}">
        ${thumb}
        <span class="media-index">${index + 1}</span>
      </button>
      <span class="media-info">
        <span class="media-name">${esc(label)}</span>
        <span class="media-host" title="${esc(url)}">${esc([host, file].filter(Boolean).join(" · "))}</span>
      </span>
      <span class="media-actions">
        <button class="media-remove" data-action="media-remove" data-field="${esc(field)}" data-index="${index}" aria-label="Remove reference" title="Remove this reference">${ICONS.trash}<span>Remove</span></button>
      </span>
    </div>`;
}

function mediaLabelFromUrl(file) {
  const name = String(file || "").trim();
  if (!name) return "Attached";
  return name.length > 38 ? `${name.slice(0, 35)}…` : name;
}

function renderMediaBlock(model, field, prop) {
  const form = state.forms[model.id];
  const single = prop.type === "string";
  const values = mediaValue(form, field);
  const max = single ? 1 : prop.maxItems;
  const canAdd = values.length < (max ?? Infinity);
  const upload = state.uploading[field] || null;
  const uploading = Boolean(upload);
  const isAudio = /audio/i.test(field);
  const noun = isAudio ? "audio" : field === "video" ? "video" : "image";

  return `
    <div class="block media-block" id="media-${esc(field)}" data-media-field="${esc(field)}">
      <div class="block-head">
        <span class="block-label">${esc(mediaLabel(prop, field))}</span>
        <span class="block-head-right">
          <span class="block-note">${values.length ? `${values.length} added${max ? ` of ${max}` : ""}` : "optional"}</span>
          ${values.length ? `<button class="block-clear" data-action="media-clear" data-field="${esc(field)}" title="Remove all references in this field">Clear all</button>` : ""}
        </span>
      </div>
      ${upload ? renderUploadState(field, upload) : ""}
      <div class="media-list">${values.map((url, index) => mediaRowHTML(url, field, index, single)).join("")}</div>
      ${canAdd ? `
        <div class="media-add">
          <input class="input url-input" data-media-url="${esc(field)}" placeholder="${esc(mediaPlaceholder(field))}" autocomplete="off" spellcheck="false" />
          <button class="tiny-btn" data-action="media-add" data-field="${esc(field)}">Add</button>
          <button class="upload-btn ${uploading ? "is-busy" : ""}" data-action="upload" data-field="${esc(field)}" ${uploading ? "disabled" : ""}>
            ${ICONS.upload}<span>${uploading ? "Uploading…" : "Upload"}</span>
          </button>
          <input type="file" accept="${mediaAccept(field)}" data-file="${esc(field)}" hidden />
        </div>` : ""}
      ${!values.length && !uploading ? `<div class="drop-hint" data-drop="${esc(field)}">Drop ${noun === "audio" ? "audio" : `an ${noun}`} here, drag one from Activity, or paste a URL</div>` : ""}
    </div>`;
}

function renderUploadState(field, upload) {
  const preview =
    upload.previewUrl && upload.kind === "image"
      ? `<img src="${esc(upload.previewUrl)}" alt="" />`
      : upload.previewUrl && upload.kind === "video"
        ? `<video src="${esc(upload.previewUrl)}" muted playsinline></video>`
        : ICONS.upload;
  const processing = upload.phase === "processing";
  return `
    <div class="upload-state" id="upload-${esc(field)}">
      <span class="upload-thumb">${preview}</span>
      <span class="upload-copy">
        <strong title="${esc(upload.name)}">${esc(upload.name)}</strong>
        <small data-upload-label>${processing ? "Processing on SpicyModels…" : `Uploading ${upload.progress}% · ${formatBytes(upload.size)}`}</small>
        <span class="upload-bar"><span data-upload-bar style="width:${processing ? 100 : upload.progress}%"></span></span>
      </span>
    </div>`;
}

function updateUploadState(field) {
  const upload = state.uploading[field];
  const host = document.getElementById(`upload-${field}`);
  if (!upload || !host) return;
  const processing = upload.phase === "processing";
  const bar = host.querySelector("[data-upload-bar]");
  const label = host.querySelector("[data-upload-label]");
  if (bar) bar.style.width = `${processing ? 100 : upload.progress}%`;
  if (label) {
    label.textContent = processing
      ? "Processing on SpicyModels…"
      : `Uploading ${upload.progress}% · ${formatBytes(upload.size)}`;
  }
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function renderSwitch(key, prop, form) {
  const checked = Boolean(form[key]);
  return `
    <div class="field full">
      <div class="switch-row">
        <span class="switch-label">
          <strong>${esc(prop.title || key)}</strong>
          ${prop.description ? `<small>${esc(prop.description)}</small>` : ""}
        </span>
        <label class="switch">
          <input type="checkbox" data-field="${esc(key)}" ${checked ? "checked" : ""} />
          <span></span>
        </label>
      </div>
    </div>`;
}

function renderControl(key, prop, form) {
  const value = form[key] ?? "";
  const label = prop.title || key.replace(/_/g, " ");
  if (prop.type === "boolean") return renderSwitch(key, prop, form);

  let control = "";
  if (prop.type === "string" && prop.enum) {
    const auto = prop.default === undefined ? `<option value="" ${value === "" ? "selected" : ""}>Auto</option>` : "";
    control = `<select class="select" data-field="${esc(key)}">${auto}${prop.enum
      .map((option) => `<option value="${esc(option)}" ${String(value) === String(option) ? "selected" : ""}>${esc(option)}</option>`)
      .join("")}</select>`;
  } else if (key === "duration" && prop.type === "integer") {
    control = `
      <div class="range-row duration-field">
        <input type="range" min="${prop.minimum}" max="${prop.maximum}" step="1" value="${esc(value)}" data-field="${esc(key)}" data-range="1" />
        <input class="input" type="number" min="${prop.minimum}" max="${prop.maximum}" step="1" value="${esc(value)}" data-field="${esc(key)}" data-number="1" />
      </div>`;
  } else if (prop.type === "integer") {
    control = `<input class="input" type="number" min="${prop.minimum ?? ""}" max="${prop.maximum ?? ""}" step="1" value="${esc(value)}" data-field="${esc(key)}" placeholder="${prop.default ?? ""}" />`;
  } else if (key === "size") {
    control = `<input class="input" type="text" value="${esc(value)}" data-field="${esc(key)}" list="size-options" placeholder="2K / 3K / 4K / 2048x2048" />`;
  } else {
    control = `<input class="input" type="text" value="${esc(value)}" data-field="${esc(key)}" placeholder="${esc(prop.examples?.[0] || "")}" />`;
  }

  return `
    <div class="field">
      <label class="field-label" for="field-${esc(key)}">
        <span>${esc(label)}</span>
        ${prop.description ? `<span class="hint" title="${esc(prop.description)}">${esc(prop.description.slice(0, 34))}${prop.description.length > 34 ? "…" : ""}</span>` : ""}
      </label>
      ${control}
    </div>`;
}

function sizeControlFields(control) {
  if (!control) return [];
  return control.mode === "dimensions" ? [control.width, control.height] : [control.field];
}

function parseRatio(label) {
  const [width, height] = String(label).split(":").map(Number);
  return width > 0 && height > 0 ? width / height : 1;
}

function snapDimension(value) {
  return Math.max(8, Math.round(value / 8) * 8);
}

function parseSizeValue(control, form) {
  if (control.mode === "dimensions") {
    const width = Number(form[control.width]) || control.tiers[0].longEdge;
    const height = Number(form[control.height]) || control.tiers[0].longEdge;
    return { width, height };
  }
  const raw = String(form[control.field] || "").trim().toLowerCase();
  const dims = raw.match(/^(\d{2,5})x(\d{2,5})$/);
  if (dims) return { width: Number(dims[1]), height: Number(dims[2]) };
  if (control.mode === "presets") {
    if (raw === "2k") return { width: 2048, height: 2048 };
    const fallback = String(control.default || "2048x2048").split("x").map(Number);
    return { width: fallback[0] || 2048, height: fallback[1] || 2048 };
  }
  const tier = control.tiers.find((item) => item.label.toLowerCase() === raw);
  const longEdge = tier?.longEdge || control.tiers[0].longEdge;
  return { width: longEdge, height: longEdge };
}

function sizeFromPreset(control, ratioLabel, tierIndex) {
  const tier = control.tiers[tierIndex] || control.tiers[0];
  const ratio = parseRatio(ratioLabel);
  let width;
  let height;
  if (Math.abs(ratio - 1) < 1e-6) {
    width = tier.longEdge;
    height = tier.longEdge;
  } else if (ratio > 1) {
    width = tier.longEdge;
    height = snapDimension(tier.longEdge / ratio);
  } else {
    height = tier.longEdge;
    width = snapDimension(tier.longEdge * ratio);
  }
  if (control.max != null) {
    const scale = Math.min(1, control.max / Math.max(width, height));
    width = snapDimension(width * scale);
    height = snapDimension(height * scale);
  }
  if (control.min != null) {
    width = Math.max(control.min, width);
    height = Math.max(control.min, height);
  }
  return { width, height, tier };
}

function currentSizeState(control, form) {
  if (control.mode === "presets") {
    const raw = String(form[control.field] || "").trim().toLowerCase();
    const normalized = raw === "2k" ? "2048x2048" : raw;
    let ratioIndex = -1;
    let sizeIndex = -1;
    control.ratios.forEach((item, index) => {
      const found = item.sizes.findIndex((size) => size.value === normalized);
      if (found >= 0) {
        ratioIndex = index;
        sizeIndex = found;
      }
    });
    if (ratioIndex < 0) {
      const fallback = control.default || "2048x2048";
      control.ratios.forEach((item, index) => {
        const found = item.sizes.findIndex((size) => size.value === fallback);
        if (found >= 0) {
          ratioIndex = index;
          sizeIndex = found;
        }
      });
      if (ratioIndex >= 0) form[control.field] = fallback;
    }
    if (ratioIndex < 0) {
      ratioIndex = 0;
      sizeIndex = 0;
      form[control.field] = control.ratios[0].sizes[0].value;
    } else if (normalized !== raw) {
      form[control.field] = control.ratios[ratioIndex].sizes[sizeIndex].value;
    }
    const size = control.ratios[ratioIndex].sizes[sizeIndex];
    const [width, height] = size.value.split("x").map(Number);
    return { width, height, ratioIndex, sizeIndex, size };
  }

  const { width, height } = parseSizeValue(control, form);
  const ratio = width / height;
  let ratioIndex = 0;
  let ratioDistance = Infinity;
  control.ratios.forEach((label, index) => {
    const distance = Math.abs(Math.log(ratio / parseRatio(label)));
    if (distance < ratioDistance) {
      ratioDistance = distance;
      ratioIndex = index;
    }
  });
  let tierIndex = 0;
  let tierDistance = Infinity;
  control.tiers.forEach((tier, index) => {
    const distance = Math.abs(Math.log(Math.max(width, height) / tier.longEdge));
    if (distance < tierDistance) {
      tierDistance = distance;
      tierIndex = index;
    }
  });
  return { width, height, ratioIndex, tierIndex, tier: control.tiers[tierIndex] };
}

function renderSizePreset(model, control) {
  const form = state.forms[model.id];
  const current = currentSizeState(control, form);
  if (control.mode === "presets") {
    const ratio = control.ratios[current.ratioIndex];
    const ratios = control.ratios
      .map((item, index) => `<option value="${index}" ${index === current.ratioIndex ? "selected" : ""}>${esc(item.label)}</option>`)
      .join("");
    const sizes = ratio.sizes
      .map((size, index) => `<option value="${index}" data-label="${esc(size.label)}" ${index === current.sizeIndex ? "selected" : ""}>${esc(size.label)} · ${esc(size.value.replace("x", " × "))}</option>`)
      .join("");
    return `
      <div class="block size-preset" id="size-preset">
        <div class="field-grid">
          <div class="field">
            <label class="field-label" for="size-ratio"><span>Aspect ratio</span><span class="hint">${esc(ratio.label)}</span></label>
            <select class="select" id="size-ratio" data-size-ratio>${ratios}</select>
          </div>
          <div class="field">
            <label class="field-label" for="size-tier"><span>Resolution</span><span class="hint">${esc(current.size.label)}</span></label>
            <select class="select" id="size-tier" data-size-tier>${sizes}</select>
          </div>
        </div>
        <p class="size-readout" id="size-readout">${current.width} × ${current.height} px · ${esc(current.size.label)}</p>
      </div>`;
  }
  const ratios = control.ratios
    .map((label, index) => `<option value="${index}" ${index === current.ratioIndex ? "selected" : ""}>${esc(label)}</option>`)
    .join("");
  const tiers = control.tiers
    .map((tier, index) => `<option value="${index}" ${index === current.tierIndex ? "selected" : ""}>${esc(tier.label)}</option>`)
    .join("");
  return `
    <div class="block size-preset">
      <div class="field-grid">
        <div class="field">
          <label class="field-label" for="size-ratio"><span>Aspect ratio</span><span class="hint">${esc(control.ratios[current.ratioIndex])}</span></label>
          <select class="select" id="size-ratio" data-size-ratio>${ratios}</select>
        </div>
        <div class="field">
          <label class="field-label" for="size-tier"><span>Resolution</span><span class="hint">long edge</span></label>
          <select class="select" id="size-tier" data-size-tier>${tiers}</select>
        </div>
      </div>
      <p class="size-readout" id="size-readout">${current.width} × ${current.height} px · ${esc(current.tier.label)}</p>
    </div>`;
}

function applySizePreset(model, form, control, changed) {
  const ratioSelect = $("[data-size-ratio]", ELS.composer);
  const tierSelect = $("[data-size-tier]", ELS.composer);
  if (!ratioSelect || !tierSelect) return;

  if (control.mode === "presets") {
    const ratioIndex = Number(ratioSelect.value) || 0;
    const ratio = control.ratios[ratioIndex] || control.ratios[0];
    const changingRatio = Boolean(changed?.matches?.("[data-size-ratio]"));
    const previousLabel = tierSelect.selectedOptions?.[0]?.dataset?.label || "";
    let sizeIndex = changingRatio
      ? ratio.sizes.findIndex((size) => size.label === previousLabel)
      : Number(tierSelect.value) || 0;
    if (changingRatio && sizeIndex < 0) {
      const previous = parseSizeValue(control, form);
      const targetPixels = previous.width * previous.height;
      let closest = Infinity;
      ratio.sizes.forEach((size, index) => {
        const [width, height] = size.value.split("x").map(Number);
        const distance = Math.abs(width * height - targetPixels);
        if (distance < closest) {
          closest = distance;
          sizeIndex = index;
        }
      });
    }
    if (sizeIndex < 0) sizeIndex = 0;
    const size = ratio.sizes[sizeIndex] || ratio.sizes[ratio.sizes.length - 1];
    form[control.field] = size.value;
    if (changingRatio) {
      const host = document.getElementById("size-preset");
      if (host) host.outerHTML = renderSizePreset(model, control);
    } else {
      const [width, height] = size.value.split("x");
      const readout = $("#size-readout", ELS.composer);
      if (readout) readout.textContent = `${width} × ${height} px · ${size.label}`;
    }
    updateFooter();
    savePrefsSoon();
    return;
  }

  const ratioLabel = control.ratios[Number(ratioSelect.value)] || control.ratios[0];
  const { width, height, tier } = sizeFromPreset(control, ratioLabel, Number(tierSelect.value));
  if (control.mode === "dimensions") {
    form[control.width] = width;
    form[control.height] = height;
  } else {
    form[control.field] = `${width}x${height}`;
  }
  const readout = $("#size-readout", ELS.composer);
  if (readout) readout.textContent = `${width} × ${height} px · ${tier.label}`;
  updateFooter();
  savePrefsSoon();
}

function renderPromptSection(model) {
  const form = state.forms[model.id];
  const result = state.optimizeResults[model.id];
  const optimizable = model.guide && model.guide.optimizable !== false;
  const length = String(form.prompt || "").length;
  const placeholder =
    model.kind === "video"
      ? "Describe the shot — subject, action, setting, camera, light. Or write one line and let DeepSeek expand it."
      : "Describe the image — subject, styling, setting, light, lens. Or write one line and let DeepSeek expand it.";

  return `
    <div class="prompt-shell ${result ? "is-optimized" : ""}" id="prompt-shell">
      <div class="prompt-top">
        <span class="prompt-label">${model.promptable ? "Your idea" : "Prompt"}</span>
        <div class="prompt-tools">
          ${model.guide ? `<button class="ghost-btn" data-action="guide">${ICONS.book} Guide</button>` : ""}
          <span class="char-count" id="char-count">${length.toLocaleString()}</span>
        </div>
      </div>
      ${model.promptable
        ? `<textarea id="prompt-input" class="prompt-input" data-field="prompt" spellcheck="true" placeholder="${esc(placeholder)}">${esc(form.prompt || "")}</textarea>
           <div class="prompt-bottom">
             <span class="prompt-hint">${optimizable ? "DeepSeek rewrites this using the model's own prompt guide." : "This model does not use a text prompt."}</span>
             ${optimizable
               ? `<button class="optimize-btn" data-action="optimize" ${state.optimizing ? "disabled" : ""}>
                    ${state.optimizing ? '<span class="spin">' + ICONS.spark + "</span> Optimizing…" : ICONS.spark + " Optimize with DeepSeek V4.1"}
                  </button>`
               : ""}
           </div>`
        : `<div class="prompt-bottom"><span class="prompt-hint">${esc(model.guide?.summary || "This model works from the media you supply.")}</span></div>`}
    </div>
    <div id="optimize-host">${optimizePanelHTML(model)}</div>`;
}

function optimizePanelHTML(model) {
  const result = state.optimizeResults[model.id];
  if (!result) return "";
  const degraded = result.engine === "local-fallback";
  return `
    <div class="optimize-result">
      <div class="optimize-head">
        <span style="color:#46dda0">${ICONS.check}</span>
        <strong>Optimized</strong>
        <span>for ${esc(result.guide?.label || model.guide?.label || model.title)}</span>
        <span class="engine-tag">${esc(result.engineLabel || (degraded ? "Local structure" : "DeepSeek V4.1"))}</span>
        <button class="ghost-btn undo" data-action="undo">Undo</button>
      </div>
      ${Array.isArray(result.notes) && result.notes.length
        ? `<ul class="notes-list">${result.notes.map((note) => `<li>${ICONS.check}<span>${esc(note)}</span></li>`).join("")}</ul>`
        : ""}
      ${result.warning ? `<p class="optimize-warning">Local fallback: ${esc(result.warning)}</p>` : ""}
    </div>`;
}

function renderComposer() {
  if (!ELS.composer) return;
  const model = currentModel();
  if (!model) {
    ELS.composer.innerHTML = `<div class="composer-loading"><div class="skeleton-line wide"></div><div class="skeleton-line"></div><div class="skeleton-block"></div></div>`;
    return;
  }
  if (!model.contract) {
    ELS.composer.innerHTML = `
      <div class="composer-inner">
        <div class="composer-head"><div class="composer-title"><h2>${esc(model.title)}</h2><p>This model is in the catalog but its request schema is not mapped in this app yet.</p></div></div>
      </div>`;
    return;
  }

  const contract = model.contract;
  const form = state.forms[model.id];
  const entries = Object.entries(contract.properties);
  const sizeControl = contract.sizeControl || null;
  const presetFields = sizeControlFields(sizeControl);
  const mediaEntries = entries.filter(([key, prop]) => key !== "prompt" && isMediaField(key, prop));
  const consentEntry = entries.find(([key]) => key === "likeness_consent");
  const mainEntries = entries.filter(
    ([key, prop]) =>
      key !== "prompt" &&
      key !== "likeness_consent" &&
      !isMediaField(key, prop) &&
      !prop.advanced &&
      !presetFields.includes(key)
  );
  const advancedEntries = entries.filter(
    ([key, prop]) =>
      key !== "prompt" &&
      key !== "likeness_consent" &&
      !isMediaField(key, prop) &&
      prop.advanced &&
      !presetFields.includes(key)
  );

  const price = model.price ? `${model.price.display} <small>/${model.price.unit}</small>` : "Rate on submit";
  const cover = safeUrl(model.cover);

  ELS.composer.innerHTML = `
    <div class="composer-inner">
      <div class="composer-head">
        <button class="model-trigger" type="button" data-action="pick-model" aria-haspopup="dialog" title="Switch model">
          <span class="model-trigger-cover">${cover
            ? `<img src="${esc(cover)}" alt="" />`
            : (model.kind === "video" ? ICONS.video : ICONS.image)}</span>
          <span class="model-trigger-text">
            <span class="model-trigger-kicker">Model <span class="kind-pill ${model.kind}">${model.kind === "video" ? "VID" : "IMG"}</span></span>
            <span class="model-trigger-name">${esc(model.title)}</span>
            <span class="model-trigger-summary">${esc(model.summary || contract.summary || "Generate with this model.")}</span>
          </span>
          <span class="model-trigger-side">
            <span class="price-tag"><strong>${price}</strong><small>from SpicyModels</small></span>
            <span class="model-trigger-change">${ICONS.chevronDown} Change</span>
          </span>
        </button>
      </div>

      ${model.promptable || model.guide ? renderPromptSection(model) : ""}

      ${sizeControl ? renderSizePreset(model, sizeControl) : ""}

      ${mediaEntries.map(([key, prop]) => renderMediaBlock(model, key, prop)).join("")}

      ${mainEntries.length ? `<div class="block"><div class="field-grid">${mainEntries.map(([key, prop]) => renderControl(key, prop, form)).join("")}</div></div>` : ""}

      ${consentEntry ? `
        <div class="consent">
          <label>
            <input type="checkbox" data-field="likeness_consent" ${form.likeness_consent ? "checked" : ""} />
            <span><strong>Likeness consent is required.</strong> I confirm every person shown has given documented consent to this use, and I will not use this for sexual content, impersonation of a public figure, or any content involving a minor.</span>
          </label>
        </div>` : ""}

      ${advancedEntries.length ? `
        <details class="advanced">
          <summary>${ICONS.chevron} Advanced <span class="count">${advancedEntries.length}</span></summary>
          <div class="field-grid">${advancedEntries.map(([key, prop]) => renderControl(key, prop, form)).join("")}</div>
        </details>` : ""}
    </div>

    <div class="composer-foot">
      <div class="estimate">
        <strong id="estimate-main">—</strong>
        <small id="estimate-sub">Billed from your SpicyModels wallet.</small>
        ${state.configured ? "" : `<div class="key-hint" id="key-hint">Add your <code>SpicyModels</code> API key in <a href="#" data-open-settings-link>Settings</a> to generate.</div>`}
      </div>
      <div class="foot-actions">
        <label class="qty-control" title="Number of generations">
          <span>Qty</span>
          <select class="select qty-select" data-quantity>
            ${[1, 2, 3, 4].map((n) => `<option value="${n}" ${state.quantity === n ? "selected" : ""}>${n}</option>`).join("")}
          </select>
        </label>
        <button class="generate-btn" id="generate-btn" data-action="generate" ${state.submitting || !state.configured ? "disabled" : ""}>
          ${state.submitting ? '<span class="spinner"></span> Submitting…' : `${model.kind === "video" ? ICONS.video : ICONS.image} Generate ${state.quantity > 1 ? `${state.quantity} ${model.kind}s` : model.kind}`}
        </button>
      </div>
    </div>

    <datalist id="size-options"><option value="2K"></option><option value="3K"></option><option value="4K"></option><option value="2048x2048"></option><option value="1536x1024"></option><option value="1024x1536"></option></datalist>`;

  updateFooter();
  bindComposerDelegates();
}

function estimateFor(model, form) {
  const quantity = Math.max(1, Number(state.quantity) || 1);
  if (!model.price) {
    return {
      main: quantity > 1 ? `${quantity} generations` : "Price shown at submit",
      sub: "SpicyModels sets the final price.",
    };
  }
  if (model.kind === "image") {
    if (model.id === "qwen-image-edit-spicy") {
      const count = Math.min(3, Math.max(1, (form.images || []).length));
      const table = { 1: 0.072, 2: 0.0774, 3: 0.0828 };
      const unit = table[count];
      return {
        main: `${formatMoney(unit * quantity)} · ${quantity} edit${quantity === 1 ? "" : "s"} · ${count} input image${count === 1 ? "" : "s"}`,
        sub: `Per edit ${formatMoney(unit)} · billed by input image count · failed tasks are not charged.`,
      };
    }
    if (model.id === "seedream-5-0-pro" && model.contract?.sizeControl) {
      const { width, height } = parseSizeValue(model.contract.sizeControl, form);
      const megapixels = (width * height) / 1_000_000;
      const base = Number(model.price.amount) || 0;
      const unit = megapixels > 2.36 ? base * 2 : base;
      const tier = megapixels > 2.36 ? "2K" : "1.5K";
      return {
        main: `${formatMoney(unit * quantity)} · ${quantity} image${quantity === 1 ? "" : "s"}`,
        sub: `${width} × ${height}px · ${formatMoney(unit)}/image (${tier}) · failed tasks are not charged.`,
      };
    }
    const unit = Number(model.price.amount) || 0;
    return {
      main: `${formatMoney(unit * quantity)} · ${quantity} image${quantity === 1 ? "" : "s"}`,
      sub: quantity > 1 ? `${formatMoney(unit)}/image · failed tasks are not charged.` : "Billed per image · failed tasks are not charged.",
    };
  }
  if (model.id === "wan-animate" || model.id === "flashvsr-video-upscale") {
    return {
      main: `${model.price.display}/sec of input${quantity > 1 ? ` · × ${quantity}` : ""}`,
      sub: model.id === "flashvsr-video-upscale"
        ? "Target resolution sets the rate · input video length sets the total."
        : "Input video length sets the total · failed tasks are not charged.",
    };
  }
  const seconds = Math.max(1, Number(form.duration || 5));
  return {
    main: `from ${formatMoney(Number(model.price.amount) * seconds * quantity)} · ${seconds}s${quantity > 1 ? ` × ${quantity}` : ""}`,
    sub: `Base rate ${model.price.display}/sec · resolution sets the final rate`,
  };
}

function refreshComposerPrice() {
  const model = currentModel();
  const node = $(".model-trigger-side .price-tag strong");
  if (!node) return;
  if (model?.price) node.innerHTML = `${esc(model.price.display)} <small>/${esc(model.price.unit)}</small>`;
  else node.textContent = "Rate on submit";
}

function updateFooter() {
  const model = currentModel();
  const form = currentForm();
  if (!model || !form) return;
  const estimate = estimateFor(model, form);
  const main = $("#estimate-main");
  const sub = $("#estimate-sub");
  const button = $("#generate-btn");
  if (main) main.textContent = estimate.main;
  if (sub) sub.textContent = estimate.sub;
  if (button) {
    const quantity = Math.max(1, Number(state.quantity) || 1);
    button.disabled = state.submitting || !state.configured;
    button.innerHTML = state.submitting
      ? '<span class="spinner"></span> Submitting…'
      : `${model.kind === "video" ? ICONS.video : ICONS.image} Generate ${quantity > 1 ? `${quantity} ${model.kind}s` : model.kind}`;
  }
}

function syncPromptUI() {
  const model = currentModel();
  const form = currentForm();
  const textarea = $("#prompt-input");
  const count = $("#char-count");
  const shell = $("#prompt-shell");
  if (!model || !form) return;
  if (textarea && textarea.value !== (form.prompt || "")) textarea.value = form.prompt || "";
  if (count) count.textContent = String(form.prompt || "").length.toLocaleString();
  if (shell) shell.classList.toggle("is-optimized", Boolean(state.optimizeResults[model.id]));
}

function bindComposerDelegates() {
  if (ELS.composer.dataset.bound === "1") return;
  ELS.composer.dataset.bound = "1";

  ELS.composer.addEventListener("click", async (event) => {
    const actionEl = event.target.closest("[data-action]");
    if (!actionEl) return;
    const action = actionEl.dataset.action;
    const model = currentModel();
    const form = currentForm();
    if (!model || !form) return;

    if (action === "optimize") return optimize(model);
    if (action === "undo") return undoOptimize(model);
    if (action === "guide") return openGuide(model);
    if (action === "pick-model") return openModelPicker();
    if (action === "generate") return generate(model);
    if (action === "media-add") {
      const field = actionEl.dataset.field;
      const input = $(`[data-media-url="${CSS.escape(field)}"]`);
      const url = input?.value.trim();
      if (!url) return input?.focus();
      if (!safeUrl(url)) return toast("Use a public http(s) URL.", "error");
      addMedia(field, url);
      return;
    }
    if (action === "media-open") {
      const field = actionEl.dataset.field;
      const index = Number(actionEl.dataset.index || 0);
      openReferencePreview(field, index);
      return;
    }
    if (action === "media-clear") {
      clearMedia(actionEl.dataset.field);
      return;
    }
    if (action === "media-remove") {
      const field = actionEl.dataset.field;
      const index = Number(actionEl.dataset.index || 0);
      removeMedia(field, index);
      return;
    }
    if (action === "upload") {
      const field = actionEl.dataset.field;
      const fileInput = $(`[data-file="${CSS.escape(field)}"]`);
      fileInput?.click();
      return;
    }
  });

  ELS.composer.addEventListener("change", (event) => {
    if (!event.target.closest("[data-size-ratio], [data-size-tier]")) return;
    const model = currentModel();
    const form = currentForm();
    if (!model || !form || !model.contract?.sizeControl) return;
    applySizePreset(model, form, model.contract.sizeControl, event.target);
  });

  ELS.composer.addEventListener("change", (event) => {
    if (!event.target.closest("[data-quantity]")) return;
    state.quantity = Math.min(4, Math.max(1, Number(event.target.value) || 1));
    savePrefsSoon();
    updateFooter();
  });

  ELS.composer.addEventListener("change", (event) => {
    const field = event.target.dataset.field;
    if (!field) return;
    if (event.target.type === "file") return;
    const form = currentForm();
    const model = currentModel();
    if (!form) return;
    form[field] = event.target.type === "checkbox" ? event.target.checked : event.target.value;
    if (event.target.type === "number" || event.target.type === "range") {
      const twin = $(`[data-field="${CSS.escape(field)}"]${event.target.type === "range" ? "[data-number]" : "[data-range]"}`);
      if (twin) twin.value = event.target.value;
    }
    updateFooter();
    savePrefsSoon();
    if (field === "likeness_consent" && !event.target.checked) {
      toast("Likeness consent is required for this model.", "error");
    }
  });

  ELS.composer.addEventListener("input", (event) => {
    const field = event.target.dataset.field;
    const model = currentModel();
    const form = currentForm();
    if (!form) return;
    if (field === "prompt") {
      form.prompt = event.target.value;
      syncPromptUI();
      savePrefsSoon();
      return;
    }
    if (!field) return;
    if (event.target.type === "range" || event.target.type === "number") {
      const twin = $(`[data-field="${CSS.escape(field)}"]${event.target.type === "range" ? "[data-number]" : "[data-range]"}`);
      if (twin) twin.value = event.target.value;
      if (event.target.type === "range") {
        form[field] = event.target.value;
        updateFooter();
        savePrefsSoon();
      }
    }
  });

  ELS.composer.addEventListener("change", async (event) => {
    if (event.target.type !== "file") return;
    const field = event.target.dataset.file;
    const file = event.target.files?.[0];
    if (field && file) await uploadFile(field, file);
    event.target.value = "";
  });

  ELS.composer.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    const input = event.target.closest("[data-media-url]");
    if (!input) return;
    event.preventDefault();
    const field = input.dataset.mediaUrl;
    const url = input.value.trim();
    if (!safeUrl(url)) return toast("Use a public http(s) URL.", "error");
    addMedia(field, url);
  });

  ["dragenter", "dragover"].forEach((type) =>
    ELS.composer.addEventListener(type, (event) => {
      const block = event.target.closest("[data-media-field]");
      if (!block) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
      for (const node of $$(".media-block.is-over")) {
        if (node !== block) node.classList.remove("is-over");
      }
      block.classList.add("is-over");
    })
  );
  ELS.composer.addEventListener("dragleave", (event) => {
    const block = event.target.closest("[data-media-field]");
    if (!block) return;
    if (event.relatedTarget instanceof Node && block.contains(event.relatedTarget)) return;
    block.classList.remove("is-over");
  });
  ELS.composer.addEventListener("drop", async (event) => {
    const block = event.target.closest("[data-media-field]");
    if (!block) return;
    event.preventDefault();
    block.classList.remove("is-over");
    const field = block.dataset.mediaField;
    if (!field) return;

    const file = event.dataTransfer?.files?.[0];
    if (file) return uploadFile(field, file);

    const raw = event.dataTransfer?.getData(REFERENCE_MIME);
    if (raw) {
      try {
        const payload = JSON.parse(raw);
        const task = state.tasks.find((item) => item.id === payload.taskId);
        if (task) return useAsReference(task, Number(payload.outputIndex || 0), { field });
      } catch {
        /* fall through to a plain URL drop */
      }
    }

    const uri = (event.dataTransfer?.getData("text/uri-list") || event.dataTransfer?.getData("text/plain") || "")
      .split(/\r?\n/)
      .find((line) => line && !line.startsWith("#"));
    const url = safeUrl(uri);
    if (!url) return toast("That drop did not include a usable URL.", "error");
    const hinted = /\.(mp4|mov|webm|m4v)(?:[?#]|$)/i.test(url)
      ? "video"
      : /\.(mp3|wav|m4a)(?:[?#]|$)/i.test(url)
        ? "audio"
        : "";
    if (hinted && hinted !== mediaFieldKind(field)) {
      return toast(`That looks like ${hinted} media; drop it on a ${hinted} field.`, "error");
    }
    if (addMedia(field, url)) {
      toast("Added the dropped URL.", "ok", "check");
      revealMediaBlock(field);
    }
  });
}

function addMedia(field, url) {
  const model = currentModel();
  const form = currentForm();
  if (!model || !form) return false;
  const prop = model.contract.properties[field];
  if (!prop) return false;
  const single = prop.type === "string";
  if (single) {
    form[field] = url;
  } else {
    const list = Array.isArray(form[field]) ? form[field] : [];
    if (prop.maxItems != null && list.length >= prop.maxItems) {
      toast(`This field allows ${prop.maxItems} item(s).`, "error");
      return false;
    }
    form[field] = [...list, url];
  }
  refreshMediaBlock(field);
  updateFooter();
  savePrefsSoon();
  return true;
}

function removeMedia(field, index) {
  const model = currentModel();
  const form = currentForm();
  if (!model || !form) return;
  const prop = model.contract.properties[field];
  if (!prop) return;
  if (prop.type === "string") form[field] = "";
  else form[field] = (form[field] || []).filter((_, i) => i !== index);
  refreshMediaBlock(field);
  updateFooter();
  savePrefsSoon();
}

function clearMedia(field) {
  const model = currentModel();
  const form = currentForm();
  if (!model || !form) return;
  const prop = model.contract.properties[field];
  if (!prop) return;
  const values = mediaValue(form, field);
  if (!values.length) return;
  if (state.uploading[field]) return toast("Wait for the current upload to finish before clearing.", "error");
  if (!confirm(`Remove all ${values.length} ${values.length === 1 ? "reference" : "references"} from ${mediaLabel(prop, field)}?`)) return;
  form[field] = prop.type === "string" ? "" : [];
  refreshMediaBlock(field);
  updateFooter();
  savePrefsSoon();
  toast("References cleared.");
}

function openReferencePreview(field, index) {
  const model = currentModel();
  const form = currentForm();
  if (!model || !form) return;
  const prop = model.contract.properties[field];
  if (!prop) return;
  const value = mediaValue(form, field)[index];
  if (!value) return;
  const url = safeUrl(value);
  if (!url) return toast("This reference URL cannot be previewed.", "error");

  const audio = /audio/i.test(field);
  const video = !audio && (field === "video" || /video/i.test(field) || /\.(mp4|mov|webm|m4v)(\?|$)/i.test(value));
  const media = audio
    ? `<audio src="${esc(url)}" controls autoplay></audio>`
    : video
      ? `<video src="${esc(url)}" controls autoplay muted playsinline></video>`
      : `<img src="${esc(url)}" alt="${esc(mediaLabel(prop, field))}" />`;
  const title = prop.type === "string" ? mediaLabel(prop, field) : `${mediaLabel(prop, field)} ${index + 1}`;

  ELS.lightboxBody.innerHTML = `
    <div class="lightbox-media">${media}</div>
    <div class="lightbox-meta">
      <h3>${esc(title)}</h3>
      <p class="muted" style="word-break:break-all">${esc(value)}</p>
      <div class="task-actions" style="margin-top:10px">
        <button class="tiny-btn danger" data-action="media-remove-open" data-field="${esc(field)}" data-index="${index}">${ICONS.trash} Remove reference</button>
      </div>
    </div>`;
  ELS.lightbox.showModal();
}

function refreshMediaBlock(field) {
  const model = currentModel();
  if (!model) return;
  const host = document.getElementById(`media-${field}`);
  if (!host) return;
  const prop = model.contract.properties[field];
  host.outerHTML = renderMediaBlock(model, field, prop);
}

function revealMediaBlock(field) {
  const node = document.getElementById(`media-${field}`);
  if (!node) return;
  node.scrollIntoView({ behavior: "smooth", block: "center" });
  node.classList.add("is-flash");
  setTimeout(() => node.classList.remove("is-flash"), 1400);
}

function uploadFile(field, file) {
  const model = currentModel();
  if (!model) return;
  if (state.uploading[field]) return toast("An upload is already running for this field.", "error");

  const kind = file.type.startsWith("video/") || field === "video" || /video/i.test(field)
    ? "video"
    : file.type.startsWith("audio/") || /audio/i.test(field)
      ? "audio"
      : "image";
  const maxBytes = (kind === "image" ? 30 : 95) * 1024 * 1024;
  if (file.size > maxBytes) {
    return toast("Images can be up to 30 MB; video and audio up to 95 MB on this free-tier deployment.", "error");
  }
  let previewUrl = "";
  try {
    previewUrl = URL.createObjectURL(file);
  } catch {
    previewUrl = "";
  }

  state.uploading[field] = { name: file.name, size: file.size, progress: 0, phase: "uploading", kind, previewUrl };
  refreshMediaBlock(field);

  let settled = false;
  let ticker = null;
  const finish = (error) => {
    if (settled) return;
    settled = true;
    if (ticker) {
      clearInterval(ticker);
      ticker = null;
    }
    const upload = state.uploading[field];
    if (upload?.previewUrl) {
      try {
        URL.revokeObjectURL(upload.previewUrl);
      } catch {
        /* ignore */
      }
    }
    delete state.uploading[field];
    refreshMediaBlock(field);
    if (error) toast(error, "error");
  };

  const xhr = new XMLHttpRequest();
  xhr.open("POST", "/api/upload");
  xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
  xhr.setRequestHeader("X-Filename", encodeURIComponent(file.name));
  if (window.__SPICY_CSRF__) xhr.setRequestHeader("X-CSRF-Token", window.__SPICY_CSRF__);
  xhr.timeout = 210_000;

  xhr.upload.onprogress = (event) => {
    const upload = state.uploading[field];
    if (!upload || !event.lengthComputable) return;
    upload.progress = Math.max(1, Math.min(100, Math.round((event.loaded / event.total) * 100)));
    updateUploadState(field);
  };
  xhr.upload.onload = () => {
    const upload = state.uploading[field];
    if (!upload) return;
    upload.phase = "processing";
    upload.progress = 100;
    updateUploadState(field);
    if (ticker) clearInterval(ticker);
    const startedAt = Date.now();
    ticker = setInterval(() => {
      const host = document.getElementById(`upload-${field}`);
      const label = host?.querySelector("[data-upload-label]");
      if (!label) return;
      label.textContent = `Processing on SpicyModels… ${Math.round((Date.now() - startedAt) / 1000)}s`;
    }, 1000);
  };
  xhr.onload = () => {
    let data = {};
    try {
      data = JSON.parse(xhr.responseText || "{}");
    } catch {
      data = {};
    }
    if (xhr.status >= 200 && xhr.status < 300 && typeof data.url === "string") {
      let attached = false;
      try {
        attached = addMedia(field, data.url);
      } catch (error) {
        finish(error.message || "Could not attach the uploaded file.");
        return;
      }
      finish();
      if (attached) toast(`Uploaded ${file.name} · ${formatBytes(file.size)}`, "ok", "check");
      else toast("Upload finished, but it could not be attached to this model. Switch back to the model you uploaded for.", "error");
    } else {
      finish(data.error || `Upload failed (HTTP ${xhr.status}).`);
    }
  };
  xhr.onerror = () => finish("Upload failed — check the connection.");
  xhr.ontimeout = () => finish("Upload timed out. Try a smaller file or a faster connection.");
  xhr.onabort = () => finish("Upload cancelled.");
  xhr.send(file);
}

/* ───────────────────────── optimizer ───────────────────────── */

async function optimize(model) {
  const form = state.forms[model.id];
  if (!form.prompt?.trim()) {
    toast("Write an idea first.", "error");
    $("#prompt-input")?.focus();
    return;
  }
  if (state.optimizing) return;
  state.optimizing = true;
  updateOptimizeButton();
  try {
    const result = await api("/api/optimize", {
      method: "POST",
      body: JSON.stringify({ model: model.id, ...form }),
    });
    if (!state.originals[model.id]) state.originals[model.id] = form.prompt;
    form.prompt = result.prompt || form.prompt;
    if (result.negativePrompt && model.contract.properties.negative_prompt) {
      form.negative_prompt = result.negativePrompt;
    }
    state.optimizeResults[model.id] = result;
    syncPromptUI();
    $("#optimize-host").innerHTML = optimizePanelHTML(model);
    updateFooter();
    savePrefsSoon();
    if (result.engine === "local-fallback") {
      toast("Optimizer fallback used — Runware and OpenCode were unavailable.", "error");
    } else {
      toast(`Prompt optimized for ${result.guide?.label || model.title}`, "ok", "check");
    }
  } catch (error) {
    toast(error.message, "error");
  } finally {
    state.optimizing = false;
    updateOptimizeButton();
  }
}

function updateOptimizeButton() {
  const button = $('[data-action="optimize"]');
  if (!button) return;
  button.disabled = state.optimizing;
  button.innerHTML = state.optimizing
    ? `<span class="spin">${ICONS.spark}</span> Optimizing…`
    : `${ICONS.spark} Optimize with DeepSeek V4.1`;
}

function undoOptimize(model) {
  const form = state.forms[model.id];
  if (!form) return;
  if (state.originals[model.id] !== undefined) form.prompt = state.originals[model.id];
  delete state.optimizeResults[model.id];
  delete state.originals[model.id];
  syncPromptUI();
  $("#optimize-host").innerHTML = "";
  updateFooter();
  savePrefsSoon();
  toast("Restored your original prompt.");
}

/* ───────────────────────── generation ───────────────────────── */

async function generate(model) {
  const form = state.forms[model.id];
  if (!state.configured) return toast("Add your SpicyModels API key in Settings first.", "error");
  if (state.submitting) return;
  if (model.promptable && model.contract.required?.includes("prompt") && !String(form.prompt || "").trim()) {
    toast("This model needs a prompt.", "error");
    $("#prompt-input")?.focus();
    return;
  }
  if (model.contract.properties.likeness_consent && !form.likeness_consent) {
    toast("Confirm likeness consent before generating.", "error");
    return;
  }

  const body = { model: model.id };
  for (const [key, value] of Object.entries(form)) {
    if (value === "" || value === null || value === undefined) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    body[key] = value;
  }

  const quantity = Math.max(1, Math.min(4, Number(state.quantity) || 1));
  state.submitting = true;
  updateFooter();
  try {
    const results = await Promise.allSettled(
      Array.from({ length: quantity }, () =>
        api("/api/generate", { method: "POST", body: JSON.stringify(body) })
      )
    );
    const created = results.filter((result) => result.status === "fulfilled").map((result) => result.value.task);
    const failures = results.filter((result) => result.status === "rejected").map((result) => result.reason);
    created.forEach((task) => upsertTask(task, false));
    refreshResults();
    state.submitting = false;
    updateFooter();
    if (created.length) toast(`${created.length} × ${model.title} queued.`, "ok", "check");
    if (failures.length) {
      const first = failures[0];
      const message = quantity === 1
        ? first?.message || "Generation failed."
        : `${failures.length} of ${quantity} failed: ${first?.message || "Unknown error"}`;
      toast(message, "error");
      if (first?.field) {
        const field = $(`[data-field="${CSS.escape(first.field)}"]`);
        if (field) {
          field.classList.add("is-invalid");
          field.style.borderColor = "rgba(255,97,120,.7)";
          field.scrollIntoView({ behavior: "smooth", block: "center" });
          setTimeout(() => {
            field.style.borderColor = "";
          }, 2600);
        }
      }
    }
    if (created.length && window.innerWidth < 900) $(".rail-activity")?.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    state.submitting = false;
    updateFooter();
    toast(error.message, "error");
  }
}

/* ───────────────────────── tasks ───────────────────────── */

function upsertTask(task, live = true) {
  if (!task?.id) return;
  const index = state.tasks.findIndex((item) => item.id === task.id);
  const previous = index >= 0 ? state.tasks[index] : null;
  if (index >= 0) state.tasks[index] = { ...state.tasks[index], ...task };
  else state.tasks.unshift(task);
  state.tasks.sort((a, b) => b.createdAt - a.createdAt);
  if (live && state.hydrated && task.status === "completed" && previous?.status !== "completed") {
    toast(`${task.modelTitle || "Render"} is ready.`, "ok", "check");
  }
  if (index < 0 || previous?.status !== task.status) {
    refreshResults();
    if (previous?.status !== task.status && ["completed", "failed", "timeout"].includes(task.status)) {
      refreshBalanceSoon();
    }
  }
}

function statusInfo(task) {
  if (task.status === "submitting") return { label: "Submitting", cls: "submitting" };
  if (task.status === "processing") {
    const raw = String(task.spicyStatus || "").toLowerCase();
    if (raw === "created" || raw === "queued") return { label: "Queued", cls: "processing" };
    return { label: "Rendering", cls: "processing" };
  }
  if (task.status === "completed") return { label: "Ready", cls: "completed" };
  if (task.status === "timeout") return { label: "Timed out", cls: "timeout" };
  return { label: "Failed", cls: "failed" };
}

function outputAt(task, index = 0) {
  const outputs = Array.isArray(task?.outputs) ? task.outputs : [];
  return outputs[Number(index) || 0] || null;
}

function outputKind(task, index = 0) {
  const output = outputAt(task, index);
  return task?.kind === "video" || output?.type === "video" ? "video" : "image";
}

function firstOutput(task) {
  return task.outputs?.find((output) => output.local || output.remote) || null;
}

function taskCardHTML(task) {
  const status = statusInfo(task);
  const active = task.status === "processing" || task.status === "submitting";
  const output = firstOutput(task);
  const outputIndex = output && Array.isArray(task.outputs) ? Math.max(0, task.outputs.indexOf(output)) : 0;
  const url = output ? safeUrl(output.local) || safeUrl(output.remote) : "";
  const canReference = Boolean(output && (safeUrl(output.remote) || safeUrl(output.local)));
  const elapsed = active ? Date.now() - task.createdAt : task.elapsedMs || 0;

  let preview = "";
  if (url) {
    const dragAttrs = canReference
      ? `draggable="true" data-drag-task="${esc(task.id)}" data-drag-output="${outputIndex}" title="Drag into a reference field"`
      : "";
    const hint = canReference ? `<span class="task-drag-hint">${ICONS.grip} drag as reference</span>` : "";
    preview = task.kind === "video"
      ? `<div class="task-output" ${dragAttrs}><video src="${esc(url)}" muted preload="metadata" playsinline draggable="false"></video><button class="open-media" draggable="false" data-action="open" data-task="${esc(task.id)}" data-output="${outputIndex}" aria-label="Open video"></button>${hint}</div>`
      : `<div class="task-output" ${dragAttrs}><img src="${esc(url)}" alt="" loading="lazy" draggable="false" /><button class="open-media" draggable="false" data-action="open" data-task="${esc(task.id)}" data-output="${outputIndex}" aria-label="Open image"></button>${hint}</div>`;
  }

  return `
    <article class="task-card is-${status.cls}" data-task-card="${esc(task.id)}">
      <div class="task-top">
        <span class="task-status ${status.cls}"><span class="dot"></span>${status.label}</span>
        <span class="task-time" data-created="${task.createdAt}" data-elapsed="${active ? 0 : 1}">${formatElapsed(elapsed)}</span>
      </div>
      <div class="task-title">${esc(task.modelTitle || task.model)}</div>
      ${task.prompt ? `<div class="task-prompt">${esc(task.prompt)}</div>` : ""}
      ${active ? '<div class="task-progress"></div>' : ""}
      ${preview}
      ${task.error ? `<div class="task-error">${esc(task.error)}</div>` : ""}
      <div class="task-actions">
        ${url ? `<a class="tiny-btn download" href="${esc(url)}" download target="_blank" rel="noopener">${ICONS.download} Save</a>` : ""}
        ${canReference ? `<button class="tiny-btn ref" data-action="reference" data-task="${esc(task.id)}" data-output="${outputIndex}" draggable="true" data-drag-task="${esc(task.id)}" data-drag-output="${outputIndex}" title="Click to add as a reference, or drag into a reference field">${ICONS.reference} Use as ref</button>` : ""}
        ${task.prompt ? `<button class="tiny-btn" data-action="copy" data-task="${esc(task.id)}">${ICONS.copy} Copy</button>` : ""}
        <button class="tiny-btn" data-action="reuse" data-task="${esc(task.id)}">${ICONS.reuse} Reuse</button>
        ${!active
          ? `<button class="tiny-btn danger" data-action="delete" data-task="${esc(task.id)}" aria-label="Delete from activity" title="Delete from activity">${ICONS.trash} Delete</button>`
          : `<button class="tiny-btn danger" disabled title="Available when this render finishes">${ICONS.trash} Delete</button>`}
      </div>
    </article>`;
}

function galleryItems() {
  const items = [];
  for (const task of state.tasks) {
    if (task.status !== "completed" || !Array.isArray(task.outputs) || !task.outputs.length) continue;
    task.outputs.forEach((output, index) => {
      const url = safeUrl(output.local) || safeUrl(output.remote);
      if (url) items.push({ task, output, index, url });
    });
  }
  return items;
}

function galleryTileHTML({ task, index, url }, draggable = false) {
  const dragAttrs = draggable
    ? `draggable="true" data-drag-task="${esc(task.id)}" data-drag-output="${index}" title="Drag into a reference field"`
    : "";
  const mediaAttrs = draggable ? 'draggable="false"' : "";
  return `
    <button class="tile" ${dragAttrs} data-action="open" data-task="${esc(task.id)}" data-output="${index}" aria-label="Open ${esc(task.modelTitle || task.model)} render">
      ${task.kind === "video"
        ? `<video src="${esc(url)}" ${mediaAttrs} muted preload="metadata" playsinline></video><span class="tile-play">${ICONS.play}</span>`
        : `<img src="${esc(url)}" ${mediaAttrs} alt="" loading="lazy" />`}
      <span class="tile-info"><strong>${esc(task.modelTitle || task.model)}</strong><small>${esc(task.prompt || "")}</small></span>
    </button>`;
}

function galleryEmptyHTML() {
  const active = state.tasks.some((task) => task.status === "processing" || task.status === "submitting");
  return `
    <div class="gallery-empty">
      <span class="orb"></span>
      <p>${active ? "Rendering…" : "Nothing rendered yet."}</p>
      <small>${active ? "Finished outputs appear here automatically." : "Pick a model, write a prompt, and press Generate."}</small>
    </div>`;
}

function renderActivity() {
  if (!ELS.activity) return;
  const isGrid = state.activityView === "grid";
  ELS.activity.classList.toggle("is-grid", isGrid);
  if (ELS.activityTitle) ELS.activityTitle.textContent = isGrid ? "Gallery" : "Activity";
  if (ELS.expandGallery) ELS.expandGallery.hidden = !isGrid;
  if (ELS.activityView) {
    $$("[data-activity-view]", ELS.activityView).forEach((button) => {
      const active = button.dataset.activityView === state.activityView;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", active ? "true" : "false");
    });
  }

  if (isGrid) {
    const items = galleryItems();
    if (ELS.activityCount) ELS.activityCount.textContent = items.length;
    ELS.activity.innerHTML = items.length
      ? items.slice(0, 60).map((item) => galleryTileHTML(item, true)).join("")
      : galleryEmptyHTML();
    return;
  }

  const tasks = state.tasks.slice(0, 40);
  if (ELS.activityCount) ELS.activityCount.textContent = state.tasks.length;
  if (!tasks.length) {
    ELS.activity.innerHTML = `
      <div class="empty-mini">
        <span class="empty-orb"></span>
        <p>Your renders will queue here.</p>
        <small>Submit a prompt to start.</small>
      </div>`;
    return;
  }
  ELS.activity.innerHTML = tasks.map(taskCardHTML).join("");
}

function renderGalleryDialog() {
  if (!ELS.galleryDialogGrid) return;
  const items = galleryItems();
  if (ELS.galleryCount) {
    ELS.galleryCount.textContent = String(items.length);
  }
  ELS.galleryDialogGrid.innerHTML = items.length
    ? items.slice(0, 120).map(galleryTileHTML).join("")
    : galleryEmptyHTML();
}

function refreshResults() {
  renderActivity();
  if (ELS.galleryDialog?.open) renderGalleryDialog();
}

function openGallery() {
  renderGalleryDialog();
  if (ELS.galleryDialog && !ELS.galleryDialog.open) ELS.galleryDialog.showModal();
}

function setActivityView(view) {
  state.activityView = view === "grid" ? "grid" : "list";
  savePrefsSoon();
  renderActivity();
}

function tickElapsed() {
  const now = Date.now();
  $$(".task-time[data-elapsed='0']").forEach((node) => {
    node.textContent = formatElapsed(now - Number(node.dataset.created || now));
  });
}

async function pollTasks() {
  try {
    const data = await api("/api/tasks");
    for (const task of data.tasks || []) {
      const existing = state.tasks.find((item) => item.id === task.id);
      if (!existing || existing.status !== task.status || existing.updatedAt !== task.updatedAt) {
        upsertTask(task, false);
      }
    }
  } catch {
    /* silent background refresh */
  }
}

/* ───────────────────────── activity actions ───────────────────────── */

function referenceFileParts(output, kind) {
  const match = /\.([a-z0-9]+)(?:[?#]|$)/i.exec(output?.local || output?.remote || "");
  const guessed = match ? match[1].toLowerCase() : "";
  const known = ["mp4", "mov", "webm", "m4v", "gif", "png", "jpg", "jpeg", "webp", "avif", "bmp", "tif", "tiff"];
  const ext = known.includes(guessed) ? guessed : kind === "video" ? "mp4" : "jpg";
  const types = {
    mp4: "video/mp4",
    mov: "video/quicktime",
    webm: "video/webm",
    m4v: "video/mp4",
    gif: "image/gif",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    avif: "image/avif",
    bmp: "image/bmp",
    tif: "image/tiff",
    tiff: "image/tiff",
  };
  return { ext, type: types[ext] || (kind === "video" ? "video/mp4" : "image/jpeg") };
}

async function useAsReference(task, outputIndex = 0, { field: requestedField } = {}) {
  const model = currentModel();
  const form = currentForm();
  if (!model?.contract || !form) return toast("Choose a model first.", "error");

  const kind = outputKind(task, outputIndex);
  let field = requestedField || "";
  let prop = field ? model.contract.properties[field] : null;

  if (field) {
    if (!prop || !isMediaField(field, prop)) return toast("That field does not accept media.", "error");
    if (mediaFieldKind(field) !== kind) {
      return toast(`That field takes ${mediaFieldKind(field)}, not ${kind}.`, "error");
    }
  } else {
    const entry = referenceFieldFor(model, kind);
    if (!entry) return toast(`${model.title} does not accept ${kind} references.`, "error");
    [field, prop] = entry;
  }

  const output = outputAt(task, outputIndex);
  if (!output) return toast("This render has no finished output.", "error");

  const existing = mediaValue(form, field);
  if (prop.type === "array" && prop.maxItems != null && existing.length >= prop.maxItems) {
    return toast(`${mediaLabel(prop, field)} already has ${prop.maxItems} item${prop.maxItems === 1 ? "" : "s"}.`, "error");
  }
  if (state.uploading[field]) return toast("That field already has an upload running.", "error");

  const remote = safeUrl(output.remote);
  if (remote) {
    if (existing.includes(remote)) {
      toast(`Already in ${mediaLabel(prop, field)}.`, "info");
      revealMediaBlock(field);
      return;
    }
    if (!addMedia(field, remote)) return;
    toast(`Added to ${mediaLabel(prop, field)}.`, "ok", "check");
    revealMediaBlock(field);
    return;
  }

  const local = safeUrl(output.local);
  if (!local) return toast("This render has no usable URL.", "error");

  toast("That public link expired — uploading the saved copy…");
  let response;
  try {
    response = await fetch(local);
  } catch {
    return toast("Could not read the saved render.", "error");
  }
  if (!response.ok) return toast("Could not read the saved render.", "error");
  const { ext, type } = referenceFileParts(output, kind);
  let file;
  try {
    const blob = await response.blob();
    const mime = /^(image|video|audio)\//i.test(blob.type || "") ? blob.type : type;
    file = new File([blob], `reference-${task.id}-${outputIndex}.${ext}`, { type: mime });
  } catch {
    return toast("Could not read the saved render.", "error");
  }
  if (currentModel()?.id !== model.id) return toast("The model changed. Try again.", "error");
  uploadFile(field, file);
  revealMediaBlock(field);
}

function bindActivity() {
  ELS.activity.addEventListener("click", async (event) => {
    const target = event.target.closest("[data-action]");
    if (!target) return;
    const task = state.tasks.find((item) => item.id === target.dataset.task);
    if (!task) return;
    const action = target.dataset.action;
    if (action === "open") return openLightbox(task.id, Number(target.dataset.output || 0));
    if (action === "reference") return useAsReference(task, Number(target.dataset.output || 0));
    if (action === "copy") {
      try {
        await navigator.clipboard.writeText(task.prompt || "");
        toast("Prompt copied.", "ok", "check");
      } catch {
        toast("Could not access the clipboard.", "error");
      }
      return;
    }
    if (action === "reuse") return reuseTask(task);
    if (action === "delete") {
      if (!confirm("Delete this render from the activity list and its saved local file? The original stays on SpicyModels for 14 days.")) return;
      try {
        await api(`/api/tasks/${encodeURIComponent(task.id)}`, { method: "DELETE" });
        state.tasks = state.tasks.filter((item) => item.id !== task.id);
        refreshResults();
        toast("Removed from this app.");
      } catch (error) {
        toast(error.message, "error");
      }
    }
  });

  ELS.activity.addEventListener("dragstart", (event) => {
    const source = event.target.closest("[data-drag-task]");
    if (!source) return;
    if (!event.dataTransfer) return event.preventDefault();

    const task = state.tasks.find((item) => item.id === source.dataset.dragTask);
    const outputIndex = Number(source.dataset.dragOutput || 0);
    const output = task ? outputAt(task, outputIndex) : null;
    const remote = safeUrl(output?.remote);
    const local = safeUrl(output?.local);
    if (!task || !output || (!remote && !local)) {
      event.preventDefault();
      return toast("That render has no output to use as a reference.", "error");
    }

    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData(
      REFERENCE_MIME,
      JSON.stringify({ taskId: task.id, outputIndex, kind: outputKind(task, outputIndex) })
    );
    if (remote) {
      event.dataTransfer.setData("text/uri-list", remote);
      event.dataTransfer.setData("text/plain", remote);
    }
    source.classList.add("is-dragging");
  });

  ELS.activity.addEventListener("dragend", (event) => {
    event.target.closest("[data-drag-task]")?.classList.remove("is-dragging");
  });

  ELS.galleryDialogGrid?.addEventListener("click", (event) => {
    const target = event.target.closest("[data-action='open']");
    if (!target) return;
    openLightbox(target.dataset.task, Number(target.dataset.output || 0));
  });
}

function reuseTask(task) {
  if (!modelById(task.model)) return toast("That model is no longer in the catalog.", "error");
  selectModel(task.model);
  const model = modelById(task.model);
  const form = defaultsFor(model);
  for (const [key, value] of Object.entries(task.params || {})) {
    if (key in form) form[key] = value;
  }
  form.prompt = task.prompt || form.prompt || "";
  state.forms[model.id] = form;
  state.optimizeResults[model.id] = null;
  renderComposer();
  savePrefsSoon();
  window.scrollTo({ top: 0, behavior: "smooth" });
  toast("Settings loaded into the composer.");
}

function openLightbox(taskId, outputIndex) {
  const task = state.tasks.find((item) => item.id === taskId);
  const output = task?.outputs?.[outputIndex];
  if (!task || !output) return;
  const url = safeUrl(output.local || output.remote);
  if (!url) return;
  ELS.lightboxBody.innerHTML = `
    <div class="lightbox-media">
      ${task.kind === "video"
        ? `<video src="${esc(url)}" controls autoplay muted playsinline></video>`
        : `<img src="${esc(url)}" alt="${esc(task.prompt || task.modelTitle)}" />`}
    </div>
    <div class="lightbox-meta">
      <h3>${esc(task.modelTitle || task.model)}</h3>
      <p>${esc(task.prompt || "")}</p>
      <div class="task-actions" style="margin-top:10px">
        <a class="tiny-btn download" href="${esc(url)}" download target="_blank" rel="noopener">${ICONS.download} Save original</a>
        <button class="tiny-btn ref" data-action="reference-open" data-task="${esc(task.id)}" data-output="${outputIndex}" title="Add this output as a reference in the composer">${ICONS.reference} Use as reference</button>
        <button class="tiny-btn" data-action="reuse-open" data-task="${esc(task.id)}">${ICONS.reuse} Reuse settings</button>
      </div>
    </div>`;
  ELS.lightbox.showModal();
}

/* ───────────────────────── guide ───────────────────────── */

function openGuide(model) {
  const guide = model?.guide;
  if (!guide) return toast("No guide available for this model.", "error");
  ELS.guideTitle.textContent = guide.label || model.title;
  ELS.guideBody.innerHTML = `
    <p class="guide-summary">${esc(guide.summary || "")}</p>
    ${guide.structure ? `<div class="guide-structure"><strong>Preferred structure</strong><br />${esc(guide.structure)}</div>` : ""}
    ${guide.rules?.length ? `<div class="guide-block rules"><h3>What the model expects</h3><ol>${guide.rules.map((rule) => `<li>${esc(rule)}</li>`).join("")}</ol></div>` : ""}
    ${guide.avoid?.length ? `<div class="guide-block avoid"><h3>Avoid</h3><ul>${guide.avoid.map((rule) => `<li>${esc(rule)}</li>`).join("")}</ul></div>` : ""}
    <div class="guide-source">
      Source: <a href="${esc(safeUrl(guide.source?.url))}" target="_blank" rel="noopener">${esc(guide.source?.label || "Model documentation")}</a>
      <p>${guide.optimizable === false ? "This guide is reference only; the model does not take a prompt." : "The optimizer sends this guide to DeepSeek with your idea, then rewrites the prompt to match."}</p>
    </div>`;
  ELS.guideDialog.showModal();
}

/* ───────────────────────── header / balance / events ───────────────────────── */

function updateHeader() {
  if (ELS.keyChip) ELS.keyChip.hidden = state.configured;
  if (!ELS.engineLabel) return;
  if (state.optimizer?.label) {
    ELS.engineLabel.textContent = state.optimizer.label;
    return;
  }
  const model = state.optimizer?.model || "deepseek:v4.1@flash-1017";
  ELS.engineLabel.textContent = /deepseek/i.test(model)
    ? "DeepSeek V4.1 Flash · Runware"
    : model.replace(/^[^/]+\//, "");
}

let balanceTimer = null;
function refreshBalanceSoon() {
  clearTimeout(balanceTimer);
  balanceTimer = setTimeout(loadBalance, 600);
}

async function loadBalance() {
  if (!ELS.balance) return;
  try {
    const data = await api("/api/balance");
    if (data.configured === false) {
      ELS.balance.textContent = "No key";
      if (ELS.balanceChip) ELS.balanceChip.title = "Add your SpicyModels API key in Settings";
      return;
    }
    const amount = balanceTotal(data.balance);
    if (data.error) {
      ELS.balance.textContent = "Unavailable";
      if (ELS.balanceChip) ELS.balanceChip.title = data.error;
    } else if (amount != null) {
      ELS.balance.textContent = formatMoney(amount);
      const detail = ["cash", "bonus"]
        .map((key) => [key, moneyValue(data.balance?.[key])])
        .filter(([, value]) => value != null);
      if (ELS.balanceChip) {
        ELS.balanceChip.title = detail.length
          ? `Available balance · ${detail.map(([key, value]) => `${key} ${formatMoney(value)}`).join(" · ")}`
          : "SpicyModels wallet balance";
      }
    } else {
      ELS.balance.textContent = "Wallet";
    }
  } catch (error) {
    ELS.balance.textContent = "—";
    if (ELS.balanceChip) ELS.balanceChip.title = error.message;
  }
}

/** `/public/v1/balance` reports money as `{ value, currency }` objects. */
function moneyValue(node) {
  if (node === null || node === undefined || node === "") return null;
  if (typeof node === "number") return Number.isFinite(node) ? node : null;
  if (typeof node === "string") {
    const n = Number(node);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof node === "object") {
    for (const key of ["value", "amount", "available"]) {
      const n = moneyValue(node[key]);
      if (n != null) return n;
    }
  }
  return null;
}

function balanceTotal(balance) {
  const available = moneyValue(balance?.available);
  if (available != null) return available;
  let total = 0;
  let found = false;
  for (const key of ["cash", "bonus", "credit_line", "creditLine"]) {
    const n = moneyValue(balance?.[key]);
    if (n != null) {
      total += n;
      found = true;
    }
  }
  if (found) return total;
  return extractMoney(balance);
}

function extractMoney(object, depth = 0) {
  if (!object || depth > 3) return null;
  for (const key of ["available", "cash", "balance", "total", "remaining", "amount"]) {
    const value = object[key];
    if (typeof value === "number" || (typeof value === "string" && value.trim() && !Number.isNaN(Number(value)))) {
      return Number(value);
    }
    if (value && typeof value === "object") {
      const found = extractMoney(value, depth + 1);
      if (found != null) return found;
    }
  }
  return null;
}

let pollTimer = null;

function setLiveState(value) {
  if (!ELS.activityLive) return;
  ELS.activityLive.dataset.state = value;
  const label = ELS.activityLive.querySelector("[data-live-label]");
  if (label) {
    label.textContent = { live: "Live", connecting: "Connecting", reconnecting: "Reconnecting", offline: "Offline" }[value] || "Live";
  }
  ELS.activityLive.title = {
    live: "Activity updates are refreshed every few seconds",
    connecting: "Connecting to the studio…",
    reconnecting: "Updates paused; retrying",
    offline: "Updates offline; using polling",
  }[value] || "Activity updates";
}

function hasActiveTasks() {
  return state.tasks.some((task) => task.status === "submitting" || task.status === "processing");
}

function schedulePoll(delay) {
  clearTimeout(pollTimer);
  pollTimer = setTimeout(async () => {
    if (document.visibilityState === "visible") {
      await pollTasks();
    }
    schedulePoll(hasActiveTasks() ? 5000 : 60_000);
  }, delay);
}

function startPolling() {
  setLiveState("live");
  schedulePoll(1500);
}

function resyncLive() {
  clearTimeout(pollTimer);
  pollTasks().finally(() => schedulePoll(hasActiveTasks() ? 5000 : 60_000));
}

/* ───────────────────────── global bindings ───────────────────────── */

function bindGlobal() {
  ELS.search?.addEventListener("input", (event) => {
    state.query = event.target.value;
    renderModelList();
  });

  ELS.filters?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter]");
    if (!button) return;
    state.filter = button.dataset.filter;
    syncFilterUI();
    renderModelList();
    savePrefsSoon();
  });

  ELS.modelList?.addEventListener("click", (event) => {
    const card = event.target.closest("[data-model]");
    if (!card) return;
    selectModel(card.dataset.model);
    ELS.modelDialog?.close();
  });

  ELS.openModels?.addEventListener("click", openModelPicker);

  ELS.keyChip?.addEventListener("click", () => document.getElementById("open-settings")?.click());

  ELS.modelDialog?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      ELS.modelDialog.close();
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    if (!ELS.modelList) return;
    const cards = $$(".model-card:not(:disabled)", ELS.modelList);
    if (!cards.length) return;
    const current = event.target.closest(".model-card");
    if (!current && event.target !== ELS.search) return;
    event.preventDefault();
    if (!current) return cards[0].focus();
    const index = cards.indexOf(current);
    const step = event.key === "ArrowDown" ? 1 : -1;
    cards[Math.min(cards.length - 1, Math.max(0, index + step))].focus();
  });

  ELS.search?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    if (!ELS.modelList) return;
    const first = $(".model-card:not(:disabled)", ELS.modelList);
    if (!first) return;
    event.preventDefault();
    first.click();
  });

  ELS.activityView?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-activity-view]");
    if (!button) return;
    setActivityView(button.dataset.activityView);
  });

  ELS.openGallery?.addEventListener("click", openGallery);
  ELS.expandGallery?.addEventListener("click", openGallery);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") resyncLive();
  });
  window.addEventListener("online", resyncLive);

  $("#refresh-tasks")?.addEventListener("click", async () => {
    try {
      const data = await api("/api/tasks");
      state.tasks = data.tasks || [];
      refreshResults();
      toast("Activity refreshed.");
    } catch (error) {
      toast(error.message, "error");
    }
  });

  bindActivity();

  $$("[data-close]").forEach((button) => {
    button.addEventListener("click", () => document.getElementById(button.dataset.close)?.close());
  });
  [ELS.guideDialog, ELS.lightbox, ELS.modelDialog, ELS.galleryDialog].filter(Boolean).forEach((dialog) => {
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
  });

  ELS.lightbox?.addEventListener("click", (event) => {
    const remove = event.target.closest("[data-action='media-remove-open']");
    if (remove) {
      const field = remove.dataset.field;
      const index = Number(remove.dataset.index || 0);
      removeMedia(field, index);
      ELS.lightbox.close();
      toast("Reference removed.");
      revealMediaBlock(field);
      return;
    }
    const reference = event.target.closest("[data-action='reference-open']");
    if (reference) {
      const task = state.tasks.find((item) => item.id === reference.dataset.task);
      ELS.lightbox.close();
      if (ELS.galleryDialog?.open) ELS.galleryDialog.close();
      if (task) useAsReference(task, Number(reference.dataset.output || 0));
      return;
    }
    const target = event.target.closest("[data-action='reuse-open']");
    if (!target) return;
    const task = state.tasks.find((item) => item.id === target.dataset.task);
    ELS.lightbox.close();
    if (ELS.galleryDialog?.open) ELS.galleryDialog.close();
    if (task) reuseTask(task);
  });

  document.addEventListener("click", (event) => {
    const link = event.target.closest("[data-open-settings-link]");
    if (!link) return;
    event.preventDefault();
    document.getElementById("open-settings")?.click();
  });

  document.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      if (ELS.modelDialog?.open) ELS.modelDialog.close();
      else openModelPicker();
      return;
    }
    if (event.key === "Escape" && ELS.lightbox?.open) ELS.lightbox.close();
  });
}

function renderComposerError(error) {
  console.error(error);
  if (!ELS.composer) return;
  ELS.composer.innerHTML = `
    <div class="composer-inner" style="padding-bottom:22px">
      <div class="composer-head"><div class="composer-title"><h2>Models unavailable</h2><p>${esc(error.message || "The live model catalog could not be loaded.")}</p></div></div>
      <p class="muted" style="margin:0 0 14px;font-size:11.5px">Activity is still live. Retry to load the composer and model list.</p>
      <button class="generate-btn" data-action="retry-models">Retry catalog</button>
    </div>`;
  ELS.composer.onclick = (event) => {
    if (!event.target.closest("[data-action='retry-models']")) return;
    ELS.composer.innerHTML = `<div class="composer-loading"><div class="skeleton-line wide"></div><div class="skeleton-line"></div><div class="skeleton-block"></div></div>`;
    loadModels().catch((retryError) => renderComposerError(retryError));
  };
}

function renderFatal(error) {
  console.error(error);
  if (!ELS.composer) return;
  const detail = error?.stack ? error.stack.split("\n").slice(0, 3).join("\n") : "";
  ELS.composer.innerHTML = `
    <div class="composer-inner" style="padding-bottom:22px">
      <div class="composer-head"><div class="composer-title"><h2>Studio unavailable</h2><p>${esc(error.message)}</p></div></div>
      ${detail ? `<pre style="margin:0 0 14px;padding:10px 12px;border-radius:10px;background:rgba(255,255,255,.04);color:#9d96ad;font-size:10.5px;line-height:1.5;white-space:pre-wrap;word-break:break-word">${esc(detail)}</pre>` : ""}
      <button class="generate-btn" data-action="reload">Reload studio</button>
    </div>`;
  ELS.composer.addEventListener("click", (event) => {
    if (event.target.closest("[data-action='reload']")) location.reload();
  });
}

if (window.__SPICY_READY__) init();
else window.addEventListener("spicy:ready", () => init(), { once: true });
