import RegisterCard from "../components/login/RegisterCard.jsx";
import HeroSection from "../components/login/HeroSection.jsx";
import AuthSection from "../components/login/AuthSection.jsx";

export default function Register() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#fafafa] lg:grid lg:h-screen lg:grid-cols-[42.5%_57.5%] lg:overflow-hidden">
      <HeroSection />
      <AuthSection>
        <RegisterCard />
      </AuthSection>
    </main>
  );
}
