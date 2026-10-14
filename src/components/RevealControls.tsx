import { useState } from "react";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useRevealController, type RevealKind } from "@/lib/useRevealChannel";
import { ExternalLink, Play, RotateCcw } from "lucide-react";

type Game = Tables<"games">;

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

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        1) Abra o telão e coloque na tela grande. 2) Quando ele aparecer como conectado, inicie
        daqui. Iniciar de novo repete a apuração.
      </p>

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
                onClick={() =>
                  send({ type: "start", kind: r.kind, gameId: needsGame ? gameId : undefined })
                }
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
