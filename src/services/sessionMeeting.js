export function meetingUrl(value) {
  if (!value || typeof value !== "string") return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" && !url.username && !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}

export function meetingPlatform(platform, link) {
  if (platform?.trim()) return platform.trim();
  const url = meetingUrl(link);
  if (!url) return "Meeting link not provided";
  const host = new URL(url).hostname;
  if (host === "meet.google.com") return "Google Meet";
  if (host === "zoom.us" || host.endsWith(".zoom.us")) return "Zoom";
  return host;
}
