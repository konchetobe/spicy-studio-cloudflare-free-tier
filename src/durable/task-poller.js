import { HttpError } from "../errors.js";
import {
  getSecret,
  getTask,
  storageBytes,
  updateTask,
} from "../db.js";
import { decryptSecret } from "../keys.js";
import { getPrediction, SpicyError, submitGeneration } from "../spicy.js";

const MAX_OUTPUT_BYTES = 95 * 1024 * 1024;
const STORAGE_CAP_BYTES = 9 * 1024 * 1024 * 1024;
const MAX_POLL_ERRORS = 24;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function extFor(url, contentType = "") {
  let ext = "";
  try {
    ext = new URL(url).pathname.split(".").pop()?.toLowerCase() || "";
    ext = ext ? `.${ext}` : "";
  } catch {
    ext = "";
  }
  if (/^\.(mp4|mov|webm|m4v|gif|png|jpe?g|webp|avif|bmp|tiff?)$/.test(ext)) return ext;
  const ct = String(contentType).toLowerCase();
  if (ct.includes("mp4")) return ".mp4";
  if (ct.includes("quicktime")) return ".mov";
  if (ct.includes("webm")) return ".webm";
  if (ct.includes("png")) return ".png";
  if (ct.includes("webp")) return ".webp";
  if (ct.includes("gif")) return ".gif";
  if (ct.includes("jpeg") || ct.includes("jpg")) return ".jpg";
  return ".mp4";
}

function extractUrls(data) {
  const raw = data?.outputs ?? data?.output ?? data?.result?.outputs ?? [];
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => (typeof item === "string" ? item : item?.url || item?.output || null))
    .filter((item) => typeof item === "string" && /^https?:\/\//.test(item));
}

async function userKey(env, userId, provider) {
  const row = await getSecret(env.DB, userId, provider);
  if (!row) return "";
  return decryptSecret(env.KEY_ENCRYPTION_SECRET, userId, provider, row);
}

async function downloadToR2(env, task, url, index) {
  const response = await fetch(url, {
    headers: { "User-Agent": "spicy-studio-cloudflare/1.0" },
    redirect: "follow",
    signal: AbortSignal.timeout(300_000),
  });
  if (!response.ok || !response.body) {
    throw new Error(`Could not download result (HTTP ${response.status}).`);
  }
  const contentType = response.headers.get("content-type") || "";
  const declared = Number(response.headers.get("content-length") || 0);
  if (declared > MAX_OUTPUT_BYTES) {
    return { skipped: true, reason: `Output is larger than ${Math.round(MAX_OUTPUT_BYTES / 1024 / 1024)} MB.` };
  }
  const ext = extFor(url, contentType);
  const key = `media/${task.userId}/${task.id}/${index}${ext}`;
  let bytes = 0;
  const counter = new TransformStream({
    transform(chunk, controller) {
      bytes += chunk.byteLength;
      if (bytes > MAX_OUTPUT_BYTES) throw new Error("Output exceeded the 95 MB cap.");
      controller.enqueue(chunk);
    },
  });
  const counted = response.body.pipeThrough(counter);
  let putBody = counted;
  let pump = null;
  if (declared && typeof FixedLengthStream !== "undefined") {
    const fixed = new FixedLengthStream(declared);
    pump = counted.pipeTo(fixed.writable);
    putBody = fixed.readable;
  }
  try {
    await env.MEDIA.put(key, putBody, {
      httpMetadata: { contentType: contentType || "application/octet-stream" },
    });
    if (pump) await pump.catch(() => {});
  } catch (error) {
    if (pump) await pump.catch(() => {});
    throw error;
  }
  if (!bytes) {
    const head = await env.MEDIA.head(key);
    bytes = Number(head?.size || 0);
  }
  return {
    key,
    bytes,
    contentType,
    local: `/media/${task.id}/${index}`,
    type: contentType.startsWith("video/") || task.kind === "video" ? "video" : "image",
  };
}

