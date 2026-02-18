import { motion } from "framer-motion";
import logoImg from "@/assets/logo.png";

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

export function Logo({
  size = "md",
  showText = true,
  className = "",
}: LogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <motion.img
        src={logoImg}
        alt="Khas Padel Club"
        className={`${sizeClasses[size]} object-contain`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      />

      {showText && (
        <span
          className={`font-display font-bold ${textSizeClasses[size]} text-foreground leading-tight whitespace-nowrap`}
        >
          Khas Padel Club
        </span>
      )}
    </div>
  );
}
