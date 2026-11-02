import { useState } from "react";
import { Search } from "lucide-react";
export default function RecordSearch({ groups, onSelect, label }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const term = query.trim().toLowerCase();
  const matches = term
    ? groups
        .flatMap(([section, rows = []]) =>
          rows
            .map((row) => ({
              section,
              row,
              text: [
                row.id,
                row.name,
                row.title,
                row.studentId,
                row.email,
                row.learner,
                row.tutor,
                row.student,
                row.incidentType,
                row.caseType,
                row.category,
                row.subject,
                row.type,
                row.service,
                row.caseId,
              ]
                .filter(
                  (value) =>
                    typeof value === "string" || typeof value === "number",
                )
                .join(" / "),
            }))
            .filter((item) => item.text.toLowerCase().includes(term)),
        )
        .slice(0, 20)
    : [];
  function choose(item) {
    onSelect(item.section, item.row);
    setOpen(false);
  }
  return (
    <div className="relative min-w-0 flex-1 max-w-xl">
      <form
        className="oswe-global !w-full"
        onSubmit={(e) => {
          e.preventDefault();
          setOpen(true);
        }}
      >
        <Search size={16} />
        <input
          aria-label={label}
          placeholder={label}
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
        />
        <button aria-label="Search all sections">
          <Search size={16} />
        </button>
      </form>
      {open && term && (
        <div className="absolute top-full z-50 mt-2 max-h-80 w-full overflow-auto rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
          <div className="flex justify-between p-2 text-xs text-slate-500">
            <span>Results across sections</span>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close search results"
            >
              Close
            </button>
          </div>
          {matches.length ? (
            matches.map((item, index) => (
              <button
                key={index}
                onClick={() => choose(item)}
                className="block w-full rounded-md p-2 text-left hover:bg-green-50 focus-visible:bg-green-50"
              >
                <span className="block text-xs font-semibold text-green-800">
                  {item.section}
                </span>
                <span className="block break-words text-sm">{item.text}</span>
              </button>
            ))
          ) : (
            <p className="p-2 text-sm">No matching records.</p>
          )}
        </div>
      )}
    </div>
  );
}
