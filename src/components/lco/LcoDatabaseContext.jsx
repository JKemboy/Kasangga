// LCO data context: exposes the loaded database snapshot plus save, refresh, loading, and error handlers to LCO sections.
import { createContext, useContext, useEffect } from "react";
export const LcoDatabaseContext = createContext(null);
export function useLcoDatabase() {
  return useContext(LcoDatabaseContext);
}

// Mark only the record whose details are actually visible, including records
// opened directly from a section, Overview, search, or a related-record link.
export function useLcoRecordSeen(entityType, entityId) {
  const markRecordSeen = useLcoDatabase()?.markRecordSeen;
  useEffect(() => {
    if (entityId != null && markRecordSeen) {
      void markRecordSeen(entityType, entityId);
    }
  }, [markRecordSeen, entityType, entityId]);
}
