// components/About.jsx
const problems = [
  {
    title: "Un suivi encore manuel",
    text: "Le budget et l’avancement technique d’un chantier se gèrent souvent sur papier ou dans des fichiers dispersés, ce qui retarde la détection des dérives.",
  },
  {
    title: "Des outils inadaptés",
    text: "MS Project et Primavera sont puissants, mais coûteux et peu adaptés aux PME, aux bureaux d’études et aux APC en Algérie.",
  },
  {
    title: "Une digitalisation à ses débuts",
    text: "Le secteur du BTP algérien commence tout juste sa transition numérique : le besoin d’un outil simple et local est réel.",
  },
];

const audiences = [
  "PME du BTP",
  "Bureaux d’études",
  "Collectivités (APC)",
  "Promoteurs privés",
];

export default function About() {
  return (
    <section id="apropos" className="w-full bg-[#F1F7FE] px-6 py-16 md:py-24 scroll-mt-20">
      <div className="max-w-7xl mx-auto">
        <header className="max-w-3xl mb-12 md:mb-16">
          <p className="text-sm font-bold uppercase text-[#E67E22] mb-3">BuildTrack</p>
          <h1 className="text-4xl md:text-5xl font-extrabold text-[#1A365D] leading-tight mb-5">
            À propos
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed">
          Notre plateforme permet de suivre en temps réel l’avancement et le
          budget des projets de bâtiment : planning de type Gantt, coûts réels
          et prévus, alertes automatiques et rapports journaliers, le tout
          dans une interface simple et accessible.
          </p>
        </header>

        <div className="grid md:grid-cols-3 gap-6">
          {problems.map((p) => (
            <article
              key={p.title}
              className="bg-white border border-slate-100 rounded-2xl p-6 md:p-8 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
            >
              <h2 className="text-xl font-bold text-[#1A365D] mb-3">{p.title}</h2>
              <p className="text-slate-600 text-sm leading-relaxed">{p.text}</p>
            </article>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-10 md:gap-16 mt-12 md:mt-16 border-t border-blue-100 pt-10 md:pt-12">
          <article>
            <h2 className="text-2xl font-bold text-[#1A365D] mb-4">Notre approche</h2>
            <p className="text-slate-600 leading-relaxed">
              Nous utilisons la méthode Earned Value Management (EVM) pour
              comparer l’avancement réel au planning prévu, et nous y ajoutons
              l’intelligence artificielle pour anticiper les retards et les
              dépassements budgétaires avant qu’ils ne surviennent. L’outil est
              adapté aux normes et aux pratiques du marché algérien, avec une
              version gratuite pour démarrer.
            </p>
          </article>

          <article>
            <h2 className="text-2xl font-bold text-[#1A365D] mb-4">À qui s’adresse-t-il ?</h2>
            <ul className="flex flex-wrap gap-3">
              {audiences.map((a) => (
                <li
                  key={a}
                  className="px-4 py-2 rounded-full bg-white border border-blue-100 text-[#1A365D] text-sm font-medium"
                >
                  {a}
                </li>
              ))}
            </ul>
          </article>
        </div>
      </div>
    </section>
  );
}