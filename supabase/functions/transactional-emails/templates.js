const titles = {
  payment_received: "Payment received",
  booking_confirmed: "Booking confirmed",
  tutor_booked: "You have a booked session",
  session_reminder: "Session reminder — tomorrow",
  payment_transferred: "Your payment has been transferred",
};
const escape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );

export function emailContent(job, appUrl) {
  if (job.kind === "system_notification") {
    const roles = ["learner", "tutor", "lco", "oswe"];
    if (!roles.includes(job.recipient_role))
      throw new Error("Unsupported recipient role");
    const base = new URL(appUrl);
    if (base.protocol !== "https:" && base.hostname !== "localhost")
      throw new Error("APP_URL must use HTTPS");
    const url = new URL(`/${job.recipient_role}-dashboard`, base);
    const update = {
      report_resolved: {
        title: "Your report has been resolved",
        text: "Your Kasangga report has been resolved. Open My Reports to review its status. Any refund is tracked separately; resolution alone does not confirm a transfer.",
        section: "reports",
      },
      refund_transferred: {
        title: "Your refund has been marked as transferred",
        text: "LCO has recorded your refund as transferred. Check your recorded payment account and open My Sessions for the related booking. Contact LCO if you have not received the refund.",
        section: "sessions",
      },
    }[job.payload?.notification_type];
    if (update) {
      url.searchParams.set("section", update.section);
      return {
        subject: `Kasangga — ${update.title}`,
        text: `${update.text}\n\nOpen your account: ${url.href}\n\nKasangga`,
        html: `<div style="font-family:Arial,sans-serif;line-height:1.6"><h1>${escape(update.title)}</h1><p>${escape(update.text)}</p><p><a href="${escape(url.href)}">Open your account</a></p></div>`,
      };
    }
    if (job.payload?.notification_type === "tutor_application_approved") {
      const accountUrl = new URL("/learner-dashboard", base);
      accountUrl.searchParams.set("section", "application");
      const title = "Your tutor application has been approved";
      const text =
        "LCO has approved your Kasangga tutor application. You can now switch to Tutor to create services and manage your availability. Your Learner access remains available.";
      return {
        subject: "Kasangga — Tutor application approved",
        text: `${title}\n\n${text}\n\nView your application: ${accountUrl.href}\n\nKasangga`,
        html: `<div style="font-family:Arial,sans-serif;line-height:1.6"><h1>${escape(title)}</h1><p>${escape(text)}</p><p><a href="${escape(accountUrl.href)}">View your application</a></p></div>`,
      };
    }
    const title = "You have a new Kasangga notification";
    // Do not email case details, report statements, chat contents, or evidence.
    const text =
      "A new notification is available in your Kasangga account. Sign in and open Notifications to review it.";
    return {
      subject: `Kasangga — New notification (${job.recipient_role.toUpperCase()})`,
      text: `${text}\n\nOpen your account: ${url.href}\n\nKasangga`,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6"><h1>${escape(title)}</h1><p>${escape(text)}</p><p><a href="${escape(url.href)}">Open your account</a></p></div>`,
    };
  }
  const p = job.payload;
  const title = titles[job.kind];
  if (!title) throw new Error("Unsupported email kind");
  const base = new URL(appUrl);
  if (base.protocol !== "https:" && base.hostname !== "localhost")
    throw new Error("APP_URL must use HTTPS");
  const url = new URL(
    `/${job.recipient_role === "tutor" ? "tutor" : "learner"}-dashboard`,
    base,
  );
  url.searchParams.set(
    "section",
    job.kind === "payment_transferred" ? "earnings" : "sessions",
  );
  const date = new Date(`${p.date}T${String(p.start).slice(0, 8)}+08:00`);
  const when = new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "full",
    timeStyle: "short",
  }).format(date);
  const intro = {
    payment_received:
      "Your payment has been received. Your booking status is available in My Sessions.",
    booking_confirmed: "Your tutoring session is confirmed.",
    tutor_booked: "A learner has confirmed a paid booking for your service.",
    session_reminder:
      "Your tutoring session starts in approximately 24 hours. Please check My Sessions for the latest details.",
    payment_transferred:
      "LCO has marked your session payment as transferred. Check Earnings for the transfer details.",
  }[job.kind];
  const amount =
    p.amount == null
      ? "See your account for the amount"
      : new Intl.NumberFormat("en-PH", {
          style: "currency",
          currency: "PHP",
        }).format(Number(p.amount));
  const lines = [
    `Hello ${p.name || "there"},`,
    intro,
    `Booking: #${job.booking_id}`,
    `Service: ${p.service || p.subject || "Tutoring session"}`,
    ...(p.topic ? [`Topic: ${p.topic}`] : []),
    `With: ${p.peer}`,
    `Schedule: ${when} (Philippine time)`,
    `Session type: ${p.session_type || "See My Sessions"}`,
    ...(job.kind === "payment_received" || job.kind === "payment_transferred"
      ? [`Amount: ${amount}`]
      : []),
  ];
  return {
    subject: `Kasangga — ${title} (#${job.booking_id})`,
    text: [...lines, `Open your account: ${url.href}`, "Kasangga"].join("\n\n"),
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#172b22;line-height:1.6"><h1 style="font-size:24px;color:#087542">${escape(title)}</h1>${lines.map((line) => `<p>${escape(line)}</p>`).join("")}<p><a href="${escape(url.href)}" style="display:inline-block;padding:12px 20px;background:#087542;color:white;border-radius:6px">Open your account</a></p><p>Kasangga</p></div>`,
  };
}
