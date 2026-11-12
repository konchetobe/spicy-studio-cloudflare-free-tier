const DEFAULT_RUNWARE_BASE = "https://api.runware.ai/v1";
const DEFAULT_RUNWARE_MODEL = "deepseek:v4.1@flash-1017";
const RUNWARE_LABEL = "DeepSeek V4.1 Flash · Runware";
const LOCAL_LABEL = "Local structure";
const CACHE_TTL = 30 * 60 * 1000;
const cache = new Map();

let running = 0;
const queue = [];
const MAX_CONCURRENT = 2;

function withSlot(fn) {
  return new Promise((resolve, reject) => {
    const run = () => {
      running += 1;
      Promise.resolve()
        .then(fn)
        .then(resolve, reject)
        .finally(() => {
          running -= 1;
          const next = queue.shift();
          if (next) next();
        });
    };
    if (running < MAX_CONCURRENT) run();
    else queue.push(run);
  });
}

function modeOf(contract, input) {
  const hasVideo = Boolean(input.video);
  const hasImage = Boolean(input.images?.length || input.first_frame);
  const hasRefs = Boolean(input.reference_images?.length);
  if (contract.kind === "image") {
    if (hasImage) return "image-to-image / edit";
    return "text-to-image";
  }
  if (hasVideo) return "video-to-video";
  if (hasImage || hasRefs) return "image-to-video";
  return "text-to-video";
}

function chosenParams(contract, input) {
  const rows = [];
  for (const key of [
    "resolution",
    "duration",
    "ratio",
    "size",
    "width",
    "height",
    "generate_audio",
    "audio",
    "mode",
    "preset",
    "prompt_extend",
  ]) {
    const prop = contract.properties[key];
    if (!prop) continue;
    const value = input[key] ?? prop.default;
    if (value === undefined || value === null) continue;
    const label = prop.title || key;
    rows.push(`${label}: ${typeof value === "boolean" ? (value ? "on" : "off") : value}`);
  }
  return rows;
}

function buildInstruction({ model, contract, guide, input }) {
  const mode = modeOf(contract, input);
  const params = chosenParams(contract, input);
  const hasSourceMedia = Boolean(input.images?.length || input.first_frame || input.video);
  const hasRefs = Boolean(input.reference_images?.length);

  const referenceNote = hasRefs
    ? "Reference images are supplied separately. Refer to them by role and, where the guide supports it, by order (Image 1, Image 2)."
    : "";

  const mediaNote =
    hasSourceMedia && contract.kind === "video"
      ? "A source image/video is supplied. Do NOT re-describe its static appearance. Anchor identity/composition/lighting only if needed, then direct motion, temporal change and camera. Include one short continuity clause: face/identity, wardrobe, props and framing stay as in the source frame. Never contradict the source frame."
      : hasSourceMedia && contract.kind === "image"
        ? "Source image(s) are supplied. State the edit precisely and protect what must not change (identity, pose, framing, background)."
        : "";

  const negativeField = contract.properties.negative_prompt
    ? 'Also return a "negative_prompt" string with the artifacts to suppress (it is a supported API field for this model).'
    : 'Set "negative_prompt" to null. This model has no negative-prompt field — express constraints as positive description inside the prompt only.';

  return `You are Spicy Prompt Compiler, a senior prompt engineer for generative image and video models.
Rewrite the user's idea into one production-ready prompt for ${contract.title} (${model.id}).

TARGET
- Modality: ${contract.kind === "image" ? "image" : "video"}
- Mode: ${mode}
- Selected settings: ${params.length ? params.join(" · ") : "defaults"}
${referenceNote ? `- ${referenceNote}` : ""}
${mediaNote ? `- ${mediaNote}` : ""}

MODEL-SPECIFIC GUIDANCE (${guide.label})
Summary: ${guide.summary}
Preferred structure: ${guide.structure}

Rules:
${guide.rules.map((r, i) => `${i + 1}. ${r}`).join("\n")}

Avoid:
${guide.avoid.map((r) => `- ${r}`).join("\n")}

OUTPUT CONTRACT
Return ONLY one JSON object, no markdown fences, no commentary:
{"prompt": "<the rewritten prompt>", "negative_prompt": <string or null>, "notes": ["<short reason>", "..."]}
- "prompt" must be a single self-contained prompt in English (keep any quoted dialogue in its original language).
- Follow the model's preferred structure and length. Do not pad with generic quality words.
- Preserve the user's creative intent, subjects, mood and any exact text/dialogue they supplied. Do not invent brand names, real people, or dialogue they did not ask for.
- If the user's idea is already detailed, refine it rather than replacing it; keep the details that matter.
- "notes" must contain 2–4 short, specific notes on what you changed and why (max 140 chars each).
- ${negativeField}
- Do not wrap the JSON in code fences. Do not add explanations before or after it.

USER IDEA
${input.prompt.trim()}`;
}

function stripAnsi(text) {
  return String(text).replace(/\u001b\[[0-9;]*m/g, "");
}

/** Find the first balanced JSON object, ignoring braces inside strings. */
export function extractJson(text) {
  const clean = stripAnsi(text).trim();
  const unfenced = clean.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  const candidates = [unfenced];
  const start = unfenced.indexOf("{");
  if (start >= 0) {
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let i = start; i < unfenced.length; i += 1) {
      const ch = unfenced[i];
      if (inString) {
        if (escaped) escaped = false;
        else if (ch === "\\") escaped = true;
        else if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') inString = true;
      else if (ch === "{") depth += 1;
      else if (ch === "}") {
        depth -= 1;
        if (depth === 0) {
          candidates.push(unfenced.slice(start, i + 1));
          break;
        }
      }
    }
  }
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      /* try next */
    }
  }
  return null;
}

