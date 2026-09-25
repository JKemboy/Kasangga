const normalize = (value) =>
  String(value).normalize("NFKC").toLowerCase().trim();

export function filterSavedTutors(
  tutors,
  { query = "", subject = "all", availability = "all", sort = "recent" } = {},
) {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  const matches = tutors.filter((tutor) => {
    const searchable = normalize(
      [
        ...tutor.slice(0, 8),
        tutor[8] ? "online" : "offline",
        "verified",
        "hour",
      ].join(" "),
    );
    return (
      words.every((word) => searchable.includes(word)) &&
      (subject === "all" ||
        tutor[2]
          .split(",")
          .some((item) => normalize(item) === normalize(subject))) &&
      (availability === "all" ||
        (availability === "online"
          ? tutor[8]
          : availability === "offline"
            ? !tutor[8]
            : tutor[6] === availability))
    );
  });
  const price = (tutor) => Number(tutor[5].replace(/[^0-9.]/g, ""));
  const comparators = {
    rating: (a, b) => Number(b[3]) - Number(a[3]),
    "price-low": (a, b) => price(a) - price(b),
    "price-high": (a, b) => price(b) - price(a),
    name: (a, b) => a[0].localeCompare(b[0]),
  };
  // The source list is stored in most-recently-saved order.
  return comparators[sort] ? matches.sort(comparators[sort]) : matches;
}
