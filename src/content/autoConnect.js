// Auto-connect flow: state signals + connect-button scan loop +
// "Send without a note" modal dismissal + search-page pagination.

import {
  AUTO_CONNECT_MAX_DELAY_MS,
  AUTO_CONNECT_MIN_DELAY_MS,
  MAX_POLL_ATTEMPTS,
  POLL_INTERVAL_MS,
  PageType,
  Selectors,
} from '../shared/constants.js';
import {
  findButtonByText,
  focusClick,
  isInviteLimitReached,
  randomInt,
  signal,
  sleep,
  waitForElement,
} from './utils.js';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
export const pageType = signal(PageType.Unidentified);
export const isRunning = signal(false);
export const clickCount = signal(0);
export const sessionCap = signal(100);
const emptyMyNetworkScans = signal(0);
const pageAdvances = signal(0);
const MAX_PAGE_ADVANCES = 20;

// ---------------------------------------------------------------------------
// "Send without a note" modal
// ---------------------------------------------------------------------------
/** After a Connect click, wait briefly for the "Send without a note" button.
 *  If it appears, click it. If not, do nothing — let the loop proceed. */
async function dismissConnectModal() {
  const DEBUG_SEND_WITHOUT_NOTE = false;
  const normalizeLabel = (el) =>
    (el?.innerText || el?.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();

  const isClickable = (el) => {
    if (!el) return false;
    if (el.disabled || el.getAttribute('aria-disabled') === 'true') return false;
    const style = window.getComputedStyle(el);
    if (style?.display === 'none' || style?.visibility === 'hidden') return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  };

  const queryAllDeep = (selector) => {
    const results = [];
    const visited = new Set();
    const walk = (root) => {
      if (!root || visited.has(root)) return;
      visited.add(root);

      let matches = [];
      try {
        matches = Array.from(root.querySelectorAll(selector));
      } catch {
        return;
      }
      results.push(...matches);

      const all = Array.from(root.querySelectorAll('*'));
      for (const node of all) {
        if (node.shadowRoot) walk(node.shadowRoot);
      }
    };
    walk(document);
    return results;
  };

  const isInInviteContainer = (el) =>
    Boolean(
      el?.closest(
        '#artdeco-modal-outlet, [role="dialog"], .artdeco-modal, .send-invite, .artdeco-modal-overlay, .artdeco-dropdown__content, .artdeco-dropdown__content-inner',
      ),
    );

  const isSendWithoutNoteLabel = (label) =>
    label.includes('Send without a note') || label.includes('send without note');

  const findSendWithoutNoteButton = () => {
    const controls = queryAllDeep(
      'button, [role="button"], a[role="button"], a, div[role="button"]',
    );
    const modalControls = controls.filter((el) => isInInviteContainer(el));

    const selectorFirstCandidates = [
      'button[aria-label="Send without a note"][type="submit"]',
      '.send-invite .artdeco-modal__actionbar button[aria-label="Send without a note"]',
      '.send-invite .artdeco-modal__actionbar button.artdeco-button--primary',
      '.send-invite button.artdeco-button--primary.ember-view.ml1',
      '#artdeco-modal-outlet button.artdeco-button--primary',
      '.send-invite button.artdeco-button--primary',
      '.artdeco-modal button.artdeco-button--primary',
      '.artdeco-dropdown__content button.artdeco-button--primary',
      '.artdeco-dropdown__content button',
      '.artdeco-dropdown__content [role="button"]',
      'button[data-control-name*="send"]',
    ];

    if (DEBUG_SEND_WITHOUT_NOTE) {
      console.debug(
        '[Linkit][diag] modal root:',
        modalControls.length ? 'dialog-like' : 'document',
      );
    }

    for (const selector of selectorFirstCandidates) {
      const candidate = queryAllDeep(selector).find((el) => isClickable(el));
      if (candidate) {
        if (DEBUG_SEND_WITHOUT_NOTE) {
          console.debug('[Linkit][diag] match source: selector-first', {
            selector,
            id: candidate.id || null,
            text: normalizeLabel(candidate),
          });
        }
        return candidate;
      }
    }

    const byPrimary = modalControls.find((el) => {
      if (!isClickable(el)) return false;
      const cls = (el.className || '').toString().toLowerCase();
      const aria = (el.getAttribute('aria-label') || '').toLowerCase();
      const dataControl = (el.getAttribute('data-control-name') || '').toLowerCase();
      const label = normalizeLabel(el);
      return (
        cls.includes('artdeco-button--primary') ||
        dataControl.includes('send') ||
        aria.includes('send') ||
        isSendWithoutNoteLabel(label)
      );
    });
    if (byPrimary) {
      if (DEBUG_SEND_WITHOUT_NOTE) {
        console.debug('[Linkit][diag] match source: primary-send-control', {
          id: byPrimary.id || null,
          text: normalizeLabel(byPrimary),
        });
      }
      return byPrimary;
    }

    const byText = controls.find(
      (el) => isClickable(el) && isSendWithoutNoteLabel(normalizeLabel(el)),
    );
    if (byText) {
      if (DEBUG_SEND_WITHOUT_NOTE) {
        console.debug('[Linkit][diag] match source: send-without-note-text', {
          id: byText.id || null,
          text: normalizeLabel(byText),
        });
      }
      return byText;
    }

    // Some LinkedIn cohorts render this as plain text nodes inside list/dropdown
    // items with delegated click handlers. Match the raw text and click the node
    // itself or its nearest interactive ancestor.
    const textNodes = queryAllDeep('span, div, li, p');
    const byRawTextNode = textNodes.find((el) =>
      isSendWithoutNoteLabel(normalizeLabel(el)),
    );
    if (byRawTextNode) {
      const byRawAncestor = byRawTextNode.closest(
        'button, [role="button"], a[role="button"], a, li, div, span',
      );
      const target = byRawAncestor || byRawTextNode;
      if (DEBUG_SEND_WITHOUT_NOTE) {
        console.debug('[Linkit][diag] match source: raw-text-node', {
          id: target.id || null,
          text: normalizeLabel(target),
        });
      }
      return target;
    }

    const genericSend = modalControls.find((el) => {
      if (!isClickable(el)) return false;
      const label = normalizeLabel(el);
      return label === 'send' || label.startsWith('send ');
    });
    if (genericSend) {
      if (DEBUG_SEND_WITHOUT_NOTE) {
        console.debug('[Linkit][diag] match source: generic-send-in-dialog', {
          id: genericSend.id || null,
          text: normalizeLabel(genericSend),
        });
      }
      return genericSend;
    }

    // Locale-agnostic fallback: any visible primary action control after Connect.
    const anyPrimary = controls
      .filter((el) => isClickable(el))
      .filter((el) => (el.className || '').toString().includes('artdeco-button--primary'))
      .filter((el) => !normalizeLabel(el).includes('connect'));
    if (anyPrimary.length > 0) {
      const candidate = anyPrimary[anyPrimary.length - 1];
      if (DEBUG_SEND_WITHOUT_NOTE) {
        console.debug('[Linkit][diag] match source: global-primary-fallback', {
          id: candidate.id || null,
          text: normalizeLabel(candidate),
        });
      }
      return candidate;
    }

    if (DEBUG_SEND_WITHOUT_NOTE) {
      const topCandidates = queryAllDeep('button, [role="button"], a[role="button"]')
        .map((el) => ({
          id: el.id || null,
          text: normalizeLabel(el),
          ariaLabel: (el.getAttribute('aria-label') || '').toLowerCase(),
        }))
        .filter(
          (x) =>
            x.text.includes('send') ||
            x.text.includes('note') ||
            x.ariaLabel.includes('send'),
        )
        .slice(0, 12);
      console.debug('[Linkit][diag] match source: none', { id: null, text: '' });
      console.debug('[Linkit][diag] top send/note candidates:', topCandidates);
    }

    return null;
  };

  const btn = await waitForElement(() => findSendWithoutNoteButton(), { timeout: 5000 });
  if (DEBUG_SEND_WITHOUT_NOTE) {
    console.debug('[Linkit][diag] final button found:', Boolean(btn), {
      id: btn?.id || null,
      text: normalizeLabel(btn),
    });
  }
  if (btn) {
    // Try the standard click first; if site handlers block it, dispatch native
    // pointer/mouse events as a fallback.
    focusClick(btn);
    try {
      btn.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, cancelable: true }),
      );
      btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
      btn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
      btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    } catch {
      /* best effort */
    }
    if (DEBUG_SEND_WITHOUT_NOTE) {
      console.debug('[Linkit][diag] clicked Send without note button.');
    }
  } else if (DEBUG_SEND_WITHOUT_NOTE) {
    console.debug('[Linkit][diag] no Send without note button found within timeout.');
  }
}

