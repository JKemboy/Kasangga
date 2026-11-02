// LCO data context: exposes the loaded database snapshot plus save, refresh, loading, and error handlers to LCO sections.
import { createContext, useContext } from "react";
export const LcoDatabaseContext = createContext(null);
export function useLcoDatabase() {
  return useContext(LcoDatabaseContext);
}
