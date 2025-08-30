import { LiveLeaderboard } from "@/components/LiveLeaderboard";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { useState } from "react";
import { AdminPanel } from "@/components/AdminPanel";

const Index = () => {
  const [showAdmin, setShowAdmin] = useState(false);

  if (showAdmin) {
    return <AdminPanel onBack={() => setShowAdmin(false)} />;
  }

  return (
    <div className="relative">
      <LiveLeaderboard />
      
      {/* Admin Access Button */}
      <Button
        onClick={() => setShowAdmin(true)}
        className="fixed top-4 left-4 z-50 bg-card/80 backdrop-blur-sm hover:bg-card"
        variant="outline"
        size="sm"
      >
        <Settings className="w-4 h-4 mr-2" />
        Admin
      </Button>
    </div>
  );
};

export default Index;
