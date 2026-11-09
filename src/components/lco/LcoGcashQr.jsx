import { useEffect, useRef, useState } from "react";
import { CreditCard, Save } from "lucide-react";
import { button, primary, input } from "../shared/staffUi.jsx";
import {
  loadLcoGcashQr,
  saveLcoGcashQr,
  validateGcashQr,
} from "../../services/lcoGcashQr.js";

export default function LcoGcashQr() {
  const [current, setCurrent] = useState({ path: null, url: "" });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const picker = useRef(null);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    loadLcoGcashQr()
      .then((value) => {
        if (mounted.current) setCurrent(value);
      })
      .catch((cause) => {
        if (mounted.current) setError(cause.message);
      })
      .finally(() => {
        if (mounted.current) setLoading(false);
      });
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  function choose(event) {
    setError("");
    setNotice("");
    setFile(null);
    try {
      const selected = event.target.files?.[0];
      if (selected) {
        validateGcashQr(selected);
        setFile(selected);
      }
    } catch (cause) {
      setError(cause.message);
      event.target.value = "";
    }
  }
  async function reload() {
    setLoading(true);
    setError("");
    try {
      setCurrent(await loadLcoGcashQr());
    } catch (cause) {
      setError(cause.message);
    } finally {
      setLoading(false);
    }
  }
  async function save() {
    if (!file || saving || loading) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      // Decode before uploading so a renamed non-image cannot be saved as a QR image.
      const image = await createImageBitmap(file);
      image.close();
      const result = await saveLcoGcashQr(file, current.path);
      if (!mounted.current) return;
      setFile(null);
      if (picker.current) picker.current.value = "";
      setNotice(result.warning || "GCash QR code saved.");
      setCurrent(await loadLcoGcashQr());
    } catch (cause) {
      if (mounted.current)
        setError(cause.message || "Unable to save this image.");
    } finally {
      if (mounted.current) setSaving(false);
    }
  }
  return (
    <section className="ad-panel" aria-busy={loading || saving}>
      <h2>
        <CreditCard />
        GCash Payment Details
      </h2>
      <p className="ad-help">
        Manage the GCash QR code displayed by the system.
      </p>
      <p className="mb-2 text-sm font-semibold">Current QR Code:</p>
      {loading ? (
        <p role="status">Loading QR code...</p>
      ) : current.url ? (
        <img
          src={current.url}
          alt="Current GCash QR code"
          className="mb-4 h-64 w-64 max-w-full rounded-md border bg-white object-contain"
        />
      ) : (
        <p className="ad-help">No GCash QR code has been saved.</p>
      )}
      <label className="mt-4 block text-sm font-semibold">
        Upload New QR Code:
        <input
          ref={picker}
          type="file"
          accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
          className={input + " mt-2"}
          onChange={choose}
          disabled={loading || saving}
        />
      </label>
      <p className="ad-help">
        PNG, JPG, JPEG or WEBP. Maximum file size: 5 MB.
      </p>
      {preview && (
        <img
          src={preview}
          alt="New GCash QR code preview"
          className="my-4 h-64 w-64 max-w-full rounded-md border bg-white object-contain"
          onError={() => {
            setFile(null);
            setError("Choose a valid image file.");
          }}
        />
      )}
       
      {notice && (
        <p role="status" className="mb-3 text-xs text-green-800">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="mb-3 text-xs text-red-600">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={primary + " flex items-center gap-2"}
          disabled={!file || loading || saving}
          onClick={save}
        >
          <Save size={15} />
          {saving ? "Saving..." : "Save Changes"}
        </button>
        <button
          type="button"
          className={button}
          disabled={loading || saving}
          onClick={reload}
        >
          Reload Current QR
        </button>
      </div>
    </section>
  );
}
