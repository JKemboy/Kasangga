import { collegeProgramMap } from "../../services/collegeProgramMap.js";
// Admin catalogs: renders tutor verification and service moderation tables with their record-review actions.
import { statusClass } from "../shared/statusColors.js";
import ServiceDetails from "./ServiceDetails.jsx";
import UserDetails from "./UserDetails.jsx";
import UserExport from "./UserExport.jsx";
import { serviceCsv } from "./serviceActions.js";
import { useInteractions } from "../shared/InteractionProvider.jsx";
import ApplicationReview from "./ApplicationReview.jsx";
import { DOCUMENTS } from "../learner/application/applicationRules.js";
import { useState } from "react";
import {
  ShieldCheck,
  BriefcaseBusiness,
  Download,
  MoreHorizontal,
  Eye,
} from "lucide-react";
import {
  Modal,
  button,
  primary,
  input,
  Avatar,
} from "../tutor/workspace/ui.jsx";
import { dateLabel, downloadData } from "./adminData.js";
function applicationDocumentKey(application) {
  return Object.entries(application.documents || {})
    .map(([kind, document]) => `${kind}:${document.storagePath || ""}`)
    .sort()
    .join("|");
}
export default function AdminCatalog({
  kind,
  searchQuery = "",
  onQueryChange = () => {},
  rows,
  onUpdate,
  config,
  users = [],
  onUserSave,
  applications = [],
  onApplicationSave,
  onDocument,
  verificationChecks = {},
  onVerificationCheckChange = () => {},
}) {
  const [serviceAction, setServiceAction] = useState("");
  const [userId, setUserId] = useState(null);

  const verification = kind === "applications",
    title = verification ? "Tutor Verification" : "Service Management";
  const statuses = verification
    ? [
        "Pending",
        "Under Review",
        "Resubmission Required",
        "Approved",
        "Rejected",
      ]
    : ["Active", "Inactive", "Suspended", "Archived"];
  const [status, setStatus] = useState(""),
    [groupFilter, setGroupFilter] = useState(""),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState(null),
    [action, setAction] = useState(""),
    [reason, setReason] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const filtered = rows.filter(
    (r) =>
      (!status ||
        (status === "inactiveGroup"
          ? ["Inactive", "Archived"].includes(r.status)
          : r.status === status)) &&
      (!groupFilter ||
        (verification
          ? r.college === groupFilter ||
            collegeProgramMap.some(
              (c) => c.code === groupFilter && c.name === r.college,
            )
          : r.id === groupFilter)) &&
      [
        ...Object.values(r),
        ...(Array.isArray(r.topics)
          ? r.topics
          : typeof r.topics === "string"
            ? [r.topics]
            : Object.values(r.topics || {}).flat()),
      ]
        .filter((v) => typeof v !== "object")
        .join(" ")
        .toLowerCase()
        .includes(searchQuery.trim().toLowerCase()),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 7)),
    current = Math.min(page, pages),
    visible = filtered.slice((current - 1) * 7, current * 7);
  function open(r) {
    setSelected(r);
    setServiceAction("");
    setAction(verification ? r.status : "");
    setReason("");
    setError("");
  }
  function serviceOption(r, action) {
    if (action === "account") {
      const user = users.find((u) => u.userId === r.tutorUserId);
      if (user) setUserId(user.id);
      else setNotice("No matching tutor account in the available records.");
      return;
    }
    setServiceAction(action);
    setSelected(r);
  }
  function exportServices() {
    const url = URL.createObjectURL(
      new Blob(["\uFEFF" + serviceCsv(filtered)], {
        type: "text/csv;charset=utf-8",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "admin-services.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice("Exported " + filtered.length + " matching services.");
  }
  const pill = (v) => <span className={statusClass(v, "au-status")}>{v}</span>;
  function applicationDocumentStatus(application) {
    // The final database decision survives page refreshes; OCR state does not.
    if (application.status === "Approved") return "Reviewed";
    const savedVerification = verificationChecks[application.id];
    const verification =
      savedVerification?.documentsKey === applicationDocumentKey(application)
        ? savedVerification
        : null;
    if (verification?.checksRun) return verification.documentStatus;
    const required = DOCUMENTS.filter((document) => document.required);
    const uploaded = required.filter(
      (document) => application.documents?.[document.id]?.storagePath,
    ).length;
    return uploaded === required.length
      ? "Pending Review"
      : `${uploaded}/${required.length} Required`;
  }
  const metrics = verification
    ? statuses.map((s) => [s, rows.filter((r) => r.status === s).length, s])
    : [
        ["Total Services", rows.length, ""],
        [
          "Active Services",
          rows.filter((r) => r.status === "Active").length,
          "Active",
        ],
        [
          "Suspended Services",
          rows.filter((r) => r.status === "Suspended").length,
          "Suspended",
        ],
        [
          "Inactive / Archived",
          rows.filter((r) => ["Inactive", "Archived"].includes(r.status))
            .length,
          "inactiveGroup",
        ],
      ];
  return (
    <section
      className={
        "ad-page " +
        (verification ? "admin-tutor-verification" : "admin-service-management")
      }
    >
      <div className="osas-heading">
        <div>
          <h1>
            {title}{" "}
            {verification ? (
              <ShieldCheck size={22} />
            ) : (
              <BriefcaseBusiness size={22} />
            )}
          </h1>
          <p>
            {verification
              ? "Review Tutor applications and supporting documents before activating Tutor capability."
              : "Monitor and moderate Tutor-created services for platform compliance."}
          </p>
        </div>
      </div>
      <div className={`ad-cards ${verification ? "five" : ""}`}>
        {metrics.map(([label, n, value], i) => (
          <button
            key={label}
            aria-pressed={status === value}
            onClick={() => {
              setStatus(value);
              onQueryChange("");
              setGroupFilter("");
              setPage(1);
            }}
          >
            <span
              style={{
                background: [
                  "#006439",
                  "#087bff",
                  "#ef243d",
                  "#ffb800",
                  "#7825d9",
                ][i],
              }}
            >
              {verification ? (
                <ShieldCheck size={23} />
              ) : (
                <BriefcaseBusiness size={23} />
              )}
            </span>
            <div>
              <b>{n}</b>
              <small>{label}</small>
            </div>
          </button>
        ))}
      </div>
      {verification ? (
        <div className="ad-toolbar flex-wrap">
          <select
            aria-label="Application status"
            className={input}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Applications</option>
            {statuses.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
          <select
            aria-label="Application college"
            className={input}
            value={groupFilter}
            onChange={(e) => {
              setGroupFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Colleges</option>
            {collegeProgramMap.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code}
              </option>
            ))}
            {[...new Set(rows.map((r) => r.college).filter(Boolean))]
              .filter(
                (c) =>
                  !collegeProgramMap.some(
                    (item) => item.code === c || item.name === c,
                  ),
              )
              .map((c) => (
                <option key={c}>{c}</option>
              ))}
          </select>
        </div>
      ) : (
        <div className="ad-toolbar flex-wrap">
          <select
            aria-label="Service status"
            className={input}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Services</option>
            <option value="Active">Active</option>
            <option value="Suspended">Suspended</option>
            <option value="inactiveGroup">Inactive / Archived</option>
          </select>
          <UserExport
            kind="services"
            rows={filtered}
            onCsv={exportServices}
            onNotice={setNotice}
          />
        </div>
      )}
      {verification &&
        rows.some((r) => !["Approved", "Rejected"].includes(r.status)) && (
          <p className="ad-banner">
            Review the original documents and complete the manual review
            checklist, or run OCR checks and confirm Information Match. Add
            review notes before approving.
          </p>
        )}
      {notice && (
        <p role="status" className="text-xs text-green-800">
          {notice}
        </p>
      )}
      <div className="ad-table">
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                {(verification
                  ? [
                      "Application ID",
                      "Applicant",
                      "Student ID",
                      "College / Program",
                      "Submitted Date",
                      "Document Status",
                      "Information Match",
                      "Application Status",
                      "Action",
                    ]
                  : [
                      "Service ID",
                      "Tutor",
                      "Service title / Subject",
                      "Topics",
                      "Topic hourly rates",
                      "Session Type",
                      "Created Date",
                      "Service Status",
                      "Actions",
                    ]
                ).map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td>
                    <div className="au-person ad-catalog-person">
                      <Avatar name={verification ? r.name : r.tutor} />
                      <span className="ad-catalog-person-name">
                        {verification ? r.name : r.tutor}
                      </span>
                    </div>
                  </td>
                  {verification ? (
                    <>
                      <td>{r.studentId}</td>
                      <td>
                        {r.college}
                        <br />
                        {r.program}
                      </td>
                      <td>{dateLabel(r.date)}</td>
                      <td>{pill(applicationDocumentStatus(r))}</td>
                      <td>
                        {r.status === "Approved"
                          ? pill("Confirmed")
                          : verificationChecks[r.id]?.documentsKey ===
                                applicationDocumentKey(r) &&
                              verificationChecks[r.id]?.checksRun &&
                              verificationChecks[r.id]?.documentStatus ===
                                "Complete"
                            ? pill(
                                verificationChecks[r.id]?.matchConfirmed
                                  ? "Confirmed"
                                  : "Not confirmed",
                              )
                            : pill(
                                verificationChecks[r.id]?.documentsKey ===
                                  applicationDocumentKey(r) &&
                                  verificationChecks[r.id]?.checksRun
                                  ? "Incomplete"
                                  : r.match || "Not checked",
                              )}
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{r.title}</td>
                      <td>
                        {r.topics.length
                          ? r.topics.join(", ")
                          : "No active topics"}
                      </td>
                      <td>
                        {r.topicDetails.length ? (
                          r.topicDetails.map((t) => (
                            <div key={t.id}>
                              {t.name}: {"\u20b1"}
                              {t.rate.toLocaleString("en-PH")}/hr
                            </div>
                          ))
                        ) : (
                          <>
                            {"\u20b1"}
                            {r.rate}/hr
                          </>
                        )}
                      </td>
                      <td>{r.type}</td>
                      <td>{dateLabel(r.date)}</td>
                    </>
                  )}
                  <td>{pill(r.status)}</td>
                  <td>
                    <div className="ad-actions flex-wrap">
                      <button
                        className={
                          verification &&
                          !["Approved", "Rejected"].includes(r.status)
                            ? primary
                            : button
                        }
                        aria-label={`Open ${r.id}`}
                        onClick={() => open(r)}
                      >
                        {verification ? (
                          ["Approved", "Rejected"].includes(r.status) ? (
                            "View Application"
                          ) : (
                            "Review Application"
                          )
                        ) : (
                          <>
                            <Eye size={12} />
                            View Service
                          </>
                        )}
                      </button>
                      {!verification && (
                        <>
                          <button
                            type="button"
                            className={button + " text-red-700"}
                            disabled={
                              !["Active", "Suspended"].includes(r.status)
                            }
                            onClick={() =>
                              serviceOption(
                                r,
                                r.status === "Suspended"
                                  ? "Lift Suspension"
                                  : "Suspend Service",
                              )
                            }
                          >
                            {r.status === "Suspended"
                              ? "Lift Suspension"
                              : "Suspend"}
                          </button>
                          <button
                            type="button"
                            className={button}
                            onClick={() => serviceOption(r, "account")}
                          >
                            Tutor Account
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!visible.length && (
            <p className="p-6 text-center text-xs">No matching records.</p>
          )}
        </div>
        <div className="op-pagination p-3">
          <span>
            Showing {filtered.length ? (current - 1) * 7 + 1 : 0} to{" "}
            {Math.min(current * 7, filtered.length)} of {filtered.length}{" "}
            entries
          </span>
          <div>
            <button
              className={button}
              disabled={current === 1}
              onClick={() => setPage(current - 1)}
              aria-label="Previous catalog page"
            >
              ‹
            </button>
            <span>{current}</span>
            <button
              className={button}
              disabled={current === pages}
              onClick={() => setPage(current + 1)}
              aria-label="Next catalog page"
            >
              ›
            </button>
          </div>
        </div>
      </div>
      <p className="ad-help">
        {verification
          ? "Supporting documents require manual review."
          : "Tutor-created services and topic schedules come from the database. Moderation is saved with an audit record. View each service to inspect its bookings."}
      </p>
      {selected && verification && (
        <ApplicationReview
          application={rows.find((r) => r.id === selected.id) || selected}
          config={config}
          onSave={(updated, status) => onUpdate(updated, status)}
          onDocument={onDocument}
          verificationState={
            verificationChecks[selected.id]?.documentsKey ===
            applicationDocumentKey(selected)
              ? verificationChecks[selected.id]
              : null
          }
          onVerificationUpdate={(next) =>
            onVerificationCheckChange(selected.id, {
              ...next,
              documentsKey: applicationDocumentKey(selected),
            })
          }
          onClose={() => setSelected(null)}
        />
      )}
      {selected && !verification && (
        <ServiceDetails
          key={selected.id + serviceAction}
          service={rows.find((r) => r.id === selected.id) || selected}
          initialAction={
            ["Suspend Service", "Lift Suspension"].includes(serviceAction)
              ? serviceAction
              : ""
          }
          onTutor={() => serviceOption(selected, "account")}
          onSave={(updated) =>
            onUpdate(rows.map((r) => (r.id === updated.id ? updated : r)))
          }
          onClose={() => setSelected(null)}
        />
      )}
      {userId && (
        <UserDetails
          user={users.find((u) => u.id === userId)}
          services={rows}
          applications={applications}
          config={config}
          onSave={onUserSave}
          onApplicationSave={onApplicationSave}
          onDocument={onDocument}
          onServiceSave={(updated) =>
            onUpdate(rows.map((r) => (r.id === updated.id ? updated : r)))
          }
          onClose={() => setUserId(null)}
        />
      )}
    </section>
  );
}