// ---------------------------------------------------------------------------
// Connect-button scanning + pagination
// ---------------------------------------------------------------------------
/** Scan for a Connect button using mutation observer; scroll periodically to
 *  trigger lazy-load of further results. `finder` may be a CSS selector string
 *  or a function returning an element (or null). */
function findAndClickConnect(finder) {
  const scan = () => {
    let btn = null;
    if (typeof finder === 'function') btn = finder();
    else if (typeof finder === 'string') btn = document.querySelector(finder);
    if (!btn) btn = findButtonByText('Connect');
    return btn;
  };
  const scrollTimer = setInterval(() => {
    window.scrollTo(0, document.body.scrollHeight);
  }, POLL_INTERVAL_MS);
  void waitForElement(scan, {
    timeout: MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS,
  }).then((btn) => {
    clearInterval(scrollTimer);
    if (btn) onConnectButtonFound(btn);
    else onNoConnectButton();
  });
}

/** Find the search pagination "Next" button. LinkedIn's modern DOM uses
 *  obfuscated class names, so we rely on aria-label / visible text and walk
 *  up to the actual <button> when the match lands on the inner <span>. */
function findNextPageButton() {
  const candidates = [
    document.querySelector(Selectors.NextPageButton),
    document.querySelector('button[aria-label="Next"]'),
    document.querySelector('button[aria-label="View next page"]'),
  ];
  for (const el of candidates) {
    if (el && !el.disabled && el.getAttribute('aria-disabled') !== 'true') return el;
  }
  const labelMatch = findButtonByText('Next');
  if (labelMatch) {
    const btn = labelMatch.closest('button') || labelMatch;
    if (btn && !btn.disabled && btn.getAttribute('aria-disabled') !== 'true') return btn;
  }
  return null;
}

