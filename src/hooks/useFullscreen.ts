import { useCallback, useEffect, useState } from "react";

// Thin wrapper around the Fullscreen API. Tracks whether the document is
// currently in fullscreen (kept in sync via the `fullscreenchange` event, so
// pressing Escape updates the UI too) and exposes a toggle.
export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(
    () => typeof document !== "undefined" && Boolean(document.fullscreenElement)
  );

  const supported =
    typeof document !== "undefined" &&
    (document.fullscreenEnabled || (document as any).webkitFullscreenEnabled);

  useEffect(() => {
    function onChange() {
      setIsFullscreen(
        Boolean(document.fullscreenElement || (document as any).webkitFullscreenElement)
      );
    }
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, []);

  const toggle = useCallback(async () => {
    try {
      if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
        await (document.exitFullscreen?.() ?? (document as any).webkitExitFullscreen?.());
      } else {
        const el = document.documentElement as any;
        await (el.requestFullscreen?.() ?? el.webkitRequestFullscreen?.());
      }
    } catch {
      // Fullscreen can be refused (e.g. not triggered by a user gesture); ignore.
    }
  }, []);

  return { isFullscreen, toggle, supported };
}
