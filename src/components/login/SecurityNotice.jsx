import { BadgeCheck } from "lucide-react";

export default function SecurityNotice() {
  return (
    <div className="flex items-center gap-2 border-t border-[#e8e8e8] bg-[#fcfcfc] px-4 py-2.5 sm:px-5 sm:py-3 lg:px-6">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#fff5db] text-[#f5ae00] sm:h-9 sm:w-9">
        <BadgeCheck className="h-5 w-5 stroke-[1.8]" />
      </div>
      <div>
        <p className="text-[11px] font-semibold text-[#3f4046] sm:text-[12px]">
          Only CSU student email accounts can register.
        </p>
        <p className="mt-px text-[9px] text-[#92949c] sm:text-[10px]">
          Use your @carsu.edu.ph email to access CampusTutor.
        </p>
      </div>
    </div>
  );
}
