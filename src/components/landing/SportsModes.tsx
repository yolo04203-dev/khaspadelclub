import { TrendingUp, Shuffle, Trophy } from "lucide-react";

const modes = [
  {
    icon: TrendingUp,
    title: "Ladder Mode",
    description: "Traditional ranking system where teams climb by winning challenges against higher-ranked opponents.",
    highlights: ["Challenge up to 5 ranks higher", "Real-time position updates", "Protection periods after matches"],
    color: "accent",
  },
  {
    icon: Shuffle,
    title: "Americano Mode",
    description: "Casual format with rotating partners. Perfect for social play and mixing skill levels.",
    highlights: ["Randomized partner assignments", "Point accumulation over rounds", "Great for large groups"],
    color: "success",
  },
  {
    icon: Trophy,
    title: "Tournament Mode",
    description: "Structured competition with brackets. Single elimination, double elimination, or round-robin formats.",
    highlights: ["Visual bracket displays", "Automated progression", "Finals and consolation rounds"],
    color: "warning",
  },
];

export function SportsModes() {
  return (
    <section className="py-24">
      <div className="container">
        <div className="text-center mb-16 hero-animate">
          <span className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary font-medium text-sm mb-4">
            Competition Formats
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Three Ways to Compete
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Choose the format that fits your play style. Switch between modes anytime.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {modes.map((mode, i) => (
            <div
              key={mode.title}
              className="relative group hero-animate"
              style={{ animationDelay: `${0.1 + i * 0.1}s` }}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-accent/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="relative p-8 bg-card rounded-2xl border border-border shadow-card h-full">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 ${
                  mode.color === "accent" ? "bg-accent/10" :
                  mode.color === "success" ? "bg-success/10" :
                  "bg-warning/10"
                }`}>
                  <mode.icon className={`w-7 h-7 ${
                    mode.color === "accent" ? "text-accent" :
                    mode.color === "success" ? "text-success" :
                    "text-warning"
                  }`} />
                </div>
                
                <h3 className="font-display text-2xl font-bold text-card-foreground mb-3">
                  {mode.title}
                </h3>
                
                <p className="text-muted-foreground mb-6">
                  {mode.description}
                </p>
                
                <ul className="space-y-3">
                  {mode.highlights.map((highlight) => (
                    <li key={highlight} className="flex items-center gap-3 text-sm text-card-foreground">
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        mode.color === "accent" ? "bg-accent" :
                        mode.color === "success" ? "bg-success" :
                        "bg-warning"
                      }`} />
                      {highlight}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
