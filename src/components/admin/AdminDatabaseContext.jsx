import { createContext, useContext } from "react";
export const AdminDatabaseContext = createContext(null);
export function useAdminDatabase() {
  return useContext(AdminDatabaseContext);
}
