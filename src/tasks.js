import { HttpError } from "./errors.js";
import {
  activeTaskCount,
  deleteTask,
  getTask,
  getTaskForUser,
  insertTask,
  listTasks,
  storageBytes,
} from "./db.js";

const STORAGE_CAP_BYTES = 9 * 1024 * 1024 * 1024;
const MAX_ACTIVE_TASKS = 2;

function publicOutput(output) {
  if (!output) return output;
  const { key, ...rest } = output;
  return rest;
}

export function publicTask(task) {
  if (!task) return null;
  const createdAt = Number(task.createdAt || 0);
  const completedAt = Number(task.completedAt || 0);
  return {
    id: task.id,
    spicyId: task.spicyId || "",
    model: task.model,
    modelTitle: task.modelTitle || task.model,
    kind: task.kind,
    prompt: task.prompt || "",
    params: task.params || {},
    status: task.status,
    spicyStatus: task.spicyStatus || "",
    error: task.error || "",
    outputs: (task.outputs || []).map(publicOutput),
    mediaBytes: Number(task.mediaBytes || 0),
    timeoutMinutes: Number(task.timeoutMinutes || 30),
    requestId: task.requestId || "",
    createdAt,
    updatedAt: Number(task.updatedAt || createdAt),
    startedAt: Number(task.startedAt || 0),
    completedAt,
    elapsedMs: completedAt ? completedAt - createdAt : Date.now() - createdAt,
  };
}

async function taskStub(env, taskId) {
  return env.TASKS.get(env.TASKS.idFromName(taskId));
}

async function callTask(env, taskId, path) {
  const stub = await taskStub(env, taskId);
  const response = await stub.fetch(
    new Request(`https://task${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId }),
    })
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new HttpError(response.status, data?.error || "The generation service failed.");
  return data;
}

export async function createTask(env, user, model, payload) {
  if ((await activeTaskCount(env.DB, user.id)) >= MAX_ACTIVE_TASKS) {
    throw new HttpError(429, `You can have at most ${MAX_ACTIVE_TASKS} active tasks. Wait for one to finish.`);
  }
  if ((await storageBytes(env.DB)) >= STORAGE_CAP_BYTES) {
    throw new HttpError(409, "The 9 GB free storage cap is full. Delete old tasks to save new results.");
  }

  const id = crypto.randomUUID();
  const createdAt = Date.now();
  const task = {
    id,
    userId: user.id,
    spicyId: "",
    model: model.id,
    modelTitle: model.title,
    kind: model.kind,
    prompt: payload.prompt || "",
    params: Object.fromEntries(Object.entries(payload).filter(([key]) => key !== "model")),
    status: "submitting",
    spicyStatus: "",
    error: "",
    outputs: [],
    mediaBytes: 0,
    timeoutMinutes: model.timeoutMinutes || 30,
    requestId: "",
    createdAt,
    updatedAt: createdAt,
    startedAt: 0,
    completedAt: 0,
    nextPollAt: createdAt + 5000,
    pollAttempts: 0,
  };
  await insertTask(env.DB, task);
  try {
    await callTask(env, id, "/start");
  } catch (error) {
    const stored = await getTask(env.DB, id);
    throw new HttpError(error.status || 502, error.message || stored?.error || "Submission failed.");
  }
  return publicTask(await getTask(env.DB, id));
}

export async function listUserTasks(env, userId) {
  return (await listTasks(env.DB, userId)).map(publicTask);
}

export async function getUserTask(env, userId, id) {
  const task = await getTaskForUser(env.DB, id, userId);
  if (!task) throw new HttpError(404, "Task not found.");
  return task;
}

export async function deleteUserTask(env, task) {
  if (["submitting", "processing"].includes(task.status)) {
    throw new HttpError(409, "This task is still running. Its record cannot be removed yet.");
  }
  const keys = (task.outputs || []).map((output) => output.key).filter(Boolean);
  if (keys.length) {
    await env.MEDIA.delete(keys);
  }
  await deleteTask(env.DB, task.id);
}

export { STORAGE_CAP_BYTES };
