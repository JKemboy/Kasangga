export default function FeatureItem({ icon: Icon, title, children }) {
  return (
    <div className="flex items-center gap-2">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[#76a932] bg-[#08723c]/85 shadow-lg shadow-black/10 sm:h-10 sm:w-10 lg:h-12 lg:w-12">
        <Icon className="h-4 w-4 text-white stroke-[1.65] sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
      </div>
      <div className="leading-tight">
        <h3 className="text-[11px] font-bold text-white sm:text-[13px] lg:text-[14px]">
          {title}
        </h3>
        <p className="mt-px max-w-64 text-[9px] leading-[1.15] text-white/85 sm:mt-0.5 sm:text-[11px] lg:text-[12px] lg:leading-[1.25]">
          {children}
        </p>
      </div>
    </div>
  );
}