function clickNextPage() {
  const btn = findNextPageButton();
  if (btn) {
    focusClick(btn);
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Loop orchestration
// ---------------------------------------------------------------------------
function onConnectButtonFound(btn) {
  emptyMyNetworkScans.set(0);
  pageAdvances.set(0);
  focusClick(btn);
  btn.setAttribute('disabled', 'disabled');
  // Defer the post-click work (count++ / modal dismissal / pacing) to the orchestrator.
  void postClickCycle();
}

/**
 * No Connect button visible. On My Network, try to expand a PYMK section:
 *   1. "Load more" inside an already-open modal/section, or
 *   2. "Show all" to open one.
 * On Search pages, fall back to pagination.
 */
function onNoConnectButton() {
  if (!isRunning.get()) return;

  // Background-tab timer throttling can delay LinkedIn rendering.
  // Retry later instead of treating this as terminal exhaustion.
  if (document.hidden) {
    setTimeout(() => driveAutoConnect(), 2500);
    return;
  }

  const type = pageType.get();

  if (type === PageType.MyNetwork) {
    const loadMore =
      findButtonByText('Load more') || findButtonByText('Show more results');
    if (loadMore) {
      emptyMyNetworkScans.set(0);
      focusClick(loadMore);
      setTimeout(() => driveAutoConnect(), 500);
      return;
    }
    const showAll = findButtonByText('Show all');
    if (showAll) {
      emptyMyNetworkScans.set(0);
      focusClick(showAll);
      setTimeout(() => driveAutoConnect(), 1800);
      return;
    }
    const roundsWithoutTarget = emptyMyNetworkScans.get() + 1;
    emptyMyNetworkScans.set(roundsWithoutTarget);

    // Require a few consecutive empty scans before stopping.
    if (roundsWithoutTarget < 3) {
      setTimeout(() => driveAutoConnect(), 2000);
      return;
    }

    // Nothing more to expand — stop the loop.
    console.info('[Linkit] No more Connect / Show all / Load more buttons found.');
    stopAutoConnect();
    return;
  }

  // Search pages: paginate. If there's no next page, stop the loop.
  if (pageAdvances.get() >= MAX_PAGE_ADVANCES) {
    console.info(`[Linkit] Reached max page advances (${MAX_PAGE_ADVANCES}) — stopping.`);
    stopAutoConnect();
    return;
  }
  const urlBefore = window.location.href;
  if (!clickNextPage()) {
    console.info('[Linkit] No more Connect buttons and no Next page — stopping.');
    stopAutoConnect();
    return;
  }
  pageAdvances.set(pageAdvances.get() + 1);
  // Wait for the URL or the results list to actually update before re-scanning,
  // otherwise we'd poll a stale page and risk a false-empty stop.
  void waitForElement(() => (window.location.href !== urlBefore ? true : null), {
    timeout: 3000,
  }).then(() => setTimeout(() => driveAutoConnect(), 800));
}

/** Single cycle after a successful invite click: bump counts, sleep, then loop or stop. */
async function postClickCycle() {
  clickCount.set(clickCount.get() + 1);
  await dismissConnectModal();

  // Rate-limit jitter.
  await sleep(randomInt(AUTO_CONNECT_MIN_DELAY_MS, AUTO_CONNECT_MAX_DELAY_MS));

  if (!isRunning.get()) return;

  if (isInviteLimitReached()) {
    console.warn('[Linkit] LinkedIn invite-limit modal detected; stopping.');
    stopAutoConnect();
    return;
  }
  if (clickCount.get() >= Number(sessionCap.get())) {
    stopAutoConnect();
    return;
  }
  driveAutoConnect();
}

/** Decide what to click based on the current page type, then click it. */
export function driveAutoConnect() {
  if (!isRunning.get()) return;
  const type = pageType.get();

  // Modern LinkedIn renders PYMK cards directly on /mynetwork/ and
  // /mynetwork/grow/. The legacy cohort/catch-up URLs now 404 or bounce to
  // /mynetwork/catch-up/pymk/?skipRedirect=true, so we no longer navigate —
  // we just scan the current page for "Connect" buttons.

  if ([PageType.MyNetwork, PageType.SearchPeople].includes(type)) {
    const cssSelector =
      type === PageType.MyNetwork
        ? Selectors.ConnectButtonFromMyNetworkPage
        : Selectors.ConnectButtonFromSearchPage;
    // Try the page-specific CSS selector first, fall back to a visible
    // "Connect" span button on either page layout.
    findAndClickConnect(
      () => document.querySelector(cssSelector) || findButtonByText('Connect'),
    );
  }
}

export function startAutoConnect() {
  emptyMyNetworkScans.set(0);
  pageAdvances.set(0);
  isRunning.set(true);
}

export function stopAutoConnect() {
  isRunning.set(false);
}
