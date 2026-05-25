// Shared constants for popup, options, and the content script.

/** CSS selectors and key URLs used by the content script. */
export const Selectors = Object.freeze({
  NextPageButton: 'button.artdeco-pagination__button--next',
  ConnectButtonFromMyNetworkPage:
    'button[aria-label^="Invite "][aria-label$=" to connect"]:not([disabled]):not(.artdeco-button--muted)',
  ConnectButtonFromSearchPage:
    'div.search-results-container button.ember-view:enabled:not(.artdeco-button--muted)',
  SendButtonFromSendInviteModal: 'div.send-invite button.artdeco-button--primary',
  SendInMailsModalDismissButton: '#artdeco-modal-outlet .artdeco-modal__dismiss',
  CloseSendInMailsModalButton:
    '.msg-overlay-bubble-header__control .artdeco-button__icon[data-test-icon="close-small"]',
});

/** What kind of LinkedIn page the content script is currently on. */
export const PageType = Object.freeze({
  Unidentified: 0,
  SearchPeople: 1,
  MyNetwork: 2,
  Skills: 3,
});

/** Canonical LinkedIn URLs + URL-substring patterns for page detection. */
export const Links = Object.freeze({
  SearchPeoplePage: 'https://www.linkedin.com/search/results/people/',
  MyNetworkPage: 'https://www.linkedin.com/mynetwork/',
  SkillsPage: 'https://www.linkedin.com/in/*/details/skills/',
  PatternOfSearchPage: 'linkedin.com/search/results/people',
  PatternOfMyNetworkPage: 'linkedin.com/mynetwork',
  PatternOfSkillsPage: 'linkedin.com/in/*/details/skills',
});

/** Port message IDs exchanged between popup and content script. */
export const MessageId = Object.freeze({
  ConnectionEstablished: 0,
  RunningStateUpdated: 1,
  ButtonClicksCountUpdated: 2,
  StartAutoConnect: 3,
  StopAutoConnect: 4,
});

// --- Linkit safety constants (issue #10) ---
export const LINKIT_DAILY_CAP = 40;
export const LINKIT_SESSION_CAP_MIN = 1;
export const LINKIT_SESSION_CAP_MAX = 500;
export const LINKIT_SESSION_CAP_DEFAULT = 100;
export const LINKIT_INVITE_LIMIT_TEXT =
  /weekly invite limit|invitation limit|you[\u2019']ve reached the weekly|reached the weekly invitation/i;

// --- Auto-connect timing (rate-limit jitter) ---
export const AUTO_CONNECT_MIN_DELAY_MS = 3000;
export const AUTO_CONNECT_MAX_DELAY_MS = 8000;
export const POLL_INTERVAL_MS = 500;
export const MAX_POLL_ATTEMPTS = 5;
export const PORT_TICK_MS = 1000;

export function clampSessionCap(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return LINKIT_SESSION_CAP_DEFAULT;
  return Math.min(
    LINKIT_SESSION_CAP_MAX,
    Math.max(LINKIT_SESSION_CAP_MIN, Math.floor(n)),
  );
}
