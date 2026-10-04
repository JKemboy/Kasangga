const sessions = [];

export const sessionRecords = sessions.map((details, index) => ({
  id: index + 1,
  lifecycle: "Upcoming",
  date: details[9],
  paymentStatus: details[15],
  details,
}));
