import React from 'react';

const features = [
  {
    title: "Suivi Projets",
    description: "Visualisation en temps réel de l'avancement des tâches.",
    icon: (
      <svg className="w-12 h-12 text-[#E67E22]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 11a2 2 0 100-4 2 2 0 000 4z" />
      </svg>
    )
  },
  {
    title: "Gestion Budget",
    description: "Contrôle des dépenses, suivi budgétaire et dépassements.",
    icon: (
      <svg className="w-12 h-12 text-[#E67E22]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
  {
    title: "Prévisions IA",
    description: "Estimations intelligentes et anticipations des financiers et délais.",
    icon: (
      <svg className="w-12 h-12 text-[#E67E22]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    )
  },
  {
    title: "Collaboration",
    description: "Communication fluide, partage de documents et workflows intégrés.",
    icon: (
      <svg className="w-12 h-12 text-[#E67E22]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    )
  }
];

const Fonctionality = () => {
  return (
    <section className="w-full bg-[#F8FAFC] py-20 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Section Heading */}
        <h2 className="text-3xl font-bold text-[#1A365D] mb-12 text-left">
          Fonctionnalités
        </h2>

        {/* Grid Container */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center transition-all hover:shadow-md hover:-translate-y-1"
            >
              {/* Icon Container */}
              <div className="mb-6">
                {feature.icon}
              </div>

              {/* Title */}
              <h3 className="text-xl font-bold text-[#1A365D] mb-3">
                {feature.title}
              </h3>

              {/* Description */}
              <p className="text-slate-500 text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Fonctionality;