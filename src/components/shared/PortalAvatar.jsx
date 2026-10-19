// Shared avatar: resolves the profile image from the avatar storage/database flow and uploads only when explicitly editable.
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../auth/AuthProvider.jsx";
import { getSupabaseClient } from "../../services/supabaseClient.js";
export default function PortalAvatar({
  name = "",
  userId,
  role,
  className = "inline-grid h-8 w-8 shrink-0 place-items-center rounded-full bg-green-50 text-xs font-bold text-green-800",
  editable = false,
}) {
  const auth = useAuth(),
    input = useRef(null);
  const [url, setUrl] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const ownName = [auth?.profile?.first_name, auth?.profile?.last_name]
    .filter(Boolean)
    .join(" ");
  const target =
    userId || (editable || name === ownName ? auth?.user?.id : null);
  useEffect(() => {
    let live = true;
    const load = async () => {
      try {
        const client = getSupabaseClient();
        const { data: path, error } = await client.rpc("get_portal_avatar", {
          p_user_id: target || null,
          p_name: name,
        });
        if (error) throw error;
        let next = "";
        if (path) {
          if (/^https:\/\//i.test(path)) next = path;
          else {
            const result = await client.storage
              .from("avatar")
              .createSignedUrl(path, 3600);
            if (result.error) throw result.error;
            next = result.data.signedUrl;
          }
        }
        if (live) setUrl(next);
      } catch {
        if (live) setUrl("");
      }
    };
    load();
    const refresh = () => load();
    window.addEventListener("campustutor:avatar-changed", refresh);
    const timer = setInterval(load, 3000000);
    return () => {
      live = false;
      clearInterval(timer);
      window.removeEventListener("campustutor:avatar-changed", refresh);
    };
  }, [target, name, auth?.profile?.profile_image]);
  async function upload(file) {
    if (!file) return;
    setError("");
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      !file.size ||
      file.size > 5242880
    ) {
      setError("Choose JPG, PNG or WebP up to 5 MB.");
      return;
    }
    setBusy(true);
    let path;
    try {
      const client = getSupabaseClient();
      const { data, error } = await client.auth.getUser();
      if (error || !data.user) throw Error("Sign in before uploading.");
      const ext = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
      }[file.type];
      path = role + "/" + data.user.id + "/" + crypto.randomUUID() + "." + ext;
      const result = await client.storage
        .from("avatar")
        .upload(path, file, { contentType: file.type });
      if (result.error) throw result.error;
      const saved = await client.rpc("save_my_avatar", { p_path: path });
      if (saved.error) {
        await client.storage.from("avatar").remove([path]);
        throw saved.error;
      }
      auth.retry();
      window.dispatchEvent(new Event("campustutor:avatar-changed"));
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <span
      className={"relative " + className}
      style={{ flexShrink: 0 }}
      onClick={
        editable
          ? (event) => {
              event.stopPropagation();
              if (!busy) input.current?.click();
            }
          : undefined
      }
    >
      <span
        style={{
          display: "grid",
          placeItems: "center",
          position: "relative",
          width: "100%",
          height: "100%",
          minWidth: 0,
          minHeight: 0,
          borderRadius: "inherit",
          overflow: "hidden",
          cursor: editable ? "pointer" : undefined,
        }}
        title={editable ? "Change profile picture" : name}
        role={editable ? "button" : undefined}
        tabIndex={editable ? 0 : undefined}
        aria-label={
          editable ? "Change " + role + " profile picture" : undefined
        }
        onKeyDown={
          editable
            ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  event.stopPropagation();
                  input.current?.click();
                }
              }
            : undefined
        }
      >
        {url ? (
          <img
            src={url}
            alt={name || ownName}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              maxWidth: "100%",
              objectFit: "cover",
              display: "block",
            }}
            onError={() => setUrl("")}
          />
        ) : busy ? (
          "?"
        ) : (
          (name || ownName)
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((s) => s[0])
            .join("")
        )}
      </span>
      {editable && (
        <input
          ref={input}
          type="file"
          aria-label={role + " avatar upload"}
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          disabled={busy}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => {
            upload(event.target.files[0]);
            event.target.value = "";
          }}
        />
      )}
      {error && (
        <span
          role="alert"
          className="absolute right-0 top-full z-50 w-56 rounded border bg-white p-2 text-xs text-red-700"
          onClick={(event) => event.stopPropagation()}
        >
          {error}
        </span>
      )}
    </span>
  );
}
