import { motion } from "framer-motion";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-14 h-14",
};

const textSizeClasses = {
  sm: "text-lg",
  md: "text-xl",
  lg: "text-2xl",
};

export function Logo({ size = "md", showText = true, className = "" }: LogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <motion.div 
        className={`${sizeClasses[size]} relative`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {/* Paddle icon - stylized */}
        <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          {/* Main paddle shape */}
          <ellipse 
            cx="24" 
            cy="18" 
            rx="14" 
            ry="16" 
            className="fill-primary"
          />
          {/* Handle */}
          <rect 
            x="21" 
            y="32" 
            width="6" 
            height="14" 
            rx="2" 
            className="fill-primary"
          />
          {/* Ball indicator */}
          <circle 
            cx="30" 
            cy="12" 
            r="5" 
            className="fill-accent"
          />
          {/* Accent line */}
          <path 
            d="M14 18 Q24 8 34 18" 
            strokeWidth="2" 
            strokeLinecap="round"
            className="stroke-accent fill-none"
          />
        </svg>
      </motion.div>
      
      {showText && (
        <div className="flex flex-col">
          <span className={`font-display font-bold ${textSizeClasses[size]} text-foreground leading-tight`}>
            Paddle
          </span>
          <span className={`font-display font-medium text-xs uppercase tracking-widest text-muted-foreground`}>
            Leaderboard
          </span>
        </div>
      )}
    </div>
  );
}
