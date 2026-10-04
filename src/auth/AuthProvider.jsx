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
    try {
      const client = getSupabaseClient();
      subscription = client.auth.onAuthStateChange((_event, next) => {
        receivedEvent = true;
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
          if (error) setError(error.message);
          setSession(data?.session || null);
          setInitializing(false);
        })
        .catch((e) => {
          if (alive) {
            setError(e.message);
            setInitializing(false);
          }
        });
    } catch (e) {
      setError(e.message);
      setInitializing(false);
    }
    return () => {
      alive = false;
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
        "Only @carsu.edu.ph accounts can access CampusTutor. Sign out and choose your CSU Google account.",
      );
      return;
    }
    setError("");
    loadAuthAccount(getSupabaseClient(), session.user.id)
      .then((value) => {
        if (alive) setAccount({ ...value, userId: session.user.id });
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
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
