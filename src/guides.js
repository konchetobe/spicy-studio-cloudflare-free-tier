/**
 * Prompt-engineering guides used by the optimizer.
 *
 * Each guide encodes the published prompting guidance for that model family:
 * what the model expects to see, the order to say it in, and the failure modes
 * to avoid. The optimizer sends the matching guide verbatim to DeepSeek, and
 * the UI exposes it so a prompt can be checked by hand.
 */

export const guides = {
  seedance: {
    id: "seedance",
    label: "Seedance 2.0 / 2.5",
    kind: "video",
    source: {
      label: "Seedance 2.0 prompting guide (compiled from ByteDance docs)",
      url: "https://github.com/issastash/AI_Complete_Prompting_Guides/blob/main/Seedance_2.0_Complete_Prompting_Guide.md",
    },
    summary: "Write like a director: one shot, one primary camera move, visible physics.",
    structure:
      "Subject + Action + Environment + Camera + Style + Constraints — or a timed shot script for multi-shot clips.",
    rules: [
      "Describe the subject with specific visual features, then one clear action, then the environment including lighting.",
      "Use exactly one primary camera instruction (slow push-in, lateral tracking, orbit, handheld, locked-off), with pacing words such as slow, smooth, gentle. Never stack disconnected camera labels.",
      "Keep camera movement and subject movement in separate sentences; mixing them causes shaky, uncontrollable footage.",
      "State a concrete style anchor (35mm film, naturalistic film print, IMAX-scale, anime, product-commercial lighting) instead of bare words like cinematic or epic.",
      "Always include one lighting description: golden hour, rim light, soft window light, neon, overcast, backlit.",
      "Describe physical interactions (tires smoke, fabric ripples, dust lifts) so the model has physics to simulate.",
      "For a clip longer than about 5 seconds, use a shot script with [00:00–00:0X] timestamps or a clear beginning → change → ending state.",
      "For image-to-video, do not re-describe the still. Anchor identity and continuity — face, wardrobe, props, composition, colours and lighting — then describe only motion, temporal change and camera.",
      "If audio is enabled, describe diegetic sound, ambience and any dialogue in quotation marks; keep it short and specific.",
      "Aim for 60–100 words for a single shot (up to ~150 for a longer 2.5 clip).",
    ],
    avoid: [
      "Vague adjective piles: 'cool video, epic, amazing, lots of movement'.",
      "More than one primary camera move, or camera and subject motion in the same clause.",
      "Re-describing an input image instead of directing its motion.",
      "Fast motion on several elements at once — only one element should be fast.",
      "Prompts over ~150 words for one shot; extra instructions dilute the important ones.",
    ],
    fallback:
      "In one continuous shot, {idea}. Keep the framing stable and the action readable, with a single slow camera move, natural lighting and a clean cinematic finish."
  },

  seedream: {
    id: "seedream",
    label: "Seedream 4.5 / 5.0",
    kind: "image",
    source: {
      label: "Seedream 5.0 prompting guide + ByteDance model notes",
      url: "https://replicate.com/blog/how-to-prompt-seedream-5",
    },
    summary: "Natural-language art direction with photographic specificity — not keyword soup.",
    structure:
      "Subject + action/pose + environment + composition/crop + lighting + lens/film look + palette + mood. For edits: what changes, then what must stay.",
    rules: [
      "Write in natural language sentences, as an art director would brief a photographer. Keyword lists perform worse.",
      "Seedream understands photographic language: name the lens, film stock, lighting setup, depth of field, grain and colour grade when they matter.",
      "Be precise about quantities, spatial relationships, materials and colours; 5.0 follows dense, exact instructions well.",
      "Put any text that must appear in the image in double quotation marks, and keep it short.",
      "With reference images, say which reference supplies which element (identity, outfit, environment, style) and what to preserve.",
      "For edits, lead with the change, then explicitly protect what should not move: 'Replace the hat with a crown, keeping pose, framing and expression unchanged.'",
      "Name the use case when relevant ('a poster for…', 'a product photo for…') — it focuses composition and styling.",
      "Aim for 60–140 words; detail is welcome, contradictions are not.",
    ],
    avoid: [
      "Comma-separated keyword soup or bare quality words ('masterpiece, 8k, best quality').",
      "Contradictory lighting or palette instructions in one image.",
      "Describing an edit without saying what must remain unchanged.",
      "Expecting multiple unrelated images from one request; this endpoint returns one image.",
    ],
    fallback:
      "A highly detailed, naturalistic image of {idea}. Thoughtful composition, clear focal point, convincing materials and lighting, photographed with a 50mm lens and finished with a restrained cinematic colour grade."
  },

  zimage: {
    id: "zimage",
    label: "Z-Image Creative / Pro",
    kind: "image",
    source: {
      label: "Tongyi-MAI Z-Image prompting notes",
      url: "https://huggingface.co/Tongyi-MAI/Z-Image-Turbo/discussions/8",
    },
    summary: "Long, detailed, positive descriptions. No negative-prompt section.",
    structure:
      "One vivid paragraph: subject and appearance → pose/action → wardrobe and materials → environment → framing and camera → lighting → colour palette → medium/style → fine detail.",
    rules: [
      "Z-Image is trained for long, detailed prompts. Expand short ideas into a full visual description rather than adding keywords.",
      "Write positively: say what is present. The model is distilled without classifier-free guidance and does not use negative prompts.",
      "Include concrete appearance details — age, hair, clothing, textures, materials — plus pose and expression.",
      "Specify framing and camera: eye-level, low angle, wide establishing shot, close-up, 35mm, shallow depth of field.",
      "Describe the light direction and quality, then the palette, then the medium (editorial photograph, oil painting, 3D render, anime).",
      "For text in the image, quote the exact string and keep it short.",
      "If prompt expansion is on, keep the prompt clear and let the model add texture; if off, do the expansion yourself.",
    ],
    avoid: [
      "Negative prompts, 'no X' lists, or CFG-style phrases.",
      "Short keyword strings ('cat, sunset, 8k').",
      "Conflicting styles in one prompt (photoreal + cartoon + watercolour).",
      "Overloading a single frame with unrelated subjects.",
    ],
    fallback:
      "A richly detailed image of {idea}. The subject is clearly described with specific features, clothing and expression, set in a fully realised environment. Cinematic composition, directional natural light, refined colour palette, crisp textures, photographed with a 50mm lens and finished as an editorial still."
  },

  "qwen-edit": {
    id: "qwen-edit",
    label: "Qwen Image Edit",
    kind: "image",
    source: {
      label: "Qwen-Image official repository",
      url: "https://github.com/QwenLM/Qwen-Image",
    },
    summary: "One clear instruction. Change what must change, protect everything else.",
    structure:
      "Action verb + target object/region + desired state + preservation clause (+ reference role, if any).",
    rules: [
      "Start with the operation: Change, Replace, Add, Remove, Restyle, Extend or Recolour.",
      "Identify the exact object or region, not the whole image.",
      "State the target state precisely — colour, material, text, style or object.",
      "End with what must stay unchanged: identity, pose, framing, background, lighting, composition.",
      "Refer to extra references by content ('the jacket in the second image'), not by index alone.",
      "Keep one coherent edit per request; related sub-changes are fine, unrelated scene rewrites are not.",
      "The output keeps the size and composition of the first image — do not ask for a new crop or canvas.",
    ],
    avoid: [
      "Re-describing the entire source image.",
      "Vague instructions ('make it better', 'enhance').",
      "Multiple unrelated edits at once.",
      "Asking for a different aspect ratio or composition.",
    ],
    fallback:
      "Change {idea} in the source image. Apply the edit precisely to the named subject or region, match the existing lighting, perspective and materials, and keep the identity, pose, framing and background unchanged."
  },

  w3: {
    id: "w3",
    label: "W3.0 Video family",
    kind: "video",
    source: {
      label: "Alibaba Cloud Model Studio video prompt guide (Wan 3.0/2.7 formula)",
      url: "https://www.alibabacloud.com/help/en/model-studio/text-to-video-prompt",
    },
    summary: "Entity + scene + motion + aesthetic control + stylisation, with optional sound and shots.",
    structure:
      "Text-to-video: Entity (description) + Scene (description) + Motion (description) + Aesthetic control + Stylisation. Image-to-video: Motion + Camera movement.",
    rules: [
      "Name the entity and give concrete appearance details; then describe the scene and its foreground/background.",
      "Describe motion with amplitude, speed and effect ('swaying violently', 'slowly turning', 'shattering the glass').",
      "Add aesthetic control: light source, lighting quality, shot size, camera angle, lens and camera movement. Each camera move carries intent — push-in for intimacy, pull-out for scale, orbit for importance, fixed for stillness.",
      "Name the visual style explicitly: cyberpunk, documentary, 35mm film, line-art illustration, wuxia, product commercial.",
      "For image-to-video, the image supplies entity, scene and style; write Motion + Camera movement only.",
      "For sound (W3.0 has audio), use: voice = exact line + emotion + tone + speed + timbre + accent; sound effect = source + action + ambience; BGM = style.",
      "For multi-shot, write an overall description, then Shot 1 [0–3 s], Shot 2 [3–6 s] with hard-cut transitions. For a single shot, say 'Generate single shot.'",
      "For references, use 'Image 1', 'Video 1' in upload order and state each reference's role. Use 'No dialogue.' / 'No background music.' to suppress audio.",
    ],
    avoid: [
      "Specific real people by name.",
      "Rapid scene changes inside one continuous clip — one clip is one shot unless you write explicit shots.",
      "Expecting exact text legibility; keep on-screen text short.",
      "Very long, complex action sequences in a short clip.",
      "Relying on exact lip-sync to arbitrary words.",
    ],
    fallback:
      "A cinematic shot of {idea}. The subject is clearly described and performs one readable action in a fully realised environment. Slow, controlled camera movement, directional lighting, coherent colour palette and a polished film finish."
  },

  wan27: {
    id: "wan27",
    label: "Wan 2.7 Image to Video",
    kind: "video",
    source: {
      label: "Alibaba Cloud Model Studio image-to-video formula",
      url: "https://www.alibabacloud.com/help/en/model-studio/text-to-video-prompt",
    },
    summary: "The image is the scene. Direct motion and camera only.",
    structure: "Motion (what moves, how fast, with what effect) + Camera movement (push in, track, pan, fixed) + optional sound.",
    rules: [
      "Do not re-describe the still image; the image already defines entity, scene and style.",
      "Describe the primary subject motion first, with speed and amplitude, then secondary environmental motion.",
      "Add one clear camera instruction, or 'fixed camera' to keep the frame locked.",
      "Use present tense and concrete physical detail; the model responds to weight, momentum and material behaviour.",
      "If audio is enabled, describe ambience, effects and any dialogue in quotes; the audio track drives the performance.",
      "Keep the action achievable within the selected 2–15 s duration.",
    ],
    avoid: [
      "Re-describing the input image's appearance or outfit.",
      "Several competing actions in one short clip.",
      "Abstract emotion words without physical cues.",
      "Camera moves that fight the composition of the source image.",
    ],
    fallback:
      "The subject in the source image moves naturally: {idea}. Preserve the existing composition, colours and lighting. One slow camera move, realistic weight and momentum, no flicker or identity drift."
  },

  "wan-animate": {
    id: "wan-animate",
    label: "Wan Animate",
    kind: "video",
    source: {
      label: "Alibaba Cloud Wan Animate prompt notes",
      url: "https://www.alibabacloud.com/help/en/model-studio/text-to-video-prompt",
    },
    summary: "Motion comes from the reference video. The prompt only guides style and consistency.",
    structure: "Preservation clause + style/environment guidance + optional mood.",
    rules: [
      "The character's motion is taken from the reference video — do not choreograph it in text.",
      "Use the prompt for style, wardrobe, environment, lighting or mood that should stay coherent.",
      "In animate mode, ask to preserve the character's identity, proportions and clothing from the source image.",
      "In replace mode, describe how the character should sit into the reference scene (lighting, scale, interaction).",
      "Keep it short; the visual evidence is doing most of the work.",
    ],
    avoid: [
      "Describing a shot-by-shot action sequence that conflicts with the motion video.",
      "Asking the model to change the reference video's timing or camera.",
      "Long prompts that fight the source footage.",
    ],
    fallback:
      "Preserve the character's identity, proportions and clothing from the source image. Match the lighting, scale and atmosphere of the motion reference, with coherent contact shadows and a natural, unified grade."
  },

  ltx: {
    id: "ltx",
    label: "LTX 2.3",
    kind: "video",
    source: {
      label: "LTX-2 official prompting guide",
      url: "https://ltx.io/blog/prompting-guide-for-ltx-2",
    },
    summary: "A single flowing paragraph that tells the whole shot from beginning to end.",
    structure:
      "Establish the shot → set the scene → describe the action as a sequence → define the character(s) → direct the camera → describe the audio.",
    rules: [
      "Write one flowing paragraph, present tense, 4–8 descriptive sentences.",
      "Establish the shot with cinematography terms (close-up, wide establishing shot, handheld, 35mm) and the genre or style.",
      "Set the scene with lighting conditions, colour palette, textures and atmosphere.",
      "Describe the action as a natural sequence from beginning to end, including the ending state.",
      "Define characters with age, hair, clothing and distinguishing details; express emotion through physical cues (tears, trembling mouth), not labels.",
      "Direct the camera in relation to the subject and say what is revealed after the move.",
      "Describe audio explicitly — ambience, effects, music — and put dialogue in quotation marks with language/accent notes.",
      "For image-to-video, start from the supplied frame and describe what happens next; do not restate the static image.",
      "End an image-to-video prompt with a short continuity clause: face, wardrobe, props and framing stay exactly as in the source frame.",
      "Keep the action small enough for the clip length; a large pose change in a short clip invites wardrobe and identity drift.",
      "Match detail to shot scale: close-ups need precise detail, wide shots need composition and atmosphere.",
    ],
    avoid: [
      "Internal-state labels ('sad', 'confused') without visible behaviour.",
      "Readable text, signage, brand names or printed material.",
      "Complex physics, juggling, fast twisting or chaotic motion.",
      "Too many characters, layered actions or conflicting light sources.",
      "Over-long prompts that try to do several shots in one generation.",
      "Large pose or wardrobe changes in a short clip — they cause identity and clothing drift.",
    ],
    fallback:
      "A cinematic shot of {idea}. The camera holds a clear relationship with the subject as the action unfolds in one continuous sequence, with natural light, believable texture and a restrained, filmic colour grade."
  },

  vidu: {
    id: "vidu",
    label: "Vidu Q3",
    kind: "video",
    source: {
      label: "Vidu video model prompting guidance",
      url: "https://www.vidu.com/tools/video-models",
    },
    summary: "One paragraph creative brief: subject, setting, action, camera, light, style.",
    structure: "Subject + setting + action within the clip + camera movement + lighting/mood + style constraints.",
    rules: [
      "Write a single clear paragraph, not a keyword list.",
      "Establish the subject and setting first, then the action that fits the chosen 1–16 s duration.",
      "Give one primary camera move and a framing choice; keep it consistent with the still.",
      "Describe lighting and mood with visible cues, then a style anchor.",
      "For image-to-video, preserve the subject's identity and the frame's composition; describe motion and camera only.",
      "If audio is enabled, add ambience or a short line of dialogue; otherwise keep the prompt visual.",
      "Keep the action arc simple: beginning state → one change → ending state.",
    ],
    avoid: [
      "Cramming several locations or a whole story into one short clip.",
      "Vague aesthetic words without visual specifics.",
      "Several camera moves at once.",
      "Contradicting the source image's framing or lighting.",
    ],
    fallback:
      "A cinematic shot of {idea}. One clear subject performs a single, readable action in a coherent environment. Slow camera movement, natural lighting, consistent colour and a polished finish."
  },

  minimax: {
    id: "minimax",
    label: "MiniMax H3",
    kind: "video",
    source: {
      label: "MiniMax H3 prompting guide",
      url: "https://hackernoon.com/minimax-h3-prompt-guide-how-to-write-better-hailuo-30-video-prompts",
    },
    summary: "A timed audiovisual plan: context, timeline, camera, sound, continuity.",
    structure:
      "Context → timeline (ordered actions with an ending state) → camera → sound layers → constraints. For image-to-video, open with the 0.00 s frame anchor.",
    rules: [
      "Write a timeline, not a still description: opening composition → cause-and-effect action → ending state.",
      "For image-to-video, open with: 'At 0.00 seconds, the source image is fully referenced.' Then describe the path forward from that state.",
      "Direct the camera in natural language with movement type, direction, scale and speed in one sentence.",
      "Separate sound layers: diegetic sound and ambience in the description; non-diegetic music described separately by instrumentation and tempo.",
      "Give speakers stable IDs (S1, S2) and put exact spoken words in <d>[Language] ...</d>; describe delivery outside the tag.",
      "Put visible on-screen text in double quotation marks and keep it short.",
      "State what must remain consistent: identity, wardrobe, seat position, lighting, props.",
      "Keep one location and one continuous arc per clip; split longer ideas into separate clips.",
    ],
    avoid: [
      "Appearance-only prompts that produce a polished still with weak motion.",
      "Stacked, disconnected camera labels.",
      "Implied or loosely quoted dialogue without a speaker ID.",
      "Naming only the start and end of a morph without the path between them.",
      "Unreadable on-screen text treated as a mood instead of a visible object.",
    ],
    fallback:
      "At 0.00 seconds, the source image is fully referenced. [Shot 1] The subject remains in the same position and lighting, then {idea}. The camera moves slowly and deliberately, preserving identity and wardrobe. Natural ambience supports the action, with a restrained score underneath."
  },

  swap: {
    id: "swap",
    label: "Face / Head Transfer",
    kind: "image",
    optimizable: false,
    source: {
      label: "SpicyModels likeness-consent policy",
      url: "https://spicymodels.ai/acceptable-use",
    },
    summary: "No prompt. Two photos and documented likeness consent.",
    rules: [
      "This model does not take a text prompt — it transfers the face or head from the second photo onto the person in the first.",
      "`likeness_consent` must be true; you must hold documented consent from every person shown.",
      "Sexual use of a real person's likeness, impersonating a public figure, and any content of a minor are prohibited.",
    ],
    avoid: [],
  },

  upscale: {
    id: "upscale",
    label: "FlashVSR Upscale",
    kind: "video",
    optimizable: false,
    source: {
      label: "FlashVSR project",
      url: "https://github.com/Vchitect/FlashVSR",
    },
    summary: "No prompt. Choose the target resolution.",
    rules: [
      "This model upscales an existing video; there is no prompt to optimise.",
      "Input is limited to 120 seconds and 500 MB.",
      "The target resolution sets the per-second price.",
    ],
    avoid: [],
  },
};

export function guideFor(contract) {
  return (contract && guides[contract.guide]) || null;
}
