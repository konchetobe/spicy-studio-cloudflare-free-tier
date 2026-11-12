/**
 * Authoritative input contracts for every model in the SpicyModels catalog.
 *
 * These mirror the request schemas used by the SpicyModels playground / docs
 * (retrieved 2026-11-02). The server validates against them and the browser
 * renders its form from them, so the app never sends an undocumented field.
 */

const MEDIA = "Public HTTPS URL. Upload a local file in the composer, or paste a URL.";
const IMAGE = { type: "string", format: "uri", description: MEDIA };

const seed = (description = "Same seed and inputs give a similar result. Omit for a random seed.") => ({
  title: "Seed",
  type: "integer",
  minimum: 0,
  maximum: 2147483647,
  description,
  advanced: true,
});

const resolution = (values, fallback) => ({
  title: "Resolution",
  type: "string",
  enum: values,
  default: fallback,
  description: "Output resolution. Sets the per-second price.",
});

const duration = (min, max, fallback = 5) => ({
  title: "Duration",
  type: "integer",
  minimum: min,
  maximum: max,
  default: fallback,
  description: `Length in seconds (${min}–${max}). Billed per requested second, rounded up.`,
});

// Seedance accepts -1 (random) up to an unsigned 32-bit seed.
const seedanceSeed = () => ({
  title: "Seed",
  type: "integer",
  minimum: -1,
  maximum: 4294967295,
  description: "Same seed and inputs give a similar result. Omit or -1 for a random seed.",
  advanced: true,
});

const ratio = (fallback = "adaptive") => ({
  title: "Aspect ratio",
  type: "string",
  enum: ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9", "adaptive"],
  ...(fallback ? { default: fallback } : {}),
  description: "`adaptive` follows the input image; otherwise a fixed frame.",
});

const images = (title, min, max, description) => ({
  title,
  type: "array",
  minItems: min,
  maxItems: max,
  items: IMAGE,
  description,
});

// Seedream sizes are per model: 5.0 Pro stops at 2K, 4.5 adds 4K, 5.0 Lite adds 3K.
// Every value below is an exact `size` the SpicyModels backend accepts; `aliases`
// are the shorthand presets it also accepts for that model.
const SEEDREAM_RATIOS = ["1:1", "4:3", "3:4", "16:9", "9:16", "3:2", "2:3", "21:9"];

const SEEDREAM_TIERS = {
  "seedream-5-0-pro": [
    { label: "1K", sizes: { "1:1": "1024x1024" } },
    {
      label: "1.5K",
      sizes: {
        "1:1": "1536x1536",
        "4:3": "1776x1328",
        "3:4": "1328x1776",
        "16:9": "2048x1152",
        "9:16": "1152x2048",
      },
    },
    {
      label: "2K",
      sizes: {
        "1:1": "2048x2048",
        "4:3": "2368x1776",
        "3:4": "1776x2368",
        "16:9": "2816x1584",
        "9:16": "1584x2816",
        "3:2": "2496x1664",
        "2:3": "1664x2496",
        "21:9": "3136x1344",
      },
    },
  ],
  "seedream-4-5": [
    {
      label: "2K",
      sizes: {
        "1:1": "2048x2048",
        "4:3": "2304x1728",
        "3:4": "1728x2304",
        "16:9": "2848x1600",
        "9:16": "1600x2848",
        "3:2": "2496x1664",
        "2:3": "1664x2496",
        "21:9": "3136x1344",
      },
    },
    {
      label: "4K",
      sizes: {
        "1:1": "4096x4096",
        "4:3": "4704x3520",
        "3:4": "3520x4704",
        "16:9": "5504x3040",
        "9:16": "3040x5504",
        "3:2": "4992x3328",
        "2:3": "3328x4992",
        "21:9": "6240x2656",
      },
    },
  ],
  "seedream-5-0-lite": [
    {
      label: "2K",
      sizes: {
        "1:1": "2048x2048",
        "4:3": "2304x1728",
        "3:4": "1728x2304",
        "16:9": "2848x1600",
        "9:16": "1600x2848",
        "3:2": "2496x1664",
        "2:3": "1664x2496",
        "21:9": "3136x1344",
      },
    },
    {
      label: "3K",
      sizes: {
        "1:1": "3072x3072",
        "4:3": "3456x2592",
        "3:4": "2592x3456",
        "16:9": "4096x2304",
        "9:16": "2304x4096",
        "3:2": "3744x2496",
        "2:3": "2496x3744",
        "21:9": "4704x2016",
      },
    },
  ],
};

