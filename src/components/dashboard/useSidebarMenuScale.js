import { useLayoutEffect, useState } from "react";

export default function useSidebarMenuScale(
  sidebarRef,
  headerRef,
  footerRef,
  menuRef,
) {
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const updateScale = () => {
      const sidebar = sidebarRef.current;
      const header = headerRef.current;
      const footer = footerRef.current;
      const menu = menuRef.current;

      if (!sidebar || !header || !footer || !menu) return;

      const availableHeight =
        sidebar.clientHeight - header.offsetHeight - footer.offsetHeight;
      const menuHeight = menu.scrollHeight;
      setScale(
        menuHeight > availableHeight
          ? Math.max(0.1, availableHeight / menuHeight)
          : 1,
      );
    };

    const observer = new ResizeObserver(updateScale);
    [sidebarRef.current, headerRef.current, footerRef.current, menuRef.current]
      .filter(Boolean)
      .forEach((element) => observer.observe(element));

    updateScale();
    window.visualViewport?.addEventListener("resize", updateScale);

    return () => {
      observer.disconnect();
      window.visualViewport?.removeEventListener("resize", updateScale);
    };
  }, [footerRef, headerRef, menuRef, sidebarRef]);

  return scale;
}
