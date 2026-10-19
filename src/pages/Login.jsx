import HeroSection from "../components/login/HeroSection.jsx";
import AuthSection from "../components/login/AuthSection.jsx";
import RegisterCard from "../components/login/RegisterCard.jsx";

export default function Login() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#fafafa] lg:grid lg:h-screen lg:grid-cols-[42.5%_57.5%] lg:overflow-hidden">
      <HeroSection />
      <AuthSection>
        <RegisterCard loginMode />
      </AuthSection>
    </main>
  );
}
