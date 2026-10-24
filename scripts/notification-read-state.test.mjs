import test from "node:test";
import assert from "node:assert/strict";
import {
  persistNotificationRead,
  loadActivityReadIds,
} from "../src/services/notificationReadState.js";

function database() {
  const rows = [
    {
      notification_id: 1,
      user_id: "alice",
      notification_type: "system",
      is_read: false,
    },
    {
      notification_id: 2,
      user_id: "alice",
      notification_type: "system",
      is_read: false,
    },
    {
      notification_id: 3,
      user_id: "bob",
      notification_type: "system",
      is_read: false,
    },
  ];
  return {
    rows,
    rpc: async (_name, { p_event_ids }) => {
      for (const id of p_event_ids)
        if (!rows.some((row) => row.message === id))
          rows.push({
            notification_id: rows.length + 1,
            user_id: "alice",
            notification_type: "activity_read_receipt",
            message: id,
            is_read: true,
          });
      return { error: null };
    },
    from: () => {
      const filters = [];
      let update;
      const query = {
        update: (value) => {
          update = value;
          return query;
        },
        eq: (key, value) => {
          filters.push((row) => row[key] === value);
          return query;
        },
        in: (key, values) => {
          filters.push((row) => values.includes(row[key]));
          return query;
        },
        select: () => query,
        order: () => query,
        range: async (start, end) => ({
          data: rows
            .filter((row) => filters.every((f) => f(row)))
            .slice(start, end + 1),
          error: null,
        }),
        then: (resolve) => {
          const data = rows.filter((row) => filters.every((f) => f(row)));
          if (update) data.forEach((row) => Object.assign(row, update));
          return Promise.resolve({ data, error: null }).then(resolve);
        },
      };
      return query;
    },
  };
}
test("click updates only the selected notification for its owner", async () => {
  const client = database();
  await persistNotificationRead(
    "alice",
    [{ id: "notification-1", notificationId: 1 }],
    client,
  );
  assert.equal(client.rows[0].is_read, true);
  assert.equal(client.rows[1].is_read, false);
  assert.equal(client.rows[2].is_read, false);
  await assert.rejects(
    persistNotificationRead("alice", [{ notificationId: 3 }], client),
  );
});
test("derived read state survives a fresh reload without marking other events", async () => {
  const client = database();
  await persistNotificationRead(
    "alice",
    [{ id: "session-42-Confirmed", kind: "session" }],
    client,
  );
  const reloaded = await loadActivityReadIds("alice", client);
  assert.ok(reloaded.has("session-42-Confirmed"));
  assert.ok(!reloaded.has("session-43-Confirmed"));
  assert.equal(client.rows[1].is_read, false);
  assert.equal((await loadActivityReadIds("bob", client)).size, 0);
});
test("clicking one message alert marks only its conversation", async () => {
  const calls = [];
  await persistNotificationRead(
    "alice",
    [{ id: "message-42-7", kind: "message", bookingId: "42" }],
    database(),
    async (id) => calls.push(id),
  );
  assert.deepEqual(calls, ["42"]);
});
test("failed persistence rejects instead of reporting a read notification", async () => {
  const client = { rpc: async () => ({ error: new Error("Unavailable") }) };
  await assert.rejects(
    persistNotificationRead(
      "alice",
      [{ id: "report-received-1", kind: "report" }],
      client,
    ),
    /Unavailable/,
  );
});
