import About from "../components/About";
import Header from "../components/Header";

export default function AboutPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-white">
        <About />
      </main>
    </>
  );
}