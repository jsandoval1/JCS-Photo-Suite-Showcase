import { HeroSection, FeaturesGrid, PricingGrid } from '../components';
import '../App.css';

function Home() {
  return (
    <>
      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <HeroSection />
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features">
        <div className="container">
          <FeaturesGrid />
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="pricing">
        <div className="container">
          <PricingGrid />
        </div>
      </section>
    </>
  );
}

export default Home; 