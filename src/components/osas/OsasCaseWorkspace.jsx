import OsasIncidents from "./OsasIncidents.jsx";
export default function OsasCaseWorkspace({ settings, initialQuery = "" }) {
  return (
    <OsasIncidents settings={settings} initialQuery={initialQuery} embedded />
  );
}
