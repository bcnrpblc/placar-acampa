import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import PublicLeaderboard from "./pages/PublicLeaderboard";
import AdminDashboard from "./pages/AdminDashboard";
import DayReveal from "./pages/DayReveal";
import Auth from "./pages/Auth";
import RoleManager from "./pages/RoleManager";
import NotFound from "./pages/NotFound";
import GameReveal from './pages/GameReveal';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PublicLeaderboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/admin/roles" element={<RoleManager />} />
          <Route path="/reveal" element={<DayReveal />} />
          <Route path="/game-reveal" element={<GameReveal />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
