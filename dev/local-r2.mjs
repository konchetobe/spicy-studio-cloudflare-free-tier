/* Local-only R2 stand-in backed by files under .local-preview/r2. */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const TYPES = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
  bmp: "image/bmp",
  tif: "image/tiff",
  tiff: "image/tiff",
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  m4v: "video/mp4",
};

function etag(buffer) {
  return `"${createHash("sha1").update(buffer).digest("hex")}"`;
}

function contentType(key) {
  const ext = path.extname(key).slice(1).toLowerCase();
  return TYPES[ext] || "application/octet-stream";
}

async function toBuffer(value) {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value);
  if (value instanceof ArrayBuffer) return Buffer.from(value);
  if (typeof value === "string") return Buffer.from(value);
  if (value instanceof ReadableStream) return Buffer.from(await new Response(value).arrayBuffer());
  if (value && typeof value.arrayBuffer === "function") return Buffer.from(await value.arrayBuffer());
  throw new Error("Unsupported R2 value.");
}

export class LocalR2 {
  constructor(root) {
    this.root = path.resolve(root);
    mkdirSync(this.root, { recursive: true });
  }

  _file(key) {
    const file = path.resolve(this.root, String(key));
    if (file !== this.root && !file.startsWith(this.root + path.sep)) throw new Error("Invalid R2 key.");
    return file;
  }

  _meta(key, buffer) {
    return {
      size: buffer.length,
      httpEtag: etag(buffer),
      httpMetadata: { contentType: contentType(key) },
      uploaded: new Date(statSync(this._file(key)).mtimeMs),
    };
  }

  async put(key, value) {
    const file = this._file(key);
    mkdirSync(path.dirname(file), { recursive: true });
    const buffer = await toBuffer(value);
    writeFileSync(file, buffer);
    return this._meta(key, buffer);
  }

  async get(key, options = {}) {
    const file = this._file(key);
    if (!existsSync(file)) return null;
    const full = readFileSync(file);
    let body = full;
    let range = null;
    const requested = options?.range;
    if (requested && Number.isFinite(requested.offset)) {
      const offset = Math.max(0, Number(requested.offset));
      const length = Number.isFinite(requested.length) ? Number(requested.length) : full.length - offset;
      body = full.subarray(offset, offset + length);
      range = { offset, length: body.length };
    }
    return {
      ...this._meta(key, full),
      body: new Response(body).body,
      range,
    };
  }

  async head(key) {
    const file = this._file(key);
    if (!existsSync(file)) return null;
    return this._meta(key, readFileSync(file));
  }

  async delete(keys) {
    for (const key of Array.isArray(keys) ? keys : [keys]) {
      const file = this._file(key);
      if (existsSync(file)) rmSync(file, { force: true });
    }
  }
}
