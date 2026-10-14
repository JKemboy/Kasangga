export function bookingTotal(sessions, rate) {
  return (
    sessions.reduce(
      (cents, session) =>
        cents + Math.round(Number(rate) * Number(session.duration) * 100),
      0,
    ) / 100
  );
}

export function chooseBookingType(sessions, key, type, allowedTypes) {
  if (!allowedTypes.includes(type)) return sessions;
  return sessions.map((session) =>
    key === "all" || session.date + "T" + session.time === key
      ? { ...session, type }
      : session,
  );
}
