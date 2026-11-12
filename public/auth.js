/* Auth, settings and admin shell for the Cloudflare free-tier build. */

const $ = (selector, root = document) => root.querySelector(selector);
const esc = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);

const state = {
  auth: null,
  user: null,
  csrf: "",
  keys: null,
  admin: null,
  inviteUrl: "",
};

function notify(message, kind = "info") {
  const host = $("#toasts");
  if (!host) return;
  const node = document.createElement("div");
  node.className = `toast ${kind}`;
  node.innerHTML = `<span>${esc(message)}</span>`;
  host.append(node);
  while (host.children.length > 3) host.firstElementChild.remove();
  setTimeout(() => node.remove(), 5000);
}

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const method = String(options.method || "GET").toUpperCase();
  if (options.body && !(options.body instanceof FormData)) headers["Content-Type"] = "application/json";
  if (!["GET", "HEAD"].includes(method) && window.__SPICY_CSRF__) headers["X-CSRF-Token"] = window.__SPICY_CSRF__;
  const response = await fetch(path, { ...options, headers, credentials: "same-origin" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || `Request failed (${response.status})`);
    error.status = response.status;
    error.field = data.field;
    throw error;
  }
  return data;
}

function setAuth(user, csrf) {
  state.user = user;
  state.csrf = csrf || "";
  window.__SPICY_USER__ = user;
  window.__SPICY_CSRF__ = state.csrf;
}

function authPage() {
  const root = $("#auth-root");
  if (!root) return null;
  root.hidden = false;
  document.body.classList.remove("authed");
  return root;
}

function appPage(user, csrf) {
  setAuth(user, csrf);
  const root = $("#auth-root");
  if (root) {
    root.hidden = true;
    root.innerHTML = "";
  }
  document.body.classList.add("authed");
  const topbarUser = $("#topbar-user");
  if (topbarUser) topbarUser.hidden = false;
  const name = $("#user-name");
  if (name) name.textContent = user.name || user.email;
  const admin = $("#open-admin");
  if (admin) admin.hidden = user.role !== "admin";
  window.__SPICY_READY__ = true;
  window.dispatchEvent(new Event("spicy:ready"));
}

function authLayout({ eyebrow, title, subtitle, body }) {
  return `
    <div class="auth-shell">
      <div class="auth-card">
        <div class="auth-brand">
          <span class="brand-mark auth-mark" aria-hidden="true">✦</span>
          <div>
            <strong>Spicy Studio</strong>
            <small>${esc(eyebrow || "Private workspace")}</small>
          </div>
        </div>
        <h1>${esc(title)}</h1>
        <p class="auth-sub">${subtitle}</p>
        <div class="auth-error" id="auth-error" hidden></div>
        ${body}
        <p class="auth-foot">Invite-only · no public registration</p>
      </div>
    </div>`;
}

function field(label, name, type = "text", options = {}) {
  return `
    <label class="auth-field">
      <span>${esc(label)}</span>
      <input class="input" name="${esc(name)}" type="${esc(type)}" ${options.autocomplete ? `autocomplete="${esc(options.autocomplete)}"` : ""} ${options.required === false ? "" : "required"} ${options.minlength ? `minlength="${options.minlength}"` : ""} ${options.placeholder ? `placeholder="${esc(options.placeholder)}"` : ""} />
    </label>`;
}

function showAuthError(message) {
  const node = $("#auth-error");
  if (!node) return;
  node.hidden = false;
  node.textContent = message;
}

function clearAuthError() {
  const node = $("#auth-error");
  if (node) {
    node.hidden = true;
    node.textContent = "";
  }
}

function bindForm(handler) {
  const form = $("#auth-form");
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearAuthError();
    const button = form.querySelector("button[type='submit']");
    const original = button?.textContent;
    if (button) {
      button.disabled = true;
      button.textContent = "Please wait…";
    }
    try {
      await handler(new FormData(form));
    } catch (error) {
      showAuthError(error.message);
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = original;
      }
    }
  });
}

