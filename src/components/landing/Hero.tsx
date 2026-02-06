import { motion } from "framer-motion";
import { ArrowRight, Trophy, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export function Hero() {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate("/auth");
  };

  const handleViewDemo = () => {
    navigate("/ladders");
  };

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-hero" />
      
      {/* Grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32' fill='none' stroke='white'%3e%3cpath d='m0 .5h31.5v31.5'/%3e%3c/svg%3e")`,
        }}
      />
      
      {/* Accent glow */}
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
      
      <div className="container relative z-10 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-primary-foreground"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/20 text-accent mb-6"
            >
              <Zap className="w-4 h-4" />
              <span className="text-sm font-medium">Real-time Competition Tracking</span>
            </motion.div>

            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              Elevate Your{" "}
              <span className="text-accent">Paddle</span>{" "}
              Game
            </h1>
            
            <p className="text-lg md:text-xl text-primary-foreground/80 mb-8 max-w-lg">
              The ultimate leaderboard platform for paddle sports academies. 
              Track rankings, issue challenges, and compete in real-time.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <Button 
                size="lg" 
                className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-glow"
                onClick={handleGetStarted}
              >
                Get Started <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10"
                onClick={handleViewDemo}
              >
                View Demo
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6">
              {[
                { icon: Users, value: "500+", label: "Active Players" },
                { icon: Trophy, value: "50+", label: "Tournaments" },
                { icon: Zap, value: "1000+", label: "Matches" },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                  className="text-center sm:text-left"
                >
                  <stat.icon className="w-5 h-5 text-accent mb-2 mx-auto sm:mx-0" />
                  <div className="font-display text-2xl font-bold">{stat.value}</div>
                  <div className="text-sm text-primary-foreground/60">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Illustration - Mock leaderboard card */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="hidden lg:block"
          >
            <div className="relative">
              {/* Main card */}
              <div className="bg-card rounded-2xl shadow-2xl p-6 border border-border/50">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-display text-lg font-semibold text-card-foreground">Live Rankings</h3>
                  <span className="px-3 py-1 text-xs font-medium rounded-full bg-accent/10 text-accent">
                    Ladder Mode
                  </span>
                </div>
                
                {/* Mock rankings */}
                {[
                  { rank: 1, name: "Team Alpha", points: 2450, change: "+2" },
                  { rank: 2, name: "The Aces", points: 2380, change: "0" },
                  { rank: 3, name: "Paddle Kings", points: 2290, change: "-1" },
                  { rank: 4, name: "Net Blazers", points: 2180, change: "+3" },
                ].map((team, i) => (
                  <motion.div
                    key={team.name}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.1 }}
                    className={`flex items-center gap-4 p-3 rounded-lg mb-2 ${
                      i === 0 ? "bg-accent/10 border border-accent/20" : "bg-muted/50"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-display font-bold text-sm ${
                      i === 0 ? "rank-gold text-white" : 
                      i === 1 ? "rank-silver text-white" : 
                      i === 2 ? "rank-bronze text-white" : 
                      "bg-muted text-muted-foreground"
                    }`}>
                      {team.rank}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-card-foreground">{team.name}</div>
                      <div className="text-xs text-muted-foreground">{team.points} pts</div>
                    </div>
                    <span className={`text-sm font-medium ${
                      team.change.startsWith("+") ? "text-ladder-up" : 
                      team.change.startsWith("-") ? "text-ladder-down" : 
                      "text-muted-foreground"
                    }`}>
                      {team.change}
                    </span>
                  </motion.div>
                ))}
              </div>

              {/* Floating badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8 }}
                className="absolute -top-4 -right-4 bg-accent text-accent-foreground px-4 py-2 rounded-full shadow-lg font-display font-semibold text-sm"
              >
                🏆 Challenge Now
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
