// Reads an event design image with Claude vision and returns theme tokens only.
// Secrets: ANTHROPIC_API_KEY, ANTHROPIC_API_KEY_FALLBACK (used if the first key fails or is out of credit).
// Deploy: supabase functions deploy theme-from-image
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MODEL = "claude-sonnet-5-5";
const HEX = /^#[0-9a-fA-F]{6}$/;
const FONTS = ["barlow", "oswald", "bebas", "anton"];

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const PROMPT = `You are given the visual identity of an event (poster, logo sheet or banner).
Return ONLY a JSON object with these keys, colors as #rrggbb:
{"background": dark or light dominant brand color suited as a full-screen scoreboard background,
 "text": color with strong contrast on background,
 "accent": the most characteristic brand color, for titles and highlights,
 "accent2": a secondary brand color or same as accent,
 "panel": slightly lighter or darker than background, for cards,
 "confetti": 3 to 5 festive brand colors,
 "font": one of ${FONTS.join("|")} matching the design's lettering style}
Never add commentary.`;

async function callClaude(apiKey: string, media: string, data: string) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: media, data } },
            { type: "text", text: PROMPT },
          ],
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}`);
  const out = await res.json();
  const text: string = out.content?.find((c: { type: string }) => c.type === "text")?.text ?? "";
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("no json");
  return JSON.parse(match[0]);
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

function sanitize(raw: Record<string, unknown>) {
  const hex = (v: unknown) => (typeof v === "string" && HEX.test(v) ? v : undefined);
  const background = hex(raw.background);
  const accent = hex(raw.accent);
  if (!background || !accent) throw new Error("incomplete theme");
  let text = hex(raw.text) ?? "#FFFFFF";
  if (contrast(background, text) < 4.5) text = contrast(background, "#0B0D10") >= contrast(background, "#FFFFFF") ? "#0B0D10" : "#FFFFFF";
  const theme: Record<string, unknown> = { background, text, accent };
  const accent2 = hex(raw.accent2);
  const panel = hex(raw.panel);
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

    const { path } = await req.json();
    if (typeof path !== "string" || path.includes("..")) return json({ error: "invalid path" }, 400);
    const { data: file, error: dlError } = await sb.storage.from("event-assets").download(path);
    if (dlError || !file) return json({ error: "image not found" }, 404);
    if (file.size > 5 * 1024 * 1024) return json({ error: "image too large (max 5 MB)" }, 413);

    const media = file.type || "image/png";
    const bytes = new Uint8Array(await file.arrayBuffer());
    let bin = "";
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    const data = btoa(bin);

    const keys = [Deno.env.get("ANTHROPIC_API_KEY"), Deno.env.get("ANTHROPIC_API_KEY_FALLBACK")].filter(
      (k): k is string => !!k,
    );
    if (!keys.length) return json({ error: "no api key configured" }, 500);

    let lastError = "unknown";
    for (const key of keys) {
      try {
        return json({ theme: sanitize(await callClaude(key, media, data)) });
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
