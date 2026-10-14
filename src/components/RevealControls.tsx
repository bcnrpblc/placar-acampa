import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { TOP3_MIN_TEAMS } from "@/lib/revealTiming";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useRevealController, type RevealKind } from "@/lib/useRevealChannel";
import { AlertTriangle, ExternalLink, ImageIcon, Play, RotateCcw } from "lucide-react";

type Game = Tables<"games">;
type RankedTeam = { id: string; name: string; color: string; photo_url: string | null; points: number };

const REVEALS: { kind: RevealKind; title: string; path: string; hint: string }[] = [
  { kind: "day", title: "Apuração do dia", path: "reveal", hint: "Ranking geral do dia." },
  { kind: "game", title: "Apuração por jogo", path: "game-reveal", hint: "Vencedores de um jogo." },
  { kind: "final", title: "Apuração final", path: "final-reveal", hint: "Do último ao grande vencedor." },
];

export const RevealControls = ({
  eventId,
  slug,
  games,
}: {
  eventId: string;
  slug: string;
  games: Game[];
}) => {
  const { screens, send } = useRevealController(eventId);
  const [gameId, setGameId] = useState("");
  const [ranked, setRanked] = useState<RankedTeam[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);

  const loadRanking = useCallback(async () => {
    const [{ data: teams }, { data: aggs }] = await Promise.all([
      supabase.from("teams").select("id, name, color, photo_url").eq("event_id", eventId),
      supabase.from("team_aggregates").select("team_id, total_points").eq("event_id", eventId),
    ]);
    const points = new Map((aggs ?? []).map((a) => [a.team_id, a.total_points ?? 0]));
    setRanked(
      (teams ?? [])
        .map((t) => ({ ...t, points: points.get(t.id) ?? 0 }))
        .sort((a, b) => b.points - a.points),
    );
  }, [eventId]);

  useEffect(() => {
    loadRanking();
  }, [loadRanking]);

  // Winner always; the whole podium only when the reveal shows a top 3
  const photoTeams = ranked.slice(0, ranked.length >= TOP3_MIN_TEAMS ? 3 : 1);
  const missingPhoto = photoTeams.some((t) => !t.photo_url);

  const uploadPhoto = async (team: RankedTeam, file?: File) => {
    if (!file) return;
    setUploading(team.id);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${eventId}/photos/${team.id}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("event-assets").upload(path, file, { upsert: true });
    if (error) {
      toast.error(error.message);
      setUploading(null);
      return;
    }
    const { publicUrl } = supabase.storage.from("event-assets").getPublicUrl(path).data;
    const { error: updateError } = await supabase.from("teams").update({ photo_url: publicUrl }).eq("id", team.id);
    setUploading(null);
    if (updateError) toast.error(updateError.message);
    else {
      toast.success(`Foto de ${team.name} salva`);
      loadRanking();
    }
  };

  const start = (kind: RevealKind, game?: string) => {
    if (kind !== "game" && missingPhoto && !window.confirm("Falta a foto do vencedor (ou do pódio). Iniciar mesmo assim?")) return;
    send({ type: "start", kind, gameId: game });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        1) Abra o telão e coloque na tela grande. 2) Quando ele aparecer como conectado, inicie
        daqui. Iniciar de novo repete a apuração.
      </p>

      <Card className="bg-card/50 backdrop-blur-sm">
        <CardHeader className="py-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            Fotos para a apuração
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Enviadas antes de abrir o telão. Mostradas na tela do vencedor
            {ranked.length >= TOP3_MIN_TEAMS ? " e do pódio (top 3)" : ""}, com base na pontuação atual.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {missingPhoto && ranked.length > 0 && (
            <div className="flex items-center gap-2 rounded-md border border-amber-500/50 p-2 text-sm text-amber-500">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Envie a foto do vencedor antes de abrir o telão. Sem foto, a apuração usa o avatar da equipe.
            </div>
          )}
          {photoTeams.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma equipe ainda.</p>}
          {photoTeams.map((t, i) => (
            <div key={t.id} className="flex items-center gap-3">
              <span className="w-6 text-sm font-bold">#{i + 1}</span>
              {t.photo_url ? (
                <img src={t.photo_url} alt="" className="h-12 w-16 rounded object-cover border" />
              ) : (
                <div className="h-12 w-16 rounded border border-dashed grid place-items-center text-xs text-muted-foreground">
                  sem foto
                </div>
              )}
              <span className="font-semibold" style={{ color: t.color }}>{t.name}</span>
              <input
                type="file"
                accept="image/*"
                disabled={uploading === t.id}
                onChange={(e) => uploadPhoto(t, e.target.files?.[0])}
                className="ml-auto text-xs max-w-[12rem]"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {REVEALS.map((r) => {
        const connected = screens.includes(r.kind);
        const needsGame = r.kind === "game";
        return (
          <Card key={r.kind} className="bg-card/50 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between py-4">
              <div>
                <CardTitle className="text-lg">{r.title}</CardTitle>
                <p className="text-xs text-muted-foreground">{r.hint}</p>
              </div>
              <Badge variant={connected ? "default" : "secondary"}>
                {connected ? "Telão conectado" : "Telão fechado"}
              </Badge>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-2">
              {needsGame && (
                <Select value={gameId} onValueChange={setGameId}>
                  <SelectTrigger className="w-56">
                    <SelectValue placeholder="Escolha o jogo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {games.map((g) => (
                      <SelectItem key={g.id} value={g.id}>{g.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`/e/${slug}/${r.path}`, "_blank", "noopener")}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Abrir telão
              </Button>
              <Button
                size="sm"
                disabled={!connected || (needsGame && !gameId)}
                onClick={() => start(r.kind, needsGame ? gameId : undefined)}
              >
                <Play className="w-4 h-4 mr-2" />
                Iniciar apuração
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={!connected}
                onClick={() => send({ type: "stop" })}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Voltar à espera
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
