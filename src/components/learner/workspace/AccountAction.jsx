import { useState } from "react";
import { Download, Trash2 } from "lucide-react";
import "./account-actions.css";
export default function AccountAction({ kind, email, onClose, onRequest }) {
  const [confirmation, setConfirmation] = useState("");
  const deleting = kind === "delete";
  const Icon = deleting ? Trash2 : Download;
  return (
    <form
      className="account-action"
      onSubmit={(e) => {
        e.preventDefault();
        if (deleting && confirmation !== "DELETE") return;
        onRequest(deleting ? "account-deletion" : "data-export", { email });
      }}
    >
      <span className={`account-action-icon ${deleting ? "danger" : ""}`}>
        <Icon size={24} />
      </span>
      <h2>{deleting ? "Delete account?" : "Request a copy of your data"}</h2>
      <p>
        {deleting ? (
          "Account deletion removes your CampusTutor profile, saved tutors and reviews. Paid session and incident records may be retained under institutional policy. Type DELETE to confirm your request."
        ) : (
          <>
            Request a copy of your profile, sessions, messages and payment
            history for <strong>{email}</strong>.
          </>
        )}
      </p>
      {deleting && (
        <input
          aria-label="Type DELETE to confirm"
          placeholder="Type DELETE"
          autoComplete="off"
          spellCheck={false}
          required
          pattern="DELETE"
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
        />
      )}
      <p className="account-action-note">
        {deleting
          ? "Account deletion requests are not connected to the database yet."
          : "Data requests and email delivery are not connected to the database yet."}
      </p>
      <footer>
        <button type="button" onClick={onClose}>
          Cancel
        </button>
        <button
          className={deleting ? "danger primary" : "primary"}
          disabled={deleting && confirmation !== "DELETE"}
        >
          {deleting ? "Delete Account" : "Request My Data"}
        </button>
      </footer>
    </form>
  );
}
