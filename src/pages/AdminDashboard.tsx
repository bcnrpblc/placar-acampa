import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminPanel } from "@/components/AdminPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Lock, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const AdminDashboard = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [showPasscode, setShowPasscode] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const ADMIN_PASSCODE = "##Jesus";

  const handleLogin = async () => {
    setLoading(true);
    
    // Simple client-side passcode check
    if (passcode === ADMIN_PASSCODE) {
      setIsAuthenticated(true);
      toast({
        title: "Access Granted",
        description: "Welcome to the admin dashboard!",
      });
    } else {
      toast({
        title: "Access Denied",
        description: "Invalid passcode. Please try again.",
        variant: "destructive"
      });
      setPasscode("");
    }
    
    setLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  if (isAuthenticated) {
    return <AdminPanel onBack={() => navigate('/')} />;
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
          Back to Leaderboard
        </Button>

        <Card className="bg-card/50 backdrop-blur-sm border-camp-cyan/20">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-4 rounded-full bg-camp-cyan/10">
              <Lock className="w-8 h-8 text-camp-cyan" />
            </div>
            <CardTitle className="text-2xl font-bold bg-gradient-camp bg-clip-text text-transparent">
              Admin Access
            </CardTitle>
            <p className="text-muted-foreground">
              Enter the passcode to access the judge panel
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="passcode">Passcode</Label>
              <div className="relative">
                <Input
                  id="passcode"
                  type={showPasscode ? "text" : "password"}
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter admin passcode..."
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPasscode(!showPasscode)}
                >
                  <Eye className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <Button 
              onClick={handleLogin}
              disabled={loading || !passcode}
              className="w-full bg-camp-cyan text-camp-dark hover:bg-camp-cyan/90"
            >
              {loading ? "Verifying..." : "Access Admin Panel"}
            </Button>

            <div className="text-center text-xs text-muted-foreground">
              For authorized judges only
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;