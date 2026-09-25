import { BookOpen, GraduationCap } from "lucide-react";

export default function CampusLogo() {
  return (
    <div className="flex items-center gap-2 sm:gap-3" aria-label="CampusTutor">
      <span className="relative grid h-10 w-10 place-items-center text-[#ffc107] sm:h-12 sm:w-12 lg:h-14 lg:w-14">
        <BookOpen className="absolute bottom-0 h-7 w-8 stroke-[2.3] sm:h-8 sm:w-10 lg:h-9 lg:w-11" />
        <GraduationCap className="absolute -top-1 h-7 w-9 fill-[#ffc107] stroke-[#ffc107] sm:h-9 sm:w-11 lg:h-10 lg:w-12" />
      </span>
      <span className="font-serif text-[22px] leading-none tracking-tight sm:text-[26px] lg:text-[29px]">
        <span className="text-[#17844c]">Campus</span>
        <span className="text-[#ffc107]">Tutor</span>
      </span>
    </div>
  );
}
