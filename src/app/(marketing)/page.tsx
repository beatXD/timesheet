import {
  Navbar,
  HeroSection,
  TrustedBySection,
  FeaturesSection,
  ProductScreenshotsSection,
  HowItWorksSection,
  UseCaseSection,
  PricingSection,
  ComparisonSection,
  TestimonialsSection,
  FAQSection,
  CTASection,
  Footer,
} from "@/components/landing";

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <TrustedBySection />
        <FeaturesSection />
        <ProductScreenshotsSection />
        <HowItWorksSection />
        <UseCaseSection />
        <PricingSection />
        <ComparisonSection />
        <TestimonialsSection />
        <FAQSection />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
