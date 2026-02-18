import { ReactNode } from "react";

export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <div className="hero-animate">
      {children}
    </div>
  );
}
