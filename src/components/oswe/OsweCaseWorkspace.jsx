import OsweIncidents from "./OsweIncidents.jsx";
export default function OsweCaseWorkspace({
  settings,
  searchQuery = "",
  onSearchChange,
  initialFilter,
}) {
  return (
    <OsweIncidents
      settings={settings}
      searchQuery={searchQuery}
      onSearchChange={onSearchChange}
      embedded
      initialFilter={initialFilter}
    />
  );
}
