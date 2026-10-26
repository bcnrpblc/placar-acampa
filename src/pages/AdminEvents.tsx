import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Settings } from "lucide-react";
import { useIsSuperadmin } from "@/lib/useIsSuperadmin";

type EventRow = Tables<"events">;

const AdminEvents = () => {
  const [events, setEvents] = useState<EventRow[]>([]);
  const navigate = useNavigate();
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

        <Button size="lg" className="h-14 w-full text-base" onClick={() => navigate("/admin/new")}>
          <Plus className="w-5 h-5 mr-2" />
          Criar novo evento
        </Button>

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
