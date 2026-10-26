import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Users, Shield, ShieldCheck, ShieldX, UserPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import type { User, Session } from '@supabase/supabase-js';
import { isSuperadminEmail } from "@/lib/auth";

interface AuthUser {
  id: string;
  email: string;
  created_at: string;
}

interface UserWithRole extends AuthUser {
  is_admin: boolean;
  is_superadmin: boolean;
}

const RoleManager = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteAdmin, setInviteAdmin] = useState(true);
  const [inviting, setInviting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            checkAdminStatus(session.user.id);
          }, 0);
        } else {
          setIsAdmin(false);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        checkAdminStatus(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdminStatus = async (userId: string) => {
    try {
      const { data, error } = await supabase.rpc('is_superadmin');
      
      if (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      } else {
        setIsAdmin(data === true);
        if (data === true) {
          fetchUsers();
        }
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Falha ao carregar usuários"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      // Get all profiles (which are created for each user)
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, created_at');
      
      if (profilesError) throw profilesError;

      // Get all user roles
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (roleError) throw roleError;

      const usersWithRoles = (profilesData ?? []).map(profile => {
        const email = profile.email || 'No email';
        return {
          id: profile.id,
          email,
          created_at: profile.created_at,
          is_admin: (roleData ?? []).some(
            role => role.user_id === profile.id && role.role === 'admin'
          ),
          is_superadmin: isSuperadminEmail(email),
        };
      });

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Falha ao carregar usuários"
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  const inviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    try {
      const { data, error } = await supabase.functions.invoke('invite-user', {
        body: { email: inviteEmail.trim(), admin: inviteAdmin, redirectTo: `${window.location.origin}/auth` },
      });
      if (error) {
        // non-2xx: the function's message is in the response body
        const body = await (error as { context?: Response }).context?.json?.().catch(() => null);
        throw new Error(body?.error ?? 'Falha ao enviar o convite');
      }
      if (!data?.ok) throw new Error(data?.error ?? 'Falha ao enviar o convite');
      toast({ title: "Convite enviado", description: inviteEmail.trim() });
      setInviteEmail('');
      fetchUsers();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error instanceof Error ? error.message : "Falha ao enviar o convite",
      });
    } finally {
      setInviting(false);
    }
  };

  const toggleAdminRole = async (target: UserWithRole) => {
    if (target.is_superadmin && target.is_admin) {
      toast({
        variant: "destructive",
        title: "Não permitido",
        description: "A conta superadmin não pode ser rebaixada",
      });
      return;
    }

    try {
      if (target.is_admin) {
        const { data, error } = await supabase.rpc('admin_remove_role', {
          target_user_id: target.id,
          role_to_remove: 'admin',
        });

        if (error) throw error;
        if (!data) throw new Error("Operação não permitida");

        toast({
          title: "Sucesso",
          description: "Acesso de administrador removido",
        });
      } else {
        const { data, error } = await supabase.rpc('admin_add_role', {
          target_user_id: target.id,
          role_to_add: 'admin',
        });

        if (error) throw error;
        if (!data) throw new Error("Operação não permitida");

        toast({
          title: "Sucesso",
          description: "Acesso de administrador concedido",
        });
      }

      fetchUsers();
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Falha ao atualizar o papel do usuário",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-camp-cyan mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center p-4">
        <Card className="bg-card/50 backdrop-blur-sm border-camp-cyan/20">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-4 rounded-full bg-red-500/10">
              <ShieldX className="w-8 h-8 text-red-500" />
            </div>
            <CardTitle className="text-2xl font-bold text-red-400">
              Acesso Negado
            </CardTitle>
            <p className="text-muted-foreground">
              Somente o superadmin pode gerenciar usuários e papéis
            </p>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => navigate('/admin')}
              className="w-full bg-camp-cyan text-camp-dark hover:bg-camp-cyan/90"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Painel Admin
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-dark p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button
            onClick={() => navigate('/admin')}
            variant="outline"
            size="sm"
            className="mb-4 bg-card/50 backdrop-blur-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Painel Admin
          </Button>
          
          <Card className="bg-card/50 backdrop-blur-sm border-camp-cyan/20 mb-6">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-camp-cyan/10">
                  <UserPlus className="w-6 h-6 text-camp-cyan" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold">Convidar usuário</CardTitle>
                  <p className="text-muted-foreground text-sm">
                    A pessoa recebe um e-mail e define a própria senha
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={inviteUser} className="space-y-3">
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                  required
                />
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={inviteAdmin} onCheckedChange={(v) => setInviteAdmin(v === true)} />
                  Conceder acesso de administrador
                </label>
                <Button
                  type="submit"
                  disabled={inviting}
                  className="bg-camp-cyan text-camp-dark hover:bg-camp-cyan/90"
                >
                  {inviting ? 'Enviando...' : 'Enviar convite'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-camp-cyan/20">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-camp-cyan/10">
                  <Users className="w-6 h-6 text-camp-cyan" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold bg-gradient-camp bg-clip-text text-transparent">
                    Gerenciar Papéis
                  </CardTitle>
                  <p className="text-muted-foreground text-sm">
                    Gerencie o acesso de administrador dos usuários
                  </p>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              {loadingUsers ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-camp-cyan mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Carregando usuários...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {users.map((userData) => (
                    <div 
                      key={userData.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-card/30 border border-border/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-muted">
                          {userData.is_admin ? (
                            <ShieldCheck className="w-4 h-4 text-camp-cyan" />
                          ) : (
                            <Shield className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{userData.email}</p>
                          <p className="text-xs text-muted-foreground">
                            {userData.is_superadmin
                              ? 'Superadmin'
                              : userData.is_admin
                                ? 'Administrador'
                                : 'Usuário comum'}
                          </p>
                        </div>
                      </div>
                      
                      <Button
                        onClick={() => toggleAdminRole(userData)}
                        variant={userData.is_admin ? "destructive" : "default"}
                        size="sm"
                        disabled={userData.is_superadmin}
                        className={userData.is_admin 
                          ? "" 
                          : "bg-camp-cyan text-camp-dark hover:bg-camp-cyan/90"
                        }
                      >
                        {userData.is_superadmin
                          ? 'Protegido'
                          : userData.is_admin
                            ? 'Remover Admin'
                            : 'Tornar Admin'}
                      </Button>
                    </div>
                  ))}
                  
                  {users.length === 0 && (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">Nenhum usuário encontrado</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default RoleManager;