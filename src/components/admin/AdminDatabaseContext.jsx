// Admin data context: exposes the loaded database snapshot plus save, refresh, loading, and error handlers to Admin sections.
import { createContext, useContext } from "react";
export const AdminDatabaseContext = createContext(null);
export function useAdminDatabase() {
  return useContext(AdminDatabaseContext);
}
