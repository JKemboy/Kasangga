import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
const server = await createServer({
  server: { middlewareMode: true },
  logLevel: "error",
});
try {
  const { default: Fields } = await server.ssrLoadModule(
    "/src/components/shared/IncidentTypeFields.jsx",
  );
  const { incidentGroups, SESSION_PAYMENT, HANDBOOK } =
    await import("../src/services/incidentTypes.js");
  const noop = () => {};
  for (const category of ["", SESSION_PAYMENT, HANDBOOK]) {
    const html = renderToStaticMarkup(
      React.createElement(Fields, {
        category,
        type: "",
        onCategory: noop,
        onType: noop,
      }),
    );
    assert.ok(
      html.includes('value="" selected=""'),
      "An empty type must be selected initially",
    );
    assert.ok(!html.includes("Repeated Rule Violations"));
    for (const [group, types] of Object.entries(incidentGroups))
      for (const type of types) {
        assert.equal(
          html.includes(`>${type}</option>`),
          category === group,
          `${type} belongs only to its category`,
        );
      }
    if (!category)
      assert.ok(
        html.includes("disabled="),
        "Type selection waits for a category",
      );
  }
  const { default: LearnerReport } = await server.ssrLoadModule(
    "/src/components/learner/workspace/LearnerReport.jsx",
  );
  const { default: TutorSession } = await server.ssrLoadModule(
    "/src/components/tutor/workspace/SessionDetails.jsx",
  );
  const { default: ChatDetails } = await server.ssrLoadModule(
    "/src/components/shared/ChatDetails.jsx",
  );
  const booking = {
    id: "7",
    bookingId: "BK-7",
    booking: "BK-7",
    name: "Fixture",
    learner: "Fixture",
    service: "Programming",
    date: "2098-01-01",
    start: "08:00",
    end: "09:00",
    status: "Completed",
    payment: "Paid",
    amount: 100,
  };
  const forms = [
    React.createElement(LearnerReport, {
      record: { bookings: [booking] },
      onSubmit: noop,
      onClose: noop,
    }),
    React.createElement(TutorSession, {
      data: { sessions: [booking] },
      sessionId: "7",
      initialAction: "incident",
      onClose: noop,
      go: noop,
    }),
    React.createElement(ChatDetails, {
      chat: { booking_id: "7" },
      mode: "report",
      role: "learner",
      close: noop,
    }),
    React.createElement(ChatDetails, {
      chat: { booking_id: "7" },
      mode: "report",
      role: "tutor",
      close: noop,
    }),
  ];
  for (const form of forms) {
    const html = renderToStaticMarkup(form);
    assert.ok(html.includes("Select an incident category"));
    assert.ok(html.includes("Select an incident type"));
    assert.ok(!html.includes("Repeated Rule Violations"));
  }
  console.log(
    "Learner, tutor, and both messaging report forms render unselected grouped fields.",
  );
} finally {
  await server.close();
}