export class TaskPoller {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    const url = new URL(request.url);
    try {
      if (url.pathname === "/start") {
        const body = await request.json().catch(() => ({}));
        await this.remember(body.taskId);
        return json(await this.start(body.taskId));
      }
      if (url.pathname === "/resume") {
        const body = await request.json().catch(() => ({}));
        await this.remember(body.taskId);
        return json(await this.resume(body.taskId));
      }
      return json({ error: "Not found." }, 404);
    } catch (error) {
      if (error instanceof HttpError) return json({ error: error.message }, error.status);
      console.error("[task]", error);
      return json({ error: "Task service failed." }, 500);
    }
  }

  async start(taskId) {
    const task = await getTask(this.env.DB, taskId);
    if (!task) throw new HttpError(404, "Task not found.");
    if (task.status !== "submitting" && task.status !== "processing") {
      return { ok: true, task };
    }
    if (task.spicyId) {
      await this.schedule(1200);
      return { ok: true, task };
    }

    let key;
    try {
      key = await userKey(this.env, task.userId, "spicy");
    } catch {
      key = "";
    }
    if (!key) {
      await updateTask(this.env.DB, taskId, {
        status: "failed",
        error: "This account has no SpicyModels API key. Add one in Settings.",
        completedAt: Date.now(),
      });
      throw new HttpError(400, "This account has no SpicyModels API key. Add one in Settings.");
    }

    try {
      const data = await submitGeneration(this.env, key, {
        kind: task.kind,
        payload: { model: task.model, ...task.params },
        idempotencyKey: task.id,
      });
      const spicyId = data?.id || data?.task_id || data?.prediction_id;
      if (!spicyId) throw new Error("SpicyModels accepted the request but returned no task id.");
      await updateTask(this.env.DB, taskId, {
        spicyId,
        status: "processing",
        spicyStatus: data?.status || "created",
        startedAt: Date.now(),
        requestId: data?.request_id || "",
        nextPollAt: Date.now() + 3000,
      });
      await this.schedule(2500);
      return { ok: true };
    } catch (error) {
      if (error instanceof SpicyError && error.status === 409 && error.taskId) {
        await updateTask(this.env.DB, taskId, {
          spicyId: error.taskId,
          status: "processing",
          spicyStatus: "processing",
          startedAt: Date.now(),
          requestId: error.requestId,
          nextPollAt: Date.now() + 3000,
        });
        await this.schedule(2500);
        return { ok: true };
      }
      await updateTask(this.env.DB, taskId, {
        status: "failed",
        error: error.message || "Submission failed.",
        requestId: error.requestId || "",
        completedAt: Date.now(),
        nextPollAt: null,
      });
      throw new HttpError(error.status && error.status < 500 ? error.status : 502, error.message || "Submission failed.");
    }
  }

  async resume(taskId) {
    const task = await getTask(this.env.DB, taskId);
    if (!task) return { ok: true };
    if (task.status !== "submitting" && task.status !== "processing") return { ok: true };
    if (!task.spicyId) return this.start(taskId);
    await this.schedule(1000);
    return { ok: true };
  }

  async schedule(ms) {
    await this.state.storage.setAlarm(Date.now() + Math.max(1000, ms));
  }

  async alarm() {
    const taskId = await this.state.storage.get("task:id");
    if (!taskId) return;
    try {
      await this.poll(taskId);
    } catch (error) {
      console.error("[task alarm]", error);
      await this.schedule(15_000);
    }
  }

  async remember(taskId) {
    if (!taskId) return;
    if ((await this.state.storage.get("task:id")) !== taskId) {
      await this.state.storage.put("task:id", taskId);
    }
  }

  async poll(taskId) {
    const task = await getTask(this.env.DB, taskId);
    if (!task) return;
    if (!["submitting", "processing"].includes(task.status)) return;
    if (!task.spicyId) {
      await this.start(taskId);
      return;
    }

    const startedAt = task.startedAt || task.createdAt;
    const maxMs = (task.timeoutMinutes || 30) * 60 * 1000;
    if (Date.now() - startedAt > maxMs) {
      await updateTask(this.env.DB, taskId, {
        status: "timeout",
        spicyStatus: "timeout",
        error: `No final status after ${Math.round(maxMs / 60000)} minutes. The task may still finish on SpicyModels; failed/timeout tasks are not charged.`,
        completedAt: Date.now(),
        nextPollAt: null,
      });
      return;
    }

    let key;
    try {
      key = await userKey(this.env, task.userId, "spicy");
    } catch {
      key = "";
    }
    if (!key) {
      await updateTask(this.env.DB, taskId, {
        status: "failed",
        error: "This account has no SpicyModels API key. Add one in Settings.",
        completedAt: Date.now(),
        nextPollAt: null,
      });
      return;
    }

    try {
      const data = await getPrediction(this.env, key, task.spicyId);
      const status = String(data?.status || "").toLowerCase();
      if (["completed", "succeeded", "success"].includes(status)) {
        await this.finalize(task, data);
        return;
      }
      if (["failed", "timeout"].includes(status)) {
        await updateTask(this.env.DB, taskId, {
          status: status === "timeout" ? "timeout" : "failed",
          spicyStatus: status,
          error: data?.error || data?.msg || (status === "timeout" ? "The provider timed out. Not charged." : "Generation failed."),
          completedAt: Date.now(),
          requestId: data?.request_id || task.requestId,
          nextPollAt: null,
        });
        return;
      }
      const interval = task.kind === "image" ? 5000 : 8000;
      await updateTask(this.env.DB, taskId, {
        status: "processing",
        spicyStatus: status || "processing",
        error: "",
        pollAttempts: 0,
        nextPollAt: Date.now() + interval,
      });
      await this.schedule(interval);
    } catch (error) {
      const attempts = Number(task.pollAttempts || 0) + 1;
      if (attempts >= MAX_POLL_ERRORS) {
        await updateTask(this.env.DB, taskId, {
          status: "failed",
          error: `Lost contact with SpicyModels while polling: ${error.message}`,
          completedAt: Date.now(),
          pollAttempts: attempts,
          nextPollAt: null,
        });
        return;
      }
      const interval = Math.min(30_000, 5000 * attempts);
      await updateTask(this.env.DB, taskId, {
        pollAttempts: attempts,
        nextPollAt: Date.now() + interval,
      });
      await this.schedule(interval);
    }
  }

  async finalize(task, data) {
    const urls = extractUrls(data);
    if (!urls.length) {
      await updateTask(this.env.DB, task.id, {
        status: "failed",
        error: "The task completed but returned no outputs.",
        completedAt: Date.now(),
        nextPollAt: null,
      });
      return;
    }

    const outputs = [];
    let stored = await storageBytes(this.env.DB);
    let savedBytes = 0;

    for (let i = 0; i < urls.length; i += 1) {
      const remote = urls[i];
      if (stored + savedBytes >= STORAGE_CAP_BYTES) {
        outputs.push({
          remote,
          local: "",
          bytes: 0,
          contentType: "",
          type: task.kind === "video" ? "video" : "image",
          capped: true,
          error: "Storage cap reached. This output stays on the provider for 14 days; delete old tasks to save new results.",
        });
        continue;
      }
      try {
        const saved = await downloadToR2(this.env, task, remote, i);
        if (saved.skipped) {
          outputs.push({
            remote,
            local: "",
            bytes: 0,
            contentType: "",
            type: task.kind === "video" ? "video" : "image",
            capped: true,
            error: saved.reason,
          });
          continue;
        }
        if (stored + savedBytes + saved.bytes > STORAGE_CAP_BYTES) {
          await this.env.MEDIA.delete(saved.key);
          outputs.push({
            remote,
            local: "",
            bytes: 0,
            contentType: "",
            type: task.kind === "video" ? "video" : "image",
            capped: true,
            error: "Storage cap reached. This output stays on the provider for 14 days.",
          });
          continue;
        }
        savedBytes += saved.bytes;
        outputs.push({
          remote,
          local: saved.local,
          key: saved.key,
          bytes: saved.bytes,
          contentType: saved.contentType,
          type: saved.type,
        });
      } catch (error) {
        outputs.push({
          remote,
          local: "",
          bytes: 0,
          contentType: "",
          type: task.kind === "video" ? "video" : "image",
          error: error.message,
        });
      }
    }

    await updateTask(this.env.DB, task.id, {
      status: "completed",
      spicyStatus: data?.status || "completed",
      outputs,
      mediaBytes: savedBytes,
      completedAt: Date.now(),
      error: outputs.some((output) => output.local) ? "" : outputs[0]?.error || "",
      requestId: data?.request_id || task.requestId,
      nextPollAt: null,
    });
  }
}
