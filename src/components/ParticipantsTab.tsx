import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { parseCsv } from "@/lib/csv";
import { nameKey } from "@/lib/slug";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Download, Plus, Trash2, Upload } from "lucide-react";

type Player = Tables<"players">;
type Team = Tables<"teams">;

interface Row {
  name: string;
  key: string;
  teamId: string | null;
  teamText: string;
}

interface Preview {
  fresh: Row[];
  existing: string[];
  dupInFile: string[];
  newTeams: string[];
  extraColumns: string[];
}

const NO_TEAM = "__none__";
const PALETTE = ["#3b82f6", "#ef4444", "#22c55e", "#eab308", "#a855f7", "#f97316", "#ec4899", "#14b8a6"];

const initials = (name: string) => {
  const w = name.trim().split(/\s+/);
  return ((w[0]?.[0] ?? "") + (w.length > 1 ? w[w.length - 1][0] : "")).toUpperCase();
};

const downloadTemplate = () => {
  const csv = "﻿nome,time\nMaria Silva,Azul\nJoão Souza,Vermelho\n";
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  a.download = "modelo-participantes.csv";
  a.click();
  URL.revokeObjectURL(a.href);
};

export const ParticipantsTab = ({
  eventId,
  teams,
  readonly,
  onTeamsChanged,
}: {
  eventId: string;
  teams: Team[];
  readonly: boolean;
  onTeamsChanged: () => void;
}) => {
  const { toast } = useToast();
  const [players, setPlayers] = useState<Player[]>([]);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [importing, setImporting] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTeam, setNewTeam] = useState(NO_TEAM);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("players")
      .select("*")
      .eq("event_id", eventId)
      .order("name");
    setPlayers(data ?? []);
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  const teamByKey = useMemo(
    () => new Map(teams.map((t) => [nameKey(t.name), t.id])),
    [teams]
  );

  const onFile = async (file: File) => {
    const rows = parseCsv(await file.text());
    const header = (rows[0] ?? []).map((h) => nameKey(h));
    const nameCol = header.findIndex((h) => ["nome", "name"].includes(h));
    if (nameCol < 0) {
      toast({
        title: "Coluna 'nome' não encontrada",
        description: "A primeira linha precisa ter o cabeçalho 'nome' (use o modelo).",
        variant: "destructive",
      });
      return;
    }
    const teamCol = header.findIndex((h) => ["time", "equipe", "team"].includes(h));
    const extraColumns = (rows[0] ?? []).filter(
      (_, i) => i !== nameCol && i !== teamCol && (rows[0][i] ?? "").trim() !== ""
    );

    const existingKeys = new Set(players.map((p) => p.name_key));
    const seen = new Set<string>();
    const fresh: Row[] = [];
    const existing: string[] = [];
    const dupInFile: string[] = [];
    const newTeams = new Map<string, string>();

    for (const r of rows.slice(1)) {
      const name = (r[nameCol] ?? "").trim().replace(/\s+/g, " ");
      if (!name) continue;
      const key = nameKey(name);
      if (existingKeys.has(key)) { existing.push(name); continue; }
      if (seen.has(key)) { dupInFile.push(name); continue; }
      seen.add(key);
      const teamText = teamCol >= 0 ? (r[teamCol] ?? "").trim() : "";
      const teamId = teamText ? teamByKey.get(nameKey(teamText)) ?? null : null;
      if (teamText && !teamId) newTeams.set(nameKey(teamText), teamText);
      fresh.push({ name, key, teamId, teamText });
    }
    setPreview({ fresh, existing, dupInFile, newTeams: [...newTeams.values()], extraColumns });
  };

  const confirmImport = async () => {
    if (!preview || preview.fresh.length === 0) return;
    setImporting(true);

    // Create teams that appear in the sheet but not in the event.
    const ids = new Map(teamByKey);
    if (preview.newTeams.length) {
      const { data: created, error: teamError } = await supabase
        .from("teams")
        .insert(
          preview.newTeams.map((name, i) => ({
            event_id: eventId,
            name,
            color: PALETTE[(teams.length + i) % PALETTE.length],
          }))
        )
        .select("id, name");
      if (teamError || !created) {
        setImporting(false);
        toast({ title: "Erro ao criar times", description: teamError?.message, variant: "destructive" });
        return;
      }
      created.forEach((t) => ids.set(nameKey(t.name), t.id));
      onTeamsChanged();
    }

    const { error } = await supabase.from("players").insert(
      preview.fresh.map((r) => ({
        event_id: eventId,
        name: r.name,
        name_key: r.key,
        team_id: r.teamText ? ids.get(nameKey(r.teamText)) ?? null : null,
      }))
    );
    setImporting(false);
    if (error) {
      toast({ title: "Erro ao importar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `${preview.fresh.length} participantes importados` });
    setPreview(null);
    load();
  };

  const setTeam = async (player: Player, value: string) => {
    const team_id = value === NO_TEAM ? null : value;
    const { error } = await supabase.from("players").update({ team_id }).eq("id", player.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    load();
  };

  const addPlayer = async () => {
    const name = newName.trim().replace(/\s+/g, " ");
    if (!name) return;
    const { error } = await supabase.from("players").insert({
      event_id: eventId,
      name,
      name_key: nameKey(name),
      team_id: newTeam === NO_TEAM ? null : newTeam,
    });
    if (error) {
      toast({
        title: error.code === "23505" ? "Já existe um participante com esse nome" : "Erro",
        description: error.code === "23505" ? undefined : error.message,
        variant: "destructive",
      });
      return;
    }
    setNewName("");
    load();
  };

  const uploadAvatar = async (player: Player, file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${eventId}/players/${player.id}-${Date.now()}.${ext}`;
    const { error: upError } = await supabase.storage
      .from("team-mascots")
      .upload(path, file, { upsert: true });
    if (upError) {
      toast({ title: "Upload falhou", description: upError.message, variant: "destructive" });
      return;
    }
    const { data } = supabase.storage.from("team-mascots").getPublicUrl(path);
    const { error } = await supabase
      .from("players")
      .update({ avatar_url: data.publicUrl })
      .eq("id", player.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    load();
  };

  const remove = async (player: Player) => {
    const { error } = await supabase.from("players").delete().eq("id", player.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    load();
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card className="bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Importar planilha</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Colunas: <b>nome</b> (obrigatória) e <b>time</b> (opcional). Times que ainda não
            existem no evento são criados. Outras colunas são ignoradas. No Google Sheets:
            importe o modelo e depois Arquivo → Fazer download → CSV.
          </p>
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="w-4 h-4 mr-2" />
            Baixar modelo (CSV)
          </Button>
          <Input
            type="file"
            accept=".csv,text/csv"
            disabled={readonly}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
              e.target.value = "";
            }}
          />

          {!readonly && (
            <div className="space-y-2 border-t pt-4">
              <p className="text-sm font-medium">Adicionar participante</p>
              <div className="flex gap-2">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nome"
                  onKeyDown={(e) => e.key === "Enter" && addPlayer()}
                />
                <Select value={newTeam} onValueChange={setNewTeam}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_TEAM}>Sem time</SelectItem>
                    {teams.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={addPlayer} disabled={!newName.trim()}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {preview && (
            <div className="rounded-md border p-3 space-y-2 text-sm">
              <p><b>{preview.fresh.length}</b> novos participantes serão adicionados.</p>
              {preview.existing.length > 0 && (
                <p className="text-muted-foreground">
                  {preview.existing.length} já cadastrados (ignorados): {preview.existing.slice(0, 5).join(", ")}
                  {preview.existing.length > 5 && "…"}
                </p>
              )}
              {preview.dupInFile.length > 0 && (
                <p className="text-amber-500">
                  {preview.dupInFile.length} nomes repetidos na planilha (ignorados):{" "}
                  {preview.dupInFile.slice(0, 5).join(", ")}. Duas pessoas com o mesmo nome
                  precisam de nomes diferentes (ex.: "João Silva B").
                </p>
              )}
              {preview.newTeams.length > 0 && (
                <p className="text-camp-cyan">
                  Times que serão criados: {preview.newTeams.join(", ")}
                </p>
              )}
              {preview.extraColumns.length > 0 && (
                <p className="text-muted-foreground">
                  Colunas ignoradas: {preview.extraColumns.join(", ")}
                </p>
              )}
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={confirmImport} disabled={importing || preview.fresh.length === 0}>
                  <Upload className="w-4 h-4 mr-2" />
                  Importar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setPreview(null)}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Participantes ({players.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 max-h-[32rem] overflow-y-auto">
          {players.map((p) => (
            <div key={p.id} className="flex items-center gap-2">
              <Avatar className="w-9 h-9 shrink-0">
                <AvatarImage src={p.avatar_url ?? undefined} alt="" />
                <AvatarFallback
                  className="text-white text-xs font-bold"
                  style={{
                    backgroundColor: teams.find((t) => t.id === p.team_id)?.color ?? "#64748b",
                  }}
                >
                  {initials(p.name)}
                </AvatarFallback>
              </Avatar>
              <span className="flex-1 truncate">{p.name}</span>
              {!readonly && (
                <label className="cursor-pointer" title="Enviar foto">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadAvatar(p, f);
                      e.target.value = "";
                    }}
                  />
                  <Upload className="w-4 h-4 text-camp-cyan" />
                </label>
              )}
              <Select
                value={p.team_id ?? NO_TEAM}
                onValueChange={(v) => setTeam(p, v)}
                disabled={readonly}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_TEAM}>Sem time</SelectItem>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!readonly && (
                <Button size="icon" variant="ghost" onClick={() => remove(p)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              )}
            </div>
          ))}
          {players.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum participante ainda.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
