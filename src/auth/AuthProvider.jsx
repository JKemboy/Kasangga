import { createContext, useContext, useEffect, useState } from "react";
import { getSupabaseClient } from "../services/supabaseClient.js";
import { loadAuthAccount, isCsuEmail } from "../services/authAccount.js";

const Context = createContext(null);
export const useAuth = () => useContext(Context);
export default function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [account, setAccount] = useState(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let alive = true,
      receivedEvent = false,
      subscription;
    const initializationTimeout = window.setTimeout(() => {
      if (alive && !receivedEvent) {
        setError(
          "Account connection timed out. Check your connection and retry.",
        );
        setInitializing(false);
      }
    }, 15000);
    try {
      const client = getSupabaseClient();
      subscription = client.auth.onAuthStateChange((_event, next) => {
        receivedEvent = true;
        window.clearTimeout(initializationTimeout);
        if (alive) {
          setSession((previous) =>
            previous?.access_token === next?.access_token &&
            previous?.user?.id === next?.user?.id
              ? previous
              : next,
          );
          setInitializing(false);
        }
      }).data.subscription;
      client.auth
        .getSession()
        .then(({ data, error }) => {
          if (!alive || receivedEvent) return;
          window.clearTimeout(initializationTimeout);
          if (error) setError(error.message);
          setSession(data?.session || null);
          setInitializing(false);
        })
        .catch((e) => {
          window.clearTimeout(initializationTimeout);
          if (alive) {
            setError(e.message);
            setInitializing(false);
          }
        });
    } catch (e) {
      window.clearTimeout(initializationTimeout);
      setError(e.message);
      setInitializing(false);
    }
    return () => {
      alive = false;
      window.clearTimeout(initializationTimeout);
      subscription?.unsubscribe();
    };
  }, []);
  useEffect(() => {
    let alive = true;
    setAccount((previous) =>
      previous?.userId === session?.user.id ? previous : null,
    );
    if (!session) return;
    if (!isCsuEmail(session.user.email)) {
      setError(
        "Only @carsu.edu.ph accounts can access Kasangga. Sign out and choose your CSU Google account.",
      );
      return;
    }
    setError("");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      controller.abort();
      if (alive) {
        setError(
          "Loading your account took too long. Please retry. If a database reset is still running, wait for it to finish first.",
        );
      }
    }, 15000);
    loadAuthAccount(getSupabaseClient(), session.user.id, controller.signal)
      .then((value) => {
        if (alive && !controller.signal.aborted)
          setAccount({ ...value, userId: session.user.id });
      })
      .catch((e) => {
        if (alive && !controller.signal.aborted) setError(e.message);
      })
      .finally(() => window.clearTimeout(timeout));
    return () => {
      alive = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [session, revision]);
  const ready = account?.userId === session?.user.id ? account : null;
  return (
    <Context.Provider
      value={{
        session,
        user: session?.user || null,
        profile: ready?.profile,
        roles: ready?.roles || [],
        loading: initializing || (!!session && !ready && !error),
        error,
        retry: () => setRevision((v) => v + 1),
        signOut: async () => {
          const { error } = await getSupabaseClient().auth.signOut({
            scope: "local",
          });
          if (error) throw error;
          setSession(null);
          setAccount(null);
          setError("");
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
