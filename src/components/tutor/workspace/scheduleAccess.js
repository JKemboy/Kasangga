export function tutorScheduleReady(data, loading = false, error = "") {
  // Keep a known confirmed schedule usable during a background refresh.
  if (loading && !data.classSchedule) return false;
  return (
    !error &&
    !!data.classSchedule?.source &&
    Array.isArray(data.classSchedule?.classes) &&
    data.classSchedule.classes.length > 0
  );
}
