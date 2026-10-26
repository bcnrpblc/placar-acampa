import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { slugify } from "@/lib/slug";
import { DEFAULT_THEME, THEME_PRESETS, type EventTheme } from "@/lib/theme";
import { ThemePicker } from "@/components/ThemePicker";
import { NEUTRAL_TEAM_COLOR } from "@/lib/teamColor";
import { ArrowLeft, Check, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

type EventRow = Tables<"events">;

const STEPS = ["Nome", "Pontos", "Equipes", "Jogos", "Visual", "Pronto"];

const Choice = ({ selected, title, hint, onClick }: { selected: boolean; title: string; hint: string; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "w-full rounded-lg border-2 p-4 text-left transition-colors",
      selected ? "border-camp-cyan bg-camp-cyan/10" : "border-border/50 hover:border-camp-cyan/50",
    )}
  >
    <p className="text-lg font-bold">{title}</p>
    <p className="text-sm text-muted-foreground">{hint}</p>
  </button>
);

const NewEventWizard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);

  const [event, setEvent] = useState<Pick<EventRow, "id" | "slug"> | null>(null);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [mode, setMode] = useState<EventRow["scoring_mode"]>("team");
  const [teams, setTeams] = useState<Pick<Tables<"teams">, "id" | "name" | "color">[]>([]);
  const [teamName, setTeamName] = useState("");
  const [games, setGames] = useState<Pick<Tables<"games">, "id" | "title">[]>([]);
  const [gameTitle, setGameTitle] = useState("");
  const [theme, setTheme] = useState<EventTheme>(DEFAULT_THEME);
  const [custom, setCustom] = useState(false);

  const fail = (message?: string) => toast({ title: "Erro", description: message, variant: "destructive" });

  // Step 0 creates the event as a draft; every later step saves straight to it.
  const saveBasics = async () => {
    const fields = { title: title.trim(), subtitle: subtitle.trim() || null };
    setBusy(true);
    const { data, error } = event
      ? await supabase.from("events").update(fields).eq("id", event.id).select("id, slug").single()
      : await supabase.from("events").insert({ ...fields, slug: slugify(title), scoring_mode: mode, theme }).select("id, slug").single();
    setBusy(false);
    if (error || !data) {
      fail(error?.code === "23505" ? "Já existe um evento com esse nome. Mude um pouco o título." : error?.message);
      return;
    }
    setEvent(data);
    setStep(1);
  };

  const saveField = async (patch: Partial<EventRow>, next: number) => {
    if (!event) return;
    setBusy(true);
    const { error } = await supabase.from("events").update(patch).eq("id", event.id);
    setBusy(false);
    if (error) return fail(error.message);
    setStep(next);
  };

  const addTeam = async () => {
    const name = teamName.trim();
    if (!event || !name) return;
    const { data, error } = await supabase.from("teams").insert({ event_id: event.id, name, color: NEUTRAL_TEAM_COLOR }).select("id, name, color").single();
    if (error || !data) return fail(error?.message);
    setTeams([...teams, data]);
    setTeamName("");
  };

  const removeTeam = async (id: string) => {
    const { error } = await supabase.from("teams").delete().eq("id", id);
    if (error) return fail(error.message);
    setTeams(teams.filter((t) => t.id !== id));
  };

  const addGame = async () => {
    const name = gameTitle.trim();
    if (!event || !name) return;
    const { data, error } = await supabase
      .from("games")
      .insert({ event_id: event.id, title: name, slug: slugify(name) || `game-${Date.now()}` })
      .select("id, title")
      .single();
    if (error || !data) return fail(error?.message);
    setGames([...games, data]);
    setGameTitle("");
  };

  const removeGame = async (id: string) => {
    const { error } = await supabase.from("games").delete().eq("id", id);
    if (error) return fail(error.message);
    setGames(games.filter((g) => g.id !== id));
  };

  const finish = async (publish: boolean) => {
    if (!event) return;
    if (publish) {
      setBusy(true);
      const { error } = await supabase.from("events").update({ status: "live" }).eq("id", event.id);
      setBusy(false);
      if (error) return fail(error.message);
    }
    navigate(`/admin/events/${event.id}`);
  };

  const back = (to: number) => (
    <Button variant="ghost" onClick={() => setStep(to)} disabled={busy}>
      <ArrowLeft className="w-4 h-4 mr-2" />
      Voltar
    </Button>
  );

  const addRow = (value: string, set: (v: string) => void, add: () => void, placeholder: string) => (
    <div className="flex gap-2">
      <Input
        autoFocus
        value={value}
        onChange={(e) => set(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && add()}
        placeholder={placeholder}
        className="h-12 text-base"
      />
      <Button onClick={add} disabled={!value.trim()} className="h-12">
        <Plus className="w-4 h-4 mr-1" />
        Adicionar
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-dark p-4">
      <div className="container mx-auto max-w-xl space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => navigate("/admin")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {event ? "Sair (fica salvo como rascunho)" : "Cancelar"}
          </Button>
          <p className="text-sm text-muted-foreground">
            Passo {step + 1} de {STEPS.length}
          </p>
        </div>

        <div className="flex gap-1.5" aria-hidden>
          {STEPS.map((s, i) => (
            <div key={s} className={cn("h-1.5 flex-1 rounded-full", i <= step ? "bg-camp-cyan" : "bg-border/50")} />
          ))}
        </div>

        <Card className="bg-card/50 backdrop-blur-sm">
          <CardContent className="space-y-5 p-6">
            {step === 0 && (
              <>
                <h1 className="text-2xl font-bold">Como se chama o evento?</h1>
                <div className="space-y-2">
                  <Input
                    autoFocus
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && slugify(title) && saveBasics()}
                    placeholder="Ex: Acampa 2026"
                    className="h-12 text-base"
                  />
                  <Input
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder="Frase embaixo do nome (opcional)"
                  />
                </div>
                <div className="flex justify-end">
                  <Button onClick={saveBasics} disabled={busy || !slugify(title)}>Continuar</Button>
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <h1 className="text-2xl font-bold">Quem ganha os pontos?</h1>
                <div className="space-y-3">
                  <Choice selected={mode === "team"} title="Só as equipes" hint="Os pontos vão direto para a equipe." onClick={() => setMode("team")} />
                  <Choice
                    selected={mode === "individual"}
                    title="Cada participante"
                    hint="Cada pessoa ganha pontos e eles somam para a equipe dela."
                    onClick={() => setMode("individual")}
                  />
                </div>
                <div className="flex justify-between">
                  {back(0)}
                  <Button onClick={() => saveField({ scoring_mode: mode }, 2)} disabled={busy}>Continuar</Button>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div>
                  <h1 className="text-2xl font-bold">Quais são as equipes?</h1>
                  <p className="text-sm text-muted-foreground">Digite o nome e aperte Enter. A cor vem do mascote, depois.</p>
                </div>
                {addRow(teamName, setTeamName, addTeam, "Ex: Azul")}
                <div className="flex flex-wrap gap-2">
                  {teams.map((t) => (
                    <span key={t.id} className="inline-flex items-center gap-2 rounded-full border border-border/50 py-1 pl-3 pr-1 text-sm">
                      {t.name}
                      <button type="button" aria-label={`Remover ${t.name}`} onClick={() => removeTeam(t.id)} className="rounded-full p-1 hover:bg-muted">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                {teams.length < 2 && <p className="text-xs text-muted-foreground">Adicione pelo menos 2 equipes.</p>}
                <div className="flex justify-between">
                  {back(1)}
                  <Button onClick={() => setStep(3)} disabled={teams.length < 2}>Continuar</Button>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div>
                  <h1 className="text-2xl font-bold">Quais são os jogos?</h1>
                  <p className="text-sm text-muted-foreground">As provas onde as equipes ganham pontos. Dá para adicionar mais depois.</p>
                </div>
                {addRow(gameTitle, setGameTitle, addGame, "Ex: Caça ao tesouro")}
                <div className="flex flex-wrap gap-2">
                  {games.map((g) => (
                    <span key={g.id} className="inline-flex items-center gap-2 rounded-full border border-border/50 py-1 pl-3 pr-1 text-sm">
                      {g.title}
                      <button type="button" aria-label={`Remover ${g.title}`} onClick={() => removeGame(g.id)} className="rounded-full p-1 hover:bg-muted">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex justify-between">
                  {back(2)}
                  <Button onClick={() => setStep(4)}>{games.length ? "Continuar" : "Pular por enquanto"}</Button>
                </div>
              </>
            )}

            {step === 4 && (
              <>
                <div>
                  <h1 className="text-2xl font-bold">Como vai ser o visual do placar?</h1>
                  <p className="text-sm text-muted-foreground">Escolha um estilo. Dá para mudar quando quiser.</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {THEME_PRESETS.map((p) => {
                    const selected = !custom && theme.background === p.theme.background && theme.accent === p.theme.accent;
                    return (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => {
                          setCustom(false);
                          setTheme({ ...theme, ...p.theme });
                        }}
                        className={cn("rounded-lg border-2 p-3 text-left", selected ? "border-camp-cyan" : "border-border/50")}
                        style={{ background: p.theme.background }}
                      >
                        <p className="text-2xl font-black" style={{ color: p.theme.accent }}>Aa</p>
                        <p className="text-sm font-semibold" style={{ color: p.theme.text }}>{p.name}</p>
                      </button>
                    );
                  })}
                </div>
                {!custom ? (
                  <Button variant="link" className="px-0" onClick={() => setCustom(true)}>
                    Personalizar cores, logo e fundo
                  </Button>
                ) : (
                  event && <ThemePicker value={theme} onChange={setTheme} eventId={event.id} />
                )}
                <div className="flex justify-between">
                  {back(3)}
                  <Button onClick={() => saveField({ theme }, 5)} disabled={busy}>Continuar</Button>
                </div>
              </>
            )}

            {step === 5 && event && (
              <>
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-camp-cyan/10 p-2">
                    <Check className="h-6 w-6 text-camp-cyan" />
                  </div>
                  <h1 className="text-2xl font-bold">Tudo pronto!</h1>
                </div>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li><b className="text-foreground">{title.trim()}</b> · /e/{event.slug}</li>
                  <li>{teams.length} equipes · {games.length} jogos · pontos para {mode === "team" ? "as equipes" : "cada participante"}</li>
                  {mode === "individual" && <li>Depois, cadastre os participantes na aba Participantes.</li>}
                </ul>
                <div className="space-y-2">
                  <Button className="h-12 w-full text-base" onClick={() => finish(true)} disabled={busy}>
                    Publicar o placar agora
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => finish(false)} disabled={busy}>
                    Ainda não, abrir o painel do evento
                  </Button>
                </div>
                <div>{back(4)}</div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NewEventWizard;
