import { useEffect } from "react";
import { getSupabaseClient } from "./supabaseClient.js";

export default function useChatPresence(userId) {
  useEffect(() => {
    if (!userId) return;
    let stopped = false,
      timer;
    async function pulse() {
      try {
        if (document.visibilityState === "visible")
          await getSupabaseClient().rpc("touch_chat_presence");
      } catch {
        /* A disconnected client expires automatically. */
      }
      if (!stopped) timer = setTimeout(pulse, 30000);
    }
    pulse();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [userId]);
}
