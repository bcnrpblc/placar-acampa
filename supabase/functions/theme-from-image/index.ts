// Reads an event design image with Claude vision and returns theme tokens only.
// Secrets: ANTHROPIC_API_KEY, ANTHROPIC_API_KEY_FALLBACK (used if the first key fails or is out of credit).
// Deploy: supabase functions deploy theme-from-image
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MODEL = "claude-sonnet-5-5";
const HEX = /^#[0-9a-fA-F]{6}$/;
const TEXT_EXT = [".md", ".txt", ".html", ".htm", ".css", ".json"];
const FONTS = ["lilita", "bowlby", "paytone", "rubik", "anton", "bebas", "oswald", "barlow"];

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const FONT_GUIDE = `Fonts (pick the closest to the Level 1 hero lettering, not the body text):
- lilita: very heavy, rounded corners, friendly sticker/poster lettering, slightly irregular.
- bowlby: very heavy, wide, blocky display, almost no counters.
- paytone: heavy, rounded, geometric, softer than lilita.
- rubik: ExtraBold geometric sans, clean and modern.
- anton: tall, heavy, condensed grotesque, sports look.
- bebas: tall, light-heavy, all-caps condensed.
- oswald: medium condensed gothic.
- barlow: clean condensed sans, neutral.`;

const REPLY = `Reply with ONLY one JSON object, no commentary: {"theme": {"background","text","muted","accent","accent2","panel","confetti":[3 to 5],"font"}, "notes": [short strings]}, every color #rrggbb.`;

const DS_PROMPT = `You are given the design system / brand guidelines of an event (PDF pages, screenshots, or the text of a markdown / html / css / json file). Map its DECLARED rules onto scoreboard theme tokens. Do not interpret mood; read what is written and shown.
${REPLY}
- Use only colors the guideline defines (hex or clearly shown swatches). If a role is missing, mix two guideline colors and say so in notes.
- Role mapping: canvas/surface -> background; on-surface or body text color -> text; primary / headline color -> accent; secondary -> accent2; raised surface -> panel; secondary text -> muted. Prefer the dark mode for a TV unless the guideline forbids it.
- Respect "don't" rules (forbidden pairings, minimum contrast) over aesthetics. text must have contrast >= 4.5 on background and on panel; accent >= 3 on background.
- font: the guideline names its typefaces. Name the headline and body typefaces in notes, then choose the closest of the available fonts for the HEADLINE typeface:
${FONT_GUIDE}
- notes: one line per role mapping, the named typefaces, and any rule that influenced a choice.`;

const PROMPT = `You analyse the visual identity of an event (poster, logo sheet or banner) and map it onto scoreboard theme tokens.
Reply with ONLY one JSON object, no commentary: {"analysis": {...}, "theme": {"background","text","muted","accent","accent2","panel","confetti":[3 to 5],"font"}}, every color #rrggbb. Fill "analysis" first (palette[], neutrals[], level1{style,fill,outline}, level2, level3, effects, layout), step by step, then derive "theme" ONLY from it. Colors are #rrggbb sampled from the image, never invented or "improved".

Step 1, canvas and palette: dominant background, 2 to 4 accent colors with where each is used, dark and light neutrals (container fills, outlines, body text).
Step 2, typography: Level 1 = hero title / logo lettering (class, weight, case, fill color AND outline/shadow color); Level 2 = badges and section headers; Level 3 = body (dates, locations).
Step 3, effects: grain, halftone, outlines, shadows. Informative only.
Step 4, layout: containers, alignment, rotation. Informative only.
Step 5, tokens (the scoreboard has ONE text color used on cards and the page, so legibility rules are strict):
- background: the dominant canvas color, never a small highlight.
- text: the Level 3 body color or a near-white/near-black neutral. Must have contrast >= 4.5 on background AND on panel.
- muted: the secondary/label color, a softer version of text, contrast >= 3 on background and panel.
- accent: the event-title color. Use the Level 1 fill color if it has contrast >= 3 on background. If it does not (e.g. white lettering on a light canvas), use the Level 1 outline or the strongest Level 2 badge color that does.
- accent2: the next most used brand color, or same as accent.
- panel: a card surface that text AND muted can be read on. If the poster's container fill is dark but text is dark (or the reverse), do NOT use it: use background shifted 6 to 10% toward text.
- confetti: 3 to 5 festive colors that appear in the image.
- font: ${FONT_GUIDE}`;

async function callClaude(apiKey: string, block: Record<string, unknown>, prompt: string) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: [
            block,
            { type: "text", text: prompt },
          ],
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const out = await res.json();
  const text: string = out.content?.find((c: { type: string }) => c.type === "text")?.text ?? "";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`no json (stop: ${out.stop_reason})`);
  // Theming only ever receives the tokens; the analysis is the model's own reasoning.
  const parsed = JSON.parse(match[0]);
  return { raw: parsed.theme ?? parsed, notes: Array.isArray(parsed.notes) ? parsed.notes.slice(0, 12).map(String) : [] };
}

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const dist = (a: string, b: string) => rgb(a).reduce((s, v, i) => s + (v - rgb(b)[i]) ** 2, 0);

