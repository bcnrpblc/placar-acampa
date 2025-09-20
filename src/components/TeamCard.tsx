import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import * as React from "react";

export interface Team {
  id: string;
  name: string;
  color: string;
  avatar_url?: string;
  total_points: number;
  top_players?: Array<{
    id: string;
    name: string;
    points: number;
  }>;
}

interface TeamCardProps {
  team: Team;
  rank: number;
  isLeader?: boolean;
  previousPoints?: number;
}

export const TeamCard = ({ team, rank, isLeader, previousPoints }: TeamCardProps) => {
  const [animatedPoints, setAnimatedPoints] = useState(previousPoints || team.total_points);
  const [isAnimating, setIsAnimating] = useState(false);

  // Animate points when they change
  useEffect(() => {
    if (previousPoints !== undefined && previousPoints !== team.total_points) {
      setIsAnimating(true);
      const difference = team.total_points - previousPoints;
      const duration = 1000;
      const steps = 30;
      const increment = difference / steps;
      let currentStep = 0;

      const interval = setInterval(() => {
        currentStep++;
        setAnimatedPoints(Math.round(previousPoints + (increment * currentStep)));
        
        if (currentStep >= steps) {
          clearInterval(interval);
          setAnimatedPoints(team.total_points);
          setIsAnimating(false);
        }
      }, duration / steps);

      return () => clearInterval(interval);
    }
  }, [team.total_points, previousPoints]);

  const getTeamColorClass = (teamName: string) => {
    const name = teamName.toLowerCase();
    const colorMap: Record<string, string> = {
      blue: "team-blue",
      red: "team-red", 
      green: "team-green",
      yellow: "team-yellow",
      purple: "team-purple",
      orange: "team-orange",
      pink: "team-pink",
      black: "team-black",
      grey: "team-grey",
      brown: "team-brown"
    };
    return colorMap[name] || "camp-cyan";
  };

  const teamColorClass = getTeamColorClass(team.name);

  return (
    <Card 
      className={`
        relative overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:shadow-elevation
        ${isLeader ? 'animate-leader-glow' : ''}
        ${isAnimating ? 'animate-pulse-camp' : ''}
        bg-gradient-to-br from-card via-card to-card/50
        border-2 border-border hover:border-${teamColorClass}
      `}
      style={{
        '--leader-color': isLeader ? team.color : 'transparent'
      } as React.CSSProperties}
    >
      {/* Team Color Stripe - Removed */}
      
      {/* Rank Badge */}
      <div className="absolute top-4 right-4">
        <Badge variant={isLeader ? "default" : "secondary"} className="text-lg font-bold px-3 py-1">
          {rank === 1 && <Trophy className="w-4 h-4 mr-1" />}
          #{rank}
        </Badge>
      </div>

      <CardHeader className="pb-2">
        <div className="flex items-center gap-4">
          <Avatar className="w-16 h-16 border-2 border-current" style={{ borderColor: team.color }}>
            <AvatarImage src={team.avatar_url} alt={`${team.name} team avatar`} />
            <AvatarFallback className={`bg-${teamColorClass} text-white font-bold text-xl`}>
              {team.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h2 className="text-2xl font-bold" style={{ color: team.color }}>
              {team.name}
            </h2>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Points Display */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <TrendingUp className={`w-6 h-6 text-${teamColorClass}`} />
            <span className="text-lg font-semibold text-muted-foreground">Total Points</span>
          </div>
          <div className={`text-6xl font-black ${isAnimating ? 'animate-count-up' : ''}`} 
               style={{ color: team.color }}>
            {animatedPoints.toLocaleString()}
          </div>
        </div>

        {/* Top Players - Removed Entirely */}
      </CardContent>
    </Card>
  );
};