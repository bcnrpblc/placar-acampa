import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import {
  THEME_FONTS,
  THEME_PRESETS,
  contrast,
  parseTheme,
  themeStyle,
  type EventTheme,
  type ThemeFont,
} from "@/lib/theme";

type ColorKey = "background" | "text" | "accent" | "panel" | "muted" | "accent2";

const FIELDS: { key: ColorKey; label: string; optional?: boolean }[] = [
  { key: "background", label: "Fundo" },
  { key: "text", label: "Texto" },
  { key: "accent", label: "Destaque (título e detalhes)" },
  { key: "panel", label: "Cartões", optional: true },
  { key: "muted", label: "Texto secundário", optional: true },
  { key: "accent2", label: "Destaque 2 (confete)", optional: true },
];

const BUCKET = "event-assets";

type Kind = "design" | "ds" | "logo" | "bg";

/** A file input styled as a button; shows a spinner while its own import runs and locks while any import runs. */
const FileButton = ({
  label,
  busyLabel,
  accept,
  loading,
  locked,
  onFile,
}: {
  label: string;
  busyLabel: string;
  accept: string;
  loading: boolean;
  locked: boolean;
  onFile: (f: File) => void;
}) => (
  <label
    className={cn(
      buttonVariants({ variant: "outline", size: "sm" }),
      "cursor-pointer w-full justify-center",
      locked && "pointer-events-none opacity-60",
    )}
  >
    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
    {loading ? busyLabel : label}
    <input
      type="file"
      accept={accept}
      disabled={locked}
      className="sr-only"
      onChange={(e) => {
        const f = e.target.files?.[0];
        e.target.value = ""; // allow picking the same file again
        if (f) onFile(f);
      }}
    />
  </label>
);

