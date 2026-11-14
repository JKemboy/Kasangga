import { Award, BookOpen, UsersRound } from "lucide-react";
import CampusLogo from "./CampusLogo.jsx";
import FeatureItem from "./FeatureItem.jsx";

const campusPhoto = "/images/csubuilding.jpg";

export default function HeroSection() {
  return (
    <aside className="hero-panel relative hidden min-h-0 overflow-hidden bg-[#002d1c] text-white lg:block lg:h-screen">
      <svg className="absolute h-0 w-0" aria-hidden="true" focusable="false">
        <defs>
          <clipPath id="hero-wave" clipPathUnits="objectBoundingBox">
            <path d="M0,0 H0.965 C0.955,0.14,0.946,0.28,0.955,0.40 C0.962,0.51,0.995,0.62,0.982,0.73 C0.971,0.84,0.952,0.93,0.966,1 H0 Z" />
          </clipPath>
        </defs>
      </svg>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_15%_60%,rgba(0,83,58,.24),transparent_43%),linear-gradient(135deg,#00351f,#002619)]" />
      <div className="hero-line hero-line-one" />
      <div className="hero-line hero-line-two" />
      <div className="dot-grid absolute right-10 top-20 h-24 w-36 opacity-35" />
      <div className="campus-scene absolute inset-x-0 bottom-0">
        <img
          className="campus-photo absolute inset-x-0 bottom-0 w-full"
          src={campusPhoto}
          alt="Caraga State University campus"
        />
      </div>
      <div className="absolute inset-x-0 bottom-0 h-[30%] bg-gradient-to-b from-transparent via-transparent to-black/45" />
      <div className="hero-copy relative z-10">
        <CampusLogo />
        <div className="hero-intro">
          <h2 className="text-[calc(clamp(2.25rem,3.2vw,3.5rem)+2px)] font-extrabold leading-[1.08] tracking-tight">
            Welcome to
            <br />
            <span>Kasangga</span>
          </h2>
          <p className="mt-2 max-w-[390px] text-[13px] leading-[1.4] text-white/90 sm:mt-3 sm:text-[16px] lg:mt-4 lg:text-[18px] lg:leading-[1.55]">
            Your peer-to-peer tutoring platform
            <br className="hidden sm:block" /> for Caraga State University
            students.
          </p>
        </div>
        <div className="mt-3 space-y-2 sm:mt-4 sm:space-y-3 lg:mt-5 lg:space-y-4">
          <FeatureItem icon={UsersRound} title="Learn Together">
            Connect with fellow CSU students
            <br />
            and share knowledge.
          </FeatureItem>
          <FeatureItem icon={BookOpen} title="Excel Together">
            Ace your subjects with personalized
            <br />
            peer support.
          </FeatureItem>
          <FeatureItem icon={Award} title="Grow Together">
            Build confidence and achieve your
            <br />
            academic goals.
          </FeatureItem>
        </div>
      </div>
      <div className="hero-caption absolute z-10">
        <p className="font-serif text-[17px] text-[#ffc107] drop-shadow-sm sm:text-[21px] lg:text-[26px]">
          Caraga State University
        </p>
        <p className="mt-px text-[11px] tracking-wide text-white sm:text-[13px] lg:mt-0.5 lg:text-[16px]">
          Excellence. Service. Commitment.
        </p>
      </div>
    </aside>
  );
}