function renderSetup() {
  const root = authPage();
  if (!root) return;
  root.innerHTML = authLayout({
    eyebrow: "First-time setup",
    title: "Create the admin account",
    subtitle: "This is the only account that can create invites and manage users. It works once, while the workspace has zero users.",
    body: `
      <form id="auth-form" class="auth-form">
        ${field("Setup token", "setupToken", "password", { autocomplete: "one-time-code" })}
        ${field("Your name", "name", "text", { autocomplete: "name" })}
        ${field("Email", "email", "email", { autocomplete: "username" })}
        ${field("Password", "password", "password", { autocomplete: "new-password", minlength: 12 })}
        ${field("Confirm password", "confirm", "password", { autocomplete: "new-password", minlength: 12 })}
        <button class="generate-btn auth-submit" type="submit">Create admin</button>
      </form>
      <p class="auth-note">The setup token is the <code>SETUP_TOKEN</code> Worker secret you set in Cloudflare. It is never stored in the browser.</p>`,
  });
  bindForm(async (data) => {
    const password = String(data.get("password") || "");
    if (password !== String(data.get("confirm") || "")) throw new Error("Passwords do not match.");
    const result = await api("/api/auth/setup", {
      method: "POST",
      body: JSON.stringify({
        setupToken: data.get("setupToken"),
        name: data.get("name"),
        email: data.get("email"),
        password,
      }),
    });
    setAuth(result.user, result.csrf);
    location.replace("/");
  });
}

function renderLogin({ message = "" } = {}) {
  const root = authPage();
  if (!root) return;
  root.innerHTML = authLayout({
    eyebrow: "Sign in",
    title: "Welcome back",
    subtitle: "Use the account your admin invited. There is no self-registration.",
    body: `
      ${message ? `<div class="auth-success">${esc(message)}</div>` : ""}
      <form id="auth-form" class="auth-form">
        ${field("Email", "email", "email", { autocomplete: "username" })}
        ${field("Password", "password", "password", { autocomplete: "current-password" })}
        <button class="generate-btn auth-submit" type="submit">Sign in</button>
      </form>
      <p class="auth-note">Forgot your password? Ask the admin to generate a one-time reset link.</p>`,
  });
  bindForm(async (data) => {
    const result = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: data.get("email"), password: data.get("password") }),
    });
    setAuth(result.user, result.csrf);
    location.replace("/");
  });
}

function renderSetupComplete() {
  const root = authPage();
  if (!root) return;
  root.innerHTML = authLayout({
    eyebrow: "Setup complete",
    title: "Admin already exists",
    subtitle: "This workspace has been set up. Sign in with the admin account, or use an invite link from your admin.",
    body: `<a class="generate-btn auth-submit auth-link" href="/login">Go to sign in</a>`,
  });
}

function renderInvite(token) {
  const root = authPage();
  if (!root) return;
  root.innerHTML = authLayout({
    eyebrow: "Invite",
    title: "Create your account",
    subtitle: "Your email was chosen by the admin. Set a name and password to finish.",
    body: `
      <form id="auth-form" class="auth-form">
        ${field("Your name", "name", "text", { autocomplete: "name" })}
        ${field("Password", "password", "password", { autocomplete: "new-password", minlength: 12 })}
        ${field("Confirm password", "confirm", "password", { autocomplete: "new-password", minlength: 12 })}
        <button class="generate-btn auth-submit" type="submit">Join workspace</button>
      </form>`,
  });
  bindForm(async (data) => {
    const password = String(data.get("password") || "");
    if (password !== String(data.get("confirm") || "")) throw new Error("Passwords do not match.");
    const result = await api("/api/invites/accept", {
      method: "POST",
      body: JSON.stringify({ token, name: data.get("name"), password }),
    });
    setAuth(result.user, result.csrf);
    location.replace("/");
  });
}