const SEEDREAM_ALIASES = {
  "seedream-5-0-pro": ["2K"],
  "seedream-4-5": ["2K", "4K"],
  "seedream-5-0-lite": ["2K", "3K"],
};

const SEEDREAM_EXAMPLES = {
  "seedream-5-0-pro": ["2048x2048", "1536x1536", "2816x1584", "1584x2816"],
  "seedream-4-5": ["2048x2048", "2848x1600", "4096x4096", "3040x5504"],
  "seedream-5-0-lite": ["2048x2048", "3072x3072", "4096x2304", "2304x4096"],
};

function seedreamSizeControl(modelId) {
  const tiers = SEEDREAM_TIERS[modelId];
  return {
    mode: "presets",
    field: "size",
    default: "2048x2048",
    aliases: SEEDREAM_ALIASES[modelId],
    ratios: SEEDREAM_RATIOS.map((label) => ({
      label,
      sizes: tiers
        .map((tier) => ({ label: tier.label, value: tier.sizes[label] }))
        .filter((size) => size.value),
    })).filter((ratio) => ratio.sizes.length),
  };
}

export const contracts = {
  /* ───────────────────────────── images ───────────────────────────── */

  "z-image-spicy-text-to-image": {
    title: "Z-Image Creative Text to Image",
    kind: "image",
    guide: "zimage",
    summary: "Fast, expressive text-to-image.",
    sizeControl: {
      mode: "dimensions",
      width: "width",
      height: "height",
      min: 256,
      max: 2048,
      ratios: ["1:1", "4:3", "3:4", "16:9", "9:16", "3:2", "2:3"],
      tiers: [
        { label: "1K", longEdge: 1024 },
        { label: "1.5K", longEdge: 1536 },
        { label: "2K", longEdge: 2048 },
      ],
    },
    required: ["prompt"],
    properties: {
      prompt: { title: "Prompt", type: "string", minLength: 1, description: "What to draw." },
      width: { title: "Width", type: "integer", default: 1024, description: "Output width in pixels." },
      height: { title: "Height", type: "integer", default: 1024, description: "Output height in pixels." },
      seed: seed("Same seed and prompt give the same image."),
      prompt_extend: {
        title: "Prompt expansion",
        type: "boolean",
        description: "Let the model expand a short prompt.",
        advanced: true,
      },
    },
    example: { prompt: "A portrait of a woman in a red dress, studio light", width: 1024, height: 1024 },
    timeoutMinutes: 10,
    rateCard: "$0.025 per image",
  },

  "z-image-spicy-pro-text-to-image": {
    title: "Z-Image Creative Pro Text to Image",
    kind: "image",
    guide: "zimage",
    summary: "Higher-quality Z-Image, up to 2560 px.",
    sizeControl: {
      mode: "dimensions",
      width: "width",
      height: "height",
      min: 256,
      max: 2560,
      ratios: ["1:1", "4:3", "3:4", "16:9", "9:16", "3:2", "2:3"],
      tiers: [
        { label: "1K", longEdge: 1024 },
        { label: "1.5K", longEdge: 1536 },
        { label: "2K", longEdge: 2048 },
        { label: "2.5K", longEdge: 2560 },
      ],
    },
    required: ["prompt"],
    properties: {
      prompt: { title: "Prompt", type: "string", minLength: 1, description: "What to draw." },
      width: { title: "Width", type: "integer", minimum: 256, maximum: 2560, default: 1024 },
      height: { title: "Height", type: "integer", minimum: 256, maximum: 2560, default: 1024 },
      seed: seed("Same seed and prompt give the same image."),
      prompt_extend: {
        title: "Prompt expansion",
        type: "boolean",
        default: false,
        description: "Let the model expand a short prompt.",
        advanced: true,
      },
    },
    example: { prompt: "A portrait of a woman in a red dress, soft studio light", width: 1024, height: 1536 },
    timeoutMinutes: 10,
    rateCard: "$0.036 per image",
  },

  "qwen-image-edit-spicy": {
    title: "Qwen Image Edit Creative",
    kind: "image",
    guide: "qwen-edit",
    summary: "Instruction-based image editing with up to two references.",
    required: ["images", "prompt"],
    properties: {
      images: images(
        "Images",
        1,
        3,
        "`images[0]` is the image to edit; the output keeps its size and composition. `images[1]` and `images[2]` are optional references."
      ),
      prompt: {
        title: "Edit instruction",
        type: "string",
        minLength: 1,
        description: 'The edit to make, e.g. "Change the dress to blue".',
      },
      seed: seed("Omit or 0 for a random seed."),
    },
    example: { images: ["https://static.spicymodels.ai/model/example/media/input-puppy.jpg"], prompt: "Put a small red hat on the puppy" },
    timeoutMinutes: 10,
    rateCard: "$0.072 (1 image) · $0.0774 (2) · $0.0828 (3)",
  },

  "face-swap": {
    title: "Face Transfer",
    kind: "image",
    guide: "swap",
    summary: "Places the face from one photo onto the person in another.",
    required: ["images", "likeness_consent"],
    properties: {
      images: images("Photos", 2, 2, "`images[0]` is the target photo; `images[1]` is the face to place on it."),
      likeness_consent: {
        title: "Likeness consent",
        type: "boolean",
        const: true,
        description: "Confirms every person shown has given documented consent to this use.",
      },
      seed: seed(),
    },
    notes: [
      "`likeness_consent` must be `true`; without it the request is rejected with 400 and nothing is charged.",
      "You must hold documented consent from every person shown. Sexual use of a real person's likeness, impersonating a public figure and any content of a minor are prohibited.",
    ],
    example: {
      images: [
        "https://static.spicymodels.ai/model/example/media/input-woman.jpg",
        "https://static.spicymodels.ai/model/example/media/input-man.png",
      ],
      likeness_consent: true,
    },
    timeoutMinutes: 10,
    rateCard: "$0.0234 per image",
  },

  "head-swap": {
    title: "Head Transfer",
    kind: "image",
    guide: "swap",
    summary: "Places the head from one photo onto the person in another.",
    required: ["images", "likeness_consent"],
    properties: {
      images: images("Photos", 2, 2, "`images[0]` is the target photo; `images[1]` is the head to place on it."),
      likeness_consent: {
        title: "Likeness consent",
        type: "boolean",
        const: true,
        description: "Confirms every person shown has given documented consent to this use.",
      },
      seed: seed(),
    },
    notes: [
      "`likeness_consent` must be `true`; without it the request is rejected with 400 and nothing is charged.",
      "You must hold documented consent from every person shown. Sexual use of a real person's likeness, impersonating a public figure and any content of a minor are prohibited.",
    ],
    example: {
      images: [
        "https://static.spicymodels.ai/model/example/media/input-woman.jpg",
        "https://static.spicymodels.ai/model/example/media/input-man.png",
      ],
      likeness_consent: true,
    },
    timeoutMinutes: 10,
    rateCard: "$0.0234 per image",
  },

  ...Object.fromEntries(
    [
      ["seedream-5-0-pro", "Seedream 5.0 Pro", "$0.09 per image"],
      ["seedream-5-0-lite", "Seedream 5.0 Lite", "$0.063 per image"],
      ["seedream-4-5", "Seedream 4.5", "$0.072 per image"],
    ].map(([id, title, rateCard]) => [
      id,
      {
        title,
        kind: "image",
        guide: "seedream",
        summary: "Text-to-image, or image-to-image with up to 14 references.",
        sizeControl: seedreamSizeControl(id),
        required: ["prompt"],
        properties: {
          prompt: {
            title: "Prompt",
            type: "string",
            minLength: 1,
            description: "What to draw. With reference images, describe how to use them.",
          },
          images: images("Reference images", 0, 14, "Optional reference images (up to 14)."),
          size: {
            title: "Size",
            type: "string",
            default: "2048x2048",
            description: "One of the supported size presets for this model.",
            examples: SEEDREAM_EXAMPLES[id],
          },
          watermark: {
            title: "Watermark",
            type: "boolean",
            default: false,
            description: "Add a visible watermark.",
            advanced: true,
          },
        },
        notes: [
          "One image per request: `n` other than 1 is rejected with 400.",
          "Output images carry a small visible “AI generated” label in the corner; it cannot be turned off.",
        ],
        example: { prompt: "A neon-lit street at night, rain, cinematic", size: "2048x2048" },
        timeoutMinutes: 10,
        rateCard,
      },
    ])
  ),

  /* ───────────────────────────── video ────────────────────────────── */

  "seedance-2-5": {
    title: "Seedance 2.5",
    kind: "video",
    guide: "seedance",
    summary: "Text- or image-to-video, 4–30 s, native audio.",
    required: [],
    anyOfRequired: [["prompt", "first_frame", "reference_images"]],
    properties: {
      prompt: {
        title: "Prompt",
        type: "string",
        description: "The video to generate. Required unless you send a frame or reference.",
      },
      first_frame: { title: "First frame", ...IMAGE, description: `Image used as the first frame. ${MEDIA}` },
      last_frame: {
        title: "Last frame",
        ...IMAGE,
        description: "Image used as the last frame. Requires `first_frame`.",
      },
      reference_images: images("Reference images", 0, 30, "Up to 30 reference images. Cannot be combined with `first_frame` / `last_frame`."),
      reference_audios: {
        title: "Reference audio",
        type: "array",
        maxItems: 10,
        items: { type: "string", format: "uri" },
        description: "Up to 10 reference audio clips. Cannot be combined with `first_frame` / `last_frame`.",
        advanced: true,
      },
      resolution: resolution(["480p", "720p", "1080p"], "720p"),
      ratio: ratio(""),
      duration: duration(4, 30, 5),
      generate_audio: { title: "Generate audio", type: "boolean", description: "Generate a soundtrack." },
      seed: seedanceSeed(),
      watermark: { title: "Watermark", type: "boolean", default: false, advanced: true },
      output_format: {
        title: "Output format",
        type: "string",
        enum: ["mp4", "mov"],
        description: "Container of the output file.",
        advanced: true,
      },
    },
    notes: ["Send a `prompt`, a `first_frame` (optionally with `last_frame`), or references. Frames and references cannot be combined.", "Reference videos are not supported."],
    example: { prompt: "The puppy slowly turns its head", first_frame: "https://static.spicymodels.ai/model/example/media/input-puppy.jpg", resolution: "480p", duration: 4 },
    timeoutMinutes: 90,
    rateCard: "480p $0.195066/s · 720p $0.419483/s · 1080p $1.032046/s",
  },

  ...Object.fromEntries(
    [
      ["seedance-2-0-pro", "Seedance 2.0 Pro", ["480p", "720p", "1080p"], 15, "$0.127613/s · $0.274428 · $0.67921"],
      ["seedance-2-0-fast", "Seedance 2.0 Fast", ["480p", "720p"], 15, "$0.102091/s · $0.219543"],
      ["seedance-2-0-mini", "Seedance 2.0 Mini", ["480p", "720p"], 15, "$0.063807/s · $0.137214"],
    ].map(([id, title, res, maxDuration, rateCard]) => [
      id,
      {
        title,
        kind: "video",
        guide: "seedance",
        summary: "Text- or image-to-video with native audio.",
        required: [],
        anyOfRequired: [["prompt", "first_frame", "reference_images"]],
        properties: {
          prompt: { title: "Prompt", type: "string", description: "The video to generate. Required unless you send a frame or reference." },
          first_frame: { title: "First frame", ...IMAGE, description: `Image used as the first frame. ${MEDIA}` },
          last_frame: { title: "Last frame", ...IMAGE, description: "Image used as the last frame. Requires `first_frame`." },
          reference_images: images("Reference images", 0, 9, "Up to 9 reference images. Cannot be combined with `first_frame` / `last_frame`."),
          reference_audios: {
            title: "Reference audio",
            type: "array",
            maxItems: 3,
            items: { type: "string", format: "uri" },
            description: "Up to 3 reference audio clips. Needs at least one reference image.",
            advanced: true,
          },
          resolution: resolution(res, "720p"),
          ratio: ratio(""),
          duration: duration(4, maxDuration, 5),
          generate_audio: { title: "Generate audio", type: "boolean", description: "Generate a soundtrack." },
          seed: seedanceSeed(),
          watermark: { title: "Watermark", type: "boolean", default: false, advanced: true },
          bitrate_mode: {
            title: "Bitrate",
            type: "string",
            enum: ["standard", "high"],
            description: "Output bitrate.",
            advanced: true,
          },
        },
        notes: ["Send a `prompt`, a `first_frame` (optionally with `last_frame`), or references. Frames and references cannot be combined.", "Reference videos are not supported."],
        example: { prompt: "The puppy slowly turns its head", first_frame: "https://static.spicymodels.ai/model/example/media/input-puppy.jpg", resolution: res[0], duration: 5 },
        timeoutMinutes: 90,
        rateCard,
      },
    ])
  ),

  ...Object.fromEntries(
    [
      ["w3-0-video", "W3.0 Video", ["480p", "720p", "1080p"], 2, 30, "480p $0.09/s · 720p $0.18/s · 1080p $0.36/s"],
      ["w3-0-video-prime", "W3.0 Video Prime", ["480p", "720p", "1080p"], 2, 30, "480p $0.1224/s · 720p $0.252/s · 1080p $0.504/s"],
      ["w3-0-video-pro", "W3.0 Video Pro", ["1080p", "2k", "4k"], 2, 30, "1080p $0.324/s · 2k $0.36/s · 4k $0.414/s"],
      ["w3-0-video-prime-pro", "W3.0 Video Prime Pro", ["1080p", "2k", "4k"], 2, 30, "1080p $0.468/s · 2k $0.504/s · 4k $0.558/s"],
    ].map(([id, title, res, minDuration, maxDuration, rateCard]) => [
      id,
      {
        title,
        kind: "video",
        guide: "w3",
        summary: "Text to video, keyframes, or reference-guided video with audio.",
        required: [],
        anyOfRequired: [["prompt", "images", "reference_images"]],
        properties: {
          prompt: {
            title: "Prompt",
            type: "string",
            description: "The video to generate (up to 20,000 characters). Required unless you send `images` or `reference_images`.",
          },
          images: images("Keyframes", 0, 2, "`images[0]` is the first frame, `images[1]` (optional) the last frame. Cannot be combined with references."),
          reference_images: images("Reference images", 0, 10, "Up to 10 reference images. Cannot be combined with keyframes."),
          reference_audios: {
            title: "Reference audio",
            type: "array",
            maxItems: 5,
            items: { type: "string", format: "uri" },
            description: "Up to 5 WAV or MP3 clips, each 1–15 s and 15 s in total. Cannot be combined with keyframes.",
            advanced: true,
          },
          resolution: resolution(res, "1080p"),
          ratio: {
            title: "Aspect ratio",
            type: "string",
            enum: ["adaptive", "16:9", "4:3", "1:1", "3:4", "9:16"],
            default: "adaptive",
            description: "Aspect ratio. `adaptive` follows the input media.",
          },
          duration: duration(minDuration, maxDuration, 5),
          audio: { title: "Audio track", type: "boolean", default: true, description: "Include an audio track. Same price either way." },
          seed: seed(),
          prompt_extend: {
            title: "Prompt expansion",
            type: "boolean",
            default: true,
            description: "Let the model rewrite the prompt. `false` keeps it literal.",
            advanced: true,
          },
        },
        notes: [
          "Send a `prompt`, keyframes (`images`), or references (`reference_images`, `reference_audios`). Keyframes and references cannot be combined.",
          'In the prompt, refer to references by order: "Image 1", "Image 2".',
          "Reference videos are not supported.",
        ],
        example: { prompt: "The puppy slowly turns its head", images: ["https://static.spicymodels.ai/model/example/media/input-puppy.jpg"], resolution: res[0], duration: 5 },
        timeoutMinutes: 60,
        rateCard,
      },
    ])
  ),

  "wan2-7-image-to-video-spicy": {
    title: "Wan 2.7 Image to Video Creative",
    kind: "video",
    guide: "wan27",
    summary: "Animates a still, optionally driven by an audio track.",
    required: ["images", "prompt"],
    properties: {
      images: images("Source image", 1, 1, `The source image. ${MEDIA}`),
      prompt: { title: "Prompt", type: "string", minLength: 1, description: "The motion and scene to generate." },
      negative_prompt: {
        title: "Negative prompt",
        type: "string",
        description: "What to keep out of the video.",
        advanced: true,
      },
      audio_url: {
        title: "Audio track URL",
        type: "string",
        format: "uri",
        description: "Optional WAV or MP3 (2–30 s, up to 15 MB) that drives the video.",
        advanced: true,
      },
      audio: { title: "Audio", type: "boolean", default: true, description: "`false` gives a silent video even with `audio_url`.", advanced: true },
      resolution: resolution(["720p", "1080p"], "1080p"),
      duration: duration(2, 15, 5),
      prompt_extend: {
        title: "Prompt expansion",
        type: "boolean",
        default: true,
        description: "Let the model rewrite the prompt.",
        advanced: true,
      },
      seed: seed(),
    },
    example: { images: ["https://static.spicymodels.ai/model/example/media/input-puppy.jpg"], prompt: "The puppy slowly turns its head", resolution: "720p", duration: 5 },
    timeoutMinutes: 60,
    rateCard: "720p $0.234/s · 1080p $0.36/s",
  },

  "wan-animate": {
    title: "Wan Animate",
    kind: "video",
    guide: "wan-animate",
    summary: "Moves the person in an image using the motion of a video.",
    required: ["images", "video"],
    properties: {
      images: images("Character image", 1, 1, `The character, up to 50 MB. ${MEDIA}`),
      video: { title: "Motion reference video", ...IMAGE, description: `The motion reference video, up to 200 MB. ${MEDIA}` },
      mode: {
        title: "Mode",
        type: "string",
        enum: ["animate", "replace"],
        default: "animate",
        description: "`animate` moves the character with the video's motion; `replace` swaps the person in the video for the character.",
      },
      resolution: resolution(["480p", "720p"], "720p"),
      prompt: { title: "Style guidance", type: "string", description: "Optional style guidance." },
      seed: seed(),
    },
    notes: ["The output is as long as the input `video`."],
    example: {
      images: ["https://static.spicymodels.ai/model/example/media/input-puppy.jpg"],
      video: "https://static.spicymodels.ai/model/example/media/input-ltx-3s.mp4",
      mode: "animate",
      resolution: "480p",
    },
    timeoutMinutes: 60,
    rateCard: "480p $0.0954/s · 720p $0.198/s (of input video, rounded up)",
  },

  "flashvsr-video-upscale": {
    title: "FlashVSR Video Upscale",
    kind: "video",
    guide: "upscale",
    summary: "Upscales a video to a higher resolution.",
    required: ["video", "resolution"],
    properties: {
      video: { title: "Video", ...IMAGE, description: `The video to upscale: up to 120 s and 500 MB. ${MEDIA}` },
      resolution: {
        title: "Target resolution",
        type: "string",
        enum: ["720p", "1080p", "2k", "4k"],
        description: "Target resolution. Sets the price.",
        required: true,
      },
    },
    example: { video: "https://static.spicymodels.ai/model/example/media/input-ltx-3s.mp4", resolution: "720p" },
    timeoutMinutes: 60,
    rateCard: "720p $0.0288/s · 1080p $0.0432/s · 2k $0.0576/s · 4k $0.0954/s",
  },

  "ltx-2-3-spicy-image-to-video": {
    title: "LTX 2.3 Creative Image to Video",
    kind: "video",
    guide: "ltx",
    summary: "Cinematic image animation with natural motion and audio.",
    required: ["images", "prompt"],
    properties: {
      images: images("First frame", 1, 1, `The first frame. ${MEDIA}`),
      prompt: { title: "Prompt", type: "string", minLength: 1, description: "The motion and scene to generate." },
      resolution: resolution(["480p", "720p", "1080p"], "480p"),
      duration: duration(3, 20, 5),
      preset: {
        title: "Weights",
        type: "string",
        enum: ["tuned", "original"],
        default: "tuned",
        description: "Model weights to use.",
        advanced: true,
      },
    },
    example: {
      images: ["https://static.spicymodels.ai/model/example/media/input-puppy.jpg"],
      prompt: "The puppy slowly blinks and tilts its head",
      resolution: "720p",
      duration: 8,
      preset: "tuned",
    },
    timeoutMinutes: 30,
    rateCard: "480p $0.036/s · 720p $0.072/s · 1080p $0.108/s",
  },

  "vidu-q3-image-to-video-spicy": {
    title: "Vidu Q3 Image to Video Creative",
    kind: "video",
    guide: "vidu",
    summary: "Animates a still with optional generated audio.",
    required: ["images", "prompt"],
    properties: {
      images: images("First frame", 1, 1, `The first frame. ${MEDIA}`),
      prompt: { title: "Prompt", type: "string", minLength: 1, description: "The motion and scene to generate." },
      resolution: resolution(["540p", "720p", "1080p"], "720p"),
      duration: duration(1, 16, 5),
      generate_audio: { title: "Generate audio", type: "boolean", default: false, description: "Add a generated soundtrack." },
    },
    example: {
      images: ["https://static.spicymodels.ai/model/example/media/input-puppy.jpg"],
      prompt: "The puppy slowly blinks and tilts its head",
      resolution: "720p",
      duration: 5,
      generate_audio: false,
    },
    timeoutMinutes: 30,
    rateCard: "540p $0.126/s · 720p $0.270/s · 1080p $0.288/s",
  },

  "minimax-h3-image-to-video-spicy": {
    title: "MiniMax H3 Image to Video Creative",
    kind: "video",
    guide: "minimax",
    summary: "Timeline-driven image animation with stereo sound.",
    required: ["images", "prompt"],
    properties: {
      images: images("First frame", 1, 1, `The first frame. ${MEDIA}`),
      prompt: { title: "Prompt", type: "string", minLength: 1, description: "The motion and scene to generate." },
      resolution: resolution(["480p", "540p", "768p", "1080p"], "480p"),
      duration: duration(3, 15, 5),
    },
    example: {
      images: ["https://static.spicymodels.ai/model/example/media/input-puppy.jpg"],
      prompt: "The puppy slowly blinks and tilts its head",
      resolution: "768p",
      duration: 6,
    },
    timeoutMinutes: 30,
    rateCard: "480p $0.072/s · 540p $0.108/s · 768p $0.144/s · 1080p $0.288/s",
  },
};

/** Fields a client is allowed to send, derived from the contract. */
export function allowedFields(contract) {
  return new Set([...Object.keys(contract.properties), "model"]);
}

/** Smallest documented duration / default helpers for the optimizer. */
export function contractFor(modelId) {
  return contracts[modelId] || null;
}

export function isPromptModel(contract) {
  return Boolean(contract && contract.properties.prompt);
}

export const SAMPLE_MEDIA = {
  image: "https://static.spicymodels.ai/model/example/media/input-puppy.jpg",
  video: "https://static.spicymodels.ai/model/example/media/input-ltx-3s.mp4",
};
