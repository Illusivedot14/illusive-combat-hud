/** Physical window size (CSS px). */
export function getScreenViewportSize() {
  return {
    w: window.innerWidth || document.documentElement.clientWidth || 0,
    h: window.innerHeight || document.documentElement.clientHeight || 0
  };
}

/** Layout viewport for HUD positioning (same as screen when UI rotation is off). */
export function getUiViewportSize() {
  return getScreenViewportSize();
}

/** DOMRect in layout space (identity when UI is not rotated). */
export function screenRectToUiLocal(rect) {
  const left = rect.left;
  const right = rect.right;
  const top = rect.top;
  const bottom = rect.bottom;
  return {
    left,
    right,
    top,
    bottom,
    width: right - left,
    height: bottom - top,
    center: (left + right) / 2
  };
}

/** getBoundingClientRect remapped into layout space. */
export function getUiLocalRect(el) {
  if (!(el instanceof Element)) return null;
  return screenRectToUiLocal(el.getBoundingClientRect());
}
