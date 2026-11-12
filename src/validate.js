import { allowedFields } from "./contracts.js";

export class ValidationError extends Error {
  constructor(message, field = "") {
    super(message);
    this.name = "ValidationError";
    this.status = 400;
    this.field = field;
  }
}

const URL_RE = /^https?:\/\/[^\s]+$/i;

function isUrl(value) {
  return typeof value === "string" && URL_RE.test(value.trim());
}

function asInteger(value, prop, field) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(n)) throw new ValidationError(`${field} must be a whole number.`, field);
  if (prop.minimum != null && n < prop.minimum) throw new ValidationError(`${field} must be at least ${prop.minimum}.`, field);
  if (prop.maximum != null && n > prop.maximum) throw new ValidationError(`${field} must be at most ${prop.maximum}.`, field);
  return n;
}

function asString(value, prop, field) {
  if (typeof value !== "string") throw new ValidationError(`${field} must be text.`, field);
  const s = value.trim();
  if (prop.minLength != null && s.length < prop.minLength) throw new ValidationError(`${field} is too short.`, field);
  if (s.length > 20_000) throw new ValidationError(`${field} is too long (max 20,000 characters).`, field);
  if (prop.enum && !prop.enum.includes(s)) {
    throw new ValidationError(`${field} must be one of: ${prop.enum.join(", ")}.`, field);
  }
  if (prop.format === "uri" && !isUrl(s)) {
    throw new ValidationError(`${field} must be a public http(s) URL.`, field);
  }
  if (prop.const !== undefined && s !== prop.const) {
    throw new ValidationError(`${field} must be ${JSON.stringify(prop.const)}.`, field);
  }
  return s;
}

function asBoolean(value, field) {
  if (typeof value !== "boolean") throw new ValidationError(`${field} must be true or false.`, field);
  return value;
}

function cleanArray(value, prop, field) {
  if (!Array.isArray(value)) throw new ValidationError(`${field} must be a list.`, field);
  const list = value
    .map((item) => (typeof item === "string" ? item.trim() : item))
    .filter((item) => item !== "" && item != null);
  if (prop.minItems != null && list.length < prop.minItems) {
    throw new ValidationError(`${field} needs at least ${prop.minItems} item(s).`, field);
  }
  if (prop.maxItems != null && list.length > prop.maxItems) {
    throw new ValidationError(`${field} allows at most ${prop.maxItems} item(s).`, field);
  }
  for (const item of list) {
    if (!isUrl(item)) throw new ValidationError(`${field} contains an invalid URL: ${String(item).slice(0, 80)}`, field);
  }
  return list;
}

/**
 * Validate a browser payload against the model contract and return the exact
 * body SpicyModels should receive.
 */
export function buildPayload(model, input) {
  if (!model) throw new ValidationError("Unknown model.");
  if (!model.supported) throw new ValidationError("This model is in the catalog but has no mapped input schema yet.");
  const contract = model.contract;

  const payload = { model: model.id };
  for (const [field, prop] of Object.entries(contract.properties)) {
    const value = input?.[field];
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value) && value.length === 0) continue;

    if (prop.type === "array") {
      payload[field] = cleanArray(value, prop, field);
    } else if (prop.type === "integer") {
      payload[field] = asInteger(value, prop, field);
    } else if (prop.type === "boolean") {
      payload[field] = asBoolean(value, field);
    } else {
      const s = asString(value, prop, field);
      if (field === "size") {
        const control = contract.sizeControl;
        if (control?.mode === "presets") {
          const allowed = new Set([
            ...control.ratios.flatMap((ratio) => ratio.sizes.map((size) => size.value)),
            ...(control.aliases || []),
          ]);
          if (!allowed.has(s)) {
            throw new ValidationError(`Size must be one of: ${[...allowed].join(", ")}.`, "size");
          }
        } else if (!["2K", "3K", "4K"].includes(s) && !/^\d{3,5}x\d{3,5}$/.test(s)) {
          throw new ValidationError("Size must be 2K, 3K, 4K, or WIDTHxHEIGHT (e.g. 2048x2048).", "size");
        }
      }
      payload[field] = s;
    }
  }

  for (const field of contract.required || []) {
    if (payload[field] === undefined) {
      throw new ValidationError(`${contract.properties[field]?.title || field} is required.`, field);
    }
  }

  if (contract.anyOfRequired) {
    const satisfied = contract.anyOfRequired.some((group) => group.some((field) => payload[field] !== undefined));
    if (!satisfied) {
      const names = contract.anyOfRequired[0].map((f) => contract.properties[f]?.title || f);
      throw new ValidationError(`Provide at least one of: ${names.join(", ")}.`);
    }
  }

  if (payload.last_frame && !payload.first_frame) {
    throw new ValidationError("A last frame requires a first frame.", "last_frame");
  }
  if (payload.reference_images && payload.first_frame) {
    throw new ValidationError("Reference images cannot be combined with a first/last frame.", "reference_images");
  }
  if (contract.properties.images && payload.images && payload.reference_images) {
    throw new ValidationError("Keyframes and reference images cannot be combined.", "reference_images");
  }
  if (payload.likeness_consent === false) {
    throw new ValidationError("Likeness consent must be true for this model.", "likeness_consent");
  }

  return { payload, contract };
}

const UPLOAD_TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
  ".gif": "image/gif",
  ".tif": "image/tiff",
  ".tiff": "image/tiff",
  ".heic": "image/heic",
  ".heif": "image/heif",
  ".avif": "image/avif",
  ".mp4": "video/mp4",
  ".m4v": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
};

const ALLOWED_UPLOAD = /^(image\/(jpeg|png|webp|bmp|gif|tiff|heic|heif|avif)|video\/(mp4|quicktime|webm|x-m4v)|audio\/(mpeg|mp3|wav|x-wav))$/i;

function resolveContentType(filename, contentType) {
  const type = String(contentType || "").toLowerCase();
  if (type && type !== "application/octet-stream") {
    return type === "image/jpg" ? "image/jpeg" : type;
  }
  const ext = String(filename || "").toLowerCase().match(/\.[a-z0-9]+$/)?.[0] || "";
  return UPLOAD_TYPES[ext] || "";
}

export function validateUpload({ filename, contentType, size }) {
  if (!size) throw new ValidationError("The uploaded file is empty.");
  if (!filename || filename.length > 200) throw new ValidationError("A valid filename is required.");
  const type = resolveContentType(filename, contentType);
  if (!type || !ALLOWED_UPLOAD.test(type)) {
    throw new ValidationError(`Unsupported file type: ${type || contentType || "unknown"}`);
  }
  const maxMb = type.startsWith("image/") ? 30 : 100;
  if (size > maxMb * 1024 * 1024) {
    throw new ValidationError(`${type.startsWith("image/") ? "Images" : "Video and audio"} can be up to ${maxMb} MB.`);
  }
  return { contentType: type };
}
