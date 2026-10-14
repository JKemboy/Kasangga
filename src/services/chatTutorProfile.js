export function chatTutorProfile(data) {
  const services = (data.services || []).map((s) => ({
    ...s,
    rate: Number(s.rate),
    type:
      { online: "Online", "in-person": "In-person", both: "Both" }[
        s.type?.toLowerCase()
      ] || s.type,
  }));
  const weeklyAvailability = {};
  for (const slot of data.availability || []) {
    const day = slot.day.slice(0, 3).toLowerCase();
    const label = day[0].toUpperCase() + day.slice(1);
    const time = (value) =>
      new Date("2000-01-01T" + value).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });
    const range = `${time(slot.start)} – ${time(slot.end)}`;
    weeklyAvailability[label] = [weeklyAvailability[label], range]
      .filter(Boolean)
      .join(", ");
  }
  return {
    id: String(data.tutor_profile_id),
    tutorProfileId: String(data.tutor_profile_id),
    userId: data.user_id,
    name: data.name,
    image: /^https:\/\//i.test(data.image || "") ? data.image : undefined,
    degree: [data.program, data.year && `Year ${data.year}`]
      .filter(Boolean)
      .join(", "),
    verified: ["verified", "approved"].includes(
      data.verification?.toLowerCase(),
    ),
    online: data.online,
    bio: data.tutor_bio || data.bio || "",
    expertise: data.expertise || [],
    rating: Number(data.rating),
    completed: data.completed,
    reviews: data.reviews?.length || 0,
    reviewEntries: (data.reviews || []).map((r) => ({
      ...r,
      date: new Date(r.date).toLocaleDateString("en-PH", {
        timeZone: "Asia/Manila",
      }),
    })),
    services,
    rate: services.length ? Math.min(...services.map((s) => s.rate)) : null,
    types: [
      ...new Set(
        services.flatMap((s) =>
          s.type === "Both" ? ["Online", "In-person"] : [s.type],
        ),
      ),
    ],
    levels: [...new Set(services.map((s) => s.level).filter(Boolean))],
    weeklyAvailability,
  };
}
