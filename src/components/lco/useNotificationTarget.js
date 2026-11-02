import { useEffect, useRef } from "react";
export default function useNotificationTarget(target, rows, pageSize, setPage) {
  const scrolled = useRef(null);
  const index = target
    ? rows.findIndex(
        (row) =>
          String(target.entityType === "refunds" ? row.refundId : row.id) ===
          String(target.entityId),
      )
    : -1;
  useEffect(() => {
    if (index >= 0) setPage(Math.floor(index / pageSize) + 1);
  }, [index, pageSize, setPage, target]);
  return (row) => {
    const active =
      !!target &&
      String(target.entityType === "refunds" ? row.refundId : row.id) ===
        String(target.entityId);
    return {
      className: active ? "lco-notification-target" : undefined,
      tabIndex: active ? -1 : undefined,
      ref: active
        ? (node) => {
            const key = `${target.id}:${target.entityType}:${target.entityId}`;
            if (node && scrolled.current !== key) {
              scrolled.current = key;
              requestAnimationFrame(() => {
                node.scrollIntoView({ block: "center", behavior: "smooth" });
                if (node.isConnected) node.focus({ preventScroll: true });
              });
            }
          }
        : undefined,
    };
  };
}
