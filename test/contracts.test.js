import test from "node:test";
import assert from "node:assert/strict";
import { contracts } from "../src/contracts.js";
import { buildPayload, validateUpload } from "../src/validate.js";
import { extractJson } from "../src/optimizer.js";

const model = (id) => ({ id, supported: true, contract: contracts[id] });

test("all 22 catalog models have a contract", () => {
  const expected = [
    "face-swap", "flashvsr-video-upscale", "head-swap", "ltx-2-3-spicy-image-to-video",
    "minimax-h3-image-to-video-spicy", "qwen-image-edit-spicy", "seedance-2-0-fast",
    "seedance-2-0-mini", "seedance-2-0-pro", "seedance-2-5", "seedream-4-5",
    "seedream-5-0-lite", "seedream-5-0-pro", "vidu-q3-image-to-video-spicy", "w3-0-video",
    "w3-0-video-prime", "w3-0-video-prime-pro", "w3-0-video-pro", "wan-animate",
    "wan2-7-image-to-video-spicy", "z-image-spicy-pro-text-to-image", "z-image-spicy-text-to-image",
  ];
  assert.equal(Object.keys(contracts).length, 22);
  for (const id of expected) assert.ok(contracts[id], `missing contract for ${id}`);
});

test("seedream accepts only its supported size presets", () => {
  const seedream = model("seedream-5-0-pro");
  const control = contracts["seedream-5-0-pro"].sizeControl;
  const sizes = control.ratios.flatMap((ratio) => ratio.sizes.map((size) => size.value));

  for (const size of sizes) {
    const { payload } = buildPayload(seedream, { prompt: "x", size });
    assert.equal(payload.size, size);
  }

  const portrait = control.ratios.find((ratio) => ratio.label === "9:16");
  assert.deepEqual(portrait.sizes.map((size) => size.value), ["1152x2048", "1584x2816"]);

  const { payload: alias } = buildPayload(seedream, { prompt: "x", size: "2K" });
  assert.equal(alias.size, "2K");

  assert.throws(() => buildPayload(seedream, { prompt: "x", size: "1728x3072" }), /must be one of/i);
  assert.throws(() => buildPayload(seedream, { prompt: "x", size: "3K" }), /must be one of/i);
});

test("each Seedream model exposes only its own size presets", () => {
  const expected = {
    "seedream-5-0-pro": [
      "1024x1024", "1536x1536", "1776x1328", "1328x1776", "2048x1152", "1152x2048",
      "2048x2048", "2368x1776", "1776x2368", "2816x1584", "1584x2816", "2496x1664",
      "1664x2496", "3136x1344",
    ],
    "seedream-4-5": [
      "2048x2048", "2304x1728", "1728x2304", "2848x1600", "1600x2848", "2496x1664",
      "1664x2496", "3136x1344", "4096x4096", "4704x3520", "3520x4704", "5504x3040",
      "3040x5504", "4992x3328", "3328x4992", "6240x2656",
    ],
    "seedream-5-0-lite": [
      "2048x2048", "2304x1728", "1728x2304", "2848x1600", "1600x2848", "2496x1664",
      "1664x2496", "3136x1344", "3072x3072", "3456x2592", "2592x3456", "4096x2304",
      "2304x4096", "3744x2496", "2496x3744", "4704x2016",
    ],
  };
  const labels = {
    "seedream-5-0-pro": ["1K", "1.5K", "2K"],
    "seedream-4-5": ["2K", "4K"],
    "seedream-5-0-lite": ["2K", "3K"],
  };

  for (const [id, values] of Object.entries(expected)) {
    const control = contracts[id].sizeControl;
    const sizes = control.ratios.flatMap((ratio) => ratio.sizes.map((size) => size.value));
    const uniqueLabels = [...new Set(control.ratios.flatMap((ratio) => ratio.sizes.map((size) => size.label)))];

    assert.deepEqual([...new Set(sizes)].sort(), [...values].sort(), `${id} size list`);
    assert.deepEqual(uniqueLabels, labels[id], `${id} tiers`);
    assert.ok(sizes.includes(control.default), `${id} default must be selectable`);

    for (const size of values) {
      const { payload } = buildPayload(model(id), { prompt: "x", size });
      assert.equal(payload.size, size);
    }
  }

  // 4.5 and Lite reject the smaller Pro-only sizes; Pro and Lite reject 4K.
  for (const id of ["seedream-4-5", "seedream-5-0-lite"]) {
    assert.throws(() => buildPayload(model(id), { prompt: "x", size: "1536x1536" }), /must be one of/i);
    assert.throws(() => buildPayload(model(id), { prompt: "x", size: "1024x1024" }), /must be one of/i);
  }
  assert.throws(() => buildPayload(model("seedream-5-0-pro"), { prompt: "x", size: "4096x4096" }), /must be one of/i);
  assert.throws(() => buildPayload(model("seedream-5-0-lite"), { prompt: "x", size: "4096x4096" }), /must be one of/i);

  // Each model accepts only the shorthand presets its backend advertises.
  assert.equal(buildPayload(model("seedream-4-5"), { prompt: "x", size: "4K" }).payload.size, "4K");
  assert.equal(buildPayload(model("seedream-5-0-lite"), { prompt: "x", size: "3K" }).payload.size, "3K");
  assert.throws(() => buildPayload(model("seedream-4-5"), { prompt: "x", size: "3K" }), /must be one of/i);
  assert.throws(() => buildPayload(model("seedream-5-0-lite"), { prompt: "x", size: "4K" }), /must be one of/i);
});

