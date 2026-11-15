import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { useAuth } from "../../auth/AuthProvider.jsx";
import { saveMyGcashAccount } from "../../services/accountGcash.js";
import { philippineMobileDigits } from "../../services/philippineMobile.js";
import { button, primary, input } from "../tutor/workspace/ui.jsx";

export default function OwnGcashAccount() {
  const auth = useAuth();
  const [account, setAccount] = useState({
    name: auth.profile?.gcash_name || "",
    number: auth.profile?.gcash_number || "",
  });
  const [draft, setDraft] = useState(account);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    setAccount({
      name: auth.profile?.gcash_name || "",
      number: auth.profile?.gcash_number || "",
    });
  }, [auth.user?.id, auth.profile?.gcash_name, auth.profile?.gcash_number]);
  async function save(event) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const saved = await saveMyGcashAccount(draft);
      setAccount(saved);
      setEditing(false);
      setNotice("GCash account updated.");
      auth.retry();
    } catch (cause) {
      setError(cause.message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <section
      className="rounded-xl border border-[#e1e7ef] bg-white p-3"
      aria-label="Your private GCash account"
    >
      <form onSubmit={save} noValidate>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-[#101828]">GCash Account</h2>
          {editing ? (
            <div className="flex gap-2">
              <button
                type="button"
                className={button}
                disabled={saving}
                onClick={() => {
                  setEditing(false);
                  setError("");
                }}
              >
                Cancel
              </button>
              <button type="submit" className={primary} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          ) : (
            <button
              type="button"
              className={button}
              onClick={() => {
                setDraft({
                  ...account,
                  number: philippineMobileDigits(account.number),
                });
                setEditing(true);
                setError("");
                setNotice("");
              }}
            >
              <Pencil className="mr-1 inline h-3 w-3" />
              Edit
            </button>
          )}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Used for your refunds and tutor payouts. Your GCash details are not
          shown on your public tutor profile.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-medium text-[#37456a]">
            GCash Account Name
            <input
              className={input + " mt-1 w-full"}
              readOnly={!editing}
              disabled={saving}
              maxLength={150}
              value={editing ? draft.name : account.name}
              placeholder="Not provided"
              onChange={(event) =>
                setDraft({ ...draft, name: event.target.value })
              }
            />
          </label>
          <label className="block text-xs font-medium text-[#37456a]">
            GCash Number
            <div className="mt-1 flex items-center overflow-hidden rounded-md border border-slate-200">
              <span className="border-r border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                +63
              </span>
              <input
                className={input + " w-full border-0"}
                readOnly={!editing}
                disabled={saving}
                type="tel"
                inputMode="numeric"
                maxLength={10}
                pattern="9[0-9]{9}"
                value={
                  editing ? draft.number : philippineMobileDigits(account.number)
                }
                placeholder={editing ? "9XXXXXXXXX" : "Not provided"}
                onChange={(event) => {
                  const number = event.target.value;
                  if (/^[0-9]{0,10}$/.test(number)) {
                    setDraft({ ...draft, number });
                  }
                }}
              />
            </div>
          </label>
        </div>
        {error && (
          <p role="alert" className="mt-2 text-xs text-red-700">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="mt-2 text-xs text-green-800">
            {notice}
          </p>
        )}
      </form>
    </section>
  );
}
