import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { AdminPanel } from "@/components/AdminPanel";
import { ParticipantsTab } from "@/components/ParticipantsTab";
import { RevealControls } from "@/components/RevealControls";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { slugify } from "@/lib/slug";
import { parseTheme, type EventTheme } from "@/lib/theme";
import { ThemePicker } from "@/components/ThemePicker";
import { ArrowLeft, ExternalLink, Plus, Trash2, Upload } from "lucide-react";

type EventRow = Tables<"events">;
type TeamRow = Tables<"teams">;
type GameRow = Tables<"games">;

const STATUS_LABEL: Record<EventRow["status"], string> = {
  draft: "Rascunho",
  live: "Ao vivo",
  ended: "Encerrado",
};

const AdminEventDetail = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [event, setEvent] = useState<EventRow | null>(null);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [games, setGames] = useState<GameRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [teamName, setTeamName] = useState("");
  const [teamColor, setTeamColor] = useState("#3b82f6");
  const [gameTitle, setGameTitle] = useState("");
  const [gameDescription, setGameDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmSlug, setConfirmSlug] = useState("");
  const [theme, setTheme] = useState<EventTheme | null>(null);

  const readonly = event?.status === "ended";

  const load = useCallback(async () => {
    if (!eventId) return;
    const [{ data: eventData }, { data: teamsData }, { data: gamesData }] =
      await Promise.all([
        supabase.from("events").select("*").eq("id", eventId).single(),
        supabase.from("teams").select("*").eq("event_id", eventId).order("name"),
        supabase.from("games").select("*").eq("event_id", eventId).order("title"),
      ]);

    if (!eventData) {
      toast({ title: "Evento não encontrado", variant: "destructive" });
      navigate("/admin");
      return;
    }

    setEvent(eventData);
    setTheme(parseTheme(eventData.theme));
    setTeams(teamsData ?? []);
    setGames(gamesData ?? []);
    setLoading(false);
  }, [eventId, navigate, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (status: EventRow["status"]) => {
    if (!event || readonly) return;
    const { error } = await supabase
      .from("events")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", event.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `Status: ${STATUS_LABEL[status]}` });
    load();
  };

  const endEvent = async () => {
    if (!event) return;
    const { data, error } = await supabase.rpc("end_event", {
      target_event_id: event.id,
    });
    if (error || !data) {
      toast({
        title: "Erro ao encerrar",
        description: error?.message ?? "Operação não permitida",
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Evento encerrado", description: "Dados salvos. Alterações bloqueadas." });
    load();
  };

  const saveSubtitle = async (value: string) => {
    if (!event || readonly) return;
    const subtitle = value.trim() || null;
    if (subtitle === (event.subtitle ?? null)) return;
    const { error } = await supabase.from("events").update({ subtitle }).eq("id", event.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Subtítulo salvo" });
    load();
  };

  const saveTheme = async () => {
    if (!event || !theme || readonly) return;
    const { error } = await supabase.from("events").update({ theme }).eq("id", event.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Cores salvas" });
  };

  const deleteEvent = async () => {
    if (!event || confirmSlug !== event.slug) return;
    // Mascot files live under <event id>/ in the bucket; remove them first.
    for (const dir of [event.id, `${event.id}/players`]) {
      const { data: files } = await supabase.storage.from("team-mascots").list(dir);
      const names = (files ?? []).filter((f) => f.id).map((f) => `${dir}/${f.name}`);
      if (names.length) await supabase.storage.from("team-mascots").remove(names);
    }
    const { error } = await supabase.from("events").delete().eq("id", event.id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Evento excluído" });
    navigate("/admin");
  };

  const addTeam = async () => {
    if (!event || !teamName.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("teams").insert({
      event_id: event.id,
      name: teamName.trim(),
      color: teamColor,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    setTeamName("");
    load();
  };

  const deleteTeam = async (team: TeamRow) => {
    if (readonly) return;
    const { error } = await supabase.from("teams").delete().eq("id", team.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    load();
  };

  const uploadMascot = async (team: TeamRow, file: File) => {
    if (readonly || !event) return;
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${event.id}/${team.id}-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("team-mascots")
      .upload(path, file, { upsert: true });
    if (uploadError) {
      toast({ title: "Upload falhou", description: uploadError.message, variant: "destructive" });
      return;
    }
    const { data: urlData } = supabase.storage.from("team-mascots").getPublicUrl(path);
    const { error } = await supabase
      .from("teams")
      .update({ avatar_url: urlData.publicUrl })
      .eq("id", team.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Mascote atualizado" });
    load();
  };

  const addGame = async () => {
    if (!event || !gameTitle.trim()) return;
    setSaving(true);
    const slug = slugify(gameTitle) || `game-${Date.now()}`;
    const { error } = await supabase.from("games").insert({
      event_id: event.id,
      title: gameTitle.trim(),
      slug,
      description: gameDescription.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    setGameTitle("");
    setGameDescription("");
    load();
  };

  const deleteGame = async (game: GameRow) => {
    if (readonly) return;
    const { error } = await supabase.from("games").delete().eq("id", game.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    load();
  };

  if (loading || !event) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center">
        <p className="text-muted-foreground">Carregando evento...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-dark p-4">
      <div className="container mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => navigate("/admin")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Eventos
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold bg-gradient-camp bg-clip-text text-transparent">
                  {event.title}
                </h1>
                <Badge>{STATUS_LABEL[event.status]}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">/{event.slug}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`/e/${event.slug}`, "_blank", "noopener")}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Ver placar
            </Button>
            {!readonly && event.status !== "live" && (
              <Button size="sm" onClick={() => setStatus("live")}>
                Publicar (ao vivo)
              </Button>
            )}
            {!readonly && event.status === "live" && (
              <Button size="sm" variant="outline" onClick={() => setStatus("draft")}>
                Voltar a rascunho
              </Button>
            )}
            {!readonly && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="destructive">
                    Encerrar evento
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Encerrar este evento?</AlertDialogTitle>
                    <AlertDialogDescription>
                      O placar final será salvo. Depois disso não será possível alterar
                      times, jogos, pontuações ou mascotes. Esta ação não pode ser
                      desfeita pelo painel.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={endEvent}>
                      Encerrar e salvar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <AlertDialog onOpenChange={() => setConfirmSlug("")}>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="outline" className="text-destructive border-destructive/50">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir evento
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir este evento?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Isto apaga permanentemente o evento, times, jogos, participantes,
                    pontuações, mascotes e o placar final. Não há como desfazer. Para
                    confirmar, digite <b>{event.slug}</b>.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <Input
                  value={confirmSlug}
                  onChange={(e) => setConfirmSlug(e.target.value)}
                  placeholder={event.slug}
                />
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={confirmSlug !== event.slug}
                    onClick={deleteEvent}
                    className="bg-destructive text-destructive-foreground"
                  >
                    Excluir definitivamente
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div className="max-w-md">
          <Label htmlFor="subtitle">Subtítulo no placar (opcional)</Label>
          <Input
            id="subtitle"
            key={event.subtitle ?? ""}
            defaultValue={event.subtitle ?? ""}
            disabled={readonly}
            placeholder="Sem subtítulo, o título fica maior"
            onBlur={(e) => saveSubtitle(e.target.value)}
          />
        </div>

        {theme && (
          <Card className="bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Cores do placar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ThemePicker value={theme} onChange={setTheme} disabled={readonly} />
              {!readonly && <Button size="sm" onClick={saveTheme}>Salvar cores</Button>}
            </CardContent>
          </Card>
        )}

        {readonly && (
          <Card className="bg-red-500/10 border-red-500/30">
            <CardContent className="py-3 text-sm text-red-200">
              Evento encerrado — somente leitura. Dados finais preservados.
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="setup">
          <TabsList className="bg-card/50">
            <TabsTrigger value="setup">Times e jogos</TabsTrigger>
            <TabsTrigger value="scoring">Pontuação</TabsTrigger>
            <TabsTrigger value="reveals">Apurações</TabsTrigger>
            {event.scoring_mode === "individual" && (
              <TabsTrigger value="participants">Participantes</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="setup" className="space-y-6 mt-4">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Times</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!readonly && (
                    <div className="space-y-2">
                      <Label>Nome</Label>
                      <Input
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                        placeholder="Ex: Azul"
                      />
                      <Label>Cor</Label>
                      <Input
                        type="color"
                        value={teamColor}
                        onChange={(e) => setTeamColor(e.target.value)}
                        className="h-10 w-full"
                      />
                      <Button onClick={addTeam} disabled={saving || !teamName.trim()}>
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar time
                      </Button>
                    </div>
                  )}
                  <div className="space-y-2">
                    {teams.map((team) => (
                      <div
                        key={team.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-card/40 border border-border/40"
                      >
                        <div
                          className="w-4 h-4 rounded-full shrink-0"
                          style={{ backgroundColor: team.color }}
                        />
                        {team.avatar_url ? (
                          <img
                            src={team.avatar_url}
                            alt=""
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                            style={{ backgroundColor: team.color }}
                          >
                            {team.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="flex-1 font-medium">{team.name}</span>
                        {!readonly && (
                          <>
                            <label className="cursor-pointer">
                              <input
                                type="file"
                                accept="image/png,image/jpeg,image/webp,image/gif"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) uploadMascot(team, file);
                                  e.target.value = "";
                                }}
                              />
                              <span className="inline-flex items-center text-xs text-camp-cyan">
                                <Upload className="w-3 h-3 mr-1" />
                                Mascote
                              </span>
                            </label>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => deleteTeam(team)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    ))}
                    {teams.length === 0 && (
                      <p className="text-sm text-muted-foreground">Nenhum time ainda.</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Jogos / desafios</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!readonly && (
                    <div className="space-y-2">
                      <Label>Título</Label>
                      <Input
                        value={gameTitle}
                        onChange={(e) => setGameTitle(e.target.value)}
                        placeholder="Ex: Caça ao tesouro"
                      />
                      <Label>Descrição (opcional)</Label>
                      <Input
                        value={gameDescription}
                        onChange={(e) => setGameDescription(e.target.value)}
                      />
                      <Button onClick={addGame} disabled={saving || !gameTitle.trim()}>
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar jogo
                      </Button>
                    </div>
                  )}
                  <div className="space-y-2">
                    {games.map((game) => (
                      <div
                        key={game.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-card/40 border border-border/40"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{game.title}</p>
                          <p className="text-xs text-muted-foreground">{game.slug}</p>
                        </div>
                        {!readonly && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteGame(game)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    ))}
                    {games.length === 0 && (
                      <p className="text-sm text-muted-foreground">Nenhum jogo ainda.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="reveals" className="mt-4">
            <RevealControls eventId={event.id} slug={event.slug} games={games} />
          </TabsContent>

          {event.scoring_mode === "individual" && (
            <TabsContent value="participants" className="mt-4">
              <ParticipantsTab
                eventId={event.id}
                teams={teams}
                readonly={readonly}
                onTeamsChanged={load}
              />
            </TabsContent>
          )}

          <TabsContent value="scoring" className="mt-4">
            <AdminPanel
              eventId={event.id}
              eventTitle={event.title}
              eventStatus={event.status}
              scoringMode={event.scoring_mode}
              onBack={() => navigate("/admin")}
              embedded
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminEventDetail;
