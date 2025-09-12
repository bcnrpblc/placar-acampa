import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Lock, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import type { User, Session } from '@supabase/supabase-js';

const Auth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Redirect authenticated users to admin
        if (session?.user) {
          navigate('/admin');
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        navigate('/admin');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Validation Error",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        toast({
          title: "Login Successful",
          description: "Welcome back!",
        });
      } else {
        const redirectUrl = `${window.location.origin}/`;
        
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl
          }
        });

        if (error) throw error;

        toast({
          title: "Account Created",
          description: "Please check your email to confirm your account.",
        });
      }
    } catch (error: any) {
      toast({
        title: isLogin ? "Login Failed" : "Sign Up Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive"
      });
    }
  };

  if (user) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center p-4">
        <Card className="bg-card/50 backdrop-blur-sm border-camp-cyan/20">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold bg-gradient-camp bg-clip-text text-transparent">
              Autenticado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-center">
              Você está logado(a) como: {user.email}
            </p>
            <div className="flex gap-2">
              <Button 
                onClick={() => navigate('/admin')} 
                className="bg-camp-cyan text-camp-dark hover:bg-camp-cyan/90"
              >
                Go to Admin
              </Button>
              <Button 
                onClick={handleSignOut}
                variant="outline"
              >
                Sair
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-dark flex items-center justify-center p-4 relative">
      {/* Background Geometric Shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 text-camp-pink opacity-10 text-9xl">★</div>
        <div className="absolute bottom-40 left-20 text-camp-pink opacity-5 text-6xl">➤</div>
        <div className="absolute top-1/2 right-10 text-camp-pink opacity-10 text-7xl">★</div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Back Button */}
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
              {isLogin ? "Admin Login" : "Create Account"}
            </CardTitle>
            <p className="text-muted-foreground">
              {isLogin ? "Sign in to access the admin panel" : "Create an admin account"}
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email..."
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Digite sua senha..."
                    className="pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <Button 
                type="submit"
                disabled={loading}
                className="w-full bg-camp-cyan text-camp-dark hover:bg-camp-cyan/90"
              >
                {loading ? "Carregando..." : (isLogin ? "Sign In" : "Sign Up")}
              </Button>

              <div className="text-center">
                <Button
                  type="button"
                  variant="link"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-camp-cyan"
                >
                  {isLogin ? "Precisa de uma conta? Cadastre-se" : "Já tem uma conta? Entrar"}
                </Button>
              </div>
            </form>

            <div className="text-center text-xs text-muted-foreground mt-4">
              Somente para pessoas autorizadas
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;