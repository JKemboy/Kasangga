import { useCallback, useEffect, useRef, useState } from "react";
import { loadAdminDatabase } from "../../services/adminDatabase.js";
import { loadTutorApplications } from "../../services/tutorApplications.js";
export default function useAdminRecords(userId, view) {
  const [database, setDatabase] = useState(null),
    [applications, setApplications] = useState([]),
    [error, setError] = useState(""),
    [applicationsError, setApplicationsError] = useState(""),
    [refreshing, setRefreshing] = useState(false);
  const request = useRef(0),
    mounted = useRef(false);
  const refresh = useCallback(async () => {
    const current = ++request.current;
    setRefreshing(true);
    const [records, apps] = await Promise.allSettled([
      loadAdminDatabase(),
      loadTutorApplications(),
    ]);
    if (!mounted.current || current !== request.current) return;
    if (records.status === "fulfilled") {
      setDatabase((previous) => ({
        ...records.value,
        config:
          previous &&
          JSON.stringify(previous.config) ===
            JSON.stringify(records.value.config)
            ? previous.config
            : records.value.config,
      }));
      setError("");
    } else setError(records.reason.message);
    if (apps.status === "fulfilled") {
      setApplications(apps.value);
      setApplicationsError("");
    } else setApplicationsError(apps.reason.message);
    setRefreshing(false);
    return records.status === "fulfilled";
  }, [userId]);
  useEffect(() => {
    mounted.current = true;
    refresh();
    const focused = () => refresh();
    const visible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const timer = window.setInterval(visible, 15000);
    window.addEventListener("focus", focused);
    window.addEventListener("campustutor:sessions-changed", focused);
    document.addEventListener("visibilitychange", visible);
    return () => {
      mounted.current = false;
      request.current++;
      window.clearInterval(timer);
      window.removeEventListener("focus", focused);
      window.removeEventListener("campustutor:sessions-changed", focused);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [refresh]);
  const lastView = useRef(view);
  useEffect(() => {
    if (lastView.current !== view) {
      lastView.current = view;
      refresh();
    }
  }, [view, refresh]);
  return {
    database,
    applications,
    error,
    applicationsError,
    refreshing,
    refresh,
  };
}