// palette: colors measured from the image pixels; model-picked colors snap to the nearest one so hex values are exact.
function sanitize(raw: Record<string, unknown>, palette: string[] = []) {
  const snap = (c: string | undefined) => {
    if (!c || !palette.length) return c;
    const n = palette.reduce((b, p) => (dist(p, c) < dist(b, c) ? p : b));
    return dist(n, c) < 60 * 60 ? n : c; // only when close: keeps deliberate neutrals like #FFFFFF
  };
  const hex = (v: unknown) => (typeof v === "string" && HEX.test(v) ? snap(v) : undefined);
  const background = hex(raw.background);
  const accentRaw = hex(raw.accent);
  if (!background || !accentRaw) throw new Error("incomplete theme");
  const best = (on: string) => (contrast(on, "#0B0D10") >= contrast(on, "#FFFFFF") ? "#0B0D10" : "#FFFFFF");
  // The panel is where team names and labels sit, so text has to read on it too; otherwise drop it (client derives one).
  let panel = hex(raw.panel);
  let text = hex(raw.text) ?? best(background);
  if (contrast(background, text) < 4.5) text = best(background);
  if (panel && contrast(panel, text) < 4.5) panel = undefined;
  const accent2 = hex(raw.accent2);
  // Titles must stay readable on the background.
  const accent = [accentRaw, accent2].find((c) => c && contrast(background, c) >= 3) ?? text;
  const theme: Record<string, unknown> = { background, text, accent };
  const muted = hex(raw.muted);
  if (muted && contrast(background, muted) >= 3 && (!panel || contrast(panel, muted) >= 3)) theme.muted = muted;
  if (accent2) theme.accent2 = accent2;
  if (panel) theme.panel = panel;
  if (Array.isArray(raw.confetti)) {
    const c = raw.confetti.map(hex).filter(Boolean).slice(0, 5);
    if (c.length) theme.confetti = c;
  }
  if (typeof raw.font === "string" && FONTS.includes(raw.font)) theme.font = raw.font;
  return theme;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const authHeader = req.headers.get("Authorization") ?? "";
    const sb = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: isAdmin } = await sb.rpc("is_admin");
    if (isAdmin !== true) return json({ error: "forbidden" }, 403);

    const { path, mode, palette } = await req.json();
    const ds = mode === "design-system";
    const measured: string[] = Array.isArray(palette) ? palette.filter((c) => typeof c === "string" && HEX.test(c)).slice(0, 12) : [];
    if (typeof path !== "string" || path.includes("..")) return json({ error: "invalid path" }, 400);
    const { data: file, error: dlError } = await sb.storage.from("event-assets").download(path);
    if (dlError || !file) return json({ error: "image not found" }, 404);
    if (file.size > 8 * 1024 * 1024) return json({ error: "file too large (max 8 MB)" }, 413);

    const lower = path.toLowerCase();
    const isText = TEXT_EXT.some((e) => lower.endsWith(e));
    let block: Record<string, unknown>;
    if (isText) {
      // Text design systems (DESIGN.md, tokens, CSS, HTML) are read as text, never as an image.
      const text = (await file.text()).slice(0, 60000);
      block = { type: "text", text: `<design_system_file>\n${text}\n</design_system_file>` };
    } else {
      const media = lower.endsWith(".pdf") ? "application/pdf" : file.type || "image/png";
      const bytes = new Uint8Array(await file.arrayBuffer());
      let bin = "";
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      const source = { type: "base64", media_type: media, data: btoa(bin) };
      block = media === "application/pdf" ? { type: "document", source } : { type: "image", source };
    }
    const prompt = ds
      ? DS_PROMPT
      : measured.length
        ? `${PROMPT}\n\nMeasured from the image pixels (most frequent first): ${measured.join(", ")}. Use these exact hex values for background, accent, accent2 and confetti; only text/muted/panel may be neutrals or mixes.`
        : PROMPT;

    const keys = [Deno.env.get("ANTHROPIC_API_KEY"), Deno.env.get("ANTHROPIC_API_KEY_FALLBACK")].filter(
      (k): k is string => !!k,
    );
    if (!keys.length) return json({ error: "no api key configured" }, 500);

    let lastError = "unknown";
    for (const key of keys) {
      try {
        const { raw, notes } = await callClaude(key, block, prompt);
        return json({ theme: sanitize(raw, ds ? [] : measured), notes });
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e);
      }
    }
    console.error("theme-from-image failed:", lastError); // never log keys
    return json({ error: "could not read the image, set colors manually" }, 502);
  } catch (_e) {
    return json({ error: "bad request" }, 400);
  }
});