test("seedance rejects keyframes combined with references", () => {
  assert.throws(
    () =>
      buildPayload(model("seedance-2-5"), {
        prompt: "a shot",
        first_frame: "https://example.com/a.jpg",
        reference_images: ["https://example.com/b.jpg"],
      }),
    /cannot be combined/i
  );
});

test("a last frame requires a first frame", () => {
  assert.throws(
    () => buildPayload(model("seedance-2-0-pro"), { prompt: "a shot", last_frame: "https://example.com/b.jpg" }),
    /requires a first frame/i
  );
});

test("likeness consent is mandatory and must be true", () => {
  const images = ["https://example.com/a.jpg", "https://example.com/b.jpg"];
  assert.throws(() => buildPayload(model("face-swap"), { images }), /required/i);
  assert.throws(() => buildPayload(model("face-swap"), { images, likeness_consent: false }), /must be true/i);
  const { payload } = buildPayload(model("face-swap"), { images, likeness_consent: true });
  assert.deepEqual(payload.images, images);
  assert.equal(payload.likeness_consent, true);
});

test("duration bounds come from the contract", () => {
  const image = "https://example.com/a.jpg";
  assert.throws(
    () => buildPayload(model("minimax-h3-image-to-video-spicy"), { images: [image], prompt: "x", duration: 2 }),
    /at least 3/i
  );
  const { payload } = buildPayload(model("minimax-h3-image-to-video-spicy"), {
    images: [image], prompt: "x", duration: 15,
  });
  assert.equal(payload.duration, 15);
});

test("unsupported catalog models are refused before submit", () => {
  assert.throws(
    () => buildPayload({ id: "future-model", supported: false, contract: null }, { prompt: "x" }),
    /no mapped input schema/i
  );
});

test("uploads accept phone image formats and enforce per-type limits", () => {
  const mb = 1024 * 1024;
  const accepted = [
    ["photo.jpg", "image/jpeg", "image/jpeg"],
    ["photo.jpg", "image/jpg", "image/jpeg"],
    ["photo.heic", "image/heic", "image/heic"],
    ["photo.heif", "image/heif", "image/heif"],
    ["photo.avif", "image/avif", "image/avif"],
    ["photo.heic", "application/octet-stream", "image/heic"],
    ["clip.mp4", "video/mp4", "video/mp4"],
    ["clip.mov", "video/quicktime", "video/quicktime"],
    ["track.mp3", "audio/mpeg", "audio/mpeg"],
  ];

  for (const [filename, contentType, expected] of accepted) {
    assert.equal(validateUpload({ filename, contentType, size: 1024 }).contentType, expected);
  }

  assert.throws(
    () => validateUpload({ filename: "doc.pdf", contentType: "application/pdf", size: 1024 }),
    /Unsupported file type/i
  );
  assert.throws(
    () => validateUpload({ filename: "photo.heic", contentType: "application/octet-stream", size: 31 * mb }),
    /30 MB/i
  );
  assert.throws(
    () => validateUpload({ filename: "clip.mp4", contentType: "video/mp4", size: 101 * mb }),
    /100 MB/i
  );
  assert.equal(validateUpload({ filename: "clip.mp4", contentType: "video/mp4", size: 100 * mb }).contentType, "video/mp4");
});

test("extractJson survives fences and surrounding prose", () => {
  const parsed = extractJson('```json\n{"prompt":"A shot","negative_prompt":null,"notes":["n"]}\n```');
  assert.equal(parsed.prompt, "A shot");
  const noisy = extractJson('Here you go: {"prompt":"A {brace} inside","notes":[]} — done.');
  assert.equal(noisy.prompt, "A {brace} inside");
});