function normalizeResult(parsed, guide, rawText) {
  const notes = Array.isArray(parsed?.notes)
    ? parsed.notes.filter((n) => typeof n === "string" && n.trim()).slice(0, 5).map((n) => n.trim())
    : [];
  if (typeof parsed?.prompt === "string" && parsed.prompt.trim().length > 8) {
    return {
      prompt: parsed.prompt.trim(),
      negativePrompt: typeof parsed?.negative_prompt === "string" ? parsed.negative_prompt.trim() : "",
      notes,
      parsed: true,
    };
  }
  const fallbackText = stripAnsi(rawText)
    .replace(/^```(?:json|text)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  if (fallbackText.length > 8) {
    return {
      prompt: fallbackText,
      negativePrompt: "",
      notes: ["The optimizer returned plain text; it was used as the prompt unchanged."],
      parsed: false,
    };
  }
  throw new Error("The optimizer returned an empty result.");
}

function contentText(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part === "string" ? part : part?.text || part?.content || ""))
      .join("");
  }
  return "";
}

async function runRunware(message, key, env) {
  if (!key) throw new Error("No Runware key is configured for this account.");
  const base = String(env.RUNWARE_BASE_URL || DEFAULT_RUNWARE_BASE).replace(/\/$/, "");
  const model = env.RUNWARE_MODEL || DEFAULT_RUNWARE_MODEL;
  const response = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "You are a precise prompt compiler. Follow the user's output contract exactly and return only the requested JSON object.",
        },
        { role: "user", content: message },
      ],
      max_completion_tokens: 6000,
      temperature: 0.7,
    }),
    signal: AbortSignal.timeout(120_000),
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = body?.error?.message || body?.errors?.[0]?.message || body?.message || `HTTP ${response.status}`;
    throw new Error(`Runware request failed: ${detail}`);
  }
  const choice = body?.choices?.[0]?.message;
  const text = contentText(choice?.content).trim();
  if (!text) throw new Error("Runware returned an empty completion.");
  return text;
}

function localFallback(guide, idea) {
  return {
    prompt: guide.fallback.replaceAll("{idea}", idea.trim()),
    negativePrompt: "",
    notes: [
      "Prompt optimizer unavailable — used the built-in structure for this model.",
      "Add a Runware API key in Settings to turn on DeepSeek rewriting.",
    ],
    parsed: false,
    degraded: true,
  };
}

function compiled(raw, guide, engine, engineLabel) {
  const parsed = extractJson(raw);
  if (!parsed) throw new Error(`${engineLabel} did not return valid JSON.`);
  return { ...normalizeResult(parsed, guide, raw), engine, engineLabel };
}

export async function optimizePrompt({ env, runwareKey, userId, model, contract, guide, input }) {
  if (!guide || guide.optimizable === false) {
    const error = new Error(guide?.summary || "This model has no prompt to optimize.");
    error.status = 400;
    throw error;
  }
  if (!input?.prompt || !String(input.prompt).trim()) {
    const error = new Error("Write an idea before optimizing.");
    error.status = 400;
    throw error;
  }

  const idea = String(input.prompt).trim().slice(0, 4000);
  const settings = ["resolution", "duration", "ratio", "size", "mode", "preset", "generate_audio", "audio"]
    .map((key) => `${key}=${input[key] ?? ""}`)
    .join("&");
  const cacheKey = `${userId}|${model.id}|${idea}|${contract.kind}|${settings}|${input.images?.length || 0}|${input.first_frame ? 1 : 0}|${input.video ? 1 : 0}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_TTL) return { ...hit.value, cached: true };

  const message = buildInstruction({ model, contract, guide, input: { ...input, prompt: idea } });
  let result = null;
  const failures = [];

  if (runwareKey) {
    try {
      const raw = await withSlot(() => runRunware(message, runwareKey, env));
      result = compiled(raw, guide, "runware", RUNWARE_LABEL);
    } catch (error) {
      failures.push(`Runware: ${error.message}`);
    }
  }

  if (!result) {
    result = {
      ...localFallback(guide, idea),
      engine: "local-fallback",
      engineLabel: LOCAL_LABEL,
      warning: failures.join(" · "),
    };
  }

  const value = {
    ...result,
    guide: { id: guide.id, label: guide.label, source: guide.source },
    model: model.id,
  };
  cache.set(cacheKey, { at: Date.now(), value });
  if (cache.size > 120) cache.delete(cache.keys().next().value);
  return value;
}

export function optimizerInfo(hasRunwareKey, env = {}) {
  return {
    engine: hasRunwareKey ? "runware" : "local",
    provider: hasRunwareKey ? "Runware" : "Local",
    model: hasRunwareKey ? env.RUNWARE_MODEL || DEFAULT_RUNWARE_MODEL : "Guide structure",
    label: hasRunwareKey ? RUNWARE_LABEL : LOCAL_LABEL,
    available: true,
  };
}
