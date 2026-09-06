import React from 'react';

const news = [
  {
    date: "04 Sept 2026",
    title: "Résidence El Bahdja",
    paragraph:
      "Le coulage de la dalle du 2ème étage a été finalisé cette semaine, marquant une nouvelle étape clé pour le projet.",
    icon: (
      <svg className="w-12 h-12 text-[#E67E22]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v12a2 2 0 01-2 2z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    )
  },
  {
    date: "01 Sept 2026",
    title: "Siège APC Aïn Témouchent",
    paragraph:
      "Les équipes ont poursuivi le passage des gaines électriques au rez-de-chaussée, en avance sur le planning initial.",
    icon: (
      <svg className="w-12 h-12 text-[#E67E22]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    )
  },
  {
    date: "28 Août 2026",
    title: "Résidence El Bahdja",
    paragraph:
      "Une visite de contrôle qualité a été réalisée avec l'ingénieur suivi, confirmant la conformité du ferraillage réalisé.",
    icon: (
      <svg className="w-12 h-12 text-[#E67E22]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }
];

const News = () => {
  return (
    <section className="w-full bg-[#F1F7FE] py-20 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Section Heading */}
        <h2 className="text-3xl font-bold text-[#1A365D] mb-12 text-left">
          Actualités des projets
        </h2>

        {/* Grid Container */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {news.map((item, index) => (
            <div
              key={index}
              className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-start text-left transition-all hover:shadow-md hover:-translate-y-1"
            >
              {/* Icon Container */}
              <div className="mb-6">
                {item.icon}
              </div>

              {/* Date */}
              <span className="text-sm font-semibold text-[#E67E22] mb-2">
                {item.date}
              </span>

              {/* Title */}
              <h3 className="text-xl font-bold text-[#1A365D] mb-3">
                {item.title}
              </h3>

              {/* Paragraph */}
              <p className="text-slate-500 text-sm leading-relaxed">
                {item.paragraph}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default News;