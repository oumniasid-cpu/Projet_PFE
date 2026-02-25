import { Link } from 'react-router-dom';
import HeroIllustration from '../assets/Build.jpg';

const Card = () => {
  return (
    <section className="w-full bg-[#F1F7FE] py-16 px-6 md:py-24 overflow-hidden">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
        
        {/* Left Side: Text Content */}
        <div className="flex-1 text-left z-10">
          <h1 className="text-4xl md:text-6xl font-extrabold text-[#1A365D] leading-[1.1] mb-6">
            Suivi intelligent des <br className="hidden lg:block" />
            projets de bâtiment
          </h1>
          
          <p className="text-lg md:text-xl text-slate-600 max-w-lg mb-10 leading-relaxed">
            Optimisez la gestion, le budget et les délais de vos chantiers avec notre solution tout-en-un.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            {/* Primary Action */}
            <button className="bg-[#E67E22] hover:bg-[#D35400] text-white px-10 py-4 rounded-full font-bold transition-all shadow-lg hover:shadow-orange-200 active:scale-95">
              Demander une démo
            </button>
            
            {/* Secondary Action */}
            <Link to="/Login"
              className="inline-block text-center border-2 border-[#1A365D] text-[#1A365D] hover:bg-[#1A365D] hover:text-white px-10 py-4 rounded-full font-bold transition-all active:scale-95">
              Se connecter
            </Link>
          </div>
        </div>

        {/* Right Side: Clean Illustration */}
        <div className="flex-1 relative w-full flex justify-end">
          {/* Subtle background glow to make the illustration pop */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-blue-200/50 rounded-full blur-3xl -z-10"></div>
          
          <img
            src={HeroIllustration}
            alt="Construction Crane Illustration"
            className="w-full max-w-162.5 h-auto object-contain transform hover:scale-105 transition-transform duration-700 ease-out"
          />
        </div>

      </div>
    </section>
  );
};

export default Card;