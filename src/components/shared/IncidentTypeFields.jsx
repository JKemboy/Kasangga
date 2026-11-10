import { incidentGroups } from "../../services/incidentTypes.js";
import { input } from "../tutor/workspace/ui.jsx";
export default function IncidentTypeFields({
  category,
  type,
  onCategory,
  onType,
  disabled = false,
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block text-xs font-medium">
        Incident category
        <select
          className={input + " mt-1"}
          required
          disabled={disabled}
          value={category}
          onChange={(event) => {
            onCategory(event.target.value);
            onType("");
          }}
        >
          <option value="">Select an incident category</option>
          {Object.keys(incidentGroups).map((name) => (
            <option key={name}>{name}</option>
          ))}
        </select>
      </label>
      <label className="block text-xs font-medium">
        Incident type
        <select
          className={input + " mt-1"}
          required
          disabled={disabled || !category}
          value={type}
          onChange={(event) => onType(event.target.value)}
        >
          <option value="">Select an incident type</option>
          {(incidentGroups[category] || []).map((name) => (
            <option key={name}>{name}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
