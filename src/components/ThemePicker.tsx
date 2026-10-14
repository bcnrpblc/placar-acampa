import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
  const [busy, setBusy] = useState<string | null>(null);
  const ratio = contrast(value.background, value.text);
  const set = (patch: Partial<EventTheme>) => onChange({ ...value, ...patch });

  const upload = async (file: File, kind: "design" | "logo" | "bg") => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${eventId}/${kind}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
    if (error) throw error;
    return { path, url: supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl };
  };

  const run = async (kind: "design" | "logo" | "bg", file?: File) => {
    if (!file || !eventId) return;
    setBusy(kind);
    try {
      const { path, url } = await upload(file, kind);
      if (kind === "logo") set({ logo: url, useLogo: true });
      else if (kind === "bg") set({ bgImage: url, bgOverlay: value.bgOverlay ?? 0.7 });
      else {
        const { data, error } = await supabase.functions.invoke("theme-from-image", { body: { path } });
        if (error || !data?.theme) throw new Error(data?.error ?? "Não foi possível ler a imagem");
        onChange({ ...value, ...parseTheme(data.theme) });
        toast.success("Cores importadas. Revise e salve.");
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
  return (
    <div className="space-y-3">
      {eventId ? (
        <div className="grid sm:grid-cols-3 gap-3 rounded-md border p-3">
          <label className="space-y-1 text-xs">
            <span className="font-semibold">Importar do design (IA)</span>
            <input
              type="file"
              accept="image/*"
              disabled={disabled || busy !== null}
              onChange={(e) => run("design", e.target.files?.[0])}
              className="block w-full text-xs"
            />
            {busy === "design" && <span className="text-muted-foreground">Lendo imagem…</span>}
          </label>
          <div className="space-y-1 text-xs">
            <span className="font-semibold">Logo (opcional)</span>
            <input
              type="file"
              accept="image/*"
              disabled={disabled || busy !== null}
              onChange={(e) => run("logo", e.target.files?.[0])}
              className="block w-full text-xs"
            />
            {value.logo && (
              <label className="flex items-center gap-2">
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
          <div className="space-y-1 text-xs">
            <span className="font-semibold">Imagem de fundo (opcional)</span>
            <input
              type="file"
              accept="image/*"
              disabled={disabled || busy !== null}
              onChange={(e) => run("bg", e.target.files?.[0])}
              className="block w-full text-xs"
            />
            {value.bgImage && (
              <div className="flex items-center gap-2">
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
                    const { bgImage: _a, bgOverlay: _b, ...rest } = value;
                    onChange(rest as EventTheme);
                  }}
                >
                  Remover
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Logo, imagem de fundo e importação do design ficam disponíveis depois de criar o evento.
        </p>
      )}
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
        <select
          value={value.font ?? "barlow"}
          disabled={disabled}
          onChange={(e) => set({ font: e.target.value as ThemeFont })}
          className="h-9 w-full rounded border bg-transparent px-2 text-sm"
        >
          {Object.entries(THEME_FONTS).map(([k, f]) => (
            <option key={k} value={k}>
              {f.label}
            </option>
          ))}
        </select>
      </div>
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
