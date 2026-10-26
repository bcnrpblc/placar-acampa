import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import {
  DEFAULT_REVEAL_TEXTS,
  REVEAL_KIND_LABEL,
  REVEAL_TEXT_FIELDS,
  getRevealTexts,
  type RevealKind,
  type RevealTexts,
} from "@/lib/revealTexts";

const KINDS: RevealKind[] = ["day", "game", "final"];

/** Edits the header, subheader, verse and all other copy shown on the reveal pages. */
export const RevealTextsEditor = ({
  eventId,
  saved,
  readonly,
}: {
  eventId: string;
  saved: Json | null;
  readonly?: boolean;
}) => {
  const [kind, setKind] = useState<RevealKind>("day");
  const [all, setAll] = useState<Record<RevealKind, RevealTexts>>(() => ({
    day: getRevealTexts(saved, "day"),
    game: getRevealTexts(saved, "game"),
    final: getRevealTexts(saved, "final"),
  }));
  const [saving, setSaving] = useState(false);

  const set = (key: keyof RevealTexts, value: string) =>
    setAll((a) => ({ ...a, [kind]: { ...a[kind], [key]: value } }));

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("events")
      .update({ reveal_texts: all as unknown as Json })
      .eq("id", eventId);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Textos salvos");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Textos da apuração</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {KINDS.map((k) => (
            <Button key={k} size="sm" variant={k === kind ? "default" : "outline"} onClick={() => setKind(k)}>
              {REVEAL_KIND_LABEL[k]}
            </Button>
          ))}
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {REVEAL_TEXT_FIELDS.map((f) => (
            <div key={f.key} className="space-y-1">
              <Label className="text-xs">
                {f.label}
                {f.hint && <span className="text-muted-foreground"> · {f.hint}</span>}
              </Label>
              <Input
                value={all[kind][f.key]}
                disabled={readonly}
                onChange={(e) => set(f.key, e.target.value)}
              />
            </div>
          ))}
        </div>
        {!readonly && (
          <div className="flex gap-2">
            <Button size="sm" onClick={save} disabled={saving}>
              Salvar textos
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setAll((a) => ({ ...a, [kind]: DEFAULT_REVEAL_TEXTS[kind] }))}
            >
              Restaurar padrão
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
