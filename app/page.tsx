import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Footer from "@/components/Footer";
import KeyboardFaq from "@/components/KeyboardFaq";
import Testimonials from "@/components/Testimonials";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="vignette" />
      <Navbar />
      <main className="flex-grow">
        <Hero />
        <KeyboardFaq />
        <Testimonials />
      </main>
      <Footer />
    </div>
  );
}
