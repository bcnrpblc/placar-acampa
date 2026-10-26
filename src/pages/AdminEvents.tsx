import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { slugify } from "@/lib/slug";
import { DEFAULT_THEME, type EventTheme } from "@/lib/theme";
import { ThemePicker } from "@/components/ThemePicker";
import { ArrowLeft, Plus, Settings } from "lucide-react";
import { useIsSuperadmin } from "@/lib/useIsSuperadmin";

type EventRow = Tables<"events">;

const AdminEvents = () => {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [theme, setTheme] = useState<EventTheme>(DEFAULT_THEME);
  const [scoringMode, setScoringMode] = useState<EventRow["scoring_mode"]>("team");
  const navigate = useNavigate();
  const { toast } = useToast();
  const isSuperadmin = useIsSuperadmin();

  const load = async () => {
    const { data } = await supabase
      .from("events")
      .select("*")
      .order("created_at", { ascending: false });
    setEvents(data ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    const slug = slugify(title);
    if (!slug) return;
    const { data, error } = await supabase
      .from("events")
      .insert({
        title: title.trim(),
        slug,
        scoring_mode: scoringMode,
        subtitle: subtitle.trim() || null,
        theme,
      })
      .select("id")
      .single();
    if (error || !data) {
      toast({ title: "Erro", description: error?.message, variant: "destructive" });
      return;
    }
    navigate(`/admin/events/${data.id}`);
  };

  return (
    <div className="min-h-screen bg-gradient-dark p-4">
      <div className="container mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          {isSuperadmin && (
            <Button variant="outline" size="sm" onClick={() => navigate("/admin/roles")}>
              <Settings className="w-4 h-4 mr-2" />
              Gerenciar Papéis
            </Button>
          )}
        </div>

        <Card className="bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Novo evento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título do evento"
                onKeyDown={(e) => e.key === "Enter" && create()}
              />
              <Button onClick={create} disabled={!slugify(title)}>
                <Plus className="w-4 h-4 mr-2" />
                Criar
              </Button>
            </div>
            <Input
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Subtítulo (opcional, aparece abaixo do título no placar)"
            />
            <div>
              <p className="text-sm mb-2">Cores do placar</p>
              <ThemePicker value={theme} onChange={setTheme} />
            </div>
            <div>
              <p className="text-sm mb-2">Quem recebe pontos neste evento?</p>
              <div className="grid sm:grid-cols-2 gap-2">
                <Button
                  variant={scoringMode === "team" ? "default" : "outline"}
                  className="h-auto py-2 whitespace-normal text-left"
                  onClick={() => setScoringMode("team")}
                >
                  Só as equipes
                </Button>
                <Button
                  variant={scoringMode === "individual" ? "default" : "outline"}
                  className="h-auto py-2 whitespace-normal text-left"
                  onClick={() => setScoringMode("individual")}
                >
                  Participantes (somam para a equipe)
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {events.map((e) => (
            <Card
              key={e.id}
              className="bg-card/50 cursor-pointer hover:border-camp-cyan/50"
              onClick={() => navigate(`/admin/events/${e.id}`)}
            >
              <CardHeader className="flex flex-row items-center justify-between py-4">
                <div>
                  <CardTitle className="text-lg">{e.title}</CardTitle>
                  <p className="text-xs text-muted-foreground">/e/{e.slug}</p>
                </div>
                <Badge variant={e.status === "live" ? "default" : "secondary"}>{{ draft: "Rascunho", live: "Ao vivo", ended: "Encerrado" }[e.status]}</Badge>
              </CardHeader>
            </Card>
          ))}
          {events.length === 0 && (
            <p className="text-center text-muted-foreground py-8">Nenhum evento ainda.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminEvents;
