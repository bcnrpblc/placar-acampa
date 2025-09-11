import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminPanel } from "@/components/AdminPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import type { User, Session } from '@supabase/supabase-js';

const AdminDashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer admin check to avoid blocking auth state changes
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

    // THEN check for existing session
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
      const { data, error } = await supabase.rpc('is_admin');
      
      if (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      } else {
        setIsAdmin(data === true);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-camp-cyan mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verificando Autenticação...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center p-4 relative">
        {/* Background Geometric Shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 right-20 text-camp-pink opacity-10 text-9xl">★</div>
          <div className="absolute bottom-40 left-20 text-camp-pink opacity-5 text-6xl">➤</div>
          <div className="absolute top-1/2 right-10 text-camp-pink opacity-10 text-7xl">★</div>
        </div>

        <div className="w-full max-w-md relative z-10">
          <Button
            onClick={() => navigate('/')}
            variant="outline"
            size="sm"
            className="mb-6 bg-card/50 backdrop-blur-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Placar
          </Button>

          <Card className="bg-card/50 backdrop-blur-sm border-camp-cyan/20">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-4 rounded-full bg-camp-cyan/10">
                <Lock className="w-8 h-8 text-camp-cyan" />
              </div>
              <CardTitle className="text-2xl font-bold bg-gradient-camp bg-clip-text text-transparent">
                Autenticação Obrigatória
              </CardTitle>
              <p className="text-muted-foreground">
                Por favor, faça login para acessar o painel de administração
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={() => navigate('/auth')}
                className="w-full bg-camp-cyan text-camp-dark hover:bg-camp-cyan/90"
              >
                Vá para o Login
              </Button>
              
              <div className="text-center text-xs text-muted-foreground">
                Acesso somente para administradores autorizados
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center p-4 relative">
        {/* Background Geometric Shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 right-20 text-camp-pink opacity-10 text-9xl">★</div>
          <div className="absolute bottom-40 left-20 text-camp-pink opacity-5 text-6xl">➤</div>
          <div className="absolute top-1/2 right-10 text-camp-pink opacity-10 text-7xl">★</div>
        </div>

        <div className="w-full max-w-md relative z-10">
          <Button
            onClick={() => navigate('/')}
            variant="outline"
            size="sm"
            className="mb-6 bg-card/50 backdrop-blur-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Placar
          </Button>

          <Card className="bg-card/50 backdrop-blur-sm border-camp-cyan/20">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-4 rounded-full bg-red-500/10">
                <Lock className="w-8 h-8 text-red-500" />
              </div>
              <CardTitle className="text-2xl font-bold text-red-400">
                Acesso Negado
              </CardTitle>
              <p className="text-muted-foreground">
                Você não tem privilégios de administrador
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Logado como: {user.email}
              </p>
              
              <div className="flex gap-2">
                <Button 
                  onClick={() => navigate('/')}
                  variant="outline"
                  className="flex-1"
                >
                  Voltar ao Placar
                </Button>
                
                <Button 
                  onClick={() => supabase.auth.signOut()}
                  variant="outline"
                  className="flex-1"
                >
                  Sign Out
                </Button>
              </div>
              
              <div className="text-center text-xs text-muted-foreground">
                Contate o Flavio Angeleu para solicitar acesso
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return <AdminPanel onBack={() => navigate('/')} />;

};

export default AdminDashboard;