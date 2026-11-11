export function notificationHighlight(active) {
  if (!active) return {};
  return {
    "data-notification-highlight": "true",
    tabIndex: -1,
    ref: (node) => {
      if (!node || node.dataset.notificationScrolled) return;
      node.dataset.notificationScrolled = "true";
      requestAnimationFrame(() => {
        if (!node.isConnected) return;
        node.scrollIntoView({ block: "center", behavior: "smooth" });
        node.focus({ preventScroll: true });
      });
    },
  };
}
