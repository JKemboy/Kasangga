// OSWE data provider: reads the role-authorized snapshot, writes through osas_save_record, and refreshes committed database state.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { getSupabaseClient } from "../../services/supabaseClient.js";
import { mapOsweRecords } from "../../services/osweRecords.js";
const Context = createContext(null);
export const useOsweDatabase = () => useContext(Context);
export function OsweDatabaseProvider({ children }) {
  const [records, setRecords] = useState(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const request = ++generation.current;
    try {
      // osas_dashboard_snapshot is the authoritative OSWE data/settings read.
      const { data, error } = await getSupabaseClient().rpc(
        "oswe_case_review_snapshot",
      );
      if (error) throw error;
      const next = mapOsweRecords(data);
      if (request === generation.current) {
        setRecords(next);
        setError("");
      }
      return next;
    } catch (cause) {
      if (request === generation.current)
        setError(cause.message || "Unable to load OSWE records.");
      return null;
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    refresh();
    const client = getSupabaseClient();
    const channel = client
      .channel("oswe-policy-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "policies" },
        refresh,
      )
      .subscribe();
    const timer = setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    return () => {
      generation.current++;
      clearInterval(timer);
      client.removeChannel(channel);
      window.removeEventListener("focus", refresh);
    };
  }, [refresh]);
  async function save(kind, id, action, value, expected = null) {
    // Persist through the role-checked RPC, then reload the snapshot so every
    // OSWE view renders the committed database value rather than a local copy.
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
  return (
    <Context.Provider
      value={{
        records,
        refresh,
        error,
        loading,
        save,
        markNotificationsRead,
      }}
    >
      {children}
    </Context.Provider>
  );
}
