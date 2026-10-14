import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, Trophy } from "lucide-react";

type EventRow = Tables<"events">;

const statusLabel: Record<EventRow["status"], string> = {
  draft: "Rascunho",
  live: "Ao vivo",
  ended: "Encerrado",
};

const Home = () => {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("events")
        .select("*")
        .in("status", ["live", "ended"])
        .order("created_at", { ascending: false });
      setEvents(data ?? []);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-dark p-4">
      <div className="container mx-auto max-w-3xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-camp bg-clip-text text-transparent">
              Placar Acampa
            </h1>
            <p className="text-muted-foreground">Escolha um evento para ver o placar</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/admin")}
            className="bg-card/50"
          >
            <Settings className="w-4 h-4 mr-2" />
            Admin
          </Button>
        </div>

        {loading ? (
          <p className="text-muted-foreground text-center py-12">Carregando eventos...</p>
        ) : events.length === 0 ? (
          <Card className="bg-card/50 backdrop-blur-sm">
            <CardContent className="py-12 text-center text-muted-foreground">
              Nenhum evento público ainda. Crie um no painel admin e marque como ao vivo.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <Card
                key={event.id}
                className="bg-card/50 backdrop-blur-sm border-camp-cyan/20 cursor-pointer hover:border-camp-cyan/50 transition-colors"
                onClick={() => navigate(`/e/${event.slug}`)}
              >
                <CardHeader className="flex flex-row items-center justify-between py-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-camp-cyan/10">
                      <Trophy className="w-5 h-5 text-camp-cyan" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{event.title}</CardTitle>
                      <p className="text-xs text-muted-foreground">/{event.slug}</p>
                    </div>
                  </div>
                  <Badge variant={event.status === "live" ? "default" : "secondary"}>
                    {statusLabel[event.status]}
                  </Badge>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
