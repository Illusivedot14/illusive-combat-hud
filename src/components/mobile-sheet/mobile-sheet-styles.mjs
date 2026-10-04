/** Critical mobile-sheet CSS — self-contained (no Swipe dependency). */
export const MOBILE_SHEET_CRITICAL_CSS = `
/* ---- Theme tokens (purple) ---- */
body.ich-mobile-client {
  --mobile-bg-primary: #16121f;
  --mobile-bg-secondary: #1f1830;
  --mobile-bg-tertiary: rgba(180,140,255,0.10);
  --mobile-bg-button: rgba(180,140,255,0.08);
  --mobile-bg-button-active: rgba(180,140,255,0.18);
  --mobile-border: rgba(180,140,255,0.18);
  --mobile-text-primary: #f3eefc;
  --mobile-text-secondary: #b9a9d4;
  --mobile-text-muted: #7d6f96;
  --mobile-accent: #b794f6;
  --mobile-accent-70: rgba(183,148,246,0.7);
  --mobile-accent-50: rgba(183,148,246,0.5);
  --mobile-accent-45: rgba(183,148,246,0.45);
  --mobile-accent-20: rgba(183,148,246,0.22);
  --mobile-accent-10: rgba(183,148,246,0.12);
  --mobile-shadow: rgba(20,8,40,0.4);
  --mobile-shadow-strong: rgba(10,4,24,0.65);
  --mobile-btn-bg: #2a2140;
  --mobile-btn-border: rgba(183,148,246,0.28);
  --mobile-btn-bg-subtle: rgba(183,148,246,0.10);
  --mobile-page-bg: #121116;
}

/* ---- Sheet-only backdrop (behind carousel / sheet) ---- */
#ich-mobile-nocanvas-bg {
  position: fixed !important;
  inset: 0 !important;
  z-index: 0 !important;
  overflow: hidden !important;
  pointer-events: none !important;
  background: var(--mobile-page-bg, #121116);
}
#ich-mobile-nocanvas-bg .ich-nocanvas-bg-image {
  position: absolute !important;
  inset: 0 !important;
  background-size: cover !important;
  background-position: center !important;
  background-repeat: no-repeat !important;
  background-color: var(--mobile-bg-secondary, #1a1820);
}
#ich-mobile-nocanvas-bg.has-image .ich-nocanvas-bg-image {
  background-color: transparent;
}
#ich-mobile-nocanvas-bg .ich-nocanvas-bg-vignette {
  position: absolute !important;
  inset: 0 !important;
  pointer-events: none !important;
  background: radial-gradient(
    ellipse at center,
    transparent 15%,
    rgba(0, 0, 0, 0.25) 30%,
    rgba(0, 0, 0, 0.75) 65%,
    rgba(0, 0, 0, 1) 100%
  );
}
body.ich-mobile-client {
  background: var(--mobile-page-bg, #121116) !important;
}

/* ---- Hide desktop Foundry chrome on mobile clients ---- */
body.ich-mobile-client #board,
body.ich-mobile-client #ui-left,
body.ich-mobile-client #ui-right,
body.ich-mobile-client #ui-top,
body.ich-mobile-client #ui-bottom,
body.ich-mobile-client #sidebar,
body.ich-mobile-client #navigation,
body.ich-mobile-client #players,
body.ich-mobile-client #hotbar,
body.ich-mobile-client #fps,
body.ich-mobile-client #logo,
body.ich-mobile-client #pause,
body.ich-mobile-client #ich-hud-overlay,
body.ich-mobile-client #ich-action-bar-dock,
body.ich-mobile-client #ich-party-status,
body.ich-mobile-client #ich-turn-tracker,
body.ich-mobile-client #ich-token-statuses {
  display: none !important;
}

/* Suppress leftover Swipe chrome if that module is still enabled */
body.ich-mobile-client .mobile-sheet-carousel:not(#ich-mobile-carousel),
body.ich-mobile-client .mobile-sheet-drawer:not(.ich-illusive-mobile-sheet),
body.ich-mobile-client .mobile-chat-drawer,
body.ich-mobile-client .mobile-button-stack {
  display: none !important;
}

/* ---- Illusive character carousel (below sheet body, themed dock) ---- */
body.ich-mobile-client {
  --ich-carousel-dock: calc(96px + env(safe-area-inset-bottom, 0px));
}
#ich-mobile-carousel {
  --avatar-size: clamp(60px, 16vw, 72px);
  --carousel-glow-pad: 14px;
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  transform: none;
  z-index: 100001;
  width: 100%;
  max-width: none;
  height: var(--ich-carousel-dock);
  padding-bottom: env(safe-area-inset-bottom, 0px);
  box-sizing: border-box;
  pointer-events: auto;
  overflow: visible;
  background: linear-gradient(
    to top,
    var(--mobile-page-bg, #121116) 55%,
    color-mix(in srgb, var(--mobile-page-bg, #121116) 88%, transparent) 100%
  );
  border-top: 1px solid var(--mobile-border, rgba(255,255,255,0.12));
}
/* Fade only on a pseudo so it doesn't clip the focus glow */
#ich-mobile-carousel::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
  background: linear-gradient(to right, rgba(var(--mobile-page-bg-rgb, 18,17,22), 0.92) 0%, transparent 14%, transparent 86%, rgba(var(--mobile-page-bg-rgb, 18,17,22), 0.92) 100%);
}
#ich-mobile-carousel[hidden] { display: none !important; }
#ich-mobile-carousel-track,
#ich-mobile-carousel .ich-mobile-carousel-track {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 100%;
  width: 100%;
  box-sizing: border-box;
  /* Side padding = half viewport minus half avatar so snap/center lands on screen center */
  padding: var(--carousel-glow-pad) calc(50% - var(--avatar-size) / 2);
  overflow-x: auto;
  overflow-y: hidden;
  scroll-snap-type: x mandatory;
  scroll-padding-inline: calc(50% - var(--avatar-size) / 2);
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
  -webkit-mask-image: none;
  mask-image: none;
}
#ich-mobile-carousel .ich-mobile-carousel-track::-webkit-scrollbar { display: none; }
#ich-mobile-carousel .ich-carousel-avatar {
  position: relative;
  flex: 0 0 var(--avatar-size);
  width: var(--avatar-size);
  height: var(--avatar-size);
  padding: 0;
  border: 3px solid var(--mobile-btn-border, rgba(255,255,255,0.18));
  border-radius: 50%;
  background: var(--mobile-btn-bg, #2a2930);
  box-shadow: 0 4px 8px rgba(0,0,0,0.45);
  overflow: visible;
  scroll-snap-align: center;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
  will-change: transform;
}
#ich-mobile-carousel .ich-carousel-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
  display: block;
  pointer-events: none;
}
/* Center / focused character — glow inside padded track so it is not clipped */
#ich-mobile-carousel .ich-carousel-avatar.is-focused {
  border-color: var(--mobile-accent, #b794f6) !important;
  transform: scale(1.04);
  box-shadow:
    0 0 0 2px var(--mobile-accent-45, rgba(183, 148, 246, 0.45)),
    0 0 14px 4px var(--mobile-accent-70, rgba(183, 148, 246, 0.7)),
    0 4px 10px rgba(0,0,0,0.45) !important;
  z-index: 2;
}
#ich-mobile-carousel .ich-carousel-close {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 1.35rem;
  opacity: 0;
  pointer-events: none;
  background: rgba(0,0,0,0.35);
  border-radius: 50%;
  transition: opacity 0.15s ease;
}
#ich-mobile-carousel.is-open .ich-carousel-avatar.is-selected img { opacity: 0.35; }
#ich-mobile-carousel.is-open .ich-carousel-avatar.is-selected .ich-carousel-close { opacity: 1; }
/* Keep all party avatars visible so you can switch — do not hide non-selected. */

/* ---- Self-contained drawer shell (no swipe-vtt.css) ---- */
#ich-mobile-sheet-root .ich-illusive-mobile-sheet.mobile-sheet-drawer {
  position: fixed !important;
  inset: 0 !important;
  z-index: 1 !important;
  pointer-events: all !important;
}
#ich-mobile-sheet-root .drawer-backdrop {
  display: none !important;
}
#ich-mobile-sheet-root .drawer-content {
  position: fixed !important;
  inset: 0 !important;
  left: 0 !important;
  right: 0 !important;
  top: 0 !important;
  bottom: var(--ich-carousel-dock, 96px) !important;
  margin: 0 !important;
  width: 100% !important;
  max-width: none !important;
  height: auto !important;
  max-height: none !important;
  background: var(--mobile-bg-primary, #1e1d21) !important;
  border-radius: 0 !important;
  border: none !important;
  border-bottom: 1px solid var(--mobile-border, rgba(255,255,255,0.12)) !important;
  box-shadow: none !important;
  display: flex !important;
  flex-direction: column !important;
  color: var(--mobile-text-primary, #fff) !important;
  overflow: hidden !important;
  transform: none !important;
  padding-top: env(safe-area-inset-top, 0px) !important;
  padding-bottom: 0 !important;
  box-sizing: border-box !important;
}
/* No swipe-down affordance — sheet is full-screen, close via carousel */
#ich-mobile-sheet-root .drawer-handle {
  display: none !important;
}
#ich-mobile-sheet-root .drawer-header {
  flex-shrink: 0;
  background: linear-gradient(120deg, var(--mobile-accent-10, rgba(183,148,246,0.12)) 0%, var(--mobile-bg-secondary, #1f1830) 55%);
  border-bottom: 1px solid var(--mobile-border, rgba(255,255,255,0.12));
}
#ich-mobile-sheet-root .header-top {
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
}
#ich-mobile-sheet-root .header-info {
  flex: 1;
  min-width: 0;
  display: grid !important;
  grid-template-columns: 1fr auto !important;
  grid-template-rows: auto auto !important;
  gap: 0 8px !important;
  align-items: center !important;
}
#ich-mobile-sheet-root .char-name {
  grid-column: 1 / 3 !important;
  grid-row: 1 !important;
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--mobile-text-primary, #fff);
}
#ich-mobile-sheet-root .char-details {
  grid-column: 1 !important;
  grid-row: 2 !important;
  font-size: 0.85rem;
  color: var(--mobile-text-secondary, #aaa);
}
#ich-mobile-sheet-root .hp-display {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 4px !important;
  margin-top: 0 !important;
  grid-column: 2 !important;
  grid-row: 2 / -1 !important;
  justify-self: end !important;
  align-self: stretch !important;
  border: 1px solid var(--mobile-border, rgba(255,255,255,0.18)) !important;
  background: var(--mobile-btn-bg-subtle, rgba(255,255,255,0.08)) !important;
  border-radius: 8px !important;
  padding: 6px 12px !important;
  color: inherit !important;
  cursor: pointer !important;
  -webkit-tap-highlight-color: transparent;
  box-shadow: 0 1px 0 rgba(255,255,255,0.06) inset !important;
  min-height: 44px !important;
  min-width: 5.5rem !important;
}
#ich-mobile-sheet-root .hp-display:active {
  background: var(--mobile-bg-button-active, rgba(255,255,255,0.14)) !important;
}
#ich-mobile-sheet-root .hp-current {
  font-size: 1.35rem !important;
  font-weight: 700 !important;
  color: var(--mobile-accent, #b794f6) !important;
}
#ich-mobile-sheet-root .hp-separator,
#ich-mobile-sheet-root .hp-max {
  color: var(--mobile-text-secondary, #aaa) !important;
  font-size: 1.15rem !important;
}
#ich-mobile-sheet-root .hp-temp { color: #4fc3f7; font-weight: 600; }
#ich-mobile-sheet-root .header-avatar {
  width: 64px !important;
  height: 64px !important;
  border-radius: 50% !important;
  object-fit: cover !important;
  object-position: top !important;
  border: 2px solid rgba(255,255,255,0.22) !important;
  display: block !important;
}
#ich-mobile-sheet-root .inspiration-indicator {
  position: absolute;
  right: -2px;
  bottom: -2px;
  color: #f0c14a;
  opacity: 0;
}
#ich-mobile-sheet-root .avatar-container.has-inspiration .inspiration-indicator { opacity: 1; }

/* Compact inspiration box in the stats row */
#ich-mobile-sheet-root .stat-box.insp-box {
  cursor: pointer !important;
  -webkit-tap-highlight-color: transparent;
}
#ich-mobile-sheet-root .stat-box.insp-box .stat-value {
  font-size: 1.05rem !important;
  line-height: 1 !important;
  color: var(--mobile-text-muted, #7d6f96) !important;
}
#ich-mobile-sheet-root .stat-box.insp-box.is-on {
  border-color: rgba(240, 193, 74, 0.55) !important;
  background: rgba(240, 193, 74, 0.14) !important;
}
#ich-mobile-sheet-root .stat-box.insp-box.is-on .stat-value,
#ich-mobile-sheet-root .stat-box.insp-box.is-on label {
  color: #f0c14a !important;
}
#ich-mobile-sheet-root .stat-box.insp-box:active {
  filter: brightness(1.08);
}

/* Death saves: centered on the sheet/phone, balanced 3 | skull | 3 */
#ich-mobile-sheet-root .death-save-overlay,
#ich-mobile-sheet-root .ich-ms-death {
  position: relative !important;
  left: auto !important;
  top: auto !important;
  transform: none !important;
  z-index: 5 !important;
  display: grid !important;
  grid-template-columns: 1fr auto 1fr !important;
  align-items: center !important;
  justify-items: center !important;
  column-gap: 12px !important;
  width: 100% !important;
  max-width: 320px !important;
  margin: 10px auto 6px !important;
  padding: 8px 14px !important;
  box-sizing: border-box !important;
  border-radius: 10px !important;
  background: var(--mobile-bg-secondary, #25242a) !important;
  border: 1px solid var(--mobile-border, rgba(255,255,255,0.12)) !important;
  box-shadow: 0 4px 12px rgba(0,0,0,0.35) !important;
  pointer-events: auto !important;
}
#ich-mobile-sheet-root .death-saves-group,
#ich-mobile-sheet-root .ich-ms-death-group {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
  flex: 0 0 auto !important;
  width: 100% !important;
}
#ich-mobile-sheet-root .death-saves-group.success {
  justify-content: flex-end !important;
}
#ich-mobile-sheet-root .death-saves-group.failure {
  justify-content: flex-start !important;
}
#ich-mobile-sheet-root .death-pip,
#ich-mobile-sheet-root .ich-ms-pip {
  flex: 0 0 auto !important;
  width: 18px !important;
  height: 18px !important;
  min-width: 18px !important;
  min-height: 18px !important;
  border-radius: 50% !important;
  border: 2px solid rgba(255,255,255,0.5) !important;
  background: transparent !important;
  padding: 0 !important;
  margin: 0 !important;
  cursor: pointer !important;
  box-sizing: border-box !important;
}
/* Color from group so failures always light red when .filled */
#ich-mobile-sheet-root .death-saves-group.success .death-pip.filled,
#ich-mobile-sheet-root .death-saves-group.success .ich-ms-pip.is-filled,
#ich-mobile-sheet-root .death-pip.filled.is-success,
#ich-mobile-sheet-root .ich-ms-pip.is-success.is-filled {
  background: #62d58a !important;
  border-color: #62d58a !important;
}
#ich-mobile-sheet-root .death-saves-group.failure .death-pip.filled,
#ich-mobile-sheet-root .death-saves-group.failure .ich-ms-pip.is-filled,
#ich-mobile-sheet-root .death-pip.filled.is-failure,
#ich-mobile-sheet-root .ich-ms-pip.is-failure.is-filled {
  background: #ef6b6b !important;
  border-color: #ef6b6b !important;
}
#ich-mobile-sheet-root .death-skull,
#ich-mobile-sheet-root .ich-ms-death-roll {
  flex: 0 0 auto !important;
  width: 36px !important;
  height: 36px !important;
  min-width: 36px !important;
  border-radius: 50% !important;
  border: 1px solid rgba(255,255,255,0.2) !important;
  background: rgba(0,0,0,0.35) !important;
  color: #fff !important;
  cursor: pointer !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  font-size: 1.05rem !important;
  padding: 0 !important;
  justify-self: center !important;
}
#ich-mobile-sheet-root .header-top {
  display: flex;
  align-items: center;
  margin-bottom: 0;
}
#ich-mobile-sheet-root .drawer-header:has(.death-save-overlay) .header-top,
#ich-mobile-sheet-root .drawer-header:has(.ich-ms-death) .header-top {
  margin-bottom: 0 !important;
}
#ich-mobile-sheet-root .hp-bar-thin {
  height: 4px;
  background: var(--mobile-bg-tertiary, rgba(255,255,255,0.08));
  margin: 8px -16px 0;
  display: flex;
  overflow: hidden;
}
#ich-mobile-sheet-root .hp-bar-fill {
  height: 100%;
  background: linear-gradient(to right, var(--mobile-accent, #b794f6), var(--mobile-accent-45, rgba(183,148,246,0.45)));
}
#ich-mobile-sheet-root .hp-bar-temp {
  height: 100%;
  background: rgba(79,195,247,0.65);
}
/* 5 equal boxes — AC / Speed / Init / Prof / Insp */
#ich-mobile-sheet-root .stats-row {
  display: grid !important;
  grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
  gap: 8px !important;
  margin-top: 10px !important;
  padding: 8px 16px !important;
  margin-left: -16px !important;
  margin-right: -16px !important;
  margin-bottom: 12px !important;
  height: auto !important;
  min-height: 0 !important;
  background: var(--mobile-accent-10, rgba(183,148,246,0.1)) !important;
  align-items: stretch !important;
}
#ich-mobile-sheet-root .stat-box {
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 2px !important;
  width: auto !important;
  min-width: 0 !important;
  max-width: none !important;
  aspect-ratio: auto !important;
  height: auto !important;
  min-height: 4.25rem !important;
  border: 1px solid var(--mobile-border, rgba(255,255,255,0.12)) !important;
  border-radius: 10px !important;
  background: var(--mobile-bg-tertiary, rgba(255,255,255,0.06)) !important;
  color: inherit !important;
  padding: 10px 6px !important;
  margin: 0 !important;
  box-shadow: none !important;
  line-height: 1.2 !important;
}
#ich-mobile-sheet-root .stat-box .stat-value {
  font-weight: 700 !important;
  font-size: 1.25rem !important;
  line-height: 1.15 !important;
  color: var(--mobile-text-primary, #fff) !important;
}
#ich-mobile-sheet-root .stat-box label {
  font-size: 0.65rem !important;
  text-transform: uppercase !important;
  color: var(--mobile-text-secondary, #aaa) !important;
  margin: 0 !important;
  line-height: 1.2 !important;
}
/* Amethyst injects a fake "INITIATIVE" label — kill it */
#ich-mobile-sheet-root .init-box::before,
#ich-mobile-sheet-root .init-box::after {
  content: none !important;
  display: none !important;
}
#ich-mobile-sheet-root .ac-box,
#ich-mobile-sheet-root .speed-box,
#ich-mobile-sheet-root .init-box {
  min-width: 0 !important;
  aspect-ratio: auto !important;
}

#ich-mobile-sheet-root .section-nav { flex-shrink: 0; position: relative; }
#ich-mobile-sheet-root .section-nav-track {
  display: flex;
  gap: 4px;
  padding: 8px 12px;
  overflow-x: auto;
  scrollbar-width: none;
  background: var(--mobile-bg-secondary, #25242a);
  border-bottom: 1px solid var(--mobile-border, rgba(255,255,255,0.12));
}
#ich-mobile-sheet-root .section-nav-track::-webkit-scrollbar { display: none; }
#ich-mobile-sheet-root .section-tab {
  flex: 0 0 auto;
  border: 1px solid transparent;
  border-radius: 999px;
  background: transparent;
  color: var(--mobile-text-secondary, #aaa);
  padding: 8px 12px;
  font-size: 0.85rem;
}
#ich-mobile-sheet-root .section-tab.active {
  color: #fff;
  background: var(--mobile-accent, #b794f6);
}
#ich-mobile-sheet-root .sections-viewport {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
}
#ich-mobile-sheet-root .sections-container {
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
/* One section; tab bodies are toggled via Handlebars {{#if tabs.*}}, not .active */
#ich-mobile-sheet-root .sheet-section {
  display: block !important;
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  overflow-y: auto !important;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
}
#ich-mobile-sheet-root .ability-check-area,
#ich-mobile-sheet-root .skill-row,
#ich-mobile-sheet-root .item-row,
#ich-mobile-sheet-root .feature-row,
#ich-mobile-sheet-root .spell-row,
#ich-mobile-sheet-root .effect-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: inherit;
  text-align: left;
}
#ich-mobile-sheet-root .ability-check-area:active,
#ich-mobile-sheet-root .skill-row:active,
#ich-mobile-sheet-root .item-row:active,
#ich-mobile-sheet-root .feature-row:active,
#ich-mobile-sheet-root .spell-row:active {
  background: var(--mobile-bg-button-active, rgba(255,255,255,0.1));
}

#ich-mobile-sheet-root {
  position: fixed !important;
  inset: 0 !important;
  z-index: 100000 !important;
  pointer-events: none !important;
}
#ich-mobile-sheet-root:empty { display: none !important; }
#ich-mobile-sheet-root.ich-mobile-sheet-behind-dialog { z-index: 100 !important; }

/* Foundry dialogs / confirms must sit above the mobile sheet + carousel dock. */
body.ich-foundry-dialog-open #ich-mobile-sheet-root,
body.ich-foundry-dialog-open #ich-mobile-carousel,
body.ich-foundry-dialog-open #ich-mobile-dice-roller,
body.ich-foundry-dialog-open #ich-mobile-global-gear {
  pointer-events: none !important;
}
body.ich-foundry-dialog-open #ich-mobile-sheet-root {
  z-index: 100 !important;
}
body.ich-foundry-dialog-open #ich-mobile-carousel {
  z-index: 99 !important;
}

/* Foundry toasts must sit above the sheet (sheet is 100000; Swipe used 99999). */
body.ich-mobile-client #notifications,
body.ich-mobile-sheet-open #notifications {
  position: fixed !important;
  top: 5% !important;
  left: 50% !important;
  transform: translateX(-50%) !important;
  z-index: 100080 !important;
  pointer-events: none !important;
  width: max-content !important;
  max-width: 85vw !important;
}
body.ich-mobile-client #notifications .notification,
body.ich-mobile-sheet-open #notifications .notification {
  pointer-events: auto !important;
  /* Do not theme toasts — keep Foundry default type colors */
  text-shadow: none !important;
  background: unset !important;
  background-color: unset !important;
  color: unset !important;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.55) !important;
}
body.ich-mobile-client #notifications .notification.info,
body.ich-mobile-sheet-open #notifications .notification.info {
  background: rgba(48, 112, 160, 0.95) !important;
  color: #fff !important;
}
body.ich-mobile-client #notifications .notification.warning,
body.ich-mobile-client #notifications .notification.warn,
body.ich-mobile-sheet-open #notifications .notification.warning,
body.ich-mobile-sheet-open #notifications .notification.warn {
  background: rgba(180, 120, 20, 0.95) !important;
  color: #fff !important;
}
body.ich-mobile-client #notifications .notification.error,
body.ich-mobile-sheet-open #notifications .notification.error {
  background: rgba(160, 40, 40, 0.95) !important;
  color: #fff !important;
}
body.ich-mobile-client #notifications .notification:not(.info):not(.warning):not(.warn):not(.error),
body.ich-mobile-sheet-open #notifications .notification:not(.info):not(.warning):not(.warn):not(.error) {
  background: rgba(40, 40, 48, 0.95) !important;
  color: #fff !important;
}

/* Client-wide settings gear — under the sheet so an open sheet covers it */
#ich-mobile-global-gear {
  position: fixed !important;
  top: calc(10px + env(safe-area-inset-top, 0px)) !important;
  right: calc(10px + env(safe-area-inset-right, 0px)) !important;
  z-index: 99950 !important;
  width: 44px !important;
  height: 44px !important;
  margin: 0 !important;
  padding: 0 !important;
  border-radius: 12px !important;
  border: 1px solid var(--mobile-border, rgba(255,255,255,0.2)) !important;
  background: var(--mobile-bg-secondary, #1f1830) !important;
  color: var(--mobile-text-primary, #fff) !important;
  font-size: 1.1rem !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  box-shadow: 0 4px 16px var(--mobile-shadow-strong, rgba(0,0,0,0.45)) !important;
  cursor: pointer !important;
  -webkit-tap-highlight-color: transparent;
  pointer-events: auto !important;
}
#ich-mobile-global-gear:active {
  background: var(--mobile-bg-button-active, rgba(255,255,255,0.14)) !important;
}
body.ich-mobile-sheet-open #ich-mobile-global-gear {
  visibility: hidden !important;
  pointer-events: none !important;
}
body.ich-mobile-client.ich-dsn-config-open #ich-mobile-global-gear,
body.ich-dsn-showing #ich-mobile-global-gear {
  visibility: hidden !important;
  pointer-events: none !important;
}

/* Dice So Nice must render above the mobile sheet + carousel. */
body.ich-dsn-showing #dice-box-canvas,
body.ich-dsn-showing #dice-box-canvas canvas {
  z-index: 200000 !important;
  pointer-events: none !important;
  display: block !important;
  visibility: visible !important;
  opacity: 1 !important;
}
body.ich-dsn-showing #ich-mobile-sheet-root {
  z-index: 100 !important;
}
body.ich-dsn-showing #ich-mobile-carousel {
  z-index: 101 !important;
}

/* Dice So Nice config app above mobile sheet */
body.ich-mobile-client.ich-dsn-config-open #dice-config,
body.ich-mobile-client.ich-dsn-config-open .application.dice-so-nice,
body.ich-mobile-client #dice-config,
body.ich-mobile-client .application.dice-so-nice {
  z-index: 100200 !important;
}
body.ich-mobile-client.ich-dsn-config-open #ich-mobile-sheet-root {
  z-index: 100 !important;
}
body.ich-mobile-client.ich-dsn-config-open #ich-mobile-carousel {
  z-index: 101 !important;
}
body.ich-dsn-hide-chrome {
  visibility: hidden !important;
  pointer-events: none !important;
}

/* Gear settings menu — full-width bottom sheet, not a cramped card */
.ich-ms-overlay.ich-ms-settings-overlay,
.ich-ms-overlay.ich-ms-accent-overlay {
  align-items: flex-end !important;
  justify-content: stretch !important;
  padding: 0 !important;
}
.ich-ms-overlay .ich-ms-settings-dialog,
.ich-ms-overlay .ich-ms-accent-dialog {
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
  border-radius: 18px 18px 0 0 !important;
  padding: 18px 18px calc(18px + env(safe-area-inset-bottom, 0px)) !important;
  max-height: min(88dvh, 920px) !important;
  overflow: auto !important;
  -webkit-overflow-scrolling: touch;
}
.ich-ms-overlay .ich-ms-settings-list {
  display: flex !important;
  flex-direction: column !important;
  gap: 12px !important;
}
.ich-ms-overlay .ich-ms-settings-item {
  display: flex !important;
  align-items: center !important;
  gap: 14px !important;
  width: 100% !important;
  margin: 0 !important;
  padding: 16px 16px !important;
  min-height: 64px !important;
  border-radius: 14px !important;
  border: 1px solid var(--mobile-border, rgba(183,148,246,0.28)) !important;
  background: var(--mobile-bg-button, rgba(183,148,246,0.08)) !important;
  color: var(--mobile-text-primary, #fff) !important;
  text-align: left !important;
  cursor: pointer !important;
}
.ich-ms-overlay .ich-ms-settings-item i {
  width: 1.6rem !important;
  text-align: center !important;
  color: var(--mobile-accent, #b794f6) !important;
  font-size: 1.25rem !important;
  flex: 0 0 auto !important;
}
.ich-ms-overlay .ich-ms-settings-item span {
  display: flex !important;
  flex-direction: column !important;
  gap: 4px !important;
  min-width: 0 !important;
  flex: 1 1 auto !important;
}
.ich-ms-overlay .ich-ms-settings-item strong {
  font-size: 1.05rem !important;
  font-weight: 700 !important;
  line-height: 1.2 !important;
}
.ich-ms-overlay .ich-ms-settings-item small {
  font-size: 0.85rem !important;
  line-height: 1.25 !important;
  color: var(--mobile-text-secondary, #b9a9d4) !important;
  white-space: normal !important;
}
.ich-ms-overlay .ich-ms-settings-item:active {
  background: var(--mobile-bg-button-active, rgba(183,148,246,0.18)) !important;
}
.ich-ms-overlay .ich-ms-dsn-form {
  display: flex !important;
  flex-direction: column !important;
  gap: 12px !important;
  margin-bottom: 14px !important;
}
.ich-ms-overlay .ich-ms-dsn-check {
  display: flex !important;
  align-items: center !important;
  gap: 10px !important;
  color: var(--mobile-text-primary, #fff) !important;
  font-size: 0.95rem !important;
  font-weight: 600 !important;
}
.ich-ms-overlay .ich-ms-dsn-check input {
  width: 18px !important;
  height: 18px !important;
}
.ich-ms-overlay .ich-ms-dsn-field {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 12px !important;
  color: var(--mobile-text-secondary, #b9a9d4) !important;
  font-size: 0.9rem !important;
}
.ich-ms-overlay .ich-ms-dsn-field select,
.ich-ms-overlay .ich-ms-dsn-field input[type="color"] {
  min-width: 9rem !important;
  max-width: 55% !important;
  height: 40px !important;
  border-radius: 8px !important;
  border: 1px solid var(--mobile-border, rgba(255,255,255,0.18)) !important;
  background: var(--mobile-bg-primary, #16121f) !important;
  color: var(--mobile-text-primary, #fff) !important;
  padding: 4px 8px !important;
}
.ich-ms-overlay .ich-ms-dsn-field input[type="color"] {
  padding: 2px !important;
}
.ich-ms-overlay .ich-ms-dsn-actions {
  flex-wrap: wrap !important;
}
.ich-ms-overlay .ich-ms-dsn-test {
  flex: 1 1 100% !important;
  order: -1 !important;
  background: var(--mobile-bg-button, rgba(183,148,246,0.14)) !important;
  border: 1px solid var(--mobile-border, rgba(183,148,246,0.35)) !important;
}
.ich-ms-overlay .ich-ms-dsn-test:disabled {
  opacity: 0.55 !important;
}
.ich-ms-overlay .ich-ms-dsn-field input[type="color"]:disabled {
  opacity: 0.45 !important;
  cursor: not-allowed !important;
}

/* Roll / Midi / DialogV2 must sit above the lowered sheet + carousel. */
body.ich-mobile-sheet-open .application.dnd5e2.roll-configuration,
body.ich-mobile-sheet-open .application.dnd5e2.dialog,
body.ich-mobile-sheet-open .application.dialog,
body.ich-mobile-sheet-open .application.dialog-v2,
body.ich-mobile-sheet-open #midi-qol-dialog,
body.ich-mobile-sheet-open .midi-qol-dialog,
body.ich-mobile-sheet-open .window-app.dialog {
  z-index: 100050 !important;
}

/* Swipe-style overlays (HP + Adv/Dis) above Illusive sheet — ignore clicks until shown. */
.ich-ms-overlay.hp-dialog-overlay,
.ich-ms-overlay.roll-dialog-overlay {
  position: fixed !important;
  inset: 0 !important;
  z-index: 100060 !important;
  display: flex !important;
  align-items: flex-start !important;
  justify-content: center !important;
  padding-top: 10vh !important;
  background: rgba(0, 0, 0, 0.55) !important;
  pointer-events: none !important;
}
.ich-ms-overlay.hp-dialog-overlay.visible,
.ich-ms-overlay.roll-dialog-overlay.visible {
  pointer-events: all !important;
}
.ich-ms-overlay.ich-ms-item-overlay {
  align-items: center !important;
  padding: 4vh 12px !important;
}
.ich-ms-overlay .ich-ms-item-dialog {
  max-width: min(28rem, 96vw) !important;
  max-height: 84vh !important;
  width: 100% !important;
  padding: 0 !important;
  overflow: hidden !important;
}
.ich-ms-overlay .ich-ms-item-dialog .roll-dialog-header {
  padding: 14px 14px 10px !important;
  margin: 0 !important;
  align-items: flex-start !important;
}
.ich-ms-overlay .ich-ms-item-heading {
  display: flex !important;
  align-items: center !important;
  gap: 10px !important;
  min-width: 0 !important;
  flex: 1 !important;
}
.ich-ms-overlay .ich-ms-item-thumb {
  width: 44px !important;
  height: 44px !important;
  border-radius: 8px !important;
  object-fit: cover !important;
  flex-shrink: 0 !important;
  border: 1px solid var(--mobile-border, rgba(183,148,246,0.28)) !important;
}
.ich-ms-overlay .ich-ms-item-titles {
  display: flex !important;
  flex-direction: column !important;
  gap: 2px !important;
  min-width: 0 !important;
}
.ich-ms-overlay .ich-ms-item-titles .roll-dialog-title {
  white-space: normal !important;
  line-height: 1.2 !important;
}
.ich-ms-overlay .ich-ms-item-subtitle {
  font-size: 0.8rem !important;
  font-weight: 600 !important;
  color: var(--mobile-accent, #b794f6) !important;
  text-transform: none !important;
}
.ich-ms-overlay .ich-ms-item-description {
  flex: 1 1 auto !important;
  overflow-y: auto !important;
  -webkit-overflow-scrolling: touch !important;
  padding: 0 14px 12px !important;
  max-height: 48vh !important;
  font-size: 0.95rem !important;
  line-height: 1.45 !important;
  color: var(--mobile-text-secondary, #b9a9d4) !important;
}
.ich-ms-overlay .ich-ms-item-description p { margin: 0 0 0.65em !important; }
.ich-ms-overlay .ich-ms-item-description p:last-child { margin-bottom: 0 !important; }
#ich-mobile-sheet-root .ich-ms-item-description ul,
.ich-ms-overlay .ich-ms-item-description ul,
.ich-ms-overlay .ich-ms-item-description ol {
  margin: 0 0 0.75em 1.1em !important;
  padding: 0 !important;
}
.ich-ms-overlay .ich-ms-item-description li {
  margin: 0 0 0.35em !important;
}
.ich-ms-overlay .ich-ms-item-description a {
  color: var(--mobile-accent, #b794f6) !important;
}
.ich-ms-overlay .ich-ms-item-description img {
  max-width: 100% !important;
  height: auto !important;
  border-radius: 6px !important;
  margin: 0.4em 0 !important;
}
.ich-ms-overlay .ich-ms-item-actions {
  display: flex !important;
  flex-wrap: wrap !important;
  gap: 8px !important;
  padding: 12px 14px calc(12px + env(safe-area-inset-bottom, 0px)) !important;
  border-top: 1px solid var(--mobile-border, rgba(183,148,246,0.18)) !important;
  background: var(--mobile-bg-primary, #16121f) !important;
}
.ich-ms-overlay .ich-ms-item-actions .roll-btn {
  flex: 1 1 calc(50% - 8px) !important;
  min-width: 0 !important;
}
.ich-ms-overlay .ich-ms-item-actions .roll-btn.is-muted {
  opacity: 0.75 !important;
  flex-basis: 100% !important;
}
.ich-ms-overlay .ich-ms-accent-actions .roll-btn,
.ich-ms-overlay .ich-ms-accent-actions .roll-btn.is-muted {
  flex: 1 1 calc(50% - 8px) !important;
  flex-basis: calc(50% - 8px) !important;
}
.ich-ms-overlay .ich-ms-accent-dialog {
  max-width: 100% !important;
  max-height: min(88dvh, 920px) !important;
  overflow: auto !important;
}
.ich-ms-overlay .ich-ms-accent-hint,
.ich-ms-overlay .ich-ms-settings-hint {
  margin: 0 0 14px !important;
  padding: 0 !important;
  font-size: 0.9rem !important;
  line-height: 1.35 !important;
  color: var(--mobile-text-secondary, #b9a9d4) !important;
}
.ich-ms-overlay .ich-ms-theme-list {
  display: flex !important;
  flex-direction: column !important;
  gap: 10px !important;
  max-height: none !important;
  overflow: visible !important;
  margin-bottom: 14px !important;
  padding-right: 0 !important;
}
.ich-ms-overlay button.ich-ms-theme-row,
.ich-ms-overlay .ich-ms-theme-row {
  appearance: none !important;
  -webkit-appearance: none !important;
  box-sizing: border-box !important;
  display: grid !important;
  grid-template-columns: 56px minmax(0, 1fr) !important;
  align-items: center !important;
  justify-items: start !important;
  column-gap: 14px !important;
  row-gap: 0 !important;
  width: 100% !important;
  margin: 0 !important;
  padding: 12px 14px !important;
  min-height: 64px !important;
  height: auto !important;
  border-radius: 12px !important;
  border: 1px solid var(--mobile-border, rgba(255,255,255,0.12)) !important;
  background: rgba(0,0,0,0.18) !important;
  color: var(--mobile-text-primary, #fff) !important;
  text-align: left !important;
  line-height: 1.2 !important;
  font: inherit !important;
  cursor: pointer !important;
}
.ich-ms-overlay .ich-ms-theme-row.is-active {
  border-color: var(--theme, var(--mobile-accent, #b794f6)) !important;
  box-shadow: inset 0 0 0 1px var(--theme, var(--mobile-accent, #b794f6)) !important;
  background: rgba(255,255,255,0.06) !important;
}
.ich-ms-overlay .ich-ms-theme-preview {
  display: block !important;
  box-sizing: border-box !important;
  width: 56px !important;
  height: 40px !important;
  margin: 0 !important;
  padding: 0 !important;
  flex: none !important;
  align-self: center !important;
  justify-self: start !important;
  border-radius: 8px !important;
  border: 1px solid rgba(255,255,255,0.2) !important;
  background: var(--theme, #b794f6) !important;
  box-shadow: inset 0 0 0 1px rgba(0,0,0,0.25) !important;
}
.ich-ms-overlay .ich-ms-theme-preview-stripe,
.ich-ms-overlay .ich-ms-theme-preview-block,
.ich-ms-overlay .ich-ms-theme-preview-bg {
  display: none !important;
}
.ich-ms-overlay .ich-ms-theme-meta {
  display: flex !important;
  flex-direction: column !important;
  justify-content: center !important;
  gap: 4px !important;
  min-width: 0 !important;
  width: 100% !important;
  margin: 0 !important;
  padding: 0 !important;
  align-self: center !important;
  justify-self: stretch !important;
  text-align: left !important;
}
.ich-ms-overlay .ich-ms-theme-meta strong {
  display: block !important;
  margin: 0 !important;
  font-size: 1.05rem !important;
  font-weight: 700 !important;
  line-height: 1.2 !important;
}
.ich-ms-overlay .ich-ms-theme-meta small,
.ich-ms-overlay .ich-ms-theme-hex {
  display: block !important;
  margin: 0 !important;
  font-size: 0.8rem !important;
  line-height: 1.2 !important;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace !important;
  color: var(--mobile-text-muted, #7d6f96) !important;
}
.ich-ms-overlay .ich-ms-theme-custom {
  display: flex !important;
  flex-direction: column !important;
  gap: 10px !important;
  margin-bottom: 14px !important;
  color: var(--mobile-text-primary, #fff) !important;
}
.ich-ms-overlay .ich-ms-theme-custom label {
  font-size: 0.9rem !important;
  color: var(--mobile-text-secondary, #b9a9d4) !important;
}
.ich-ms-overlay .ich-ms-theme-custom-row {
  display: flex !important;
  align-items: center !important;
  gap: 12px !important;
}
.ich-ms-overlay .ich-ms-theme-custom-row input[type="color"] {
  width: 100% !important;
  height: 48px !important;
  border: 1px solid var(--mobile-border, rgba(255,255,255,0.18)) !important;
  border-radius: 10px !important;
  background: transparent !important;
  padding: 4px !important;
  cursor: pointer !important;
  flex: 1 1 auto !important;
}
.ich-ms-overlay .ich-ms-theme-hex {
  flex: 0 0 auto !important;
  min-width: 4.5rem !important;
}
#ich-mobile-sheet-root .ich-ms-btn i {
  margin-right: 6px;
}
.ich-ms-overlay.roll-dialog-overlay {
  background: rgba(0, 0, 0, 0.55) !important;
}
.ich-ms-overlay.roll-dialog-overlay.visible {
  background: rgba(0, 0, 0, 0.55) !important;
}
.ich-ms-overlay .hp-dialog,
.ich-ms-overlay .standalone-roll-dialog {
  background: var(--mobile-bg-secondary, #25242a) !important;
  border: 1px solid var(--mobile-border, rgba(255,255,255,0.12)) !important;
  border-radius: 12px !important;
  padding: 16px !important;
  min-width: 260px !important;
  max-width: 22rem !important;
  width: 94% !important;
  box-shadow: 0 8px 32px rgba(0,0,0,0.4) !important;
  color: var(--mobile-text-primary, #fff) !important;
}
.ich-ms-overlay .standalone-roll-dialog {
  transform: translateY(0) !important;
  opacity: 1 !important;
  display: flex !important;
  flex-direction: column !important;
}
.ich-ms-overlay.roll-dialog-overlay.visible .standalone-roll-dialog {
  transform: translateY(0) !important;
  opacity: 1 !important;
}
/* Settings / theme must win over the 22rem dialog card rules above */
.ich-ms-overlay .standalone-roll-dialog.ich-ms-settings-dialog,
.ich-ms-overlay .standalone-roll-dialog.ich-ms-accent-dialog {
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
  border-radius: 18px 18px 0 0 !important;
  padding: 18px 18px calc(18px + env(safe-area-inset-bottom, 0px)) !important;
  max-height: min(88dvh, 920px) !important;
}
.ich-ms-overlay .hp-dialog-header,
.ich-ms-overlay .roll-dialog-header {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 8px !important;
  margin-bottom: 14px !important;
  padding-bottom: 12px !important;
  border-bottom: 1px solid var(--mobile-accent, #b794f6) !important;
  position: relative !important;
  background: transparent !important;
}
.ich-ms-overlay .hp-dialog-current {
  font-size: 1.5rem !important;
  font-weight: 700 !important;
}
.ich-ms-overlay .hp-dialog-temp {
  font-size: 0.875rem !important;
  font-weight: 600 !important;
  color: #4fc3f7 !important;
}
.ich-ms-overlay .roll-dialog-title {
  font-size: 1.15rem !important;
  font-weight: 600 !important;
  padding-bottom: 0.25rem !important;
  text-align: center !important;
}
.ich-ms-overlay .roll-dialog-close {
  position: absolute !important;
  right: 0 !important;
  top: 0 !important;
  width: 2.25rem !important;
  height: 2.25rem !important;
  background: none !important;
  border: none !important;
  color: var(--mobile-text-secondary, #aaa) !important;
  cursor: pointer !important;
  font-size: 1rem !important;
}
.ich-ms-overlay .hp-dialog-input-row {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 8px !important;
  margin-bottom: 16px !important;
}
.ich-ms-overlay .hp-dialog-adjust {
  width: 44px !important;
  height: 44px !important;
  border-radius: 8px !important;
  border: 1px solid var(--mobile-border, rgba(255,255,255,0.15)) !important;
  background: var(--mobile-bg-tertiary, rgba(255,255,255,0.08)) !important;
  color: var(--mobile-text-secondary, #ccc) !important;
  font-size: 1.25rem !important;
  cursor: pointer !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}
.ich-ms-overlay .hp-dialog-amount {
  width: 80px !important;
  height: 3rem !important;
  flex: 1 1 80px !important;
  font-size: 1.5rem !important;
  font-weight: 700 !important;
  text-align: center !important;
  background: var(--mobile-bg-tertiary, rgba(255,255,255,0.08)) !important;
  border: 2px solid var(--mobile-border, rgba(255,255,255,0.15)) !important;
  border-radius: 8px !important;
  color: var(--mobile-text-primary, #fff) !important;
}
.ich-ms-overlay .hp-dialog-actions,
.ich-ms-overlay .roll-dialog-buttons {
  display: flex !important;
  gap: 8px !important;
  margin-bottom: 12px !important;
}
.ich-ms-overlay .hp-dialog-btn {
  flex: 1 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 12px !important;
  border-radius: 6px !important;
  min-height: 2.6rem !important;
  border: none !important;
  font-size: 0.95rem !important;
  font-weight: 600 !important;
  cursor: pointer !important;
  color: #fff !important;
}
.ich-ms-overlay .hp-dialog-btn.heal {
  background: #3d8b5a !important;
}
.ich-ms-overlay .hp-dialog-btn.damage {
  background: var(--mobile-accent, #b794f6) !important;
}
.ich-ms-overlay .hp-dialog-row {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 8px !important;
  margin-top: 8px !important;
}
.ich-ms-overlay .hp-dialog-row label {
  flex: 0 0 auto !important;
  font-size: 0.85rem !important;
  color: var(--mobile-text-secondary, #aaa) !important;
  min-width: 4.5rem !important;
}
.ich-ms-overlay .hp-dialog-field {
  flex: 1 1 auto !important;
  height: 2.4rem !important;
  min-width: 0 !important;
  text-align: center !important;
  background: var(--mobile-bg-tertiary, rgba(255,255,255,0.08)) !important;
  border: 1px solid var(--mobile-border, rgba(255,255,255,0.15)) !important;
  border-radius: 6px !important;
  color: var(--mobile-text-primary, #fff) !important;
  font-size: 1rem !important;
}
.ich-ms-overlay .hp-dialog-field-apply {
  width: 2.4rem !important;
  height: 2.4rem !important;
  border-radius: 6px !important;
  border: 1px solid var(--mobile-border, rgba(255,255,255,0.15)) !important;
  background: var(--mobile-bg-tertiary, rgba(255,255,255,0.08)) !important;
  color: var(--mobile-accent, #b794f6) !important;
  cursor: pointer !important;
}
.ich-ms-overlay .hp-dialog-field-apply.applied {
  background: var(--mobile-accent, #b794f6) !important;
  color: #fff !important;
}
.ich-ms-overlay .roll-btn {
  flex: 1 0 30% !important;
  width: 30% !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 12px 4px !important;
  border-radius: 6px !important;
  min-height: 2.6rem !important;
  border: 1px solid var(--mobile-border, rgba(255,255,255,0.15)) !important;
  font-size: 0.7rem !important;
  font-weight: 600 !important;
  text-transform: uppercase !important;
  cursor: pointer !important;
  color: var(--mobile-text-secondary, #ccc) !important;
  background: var(--mobile-bg-primary, #1e1d21) !important;
}
.ich-ms-overlay .roll-btn:active {
  background: var(--mobile-accent, #b794f6) !important;
  border-color: var(--mobile-accent, #b794f6) !important;
  color: #fff !important;
}

/* Carousel must stay tappable above the sheet (close / cancel). */
body.ich-mobile-sheet-open #ich-mobile-carousel {
  z-index: 100001 !important;
  pointer-events: auto !important;
}

/* Hide Swipe's own drawer while ours is open — never hide Illusive's root. */
body.ich-mobile-sheet-open .mobile-sheet-drawer:not(.ich-illusive-mobile-sheet),
body.ich-mobile-sheet-open .application.mobile-character-sheet,
body.ich-mobile-sheet-open .mobile-character-sheet:not(.ich-illusive-mobile-sheet) {
  display: none !important;
  visibility: hidden !important;
  pointer-events: none !important;
}

#ich-mobile-sheet-root > .ich-illusive-mobile-sheet.mobile-sheet-drawer {
  pointer-events: all !important;
  z-index: 1 !important;
}

#ich-mobile-sheet-root .drawer-content {
  inset: auto !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: var(--ich-carousel-dock, 96px) !important;
  width: 100% !important;
  max-width: none !important;
  height: auto !important;
  max-height: none !important;
  border-radius: 0 !important;
  border: none !important;
  border-bottom: 1px solid var(--mobile-border, rgba(255,255,255,0.12)) !important;
  box-shadow: none !important;
  transform: none !important;
  pointer-events: all !important;
  z-index: 2 !important;
  padding-top: env(safe-area-inset-top, 0px) !important;
  padding-bottom: 0 !important;
  box-sizing: border-box !important;
}

#ich-mobile-sheet-root .drawer-backdrop,
#ich-mobile-sheet-root .drawer-handle {
  display: none !important;
  pointer-events: none !important;
}

#ich-mobile-sheet-root button.avatar-container {
  border: none !important;
  background: transparent !important;
  padding: 0 !important;
  margin: 0 !important;
  box-shadow: none !important;
  position: relative !important;
}
#ich-mobile-sheet-root button,
#ich-mobile-sheet-root [data-action],
#ich-mobile-sheet-root .avatar-container,
#ich-mobile-sheet-root .ability-check-area,
#ich-mobile-sheet-root .skill-roll-btn,
#ich-mobile-sheet-root .section-tab {
  cursor: pointer !important;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

#ich-mobile-sheet-root .sections-container {
  transform: none !important;
  width: 100% !important;
  flex: 1 1 auto !important;
  min-height: 0 !important;
  height: auto !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
}
#ich-mobile-sheet-root .sheet-section {
  flex: 1 1 auto !important;
  width: 100% !important;
  min-width: 0 !important;
  min-height: 0 !important;
  height: auto !important;
  max-height: 100% !important;
  overflow-x: hidden !important;
  overflow-y: auto !important;
  padding: 16px 16px 20px !important;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
}
#ich-mobile-sheet-root .section-content {
  padding: 0 !important;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* Match Amethyst header / stats breathing room */
#ich-mobile-sheet-root .drawer-header {
  padding: 12px 16px 0 !important;
  overflow: visible !important;
}
#ich-mobile-sheet-root .header-top {
  gap: 12px !important;
  margin-bottom: 12px !important;
  overflow: visible !important;
}
#ich-mobile-sheet-root .drawer-header:has(.death-save-overlay) .header-top,
#ich-mobile-sheet-root .drawer-header:has(.ich-ms-death) .header-top {
  margin-bottom: 4px !important;
}
#ich-mobile-sheet-root .header-avatar {
  width: 64px !important;
  height: 64px !important;
  object-fit: cover !important;
  object-position: top !important;
  border-radius: 50% !important;
}
#ich-mobile-sheet-root .stats-row {
  gap: 8px !important;
  padding: 8px 16px !important;
  margin: 0 -16px 12px !important;
  height: auto !important;
  min-height: 0 !important;
}
#ich-mobile-sheet-root .stat-box {
  padding: 10px 6px !important;
  height: auto !important;
  min-height: 4.25rem !important;
  width: auto !important;
  aspect-ratio: auto !important;
}
#ich-mobile-sheet-root .abilities-grid {
  display: grid !important;
  grid-template-columns: repeat(6, minmax(0, 1fr)) !important;
  gap: 1.2% !important;
  margin: 16px 0 !important;
}
#ich-mobile-sheet-root .ability-card {
  min-height: 4.25rem !important;
  border-radius: 8px !important;
  min-width: 0 !important;
}
#ich-mobile-sheet-root .ability-check-area {
  padding: 6px 0 !important;
  gap: 2px !important;
  min-height: 3.25rem !important;
}
#ich-mobile-sheet-root .skills-list {
  display: flex !important;
  flex-direction: column !important;
  gap: 4px !important;
  margin-top: 8px !important;
}
#ich-mobile-sheet-root .skill-roll-btn {
  min-height: 2.75rem !important;
  padding: 0.55rem 0.85rem !important;
  gap: 8px !important;
}
#ich-mobile-sheet-root .skill-mod { margin-left: auto; font-weight: 700; }
#ich-mobile-sheet-root .skill-ability {
  font-size: 0.7rem;
  opacity: 0.65;
  text-transform: uppercase;
}

/* Item rows — roomier Amethyst spacing; kill text squash */
#ich-mobile-sheet-root .item-list {
  display: flex !important;
  flex-direction: column !important;
  gap: 6px !important;
}
#ich-mobile-sheet-root .item-row {
  display: flex !important;
  flex-wrap: nowrap !important;
  align-items: center !important;
  margin-bottom: 0 !important;
  min-height: 3.5rem !important;
  height: auto !important;
  padding: 4px 0 !important;
  gap: 8px !important;
  overflow: visible !important;
  -webkit-mask-image: none !important;
  mask-image: none !important;
}
#ich-mobile-sheet-root .item-row.is-dim { opacity: 0.45; }
#ich-mobile-sheet-root .item-row.is-usable .item-img {
  cursor: pointer !important;
}
#ich-mobile-sheet-root .item-row .item-img {
  width: 2.75rem !important;
  height: 2.75rem !important;
  margin: 6px !important;
  border-radius: 6px !important;
  flex-shrink: 0 !important;
  object-fit: cover !important;
}
#ich-mobile-sheet-root .item-row .item-info,
#ich-mobile-sheet-root .item-row button.item-info {
  flex: 1 1 auto !important;
  min-width: 0 !important;
  max-width: none !important;
  height: auto !important;
  min-height: 3.25rem !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: flex-start !important;
  justify-content: center !important;
  gap: 2px !important;
  background: transparent !important;
  border: 0 !important;
  box-shadow: none !important;
  padding: 8px 8px 8px 2px !important;
  margin: 0 !important;
  text-align: left !important;
  color: inherit !important;
  line-height: 1.3 !important;
  overflow: visible !important;
  white-space: normal !important;
  font-size: inherit !important;
  transform: none !important;
  writing-mode: horizontal-tb !important;
}
#ich-mobile-sheet-root .item-row button.item-info:disabled {
  opacity: 1 !important;
  cursor: default !important;
}
#ich-mobile-sheet-root .item-row.is-usable button.item-info:active {
  background: var(--mobile-bg-button-active, rgba(255,255,255,0.08)) !important;
}
#ich-mobile-sheet-root .item-row .item-name {
  display: block !important;
  width: 100% !important;
  color: var(--mobile-text-primary, #ffffff) !important;
  font-size: 1rem !important;
  font-weight: 500 !important;
  line-height: 1.35 !important;
  max-height: none !important;
  height: auto !important;
  opacity: 1 !important;
  visibility: visible !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  transform: none !important;
  -webkit-text-size-adjust: 100% !important;
}
#ich-mobile-sheet-root .item-row .item-quantity,
#ich-mobile-sheet-root .item-row .item-uses {
  display: block !important;
  color: var(--mobile-text-secondary, #aaaaaa) !important;
  font-size: 0.85rem !important;
  line-height: 1.3 !important;
  max-height: none !important;
  height: auto !important;
  opacity: 1 !important;
  transform: none !important;
}
#ich-mobile-sheet-root .item-row .item-actions {
  display: flex !important;
  gap: 4px !important;
  margin-right: 6px !important;
  flex: 0 0 auto !important;
}
#ich-mobile-sheet-root .item-row .item-btn {
  width: 44px !important;
  height: 44px !important;
  min-width: 44px !important;
  padding: 0 !important;
  border: 0 !important;
  border-radius: 8px !important;
  background: transparent !important;
  color: var(--mobile-text-secondary, #aaa) !important;
  cursor: pointer !important;
}
#ich-mobile-sheet-root .item-row .item-btn:active {
  background: var(--mobile-bg-button-active, rgba(255,255,255,0.1)) !important;
}
#ich-mobile-sheet-root .item-row .item-btn.equipped,
#ich-mobile-sheet-root .item-row .equip-btn.equipped {
  color: var(--mobile-accent, #b794f6) !important;
}

#ich-mobile-sheet-root .section-nav-track {
  padding: 10px 14px !important;
  gap: 6px !important;
}
#ich-mobile-sheet-root .section-tab {
  padding: 10px 14px !important;
  min-height: 40px !important;
}

/* Init — clear tap target */
#ich-mobile-sheet-root .stats-row .init-box {
  cursor: pointer !important;
  border: 1px solid var(--mobile-accent-50, rgba(183,148,246,0.5)) !important;
  background: var(--mobile-accent-10, rgba(183,148,246,0.12)) !important;
}
#ich-mobile-sheet-root .stats-row .init-box:active {
  background: var(--mobile-accent-20, rgba(183,148,246,0.22)) !important;
}
#ich-mobile-sheet-root .stats-row .init-box::before,
#ich-mobile-sheet-root .stats-row .init-box::after {
  content: none !important;
  display: none !important;
}

#ich-mobile-sheet-root .sheet-section {
  -webkit-mask-image: none !important;
  mask-image: none !important;
}

#ich-mobile-sheet-root .ich-ms-rests {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 20px;
}
#ich-mobile-sheet-root .ich-ms-btn {
  border: 1px solid var(--mobile-border, rgba(255,255,255,0.12));
  background: var(--mobile-bg-button, rgba(255,255,255,0.06));
  color: var(--mobile-text-primary, #fff);
  border-radius: 8px;
  padding: 14px 16px;
  font-size: 0.95rem;
  font-weight: 600;
  min-height: 48px;
  cursor: pointer;
}
#ich-mobile-sheet-root .ich-ms-btn:active {
  background: var(--mobile-bg-button-active, rgba(255,255,255,0.12));
}
#ich-mobile-sheet-root .ich-ms-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 8px 0 14px;
}
#ich-mobile-sheet-root .ich-ms-chip {
  border-radius: 6px;
  padding: 6px 12px;
  background: var(--mobile-bg-secondary, rgba(255,255,255,0.05));
  border: 1px solid var(--mobile-border, rgba(255,255,255,0.1));
  font-size: 0.8rem;
  color: var(--mobile-text-secondary, #ccc);
}
#ich-mobile-sheet-root .ich-ms-chip strong {
  color: var(--mobile-text-primary, #fff);
  font-weight: 600;
  margin-right: 4px;
}
#ich-mobile-sheet-root .ich-ms-section-title {
  margin: 14px 0 6px;
  font-size: 0.7rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--mobile-text-secondary, #aaa);
}
#ich-mobile-sheet-root .empty-message {
  opacity: 0.65;
  color: var(--mobile-text-secondary, #aaa);
  padding: 16px 4px;
  font-size: 0.9rem;
}
#ich-mobile-sheet-root .bio-text {
  font-size: 0.95rem;
  line-height: 1.45;
  color: var(--mobile-text-primary, #fff);
  margin-bottom: 10px;
}

#ich-mobile-sheet-root .is-pressed { filter: brightness(1.12); }

/* ---- Grey out sheet while manual roller is open (do not close it) ---- */
body.ich-mobile-roller-open #ich-mobile-sheet-root {
  pointer-events: none !important;
}
body.ich-mobile-roller-open #ich-mobile-sheet-root .ich-illusive-mobile-sheet.mobile-sheet-drawer {
  filter: grayscale(0.45) brightness(0.55) !important;
  opacity: 0.72 !important;
  transition: filter 0.15s ease, opacity 0.15s ease !important;
}
body.ich-mobile-roller-open #ich-mobile-sheet-root .drawer-content {
  pointer-events: none !important;
}

/* ---- Manual dice roller: fixed toggle + docked panel ---- */
#ich-mobile-dice-roller {
  --ich-dice-fab-size: 48px;
  --ich-dice-fab-gap: 12px;
  position: fixed !important;
  inset: 0 !important;
  z-index: 100002 !important;
  pointer-events: none !important;
}
#ich-mobile-dice-roller .ich-dice-toggle,
#ich-mobile-dice-roller .ich-dice-panel {
  pointer-events: auto !important;
}
/* Toggle stays bottom-right — panel never extends under it */
#ich-mobile-dice-roller .ich-dice-toggle {
  position: fixed !important;
  right: var(--ich-dice-fab-gap) !important;
  bottom: calc(var(--ich-carousel-dock, 96px) + 12px) !important;
  width: var(--ich-dice-fab-size) !important;
  height: var(--ich-dice-fab-size) !important;
  border-radius: 50% !important;
  border: 2px solid rgba(255,255,255,0.22) !important;
  background: rgba(42, 41, 48, 0.95) !important;
  color: #fff !important;
  font-size: 1.2rem !important;
  box-shadow: 0 4px 12px rgba(0,0,0,0.45) !important;
  cursor: pointer !important;
  z-index: 100003 !important;
}
#ich-mobile-dice-roller.is-open .ich-dice-toggle {
  border-color: var(--mobile-accent, #b794f6) !important;
  color: var(--mobile-accent, #b794f6) !important;
}
/* Panel left of FAB so Roll never overlaps the manual-roller button */
#ich-mobile-dice-roller .ich-dice-panel {
  position: fixed !important;
  left: 12px !important;
  right: auto !important;
  bottom: calc(var(--ich-carousel-dock, 96px) + 12px) !important;
  transform: none !important;
  width: min(420px, calc(100vw - 12px - var(--ich-dice-fab-size) - var(--ich-dice-fab-gap) * 2)) !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 8px !important;
  padding: 10px !important;
  border-radius: 12px !important;
  background: rgba(36, 36, 40, 0.97) !important;
  border: 1px solid rgba(255,255,255,0.14) !important;
  box-shadow: 0 8px 28px rgba(0,0,0,0.55) !important;
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
}
#ich-mobile-dice-roller .ich-dice-panel[hidden] {
  display: none !important;
}
#ich-mobile-dice-roller .ich-dice-command-row {
  display: flex !important;
  width: 100% !important;
}
#ich-mobile-dice-roller .ich-dice-command {
  width: 100% !important;
  box-sizing: border-box !important;
  min-height: 44px !important;
  padding: 10px 12px !important;
  border-radius: 8px !important;
  border: 1px solid rgba(255,255,255,0.16) !important;
  background: rgba(20, 20, 24, 0.95) !important;
  color: #fff !important;
  font-size: 1rem !important;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace !important;
}
#ich-mobile-dice-roller .ich-dice-pad-row {
  display: grid !important;
  grid-template-columns: repeat(7, minmax(0, 1fr)) !important;
  gap: 6px !important;
}
#ich-mobile-dice-roller .ich-dice-btn {
  position: relative !important;
  aspect-ratio: 1 !important;
  min-height: 44px !important;
  border-radius: 8px !important;
  border: 1px solid rgba(255,255,255,0.14) !important;
  background: rgba(48, 48, 54, 0.95) !important;
  color: rgba(255,255,255,0.92) !important;
  font-size: 1.05rem !important;
  cursor: pointer !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}
#ich-mobile-dice-roller .ich-dice-btn.is-selected {
  border-color: var(--mobile-accent, #b794f6) !important;
  color: var(--mobile-accent, #b794f6) !important;
}
#ich-mobile-dice-roller .ich-dice-count {
  position: absolute !important;
  top: -6px !important;
  right: -4px !important;
  min-width: 16px !important;
  height: 16px !important;
  border-radius: 4px !important;
  background: #a35a4a !important;
  color: #fff !important;
  font-size: 0.65rem !important;
  font-weight: 700 !important;
  display: none !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 0 3px !important;
}
#ich-mobile-dice-roller .ich-dice-count.is-visible { display: flex !important; }
#ich-mobile-dice-roller .ich-dice-mod-row {
  display: grid !important;
  grid-template-columns: 44px minmax(48px, 1fr) 44px 52px minmax(72px, 1.2fr) !important;
  gap: 6px !important;
  align-items: stretch !important;
}
#ich-mobile-dice-roller .ich-dice-mod-btn,
#ich-mobile-dice-roller .ich-dice-mod-input,
#ich-mobile-dice-roller .ich-dice-adv,
#ich-mobile-dice-roller .ich-dice-roll-btn {
  min-height: 48px !important;
  border-radius: 8px !important;
  border: 1px solid rgba(255,255,255,0.14) !important;
  background: rgba(48, 48, 54, 0.95) !important;
  color: #fff !important;
}
#ich-mobile-dice-roller .ich-dice-mod-btn {
  font-size: 1.35rem !important;
  font-weight: 600 !important;
  cursor: pointer !important;
}
#ich-mobile-dice-roller .ich-dice-mod-input {
  text-align: center !important;
  font-size: 1.1rem !important;
  font-weight: 600 !important;
  -moz-appearance: textfield;
}
#ich-mobile-dice-roller .ich-dice-mod-input::-webkit-outer-spin-button,
#ich-mobile-dice-roller .ich-dice-mod-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
#ich-mobile-dice-roller .ich-dice-adv {
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 0 !important;
  padding: 4px 2px !important;
  line-height: 1.05 !important;
  font-size: 0.62rem !important;
  font-weight: 700 !important;
  letter-spacing: 0.02em !important;
  cursor: pointer !important;
  opacity: 0.55 !important;
}
#ich-mobile-dice-roller .ich-dice-adv.is-adv {
  opacity: 1 !important;
  border-color: #62d58a !important;
  color: #62d58a !important;
}
#ich-mobile-dice-roller .ich-dice-adv.is-adv .ich-dice-adv-bot { opacity: 0.35; }
#ich-mobile-dice-roller .ich-dice-adv.is-dis {
  opacity: 1 !important;
  border-color: #ef6b6b !important;
  color: #ef6b6b !important;
}
#ich-mobile-dice-roller .ich-dice-adv.is-dis .ich-dice-adv-top { opacity: 0.35; }
#ich-mobile-dice-roller .ich-dice-roll-btn {
  font-size: 1rem !important;
  font-weight: 700 !important;
  cursor: pointer !important;
  background: rgba(58, 58, 66, 0.98) !important;
}
#ich-mobile-dice-roller .ich-dice-roll-btn:active {
  background: var(--mobile-accent, #b794f6) !important;
  color: #111 !important;
}
`;

const STYLE_ID = "ich-mobile-sheet-critical-css";
const AMETHYST_LINK_ID = "ich-amethyst-sheet-css";
const AMETHYST_HREF = "modules/illusive-combat-hud/src/components/mobile-sheet/amethyst-sheet.css";

export function ensureMobileSheetStyles() {
  let link = document.getElementById(AMETHYST_LINK_ID);
  if (!link) {
    link = document.createElement("link");
    link.id = AMETHYST_LINK_ID;
    link.rel = "stylesheet";
    link.href = AMETHYST_HREF;
    document.head.appendChild(link);
  }

  let el = document.getElementById(STYLE_ID);
  if (!el) {
    el = document.createElement("style");
    el.id = STYLE_ID;
    document.head.appendChild(el);
  }
  el.textContent = MOBILE_SHEET_CRITICAL_CSS;

  // Apply per-player accent after base CSS is in place
  import("./mobile-accent.mjs")
    .then((m) => m.applyMobileAccentColor())
    .catch(() => { /* settings may not be ready yet */ });
}
