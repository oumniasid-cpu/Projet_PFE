// components/Pricing.jsx
const plans = [
  {
    name: "Gratuit",
    price: "0 DA",
    features: ["Suivi de base", "1 projet", "Rapports journaliers"],
  },
  {
    name: "Pro",
    price: "Sur devis",
    features: ["Dashboard avancé", "Projets illimités", "Alertes IA"],
    featured: true,
  },
];

export default function Pricing() {
  return (
    <section className="w-full bg-[#F8FAFC] py-16 px-6 md:py-20">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10 md:mb-12">
          <h2 className="text-3xl font-bold text-[#1A365D] mb-3">Tarifs</h2>
          <p className="max-w-2xl text-slate-600 leading-relaxed">
            Choisissez la formule adaptée au suivi de vos projets.
          </p>
        </header>

        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`relative rounded-2xl border p-7 md:p-8 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md ${
                plan.featured
                  ? "bg-[#1A365D] border-[#1A365D] text-white"
                  : "bg-white border-slate-100 text-slate-700"
              }`}
            >
              {plan.featured && (
                <span className="inline-flex mb-5 rounded-full bg-[#E67E22] px-3 py-1 text-xs font-bold text-white">
                  Recommandé
                </span>
              )}
              <h3 className={`text-xl font-bold ${plan.featured ? "text-white" : "text-[#1A365D]"}`}>
                {plan.name}
              </h3>
              <p className={`text-3xl font-extrabold my-5 ${plan.featured ? "text-white" : "text-[#1A365D]"}`}>
                {plan.price}
              </p>
              <ul className={`space-y-4 ${plan.featured ? "text-blue-50" : "text-slate-600"}`}>
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-sm">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-[#E67E22]" aria-hidden="true" />
                    {feature}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}