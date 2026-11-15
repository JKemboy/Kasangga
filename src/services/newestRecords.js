const time = (value) => {
  const parsed = Date.parse(value || "");
  return Number.isFinite(parsed) ? parsed : 0;
};

export const newestRecords = (dateOf, idOf) => (a, b) =>
  time(dateOf(b)) - time(dateOf(a)) || Number(idOf(b)) - Number(idOf(a));
