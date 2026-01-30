import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { SportsModes } from "@/components/landing/SportsModes";
import { Pricing } from "@/components/landing/Pricing";
import { Footer } from "@/components/landing/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Hero />
        <section id="features">
          <Features />
        </section>
        <section id="sports-modes">
          <SportsModes />
        </section>
        <Pricing />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
