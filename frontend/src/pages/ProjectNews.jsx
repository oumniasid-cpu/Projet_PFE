import React from 'react';

const ProjectNews = () => {
  const updates = [
    {
      id: 1,
      date: "12 Février 2026",
      title: "Finalisation des fondations",
      status: "Terminé",
      description: "Le coulage de la dalle principale est terminé. Le séchage prendra environ 7 jours avant le début de l'élévation des murs.",
      image: "https://images.unsplash.com/photo-1541888946425-d81bb19480c5?auto=format&fit=crop&w=800&q=80"
    },
    {
      id: 2,
      date: "05 Février 2026",
      title: "Arrivée des matériaux",
      status: "Info",
      description: "Les briques et les structures en acier ont été livrées sur le chantier. Le contrôle qualité a été validé par l'architecte.",
      image: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80"
    }
  ];

  return (
    <div className="min-h-screen bg-[#E9F3FF] p-6 md:p-10">
      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-8">
        
        {/* Main Feed Section */}
        <div className="flex-1 space-y-8">
          <header className="mb-10">
            <h1 className="text-3xl font-bold text-[#1A365D]">Actualités du Projet</h1>
            <p className="text-slate-600">Résidence Les Jardins d'Azur - Lot #402</p>
          </header>

          {updates.map((post) => (
            <article key={post.id} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-white">
              <img src={post.image} alt={post.title} className="w-full h-64 object-cover" />
              <div className="p-8">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm font-semibold text-slate-400 uppercase tracking-wider">{post.date}</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    post.status === 'Terminé' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {post.status}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-[#1A365D] mb-3">{post.title}</h2>
                <p className="text-slate-600 leading-relaxed mb-6">
                  {post.description}
                </p>
                <button className="text-[#E67E22] font-bold hover:underline flex items-center gap-2">
                  Voir plus de photos
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </button>
              </div>
            </article>
          ))}
        </div>

        {/* Project Status Sidebar */}
        <aside className="w-full lg:w-80 space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-white">
            <h3 className="font-bold text-[#1A365D] mb-4">État d'avancement</h3>
            <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden mb-2">
              <div className="bg-[#E67E22] h-full w-[45%] rounded-full"></div>
            </div>
            <p className="text-sm text-slate-500 font-medium">45% complété</p>
            
            <hr className="my-6 border-gray-100" />
            
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Début</span>
                <span className="font-bold text-[#1A365D]">Jan 2026</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Livraison prévue</span>
                <span className="font-bold text-[#1A365D]">Août 2026</span>
              </div>
            </div>
          </div>

          <div className="bg-[#1A365D] p-6 rounded-3xl text-white">
            <h3 className="font-bold mb-2">Besoin d'aide ?</h3>
            <p className="text-blue-100 text-sm mb-4">Contactez votre chef de projet directement.</p>
            <button className="w-full py-3 bg-[#E67E22] rounded-xl font-bold hover:bg-[#D35400] transition-colors">
              Contacter BuildTrack
            </button>
          </div>
        </aside>

      </div>
    </div>
  );
};

export default ProjectNews;