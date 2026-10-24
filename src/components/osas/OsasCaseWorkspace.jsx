import OsasIncidents from "./OsasIncidents.jsx";
export default function OsasCaseWorkspace({
  settings,
  searchQuery = "",
  onSearchChange,
  initialFilter,
}) {
  return (
    <OsasIncidents
      settings={settings}
      searchQuery={searchQuery}
      onSearchChange={onSearchChange}
      embedded
      initialFilter={initialFilter}
    />
  );
}
