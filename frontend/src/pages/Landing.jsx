import CardsSection from "../components/Card";
import Fonctionality from "../components/Fonctionality";
import Footer from "../components/Footer";
import Header from "../components/Header";
import News from "../components/News";
import Pricing from "../components/Pricing"; // new, see step 3

export default function LandingPage() {
  return (
    <>
      <Header />

      <section id="accueil" className="scroll-mt-20">
        <CardsSection />
      </section>

      <section id="fonctionnalites" className="scroll-mt-20">
        <Fonctionality />
      </section>

      <section id="tarifs" className="scroll-mt-20">
        <Pricing />
      </section>

      <section id="impact" className="scroll-mt-20">
        <News />
      </section>

      <section id="contact" className="scroll-mt-20">
        <Footer />
      </section>
    </>
  );
}