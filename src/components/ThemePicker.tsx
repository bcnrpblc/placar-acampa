import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { THEME_PRESETS, contrast, type EventTheme } from "@/lib/theme";

const FIELDS: { key: keyof EventTheme; label: string }[] = [
  { key: "background", label: "Fundo" },
  { key: "text", label: "Texto" },
  { key: "accent", label: "Destaque (título e detalhes)" },
];

export const ThemePicker = ({
  value,
  onChange,
  disabled,
}: {
  value: EventTheme;
  onChange: (t: EventTheme) => void;
  disabled?: boolean;
}) => {
  const ratio = contrast(value.background, value.text);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {THEME_PRESETS.map((p) => (
          <Button
            key={p.name}
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled}
            onClick={() => onChange(p.theme)}
          >
            {p.name}
          </Button>
        ))}
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        {FIELDS.map((f) => (
          <div key={f.key} className="space-y-1">
            <Label className="text-xs">{f.label}</Label>
            <input
              type="color"
              value={value[f.key]}
              disabled={disabled}
              onChange={(e) => onChange({ ...value, [f.key]: e.target.value })}
              className="h-9 w-full rounded border bg-transparent cursor-pointer"
            />
          </div>
        ))}
      </div>
      <div
        className="rounded-md p-4 border"
        style={{ background: value.background, color: value.text }}
      >
        <p className="text-2xl font-black" style={{ color: value.accent }}>
          Nome do evento
        </p>
        <p className="text-sm">Pré-visualização: texto, fundo e destaque</p>
      </div>
      {ratio < 4.5 && (
        <p className="text-xs text-amber-500">
          Contraste baixo entre fundo e texto ({ratio.toFixed(1)}:1). Difícil de ler de longe.
        </p>
      )}
    </div>
  );
};
