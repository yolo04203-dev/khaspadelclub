import {
  Trophy,
  Users,
  Swords,
  BarChart3,
  Bell,
  Medal,
  Layers,
  Smartphone,
} from "lucide-react";

const features = [
  {
    icon: Trophy,
    title: "Ladder Rankings",
    description: "Real-time rankings with dynamic position tracking. Challenge teams above you and climb the ladder.",
  },
  {
    icon: Swords,
    title: "Challenge System",
    description: "Issue challenges to eligible opponents. Accept or decline with automated scheduling.",
  },
  {
    icon: Layers,
    title: "Multiple Modes",
    description: "Ladder, Americano, and Tournament modes. Switch between formats seamlessly.",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description: "Track performance metrics, match history, and engagement stats at a glance.",
  },
  {
    icon: Medal,
    title: "Badges & Achievements",
    description: "Earn recognition for milestones. Most Active, Top Performer, and more.",
  },
  {
    icon: Bell,
    title: "Smart Notifications",
    description: "Stay updated with challenge alerts, match reminders, and ranking changes.",
  },
  {
    icon: Users,
    title: "Team Management",
    description: "Create teams, assign players, and track collective performance.",
  },
  {
    icon: Smartphone,
    title: "Native Mobile App",
    description: "Full-featured iOS and Android apps for on-the-go access.",
  },
];

export function Features() {
  return (
    <section className="py-24 bg-secondary/30">
      <div className="container">
        <div className="text-center mb-16 hero-animate">
          <span className="inline-block px-4 py-2 rounded-full bg-accent/10 text-accent font-medium text-sm mb-4">
            Features
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Everything You Need to Compete
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            A complete platform for managing padel sports competitions, from casual matches to organized tournaments.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className="group p-6 bg-card rounded-xl border border-border shadow-card hover:shadow-lg transition-all duration-300 hover:-translate-y-1 hero-animate"
              style={{ animationDelay: `${0.1 + i * 0.05}s` }}
            >
              <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
                <feature.icon className="w-6 h-6 text-accent" />
              </div>
              <h3 className="font-display text-lg font-semibold text-card-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
