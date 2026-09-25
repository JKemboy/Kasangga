export default function InputField({ icon: Icon, label, hint, ...props }) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between text-[10px] font-medium text-[#35363b] sm:text-[11px] lg:text-[12px]">
        <span>{label}</span>
        {hint}
      </span>
      <span className="relative block">
        <Icon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#999da4]" />
        <input
          {...props}
          className="h-8 w-full rounded-md border border-[#e2e3e5] bg-white pl-8 pr-3 text-[11px] text-[#303238] outline-none transition placeholder:text-[#a2a4ab] focus:border-[#006b3c] focus:ring-2 focus:ring-[#006b3c]/15 sm:h-9 sm:text-[12px]"
        />
      </span>
    </label>
  );
}
