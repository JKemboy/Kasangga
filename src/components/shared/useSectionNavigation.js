import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

// Keep navigation in the URL, never in browser storage or business records.
export default function useSectionNavigation(sections, fallback) {
  const [params, setParams] = useSearchParams();
  const requested = params.get("section");
  const section = sections.includes(requested) ? requested : fallback;
  const select = useCallback(
    (value) => {
      setParams((current) => {
        const next = new URLSearchParams(current);
        const selected = typeof value === "function" ? value(section) : value;
        if (sections.includes(selected)) next.set("section", selected);
        else next.delete("section");
        return next;
      });
    },
    [section, sections, setParams],
  );
  return [section, select];
}
