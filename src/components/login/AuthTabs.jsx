export default function AuthTabs({ active, onChange }) {
  return (
    <div className="grid h-8 grid-cols-2 overflow-hidden rounded-md border border-[#e6e8e8]">
      {["Login", "Register"].map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onChange(tab)}
          className={`border-b-2 text-[11px] font-medium transition ${active === tab ? "border-[#006b3c] bg-white text-[#006b3c]" : "border-transparent bg-[#fbfbfb] text-[#777981]"} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#006b3c]`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
