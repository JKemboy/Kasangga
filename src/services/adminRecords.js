import { configDefaults } from "../components/admin/adminData.js";
import { sessionLifecycle } from "./sessionLifecycle.js";
import { sessionAllocation } from "../components/tutor/workspace/earnings.js";

export const label = (value) => {
  const labels = {
    "in-person": "In-person",
    in_person: "In-person",
    success: "Success",
    pending: "Pending",
    processing: "Processing",
  };
  const key = String(value || "").toLowerCase();
  return (
    labels[key] ||
    key.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
};
export const manilaDate = (value) => {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
};
export const timestampLabel = (value) =>
  value
    ? new Date(value).toLocaleString("en-PH", {
        timeZone: "Asia/Manila",
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Not paid";
function parse(value) {
  try {
    const result = JSON.parse(value || "{}");
    return result && typeof result === "object" ? result : {};
  } catch {
    return {};
  }
}
const key = (value) => String(value ?? "");
const index = (rows, id) => new Map(rows.map((row) => [key(row[id]), row]));
const modules = {
  users: "User Management",
  user_roles: "User Management",
  tutor_profiles: "Tutor Profiles",
  tutor_applications: "Tutor Verification",
  services: "Service Management",
  service_topics: "Service Management",
  availability_slots: "Availability & Schedule",
  bookings: "Bookings Monitoring",
  reschedule_requests: "Bookings Monitoring",
  payments: "Payments & Transactions",
  payment_allocations: "Payments & Transactions",
  refunds: "Payments & Transactions",
  ratings: "Reviews",
  incident_reports: "Incident Reports",
  system_settings: "Settings",
};
const amount = (value) => Number(value || 0);
export function paymentAllocation(payment) {
  if (payment.allocation) return payment.allocation;
  if (payment.paymentStatus !== "paid")
    return {
      gross: payment.amount,
      tutor: 0,
      osas: 0,
      platform: 0,
      source: "Not allocated",
    };
  return {
    ...sessionAllocation({
      amount: payment.amount,
      status: "Completed",
      payment: "Paid",
    }),
    source: "Estimated 90/5/5 split",
  };
}
export function summarizePayments(payments, { completedOnly = false } = {}) {
  const totals = {
    count: 0,
    gross: 0,
    tutor: 0,
    osas: 0,
    platform: 0,
    estimated: false,
  };
  for (const payment of payments) {
    if (
      payment.paymentStatus !== "paid" ||
      payment.refundStatus === "pending" ||
      (completedOnly && payment.status !== "Completed")
    )
      continue;
    totals.count++;
    const allocation = paymentAllocation(payment);
    for (const field of ["gross", "tutor", "osas", "platform"])
      totals[field] += Math.round(allocation[field] * 100);
    totals.estimated ||= allocation.source !== "Recorded allocation";
  }
  for (const field of ["gross", "tutor", "osas", "platform"])
    totals[field] /= 100;
  return totals;
}
export function mapAdminDatabase(input, now = new Date()) {
  const tableNames = [
    "users",
    "user_roles",
    "tutor_profiles",
    "services",
    "service_topics",
    "availability_slots",
    "bookings",
    "payments",
    "payment_allocations",
    "refunds",
    "reschedule_requests",
    "ratings",
    "incident_reports",
    "incident_evidence",
    "cases",
    "case_decisions",
    "case_actions",
    "audit_logs",
    "system_settings",
  ];
  const db = Object.fromEntries(
    tableNames.map((table) => [table, input[table] || []]),
  );
  const people = index(db.users, "user_id"),
    tutors = index(db.tutor_profiles, "tutor_profile_id");
  const fullName = (id) => {
    const u = people.get(key(id));
    return u
      ? [u.first_name, u.last_name].filter(Boolean).join(" ")
      : "System / payment provider";
  };
  const logs = db.audit_logs
    .slice()
    .sort(
      (a, b) =>
        a.created_at.localeCompare(b.created_at) ||
        key(a.log_id).localeCompare(key(b.log_id), "en", { numeric: true }),
    );
  const history = (table, id) =>
    logs
      .filter((l) => {
        const next = parse(l.new_value);
        return (
          l.target_type === table &&
          (key(l.target_id) === key(id) ||
            key(next.id || next.record_id) === key(id))
        );
      })
      .map((l) => {
        const next = parse(l.new_value),
          previous = parse(l.previous_value);
        return next.review
          ? { ...next.review, by: fullName(l.user_id), at: l.created_at }
          : {
              from: label(
                previous.service_status ||
                  previous.account_status ||
                  previous.report_status,
              ),
              to: label(
                next.service_status ||
                  next.account_status ||
                  next.report_status ||
                  l.action,
              ),
              reason: next.reason || "",
              by: fullName(l.user_id),
              at: l.created_at,
            };
      });
  const services = db.services.map((s) => {
    const tutor = tutors.get(key(s.tutor_profile_id));
    const topicDetails = db.service_topics
      .filter(
        (t) => key(t.service_id) === key(s.service_id) && t.is_active !== false,
      )
      .map((t) => ({
        id: key(t.topic_id),
        name: t.topic_name,
        rate: amount(t.rate_per_hour ?? s.rate_per_hour),
        type: label(t.session_type || s.session_type),
        meetingLink: t.meeting_link || "",
        location: t.location || "",
        slots: db.availability_slots
          .filter((a) => a.is_active && key(a.topic_id) === key(t.topic_id))
          .map((a) => ({
            id: key(a.slot_id),
            date: a.availability_date,
            day: a.day_of_week,
            start: a.start_time.slice(0, 5),
            end: a.end_time.slice(0, 5),
          })),
      }));
    const rates = topicDetails.map((t) => t.rate),
      slots = db.availability_slots.filter(
        (a) => a.is_active && key(a.service_id) === key(s.service_id),
      );
    return {
      id: key(s.service_id),
      tutorProfileId: key(s.tutor_profile_id),
      tutorUserId: tutor?.user_id,
      tutor: fullName(tutor?.user_id),
      title: s.title,
      subject: s.title,
      legacySubject: s.subject,
      description: s.description || "",
      rate: rates.length ? Math.min(...rates) : amount(s.rate_per_hour),
      maxRate: rates.length ? Math.max(...rates) : amount(s.rate_per_hour),
      type: label(s.session_type),
      status: label(s.service_status),
      date: manilaDate(s.created_at),
      topics: topicDetails.map((t) => t.name),
      topicDetails,
      availability: `${slots.length} active schedule slots`,
      history: history("services", s.service_id),
    };
  });
  const listings = index(services, "id");
  const users = db.users.map((u) => {
    const roles = db.user_roles
      .filter((r) => r.user_id === u.user_id && r.is_active)
      .map((r) => r.role.toLowerCase());
    const tutor = db.tutor_profiles.find((t) => t.user_id === u.user_id);
    return {
      userId: u.user_id,
      id: u.student_id || u.user_id,
      name: fullName(u.user_id),
      email: u.csu_email,
      college: u.college || "",
      program: u.program || "",
      year: u.year_level,
      registered: manilaDate(u.created_at),
      emailVerified: !!u.email_verified_at,
      status: label(u.account_status),
      roles,
      tutor: roles.includes("tutor"),
      tutorSince: manilaDate(tutor?.verified_at || tutor?.created_at),
      verificationStatus: label(tutor?.verification_status),
      subjects: services
        .filter((s) => s.tutorUserId === u.user_id)
        .map((s) => s.title),
      history: history("users", u.user_id),
    };
  });
  // Checkout reservations are not bookings until payment is verified.
  // Refunded sessions remain part of the historical record.
  const settled = (status) =>
    ["paid", "partially_refunded", "refunded"].includes(
      String(status).toLowerCase(),
    );
  const sessions = db.bookings
    .filter((b) => settled(b.payment_status))
    .map((b) => {
      const service = listings.get(key(b.service_id));
      const topic = db.service_topics.find(
        (t) => key(t.topic_id) === key(b.topic_id),
      );
      const relatedPayments = db.payments
        .filter((p) => key(p.booking_id) === key(b.booking_id))
        .sort((a, b) => a.created_at.localeCompare(b.created_at));
      const payment =
        relatedPayments.findLast((p) => p.payment_status === "paid") ||
        relatedPayments.at(-1);
      const reschedules = db.reschedule_requests.filter(
        (r) => key(r.booking_id) === key(b.booking_id),
      );
      return {
        id: key(b.booking_id),
        booking: key(b.booking_id),
        serviceId: key(b.service_id),
        learnerId: b.learner_id,
        tutorUserId: service?.tutorUserId,
        learner: fullName(b.learner_id),
        tutor: service?.tutor || "Unavailable",
        service: b.service_title_snapshot || service?.title || "Unavailable",
        subject: b.service_subject_snapshot || service?.title,
        topic: b.specific_topic || topic?.topic_name || "",
        date: b.session_date,
        start: b.start_time.slice(0, 5),
        end: b.end_time.slice(0, 5),
        time: b.start_time.slice(0, 5),
        duration: amount(b.duration),
        type: label(b.session_type),
        provider: b.meeting_platform || b.location || "",
        meetingUrl: b.meeting_link || "",
        location: b.location,
        amount: amount(b.amount),
        status: label(b.booking_status),
        lifecycle: sessionLifecycle(b, now),
        payment: label(b.payment_status),
        bookedAt: b.created_at,
        completedAt: b.completed_at,
        cancellation: b.cancelled_at
          ? { at: b.cancelled_at, reason: b.cancellation_reason }
          : null,
        transaction: payment ? key(payment.payment_id) : "",
        transactionAmount: payment ? amount(payment.gross_amount) : null,
        reference: payment?.transaction_reference,
        paymongoReference: payment?.paymongo_payment_id,
        paymentMethod: label(payment?.payment_method),
        paidAt: payment?.paid_at,
        transactionStatus: label(payment?.payment_status),
        reschedules: reschedules.map((r) => ({
          id: key(r.reschedule_id),
          status: label(r.request_status),
          date: r.requested_date,
          start: r.requested_start_time,
          end: r.requested_end_time,
          reason: r.reason,
        })),
        reviews: db.ratings
          .filter((r) => key(r.booking_id) === key(b.booking_id))
          .map((r) => ({
            id: key(r.rating_id),
            score: amount(r.rating_score),
            comment: r.comment,
            visible: r.is_visible,
            date: r.rated_at,
          })),
      };
    });
  const bookings = index(sessions, "id");
  const transactionRecords = db.payments.map((p) => {
    const rawBooking = db.bookings.find(
      (record) => key(record.booking_id) === key(p.booking_id),
    );
    const service = listings.get(key(rawBooking?.service_id));
    const b = bookings.get(key(p.booking_id)) || {
      learnerId: rawBooking?.learner_id,
      learner: fullName(rawBooking?.learner_id),
      tutorUserId: service?.tutorUserId,
      tutor: service?.tutor || "Unavailable",
      serviceId: key(rawBooking?.service_id),
      service:
        rawBooking?.service_title_snapshot || service?.title || "Unavailable",
      subject: rawBooking?.service_subject_snapshot || service?.title,
      topic: rawBooking?.specific_topic || "",
      status: label(rawBooking?.booking_status),
      start: rawBooking?.start_time?.slice(0, 5),
      end: rawBooking?.end_time?.slice(0, 5),
      type: label(rawBooking?.session_type),
    };
    const requests = db.refunds
      .filter((r) => key(r.payment_id) === key(p.payment_id))
      .sort((a, b) => a.requested_at.localeCompare(b.requested_at));
    const refund =
      requests.find((r) => r.refund_status === "pending") || requests.at(-1);
    const allocationRows = db.payment_allocations.filter(
      (a) => key(a.payment_id) === key(p.payment_id),
    );
    const allocation = allocationRows.length
      ? allocationRows.reduce(
          (total, a) => ({
            gross: amount(p.gross_amount),
            tutor: total.tutor + amount(a.tutor_amount),
            osas: total.osas + amount(a.osas_amount),
            platform: total.platform + amount(a.platform_amount),
            processingFee: total.processingFee + amount(a.processing_fee),
            source: "Recorded allocation",
          }),
          { tutor: 0, osas: 0, platform: 0, processingFee: 0 },
        )
      : null;
    const reviews = history("refunds", refund?.refund_id),
      decision = reviews.at(-1);
    return {
      ...b,
      id: key(p.payment_id),
      booking: key(p.booking_id),
      reference: p.transaction_reference,
      paymongoReference: p.paymongo_payment_id,
      checkoutId: p.paymongo_checkout_session_id,
      method: label(p.payment_method),
      amount: amount(p.gross_amount),
      date: manilaDate(p.paid_at || p.created_at),
      createdAt: p.created_at,
      paidAt: p.paid_at,
      time: p.paid_at
        ? new Intl.DateTimeFormat("en-GB", {
            timeZone: "Asia/Manila",
            hour: "2-digit",
            minute: "2-digit",
            hourCycle: "h23",
          }).format(new Date(p.paid_at))
        : "",
      receiptUrl: p.receipt_url,
      transferredAt: p.transferred_at,
      transferredBy: p.transferred_by ? fullName(p.transferred_by) : "",
      transferReference: p.transfer_reference,
      paymentStatus: p.payment_status,
      payment:
        refund?.refund_status === "pending"
          ? "Refund Review"
          : label(p.payment_status),
      allocation,
      refundId: refund?.refund_id,
      refundStatus: refund?.refund_status,
      refundAmount: amount(refund?.refund_amount),
      refundReason: refund?.refund_reason,
      refundRequestedAt: refund?.requested_at,
      refundDecision:
        refund &&
        ["approved", "declined", "processed"].includes(refund.refund_status)
          ? {
              decision: label(refund.refund_status),
              note: decision?.reason,
              at: decision?.at || refund.processed_at,
            }
          : null,
      history: reviews,
    };
  });
  const payments = transactionRecords.filter((record) =>
    settled(record.paymentStatus),
  );
  for (const booking of sessions)
    booking.allocation = payments.find(
      (p) => p.id === booking.transaction,
    )?.allocation;
  const incidents = db.incident_reports.map((r) => {
    const linkedCase = (db.cases || []).find(
      (c) => key(c.report_id) === key(r.report_id),
    );
    const decision = (db.case_decisions || [])
      .filter((d) => key(d.case_id) === key(linkedCase?.case_id))
      .sort((a, b) => Number(b.decision_id) - Number(a.decision_id))[0];
    let details = {};
    try {
      details = JSON.parse(decision?.decision_details || "{}");
    } catch {}
    return {
      osasCaseId: linkedCase ? `CASE-${linkedCase.case_id}` : "",
      osasStatus: linkedCase ? label(linkedCase.case_status) : "",
      osasOutcome:
        decision?.decision_type ||
        (r.osas_assessment?.action === "close" &&
          "Closed without a formal case") ||
        "",
      osasNotes: details.notes || r.osas_assessment?.notes || "",
      osasBasis: details.basis || "",
      osasDecisionAt: decision?.decision_date || r.osas_assessment?.at || "",
      id: key(r.report_id),
      booking: r.booking_id ? key(r.booking_id) : "",
      reporterId: r.reported_by,
      reportedId: r.reported_against,
      reporter: fullName(r.reported_by),
      reported: fullName(r.reported_against),
      type: ["Technical issue", "Platform / Technical"].includes(
        r.incident_type,
      )
        ? "Platform / Technical"
        : label(r.incident_type),
      issue: r.description,
      description: r.description,
      priority: r.priority === "normal" ? "Medium" : label(r.priority),
      status:
        r.report_status === "resolved"
          ? r.osas_referral_status === "not_referred"
            ? "Resolved by Admin"
            : "Resolved by OSAS"
          : r.report_status === "screened"
            ? "Admin Screening Complete"
            : r.osas_referral_status === "case_opened"
              ? "Under OSAS Review"
              : r.report_status === "submitted"
                ? "Pending Review"
                : label(r.report_status),
      referral: ["referred", "case_opened", "closed_no_case"].includes(
        r.osas_referral_status,
      )
        ? "Referred to OSAS"
        : ["Technical issue", "Platform / Technical"].includes(
              r.incident_type,
            ) || r.osas_referral_status === "not_required"
          ? "Not Required"
          : "Not Referred",
      date: manilaDate(r.submitted_at),
      history: history("incident_reports", r.report_id),
      evidence: db.incident_evidence
        .filter((e) => key(e.report_id) === key(r.report_id))
        .map((e) => ({
          id: key(e.evidence_id),
          name: e.file_name,
          path: e.file_path,
          type: e.evidence_type,
        })),
    };
  });
  const config = { ...configDefaults };
  for (const setting of db.system_settings)
    if (Object.hasOwn(config, setting.setting_key)) {
      try {
        config[setting.setting_key] = JSON.parse(setting.setting_value);
      } catch {
        config[setting.setting_key] = setting.setting_value;
      }
    }
  const audit = logs
    .map((l) => {
      const next = parse(l.new_value);
      return {
        id: key(l.log_id),
        actor: l.user_id ? fullName(l.user_id) : "System / payment provider",
        email: people.get(key(l.user_id))?.csu_email || "",
        action: label(l.action),
        module: modules[l.module] || label(l.module),
        target: [
          label(l.target_type),
          l.target_id ?? next.record_id ?? next.id ?? "",
        ].join(" "),
        at: l.created_at,
        result: label(l.result),
        ip: l.ip_address || "Not recorded",
        device: l.device_info || "Not recorded",
        source: "Database",
        notes: next.review?.reason || next.review?.notes || "",
        before: l.previous_value,
        after: l.new_value,
      };
    })
    .reverse();
  return {
    users,
    services,
    sessions,
    payments,
    transactionRecords,
    incidents,
    config,
    audit,
    loadedAt: now.toISOString(),
  };
}
export function buildAdminReport(database, filters = {}, now = new Date()) {
  const {
    start = "",
    end = "",
    college = "",
    subject = "",
    status = "",
  } = filters;
  const inPeriod = (date) =>
    !!date &&
    (!start || date >= start) &&
    (!end || date <= end) &&
    !(start && end && start > end);
  const accounts = database.users.filter(
    (u) =>
      (!college || u.college === college) &&
      (!end || u.registered <= end) &&
      !(start && end && start > end),
  );
  const selectedUsers = new Set(accounts.map((u) => u.userId));
  const offerings = database.services.filter(
    (s) =>
      inPeriod(s.date) &&
      (!subject || s.id === subject) &&
      (!college || selectedUsers.has(s.tutorUserId)),
  );
  const matchingBooking = (s) =>
    (!subject || s.serviceId === subject) &&
    (!status || s.status === status) &&
    (!college ||
      selectedUsers.has(s.learnerId) ||
      selectedUsers.has(s.tutorUserId));
  const bookings = database.sessions.filter(
    (s) => inPeriod(s.date) && matchingBooking(s),
  );
  const transactions = database.payments.filter(
    (p) => inPeriod(p.date) && matchingBooking(p),
  );
  const financial = summarizePayments(transactions),
    earned = summarizePayments(transactions, { completedOnly: true });
  const anchor = new Date(`${end || manilaDate(now)}T12:00:00Z`);
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(
      Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() - 5 + i, 1),
    );
    return {
      prefix: d.toISOString().slice(0, 7),
      label: d.toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
        timeZone: "UTC",
      }),
    };
  });
  const counts = months.map(
    (m) => bookings.filter((b) => b.date.startsWith(m.prefix)).length,
  );
  const distribution = [...new Set(bookings.map((b) => b.status))].map(
    (label) => ({
      label,
      count: bookings.filter((b) => b.status === label).length,
    }),
  );
  const popular = offerings.map((s) => ({
    label: s.title,
    count: bookings.filter((b) => b.serviceId === s.id).length,
  }));
  return {
    accounts,
    offerings,
    bookings,
    transactions,
    financial,
    earned,
    months,
    counts,
    distribution,
    popular,
  };
}
