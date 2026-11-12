import { contracts, isPromptModel } from "./contracts.js";
import { guideFor } from "./guides.js";

const DEFAULT_API = "https://spicymodels.ai/api/v1";
const TTL_MS = 10 * 60 * 1000;
const RETRY_MS = 30 * 1000;

let cache = { at: 0, models: [], source: "empty" };
let refreshPromise = null;
let lastFailureAt = 0;
let fallbackCache = null;
let apiBase = DEFAULT_API;

function priceOf(model) {
  const raw = model?.price?.actual?.base_price ?? model?.price?.origin?.base_price ?? null;
  const n = raw == null ? null : Number(raw);
  if (!Number.isFinite(n)) return null;
  return {
    amount: n,
    display: `$${n.toFixed(4).replace(/0+$/, "").replace(/\.$/, "")}`,
    unit: model.type === "Video" ? "sec" : "img",
  };
}

function decorate(live) {
  const contract = contracts[live.model];
  const guide = guideFor(contract);
  return {
    id: live.model,
    title: contract?.title || live.displayName || live.model,
    providerName: live.displayName || live.model,
    kind: contract?.kind || (String(live.type).toLowerCase() === "video" ? "video" : "image"),
    type: live.type,
    tags: live.tags || [],
    summary: contract?.summary || "",
    guide: guide ? { ...guide, optimizable: guide.optimizable !== false } : null,
    price: priceOf(live),
    cover: live.coverUrl || "",
    logo: live.logo || "",
    supported: Boolean(contract),
    contract: contract || null,
    promptable: isPromptModel(contract),
    notes: contract?.notes || [],
    rateCard: contract?.rateCard || "",
    timeoutMinutes: contract?.timeoutMinutes || 30,
    example: contract?.example || null,
  };
}

function fallbackModels() {
  if (!fallbackCache) {
    fallbackCache = Object.entries(contracts).map(([id, c]) =>
      decorate({ model: id, displayName: c.title, type: c.kind === "video" ? "Video" : "Image", tags: [] })
    );
  }
  return fallbackCache;
}

async function fetchLiveModels() {
  const res = await fetch(`${apiBase}/models`, {
    signal: AbortSignal.timeout(20_000),
    cf: { cacheTtl: 300, cacheEverything: true },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = await res.json();
  const list = Array.isArray(body?.data) ? body.data : [];
  if (!list.length) throw new Error("Empty model catalog");

  const decorated = list.map(decorate);
  for (const [id, c] of Object.entries(contracts)) {
    if (!decorated.some((m) => m.id === id)) {
      decorated.push(decorate({ model: id, displayName: c.title, type: c.kind === "video" ? "Video" : "Image", tags: [] }));
    }
  }
  return decorated;
}

function refreshCatalog() {
  if (refreshPromise) return refreshPromise;
  refreshPromise = fetchLiveModels()
    .then((models) => {
      cache = { at: Date.now(), models, source: "live" };
      return cache.models;
    })
    .catch((error) => {
      lastFailureAt = Date.now();
      const source = cache.models.length ? cache.source : "fallback";
      console.warn(`[catalog] ${error.message}; using ${source} models.`);
      return cache.models;
    })
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

function cacheIsFresh() {
  return cache.models.length > 0 && cache.source === "live" && Date.now() - cache.at < TTL_MS;
}

export function catalogStatus() {
  return {
    source: cache.source,
    stale: !cacheIsFresh(),
    refreshing: Boolean(refreshPromise),
    ageMs: cache.at ? Date.now() - cache.at : null,
  };
}

export async function getModels(env, { force = false } = {}) {
  apiBase = String(env.SPICYMODELS_BASE_URL || DEFAULT_API).replace(/\/$/, "");
  if (!cache.models.length) {
    cache = { at: 0, models: fallbackModels(), source: "fallback" };
  }
  if (force) return refreshCatalog();
  if (cacheIsFresh()) return cache.models;
  if (Date.now() - lastFailureAt > RETRY_MS) refreshCatalog();
  return cache.models;
}

export async function getModel(env, id) {
  const models = await getModels(env);
  return models.find((m) => m.id === id) || null;
}
