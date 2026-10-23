// OSAS data provider: reads the role-authorized snapshot, writes through osas_save_record, and refreshes committed database state.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { getSupabaseClient } from "../../services/supabaseClient.js";
import { mapOsasRecords } from "../../services/osasRecords.js";
const Context = createContext(null);
export const useOsasDatabase = () => useContext(Context);
export function OsasDatabaseProvider({ children }) {
  const [records, setRecords] = useState(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const request = ++generation.current;
    try {
      // osas_dashboard_snapshot is the authoritative OSAS data/settings read.
      const { data, error } = await getSupabaseClient().rpc(
        "osas_dashboard_snapshot",
      );
      if (error) throw error;
      const next = mapOsasRecords(data);
      if (request === generation.current) {
        setRecords(next);
        setError("");
      }
    } catch (cause) {
      if (request === generation.current)
        setError(cause.message || "Unable to load OSAS records.");
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    return () => {
      generation.current++;
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [refresh]);
  async function save(kind, id, action, value, expected = null) {
    // Persist through the role-checked RPC, then reload the snapshot so every
    // OSAS view renders the committed database value rather than a local copy.
    const { error } = await getSupabaseClient().rpc("osas_save_record", {
      p_kind: kind,
      p_id: id,
      p_action: action,
      p_value: value,
      p_expected: expected,
    });
    if (error) throw new Error(error.message);
    await refresh();
    return true;
  }
  async function markNotificationsRead(ids) {
    try {
      const client = getSupabaseClient();
      const { data: auth, error: authError } = await client.auth.getUser();
      if (authError || !auth.user)
        throw new Error("Unable to verify notification access.");
      const { error } = await client
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", auth.user.id)
        .in("notification_id", ids);
      if (error) throw error;
      await refresh();
      return true;
    } catch (cause) {
      setError(cause.message || "Unable to mark notifications as read.");
      return false;
    }
  }
  async function saveCase(record) {
    const current = records.cases.find(
      (c) => c.caseDatabaseId === record.caseDatabaseId,
    );
    const action =
      record.archived && !current.archived
        ? records.evidence.some(
            (e) => e.caseId === record.caseId && e.status === "Insufficient",
          )
          ? "archive_insufficient"
          : "archive"
        : record.decision && !current.decision
          ? "decision"
          : record.decision?.conditionDone && !current.decision?.conditionDone
            ? "condition"
            : JSON.stringify(record.evidenceRequest) !==
                JSON.stringify(current.evidenceRequest)
              ? "request"
              : record.history?.length > current.history.length &&
                  record.status === current.status
                ? "note"
                : "status";
    return save(
      "case",
      record.caseDatabaseId,
      action,
      record,
      record.databaseStatus,
    );
  }
  return (
    <Context.Provider
      value={{
        records,
        refresh,
        error,
        loading,
        save,
        saveCase,
        markNotificationsRead,
      }}
    >
      {children}
    </Context.Provider>
  );
}
