import { useState, useEffect } from "react";

export function useKeyboardHeight() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const isKeyboardOpen = keyboardHeight > 0;

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const onResize = () => {
      const heightDiff = window.innerHeight - viewport.height;
      setKeyboardHeight(heightDiff > 50 ? heightDiff : 0);

      // Auto-scroll focused input into view
      if (heightDiff > 50 && document.activeElement instanceof HTMLElement) {
        const el = document.activeElement;
        if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT") {
          setTimeout(() => {
            el.scrollIntoView({ block: "center", behavior: "smooth" });
          }, 100);
        }
      }
    };

    viewport.addEventListener("resize", onResize);
    viewport.addEventListener("scroll", onResize);

    return () => {
      viewport.removeEventListener("resize", onResize);
      viewport.removeEventListener("scroll", onResize);
    };
  }, []);

  return { keyboardHeight, isKeyboardOpen };
}
