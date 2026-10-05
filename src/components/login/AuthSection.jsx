import AuthCard from "./AuthCard.jsx";
import SupportLinks from "./SupportLinks.jsx";

export default function AuthSection({ children }) {
  return (
    <section className="relative flex min-h-screen flex-col items-center bg-[#fafafa] px-3 pb-5 pt-5 sm:px-6 sm:pb-7 lg:h-screen lg:min-h-0 lg:px-8">
      <div className="flex w-full flex-1 flex-col items-center justify-center lg:-translate-y-3">
        {children || <AuthCard />}
        <SupportLinks />
      </div>
    </section>
  );
}
