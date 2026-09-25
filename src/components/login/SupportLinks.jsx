import { CircleHelp } from "lucide-react";

export default function SupportLinks() {
  return (
    <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10px] sm:mt-4 sm:text-[11px]">
      <a
        href="#help"
        className="flex items-center gap-1.5 font-medium text-[#197747]"
      >
        <CircleHelp className="h-4 w-4" />
        Need Help?
      </a>
      <span className="text-[#8b8d93]">
        Visit our{" "}
        <a className="font-medium text-[#197747]" href="#help-center">
          Help Center
        </a>
      </span>
      <span className="hidden text-[#b0b1b5] sm:block">|</span>
      <a href="#support" className="font-medium text-[#197747]">
        Contact Support
      </a>
    </div>
  );
}
