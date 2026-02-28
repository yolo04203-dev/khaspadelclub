import logoImg from "@/assets/logo.png";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  showImage?: boolean;
  hideTextOnMobile?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "w-10 h-10",
  md: "w-13 h-13",
  lg: "w-18 h-18",
};

const textSizeClasses = {
  sm: "text-xl",
  md: "text-2xl",
  lg: "text-3xl",
};

export function Logo({
  size = "md",
  showText = true,
  showImage = true,
  hideTextOnMobile = true,
  className = "",
}: LogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {showImage && (
        <img
          src={logoImg}
          alt="Khas Padel Club"
          decoding="async"
          fetchPriority="high"
          width={size === "lg" ? 72 : size === "md" ? 52 : 40}
          height={size === "lg" ? 72 : size === "md" ? 52 : 40}
          className={`${sizeClasses[size]} object-contain transition-transform duration-150 hover:scale-105 active:scale-95`}
        />
      )}

      {showText && (
        <span
          className={`font-display font-bold ${textSizeClasses[size]} text-foreground leading-tight whitespace-nowrap ${hideTextOnMobile ? "hidden sm:inline" : ""}`}
        >
          Khas Padel Club
        </span>
      )}
    </div>
  );
}
