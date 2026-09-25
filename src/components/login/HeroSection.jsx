import { Award, BookOpen, UsersRound } from "lucide-react";
import CampusLogo from "./CampusLogo.jsx";
import FeatureItem from "./FeatureItem.jsx";

const campusPhoto = "/images/csubuilding.jpg";

export default function HeroSection() {
  return (
    <aside className="hero-panel relative hidden min-h-0 overflow-hidden bg-[#004625] text-white lg:block lg:h-screen">
      <svg className="absolute h-0 w-0" aria-hidden="true" focusable="false">
        <defs>
          <clipPath id="hero-wave" clipPathUnits="objectBoundingBox">
            <path d="M0,0 H0.965 C0.955,0.14,0.946,0.28,0.955,0.40 C0.962,0.51,0.995,0.62,0.982,0.73 C0.971,0.84,0.952,0.93,0.966,1 H0 Z" />
          </clipPath>
        </defs>
      </svg>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_15%_60%,rgba(0,115,73,.38),transparent_43%),linear-gradient(135deg,#004425,#003b22)]" />
      <div className="hero-line hero-line-one" />
      <div className="hero-line hero-line-two" />
      <div className="dot-grid absolute right-10 top-20 h-24 w-36 opacity-35" />
      <img
        className="campus-photo absolute inset-x-0 bottom-0 h-[29%] w-full object-cover object-center sm:h-[33%] lg:h-[39%]"
        src={campusPhoto}
        alt="Caraga State University campus"
      />
      <div className="absolute inset-x-0 bottom-0 h-[39%] bg-gradient-to-b from-transparent via-transparent to-[#003b22]/35 lg:h-[48%]" />
      <div className="relative z-10 px-5 pb-16 pt-4 sm:px-10 sm:pt-7 md:px-12 lg:px-[14%] lg:pb-28 lg:pt-11">
        <CampusLogo />
        <div className="mt-4 sm:mt-5 lg:mt-7">
          <h2 className="text-[clamp(1.8rem,7vw,2.75rem)] font-extrabold leading-[1.08] tracking-tight sm:text-[42px] md:text-[49px] lg:text-[40px]">
            Welcome to
            <br />
            <span>Campus</span>
            <span className="text-[#ffc107]">Tutor</span>
          </h2>
          <p className="mt-2 max-w-[390px] text-[11px] leading-[1.4] text-white/90 sm:mt-3 sm:text-[14px] lg:mt-4 lg:text-[16px] lg:leading-[1.55]">
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
      <div className="absolute bottom-2 left-5 z-10 sm:bottom-3 sm:left-10 md:left-12 lg:bottom-4 lg:left-[9%]">
        <p className="font-serif text-[15px] text-[#ffc107] drop-shadow-sm sm:text-[19px] lg:text-[24px]">
          Caraga State University
        </p>
        <p className="mt-px text-[9px] tracking-wide text-white sm:text-[11px] lg:mt-0.5 lg:text-[14px]">
          Excellence. Service. Commitment.
        </p>
      </div>
    </aside>
  );
}