const Section = ({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) => (
  <section className="space-y-3 rounded-lg border p-4">
    <div>
      <h3 className="text-sm font-semibold">{title}</h3>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
    {children}
  </section>
);

/** Most frequent colors of an image, measured on pixels (4 bits per channel buckets), as #rrggbb. */
async function measurePalette(file: File, count = 10): Promise<string[]> {
  const bmp = await createImageBitmap(file);
  const w = 96;
  const h = Math.max(1, Math.round((bmp.height / bmp.width) * w));
  const ctx = new OffscreenCanvas(w, h).getContext("2d")!;
  ctx.drawImage(bmp, 0, 0, w, h);
  const px = ctx.getImageData(0, 0, w, h).data;
  const buckets = new Map<number, { n: number; r: number; g: number; b: number }>();
  for (let i = 0; i < px.length; i += 4) {
    const key = ((px[i] >> 4) << 8) | ((px[i + 1] >> 4) << 4) | (px[i + 2] >> 4);
    const e = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    e.n++; e.r += px[i]; e.g += px[i + 1]; e.b += px[i + 2];
    buckets.set(key, e);
  }
  const hex = (e: { n: number; r: number; g: number; b: number }) =>
    "#" + [e.r, e.g, e.b].map((v) => Math.round(v / e.n).toString(16).padStart(2, "0")).join("");
  return [...buckets.values()].sort((a, b) => b.n - a.n).slice(0, count).map(hex);
}

export const ThemePicker = ({
  value,
  onChange,
  disabled,
  eventId,
}: {
  value: EventTheme;
  onChange: (t: EventTheme) => void;
  disabled?: boolean;
  /** Enables image tools (design import, logo, background). Absent while creating. */
  eventId?: string;
}) => {
  const [busy, setBusy] = useState<Kind | null>(null);
  const ratio = contrast(value.background, value.text);
  const set = (patch: Partial<EventTheme>) => onChange({ ...value, ...patch });

  const upload = async (file: File, kind: Kind) => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${eventId}/${kind}-${Date.now()}.${ext}`;
    const textLike = !file.type.startsWith("image/") && file.type !== "application/pdf";
    const { error } = await supabase.storage
      .from(BUCKET)
      // Text design files (.md, .html, .css, .json...) are stored as text/plain; the bucket only allows that, pdf and images.
      // storage-js ignores `contentType` for File bodies and uses the file's own type, so retype the file itself.
      .upload(path, textLike ? new File([file], file.name, { type: "text/plain" }) : file, { upsert: true });
    if (error) throw error;
    return { path, url: supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl };
  };

  const run = async (kind: Kind, file?: File) => {
    if (!file || !eventId) return;
    setBusy(kind);
    try {
      const { path, url } = await upload(file, kind);
      if (kind === "logo") set({ logo: url, useLogo: true });
      else if (kind === "bg") set({ bgImage: url, bgOverlay: value.bgOverlay ?? 0.7 });
      else {
        const palette = kind === "design" ? await measurePalette(file).catch(() => []) : [];
        const { data, error } = await supabase.functions.invoke("theme-from-image", {
          body: { path, mode: kind === "ds" ? "design-system" : "photo", palette },
        });
        if (error || !data?.theme) throw new Error(data?.error ?? "Não foi possível ler o arquivo");
        // keep the image/logo choices, replace the look
        onChange({ ...value, ...parseTheme(data.theme) });
        toast.success("Tema importado. Revise e salve.", {
          description: Array.isArray(data.notes) ? data.notes.slice(0, 4).join(" · ") : undefined,
        });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no envio");
    } finally {
      setBusy(null);
    }
  };
  const clear = (key: ColorKey) => {
    const { [key]: _removed, ...rest } = value;
    onChange(rest as EventTheme);
  };
  const locked = disabled || busy !== null;
  const IMG = "image/*";
  return (
    <div className="space-y-4">
      {eventId ? (
        <>
          <Section title="Importar tema" hint="Escolha uma origem. Depois revise as cores e salve.">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-2 rounded-md border p-3">
                <p className="text-sm font-medium">Do design system</p>
                <p className="text-xs text-muted-foreground">
                  Lê as regras declaradas: PDF, imagem, .md, .txt, .html, .css ou .json.
                </p>
                <FileButton
                  label="Escolher arquivo"
                  busyLabel="Lendo design system…"
                  accept="application/pdf,image/*,.md,.txt,.html,.htm,.css,.json"
                  loading={busy === "ds"}
                  locked={locked}
                  onFile={(f) => run("ds", f)}
                />
              </div>
              <div className="space-y-2 rounded-md border p-3">
                <p className="text-sm font-medium">Da arte (sugestão da IA)</p>
                <p className="text-xs text-muted-foreground">Sem design system: mede as cores do cartaz ou foto.</p>
                <FileButton
                  label="Escolher imagem"
                  busyLabel="Analisando imagem…"
                  accept={IMG}
                  loading={busy === "design"}
                  locked={locked}
                  onFile={(f) => run("design", f)}
                />
              </div>
            </div>
            {(busy === "ds" || busy === "design") && (
              <p className="flex items-center gap-2 text-xs text-muted-foreground" role="status">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Isso leva alguns segundos. Não feche a página.
              </p>
            )}
          </Section>

          <Section title="Imagens do evento">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <p className="text-sm font-medium">Logo</p>
                {value.logo && <img src={value.logo} alt="Logo" className="h-16 rounded border bg-muted object-contain p-1" />}
                <FileButton
                  label={value.logo ? "Trocar logo" : "Enviar logo"}
                  busyLabel="Enviando…"
                  accept={IMG}
                  loading={busy === "logo"}
                  locked={locked}
                  onFile={(f) => run("logo", f)}
                />
                {value.logo && (
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={!!value.useLogo}
                      disabled={disabled}
                      onChange={(e) => set({ useLogo: e.target.checked })}
                    />
                    Usar logo no placar e apurações
                  </label>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Imagem de fundo</p>
                {value.bgImage && (
                  <img src={value.bgImage} alt="Fundo" className="h-16 w-full rounded border object-cover" />
                )}
                <FileButton
                  label={value.bgImage ? "Trocar imagem" : "Enviar imagem"}
                  busyLabel="Enviando…"
                  accept={IMG}
                  loading={busy === "bg"}
                  locked={locked}
                  onFile={(f) => run("bg", f)}
                />
                {value.bgImage && (
                  <div className="space-y-2 text-xs">
                    {(
                      [
                        ["bgWaiting", "Usar na tela de abertura"],
                        ["bgWinner", "Usar na tela do campeão"],
                        ["bgClosing", "Usar na tela final"],
                      ] as const
                    ).map(([k, label]) => (
                      <label key={k} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={!!value[k]}
                          disabled={disabled}
                          onChange={(e) => set({ [k]: e.target.checked })}
                        />
                        {label}
                      </label>
                    ))}
                    <div className="flex items-center gap-2">
                      <span className="shrink-0">Cobertura</span>
                      <input
                        type="range"
                        min={0.3}
                        max={0.95}
                        step={0.05}
                        value={value.bgOverlay ?? 0.7}
                        disabled={disabled}
                        onChange={(e) => set({ bgOverlay: Number(e.target.value) })}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={disabled}
                        onClick={() => {
                          const { bgImage: _a, bgOverlay: _b, bgWaiting: _c, bgWinner: _d, bgClosing: _e, ...rest } = value;
                          onChange(rest as EventTheme);
                        }}
                      >
                        Remover
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Section>
        </>
      ) : (
        <p className="text-xs text-muted-foreground">
          Logo, imagem de fundo e importação do design ficam disponíveis depois de criar o evento.
        </p>
      )}

      <Section title="Cores e fonte">
        <div className="flex flex-wrap gap-2">
          {THEME_PRESETS.map((p) => (
            <Button
              key={p.name}
              type="button"
              size="sm"
              variant="outline"
              disabled={disabled}
              onClick={() => onChange({ ...p.theme, font: value.font, logo: value.logo, useLogo: value.useLogo })}
            >
              <span className="mr-2 h-3 w-3 rounded-full border" style={{ background: p.theme.accent }} />
              {p.name}
            </Button>
          ))}
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          {FIELDS.map((f) => {
            const current = value[f.key];
            return (
              <div key={f.key} className="space-y-1">
                <Label className="text-xs">{f.label}</Label>
                <div className="flex gap-1">
                  <input
                    type="color"
                    value={current ?? value.accent}
                    disabled={disabled}
                    onChange={(e) => set({ [f.key]: e.target.value })}
                    className={`h-9 w-full rounded border bg-transparent cursor-pointer ${
                      f.optional && !current ? "opacity-40" : ""
                    }`}
                  />
                  {f.optional && current && (
                    <Button type="button" size="sm" variant="ghost" disabled={disabled} onClick={() => clear(f.key)}>
                      Auto
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="space-y-1 max-w-xs">
          <Label className="text-xs">Fonte</Label>
          <Select value={value.font ?? "barlow"} disabled={disabled} onValueChange={(v) => set({ font: v as ThemeFont })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(THEME_FONTS).map(([k, f]) => (
                <SelectItem key={k} value={k} style={{ fontFamily: f.family }}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Section>

      <div className="rounded-md p-4 border" style={{ ...themeStyle(value), fontFamily: "var(--sb-font)" }}>
        <p className="text-2xl font-black uppercase" style={{ color: "var(--sb-accent)" }}>
          Nome do evento
        </p>
        <p className="text-sm" style={{ color: "var(--sb-muted)" }}>
          Pré-visualização: texto, fundo e destaque
        </p>
        <div className="mt-2 rounded p-2 text-xl font-extrabold" style={{ background: "var(--sb-panel)" }}>
          1.250 <span className="text-xs font-semibold">pontos</span>
        </div>
      </div>
      {ratio < 4.5 && (
        <p className="text-xs text-amber-500">
          Contraste baixo entre fundo e texto ({ratio.toFixed(1)}:1). Difícil de ler de longe.
        </p>
      )}
    </div>
  );
};
