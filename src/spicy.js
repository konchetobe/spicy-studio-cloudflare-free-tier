const DEFAULT_BASE = "https://spicymodels.ai/api/v1";

export class SpicyError extends Error {
  constructor(message, { status = 0, code = 0, requestId = "", details = null, taskId = null } = {}) {
    super(message);
    this.name = "SpicyError";
    this.status = status;
    this.code = code;
    this.requestId = requestId;
    this.details = details;
    this.taskId = taskId;
  }
}

function base(env) {
  return String(env.SPICYMODELS_BASE_URL || DEFAULT_BASE).replace(/\/$/, "");
}

function origin(env) {
  return new URL(base(env)).origin;
}

function authHeaders(key, extra = {}) {
  if (!key) throw new SpicyError("No SpicyModels API key is configured for this account.", { status: 401 });
  return { Authorization: `Bearer ${key}`, "User-Agent": "spicy-studio-cloudflare/1.0", ...extra };
}

async function parseBody(res) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text.slice(0, 500) };
  }
}

function toError(res, body) {
  const message = body?.msg || body?.message || body?.error || `SpicyModels returned HTTP ${res.status}`;
  const taskId = body?.data?.id || body?.data?.task_id || null;
  return new SpicyError(message, {
    status: res.status,
    code: body?.code || res.status,
    requestId: res.headers.get("x-request-id") || "",
    details: body,
    taskId,
  });
}

async function request(env, key, path, options = {}) {
  const res = await fetch(`${base(env)}${path}`, {
    ...options,
    headers: authHeaders(key, options.headers || {}),
    signal: options.signal || AbortSignal.timeout(45_000),
  });
  const body = await parseBody(res);
  if (!res.ok) throw toError(res, body);
  return body;
}

export async function submitGeneration(env, key, { kind, payload, idempotencyKey }) {
  const path = kind === "image" ? "/model/generateImage" : "/model/generateVideo";
  const body = await request(env, key, path, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(150_000),
  });
  return body?.data ?? body;
}

export async function getPrediction(env, key, taskId) {
  const body = await request(env, key, `/model/prediction/${encodeURIComponent(taskId)}`, {
    signal: AbortSignal.timeout(30_000),
  });
  return body?.data ?? body;
}

export async function getBalance(env, key) {
  const res = await fetch(`${origin(env)}/public/v1/balance`, {
    headers: authHeaders(key),
    signal: AbortSignal.timeout(20_000),
  });
  const body = await parseBody(res);
  if (!res.ok) throw toError(res, body);
  return body?.data ?? body;
}

function safeFilename(name) {
  return String(name || "upload.bin").replace(/[\r\n"]/g, "_").slice(0, 180);
}

function multipartBody(stream, filename, contentType, boundary) {
  const encoder = new TextEncoder();
  const head = encoder.encode(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${safeFilename(filename)}"\r\nContent-Type: ${contentType || "application/octet-stream"}\r\n\r\n`
  );
  const tail = encoder.encode(`\r\n--${boundary}--\r\n`);
  return new ReadableStream({
    async start(controller) {
      controller.enqueue(head);
      if (stream) {
        const reader = stream.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
        } finally {
          reader.releaseLock();
        }
      }
      controller.enqueue(tail);
      controller.close();
    },
  });
}

/** Stream a raw request body to SpicyModels as multipart/form-data. */
export async function uploadMedia(env, key, body, filename, contentType) {
  if (!body) throw new SpicyError("No file received.", { status: 400 });
  const boundary = `----spicy-studio-${crypto.randomUUID().replaceAll("-", "")}`;
  const res = await fetch(`${base(env)}/model/uploadMedia`, {
    method: "POST",
    headers: authHeaders(key, {
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
    }),
    body: multipartBody(body, filename, contentType, boundary),
    signal: AbortSignal.timeout(180_000),
  });
  const parsed = await parseBody(res);
  if (!res.ok) throw toError(res, parsed);
  return parsed?.data ?? parsed;
}

export async function testKey(env, key) {
  const balance = await getBalance(env, key);
  return { ok: true, balance };
}
