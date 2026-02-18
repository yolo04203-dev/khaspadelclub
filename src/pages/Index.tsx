import { lazy, Suspense } from "react";
import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";

// Lazy-load below-the-fold sections to speed up FCP
const Features = lazy(() => import("@/components/landing/Features").then(m => ({ default: m.Features })));
const SportsModes = lazy(() => import("@/components/landing/SportsModes").then(m => ({ default: m.SportsModes })));
const Footer = lazy(() => import("@/components/landing/Footer").then(m => ({ default: m.Footer })));

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Hero />
        <Suspense fallback={<div className="h-96" />}>
          <section id="features">
            <Features />
          </section>
          <section id="sports-modes">
            <SportsModes />
          </section>
        </Suspense>
      </main>
      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </div>
  );
};

export default Index;