function renderReset(token) {
  const root = authPage();
  if (!root) return;
  root.innerHTML = authLayout({
    eyebrow: "Password reset",
    title: "Choose a new password",
    subtitle: "This link works once and expires one hour after the admin generated it.",
    body: `
      <form id="auth-form" class="auth-form">
        ${field("New password", "password", "password", { autocomplete: "new-password", minlength: 12 })}
        ${field("Confirm password", "confirm", "password", { autocomplete: "new-password", minlength: 12 })}
        <button class="generate-btn auth-submit" type="submit">Set new password</button>
      </form>`,
  });
  bindForm(async (data) => {
    const password = String(data.get("password") || "");
    if (password !== String(data.get("confirm") || "")) throw new Error("Passwords do not match.");
    await api("/api/auth/reset", {
      method: "POST",
      body: JSON.stringify({ token, newPassword: password }),
    });
    renderLogin({ message: "Password updated. Sign in with your new password." });
    history.replaceState(null, "", "/login");
  });
}

function renderError(title, message) {
  const root = authPage();
  if (!root) return;
  root.innerHTML = authLayout({
    eyebrow: "Private workspace",
    title,
    subtitle: message,
    body: `<a class="generate-btn auth-submit auth-link" href="/login">Go to sign in</a>`,
  });
}

/* ── settings ─────────────────────────────────────────────────────── */

function keyCard(provider, label, description, status) {
  const configured = Boolean(status?.configured);
  return `
    <div class="key-card" data-key-card="${provider}">
      <div class="key-card-head">
        <div>
          <strong>${esc(label)}</strong>
          <small>${description}</small>
        </div>
        <span class="key-status ${configured ? "ok" : ""}">${configured ? `•••• ${esc(status.last4)}` : "Not set"}</span>
      </div>
      <div class="key-card-row">
        <input class="input" type="password" data-key-input="${provider}" placeholder="${configured ? "Replace key…" : "Paste key…"}" autocomplete="off" />
        <button class="ghost-btn" data-key-save="${provider}" type="button">Save</button>
        ${configured ? `<button class="ghost-btn danger" data-key-remove="${provider}" type="button">Remove</button>` : ""}
      </div>
    </div>`;
}

function renderSettings(keys) {
  state.keys = keys;
  const host = $("#settings-body");
  if (!host) return;
  const user = state.user;
  host.innerHTML = `
    <section class="settings-section">
      <h3>Account</h3>
      <div class="settings-account">
        <div><span>Name</span><strong>${esc(user.name)}</strong></div>
        <div><span>Email</span><strong>${esc(user.email)}</strong></div>
        <div><span>Role</span><strong>${esc(user.role)}</strong></div>
      </div>
    </section>

    <section class="settings-section">
      <h3>API keys</h3>
      <p class="settings-help">Keys are encrypted in the database and never sent back to the browser. Your generation and optimization spend uses your own keys.</p>
      ${keyCard("spicy", "SpicyModels key", "Required to generate, upload references, and read your balance.", keys.spicy)}
      ${keyCard("runware", "Runware key", "Optional. Used for prompt optimization; without it, the built-in guide structure is used.", keys.runware)}
    </section>

    <section class="settings-section">
      <h3>Change password</h3>
      <form id="password-form" class="settings-form">
        <label class="auth-field"><span>Current password</span><input class="input" name="currentPassword" type="password" autocomplete="current-password" required /></label>
        <label class="auth-field"><span>New password</span><input class="input" name="newPassword" type="password" autocomplete="new-password" minlength="12" required /></label>
        <label class="auth-field"><span>Confirm new password</span><input class="input" name="confirm" type="password" autocomplete="new-password" minlength="12" required /></label>
        <button class="generate-btn" type="submit">Update password</button>
      </form>
    </section>`;

  host.querySelectorAll("[data-key-save]").forEach((button) => {
    button.addEventListener("click", async () => {
      const provider = button.dataset.keySave;
      const input = host.querySelector(`[data-key-input="${provider}"]`);
      const key = input?.value.trim();
      if (!key) return notify("Paste a key first.", "error");
      button.disabled = true;
      try {
        const result = await api(`/api/settings/keys/${provider}`, {
          method: "PUT",
          body: JSON.stringify({ key }),
        });
        renderSettings(result.keys);
        notify(`${provider === "spicy" ? "SpicyModels" : "Runware"} key saved.`, "ok");
      } catch (error) {
        notify(error.message, "error");
      } finally {
        button.disabled = false;
      }
    });
  });

  host.querySelectorAll("[data-key-remove]").forEach((button) => {
    button.addEventListener("click", async () => {
      const provider = button.dataset.keyRemove;
      if (!confirm(`Remove your ${provider === "spicy" ? "SpicyModels" : "Runware"} key?`)) return;
      try {
        const result = await api(`/api/settings/keys/${provider}`, { method: "DELETE" });
        renderSettings(result.keys);
        notify("Key removed.");
      } catch (error) {
        notify(error.message, "error");
      }
    });
  });

  $("#password-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    if (data.get("newPassword") !== data.get("confirm")) return notify("Passwords do not match.", "error");
    try {
      const result = await api("/api/auth/password", {
        method: "POST",
        body: JSON.stringify({
          currentPassword: data.get("currentPassword"),
          newPassword: data.get("newPassword"),
        }),
      });
      setAuth(result.user, result.csrf);
      form.reset();
      notify("Password updated. Other sessions were signed out.", "ok");
    } catch (error) {
      notify(error.message, "error");
    }
  });
}

