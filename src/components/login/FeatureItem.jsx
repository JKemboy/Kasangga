export default function FeatureItem({ icon: Icon, title, children }) {
  return (
    <div className="flex items-center gap-2">
      <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[#76a932] bg-[#08723c]/85 shadow-lg shadow-black/10 sm:h-9 sm:w-9 lg:h-10 lg:w-10">
        <Icon className="h-3 w-3 text-white stroke-[1.65] sm:h-4 sm:w-4 lg:h-5 lg:w-5" />
      </div>
      <div className="leading-tight">
        <h3 className="text-[9px] font-bold text-white sm:text-[11px] lg:text-[12px]">
          {title}
        </h3>
        <p className="mt-px max-w-64 text-[7px] leading-[1.15] text-white/85 sm:mt-0.5 sm:text-[9px] lg:text-[10px] lg:leading-[1.25]">
          {children}
        </p>
      </div>
    </div>
  );
}