async function openSettings() {
  const dialog = $("#settings-dialog");
  const host = $("#settings-body");
  if (!dialog || !host) return;
  host.innerHTML = `<div class="settings-loading">Loading settings…</div>`;
  if (!dialog.open) dialog.showModal();
  try {
    const result = await api("/api/settings/keys");
    renderSettings(result.keys);
  } catch (error) {
    host.innerHTML = `<p class="settings-error">${esc(error.message)}</p>`;
  }
}

/* ── admin ────────────────────────────────────────────────────────── */

function formatBytes(value) {
  const n = Number(value || 0);
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(Number(value)).toLocaleString();
}

function renderAdmin(data) {
  state.admin = data;
  const host = $("#admin-body");
  if (!host) return;
  const { users, invites, usage } = data;
  const storagePct = usage.storageCapBytes ? Math.min(100, (usage.storageBytes / usage.storageCapBytes) * 100) : 0;
  host.innerHTML = `
    <section class="admin-section">
      <div class="admin-stats">
        <div><span>Users</span><strong>${usage.users}/${usage.maxUsers}</strong></div>
        <div><span>Tasks today</span><strong>${usage.tasksToday}</strong></div>
        <div><span>Media</span><strong>${formatBytes(usage.storageBytes)}</strong></div>
        <div class="admin-storage"><span>Free storage cap</span><strong>${storagePct.toFixed(0)}%</strong><i style="width:${storagePct}%"></i></div>
      </div>
    </section>

    <section class="admin-section">
      <h3>Create invite</h3>
      <p class="settings-help">The link is shown once. Send it to the user yourself; this deployment has no email sending.</p>
      <form id="invite-form" class="admin-invite-form">
        <input class="input" name="email" type="email" placeholder="user@example.com" required />
        <button class="generate-btn" type="submit">Create invite link</button>
      </form>
      <div id="invite-result" class="invite-result" ${state.inviteUrl ? "" : "hidden"}>
        ${state.inviteUrl ? `<code>${esc(state.inviteUrl)}</code><button class="ghost-btn" data-copy-invite type="button">Copy</button>` : ""}
      </div>
    </section>

    <section class="admin-section">
      <h3>Users</h3>
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead><tr><th>User</th><th>Status</th><th>Keys</th><th>Tasks</th><th>Media</th><th>Last login</th><th></th></tr></thead>
          <tbody>
            ${users.map((user) => `
              <tr>
                <td><strong>${esc(user.name)}</strong><small>${esc(user.email)}</small>${user.role === "admin" ? `<em>admin</em>` : ""}</td>
                <td><span class="status-pill ${esc(user.status)}">${esc(user.status)}</span></td>
                <td><small>${user.spicy.configured ? `Spicy •••• ${esc(user.spicy.last4)}` : "Spicy —"}<br/>${user.runware.configured ? `Runware •••• ${esc(user.runware.last4)}` : "Runware —"}</small></td>
                <td>${user.taskCount}</td>
                <td>${formatBytes(user.storageBytes)}</td>
                <td><small>${formatDate(user.lastLoginAt)}</small></td>
                <td class="admin-actions">
                  ${user.role === "admin" ? `<small>primary admin</small>` : `
                    <button class="tiny-btn" data-user-action="${user.status === "active" ? "disable" : "enable"}" data-id="${esc(user.id)}" type="button">${user.status === "active" ? "Disable" : "Enable"}</button>
                    <button class="tiny-btn" data-user-action="reset" data-id="${esc(user.id)}" type="button">Reset link</button>
                    <button class="tiny-btn" data-user-action="logout" data-id="${esc(user.id)}" type="button">Sign out all</button>
                    <button class="tiny-btn danger" data-user-action="delete" data-id="${esc(user.id)}" type="button">Delete</button>`}
                </td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>
    </section>

    <section class="admin-section">
      <h3>Invites</h3>
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead><tr><th>Email</th><th>Created</th><th>Expires</th><th>Status</th><th></th></tr></thead>
          <tbody>
            ${invites.length ? invites.map((invite) => `
              <tr>
                <td>${esc(invite.email)}</td>
                <td><small>${formatDate(invite.createdAt)}</small></td>
                <td><small>${formatDate(invite.expiresAt)}</small></td>
                <td>${invite.usedAt ? `used by ${esc(invite.usedByName || "user")}` : invite.expired ? "expired" : "pending"}</td>
                <td>${invite.usedAt ? "" : `<button class="tiny-btn danger" data-invite-revoke="${esc(invite.id)}" type="button">Revoke</button>`}</td>
              </tr>`).join("") : `<tr><td colspan="5"><small>No invites yet.</small></td></tr>`}
          </tbody>
        </table>
      </div>
    </section>

    <section class="admin-section">
      <h3>Recent admin activity</h3>
      <div class="admin-audit">${(data.audit || []).length ? data.audit.map((entry) => `<div><code>${esc(entry.action)}</code><span>${formatDate(entry.createdAt)}</span></div>`).join("") : `<small>No activity yet.</small>`}</div>
    </section>`;

  $("#invite-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const email = new FormData(form).get("email");
    try {
      const result = await api("/api/admin/invites", { method: "POST", body: JSON.stringify({ email }) });
      state.inviteUrl = result.url;
      form.reset();
      await refreshAdmin();
      notify("Invite created. Copy the link and send it.", "ok");
    } catch (error) {
      notify(error.message, "error");
    }
  });

  host.querySelector("[data-copy-invite]")?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(state.inviteUrl);
      notify("Invite link copied.", "ok");
    } catch {
      notify("Could not copy. Select the link manually.", "error");
    }
  });

  host.querySelectorAll("[data-invite-revoke]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!confirm("Revoke this invite?")) return;
      try {
        await api(`/api/admin/invites/${button.dataset.inviteRevoke}`, { method: "DELETE" });
        await refreshAdmin();
        notify("Invite revoked.");
      } catch (error) {
        notify(error.message, "error");
      }
    });
  });

  host.querySelectorAll("[data-user-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      const action = button.dataset.userAction;
      const id = button.dataset.id;
      if (action === "delete" && !confirm("Delete this user and all of their media? This cannot be undone.")) return;
      try {
        if (action === "disable" || action === "enable") {
          await api(`/api/admin/users/${id}`, {
            method: "PATCH",
            body: JSON.stringify({ status: action === "disable" ? "disabled" : "active" }),
          });
          notify(action === "disable" ? "User disabled." : "User enabled.", "ok");
        } else if (action === "logout") {
          await api(`/api/admin/users/${id}/logout-all`, { method: "POST", body: "{}" });
          notify("User signed out everywhere.", "ok");
        } else if (action === "reset") {
          const result = await api(`/api/admin/users/${id}/reset`, { method: "POST", body: "{}" });
          try {
            await navigator.clipboard.writeText(result.url);
            notify("Password reset link copied. It expires in one hour.", "ok");
          } catch {
            window.prompt("Copy this password reset link:", result.url);
          }
        } else if (action === "delete") {
          await api(`/api/admin/users/${id}`, { method: "DELETE" });
          notify("User deleted.", "ok");
        }
        await refreshAdmin();
      } catch (error) {
        notify(error.message, "error");
      }
    });
  });
}

async function refreshAdmin() {
  const host = $("#admin-body");
  if (host) host.innerHTML = `<div class="settings-loading">Loading admin data…</div>`;
  const [users, invites, usage, audit] = await Promise.all([
    api("/api/admin/users"),
    api("/api/admin/invites"),
    api("/api/admin/usage"),
    api("/api/admin/audit"),
  ]);
  renderAdmin({ users: users.users, invites: invites.invites, usage, audit: audit.entries });
}

async function openAdmin() {
  const dialog = $("#admin-dialog");
  if (!dialog) return;
  if (state.user?.role !== "admin") return;
  if (!dialog.open) dialog.showModal();
  try {
    await refreshAdmin();
  } catch (error) {
    $("#admin-body").innerHTML = `<p class="settings-error">${esc(error.message)}</p>`;
  }
}

/* ── boot ─────────────────────────────────────────────────────────── */

function bindShell() {
  $("#open-settings")?.addEventListener("click", openSettings);
  $("#open-admin")?.addEventListener("click", openAdmin);
  $("#logout-btn")?.addEventListener("click", async () => {
    try {
      await api("/api/auth/logout", { method: "POST", body: "{}" });
    } catch {
      /* cookie may already be gone */
    }
    location.replace("/login");
  });
  ["settings-dialog", "admin-dialog"].forEach((id) => {
    const dialog = document.getElementById(id);
    dialog?.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
  });
  document.querySelectorAll("[data-close]").forEach((button) => {
    button.addEventListener("click", () => document.getElementById(button.dataset.close)?.close());
  });
}

async function boot() {
  const path = location.pathname.replace(/\/+$/, "") || "/";
  const hashToken = location.hash.startsWith("#") ? location.hash.slice(1) : "";
  let authState;
  try {
    const response = await fetch("/api/auth/state", { credentials: "same-origin" });
    authState = await response.json();
  } catch {
    renderError("Cannot reach the server", "Check your connection and reload the page.");
    return;
  }

  if (authState.user) {
    appPage(authState.user, authState.csrf);
    bindShell();
    return;
  }

  if (path === "/setup") {
    if (authState.bootstrapped) return renderSetupComplete();
    if (!authState.setupAvailable) {
      return renderError(
        "Setup is locked",
        "SETUP_TOKEN is not configured on this Worker. Add it with `wrangler secret put SETUP_TOKEN`, then reload."
      );
    }
    return renderSetup();
  }

  if (path === "/invite") {
    if (!hashToken) return renderError("Invite link is incomplete", "Ask the admin to copy the full invite link again.");
    return renderInvite(hashToken);
  }

  if (path === "/reset") {
    if (!hashToken) return renderError("Reset link is incomplete", "Ask the admin to generate a new reset link.");
    return renderReset(hashToken);
  }

  if (path === "/login" || path === "/") {
    if (!authState.bootstrapped) {
      location.replace("/setup");
      return;
    }
    history.replaceState(null, "", "/login");
    return renderLogin();
  }

  if (!authState.bootstrapped) {
    location.replace("/setup");
    return;
  }
  location.replace("/login");
}

boot();
