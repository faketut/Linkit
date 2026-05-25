// Linkit content script — runs on LinkedIn pages declared in manifest.
//
// Responsibilities:
//  1. Detect what kind of LinkedIn page we're on (search / mynetwork / skills).
//  2. Drive the auto-connect loop on search + mynetwork pages.
//  3. Bulk-delete skills on the skills page.
//  4. Talk to the popup via a long-lived chrome.runtime.Port.
//
// State is held in tiny "signal" objects (get / set / subscribe) so the
// orchestration reads close to the original obfuscated source but stays
// readable. Replaces the pre-rewrite bundled custom-store + lodash chunk.

import {
  AUTO_CONNECT_MAX_DELAY_MS,
  AUTO_CONNECT_MIN_DELAY_MS,
  LINKIT_DAILY_CAP,
  LINKIT_INVITE_LIMIT_TEXT,
  Links,
  MAX_POLL_ATTEMPTS,
  MessageId,
  PORT_TICK_MS,
  POLL_INTERVAL_MS,
  PageType,
  Selectors,
  clampSessionCap,
} from '../shared/constants.js';

// ---------------------------------------------------------------------------
// Tiny signal helper — replaces the bundled C() store from the legacy bundle.
// signal(initial) → { get, set, subscribe }; subscribe returns an unsubscriber.
// ---------------------------------------------------------------------------
function signal(initial) {
  let value = initial;
  const listeners = new Set();
  return {
    get: () => value,
    set: (next) => {
      const prev = value;
      value = next;
      for (const fn of listeners) fn(next, prev);
    },
    subscribe: (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

// ---------------------------------------------------------------------------
// Daily-cap persistence (issue #10) — bucketed by ISO date in storage.local.
// ---------------------------------------------------------------------------
const todayKey = () => 'linkit_daily_' + new Date().toISOString().slice(0, 10);

function incrementDailyCount() {
  const k = todayKey();
  return new Promise((resolve) => {
    chrome.storage.local.get([k], (v) => {
      const next = (Number(v?.[k]) || 0) + 1;
      chrome.storage.local.set({ [k]: next }, () => resolve(next));
    });
  });
}

function isInviteLimitReached() {
  if (document.querySelector('#ip-fuse-limit-alert')) return true;
  const modals = document.querySelectorAll('.artdeco-modal, [role="dialog"]');
  for (const m of modals) {
    if (LINKIT_INVITE_LIMIT_TEXT.test(m.textContent || '')) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// DOM helpers
// ---------------------------------------------------------------------------
function focusClick(el) {
  el.focus();
  el.click();
}

/**
 * Find a clickable button whose visible label (e.g. <span>Connect</span>)
 * matches `text` (case-insensitive, trimmed). Skips disabled/muted buttons.
 * Pass `exact: false` to allow substring matches.
 */
function findButtonByText(text, { root = document, exact = true } = {}) {
  const target = text.trim().toLowerCase();
  const buttons = root.querySelectorAll('button');
  for (const btn of buttons) {
    if (btn.disabled || btn.getAttribute('aria-disabled') === 'true') continue;
    if (btn.classList.contains('artdeco-button--muted')) continue;
    const label = (btn.innerText || btn.textContent || '').trim().toLowerCase();
    if (!label) continue;
    if (exact ? label === target : label.includes(target)) return btn;
  }
  return null;
}

function findElementByXPath(xpath) {
  const result = document.evaluate(
    xpath,
    document,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null,
  );
  return result.singleNodeValue;
}

/**
 * Issue #5 — event-driven wait helper. Resolves with the first truthy value
 * returned by `selectorOrFn`, or `null` after `timeout` ms.
 */
function waitForElement(selectorOrFn, { timeout = 5000, root } = {}) {
  return new Promise((resolve) => {
    const evaluate = () => {
      try {
        if (typeof selectorOrFn === 'function') return selectorOrFn();
        return document.querySelector(selectorOrFn);
      } catch {
        return null;
      }
    };
    const initial = evaluate();
    if (initial) return resolve(initial);

    let done = false;
    const finish = (v) => {
      if (done) return;
      done = true;
      observer.disconnect();
      clearTimeout(timer);
      resolve(v);
    };
    const observer = new MutationObserver(() => {
      const v = evaluate();
      if (v) finish(v);
    });
    observer.observe(root || document.body || document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
    });
    const timer = setTimeout(() => finish(null), timeout);
  });
}

// ---------------------------------------------------------------------------
// Skills-page deletion flow
// ---------------------------------------------------------------------------
function findSkillsEditButton() {
  return (
    findElementByXPath('//*[@id="navigation-add-edit-deeplink-edit-skills"]') ||
    document.querySelector('[data-control-name="edit_skills"]') ||
    document.querySelector('button[aria-label*="Edit"]') ||
    null
  );
}

function findSkillsDeleteButton() {
  return (
    findElementByXPath('/html/body/div[4]/div/div/div[3]/button[2]') ||
    document.querySelector('button[aria-label*="Delete"]') ||
    document.querySelector('[data-control-name="delete_skill"]') ||
    Array.from(document.querySelectorAll('button')).find((b) =>
      /^\s*delete\s*$/i.test(b.textContent || ''),
    ) ||
    document.querySelector('[data-control-name="delete"]') ||
    null
  );
}

function findSkillsConfirmButton() {
  return (
    findElementByXPath('/html/body/div[4]/div[2]/div/div[3]/button[2]') ||
    document.querySelector('button[aria-label*="Confirm"]') ||
    document.querySelector('[data-control-name="confirm_delete"]') ||
    Array.from(document.querySelectorAll('button')).find((b) =>
      /^\s*delete\s*$/i.test(b.textContent || ''),
    ) ||
    null
  );
}

function hasSkillsToDelete() {
  return findSkillsEditButton() !== null;
}

async function deleteSingleSkill() {
  try {
    const editButton = findSkillsEditButton();
    if (!editButton) return false;
    focusClick(editButton);

    const deleteButton = await waitForElement(findSkillsDeleteButton, { timeout: 5000 });
    if (!deleteButton) return false;
    focusClick(deleteButton);

    const confirmButton = await waitForElement(findSkillsConfirmButton, {
      timeout: 5000,
    });
    if (!confirmButton) return false;
    focusClick(confirmButton);

    // Wait for the confirm modal to close — signal deletion is complete.
    await waitForElement(() => (findSkillsConfirmButton() ? null : true), {
      timeout: 5000,
    });
    return true;
  } catch (error) {
    console.error('Linkit: error deleting skill:', error);
    return false;
  }
}

async function deleteAllSkills() {
  let deletedCount = 0;
  const maxAttempts = 50;
  let attempts = 0;

  while (hasSkillsToDelete() && attempts < maxAttempts) {
    attempts++;
    const success = await deleteSingleSkill();
    if (!success) break;
    deletedCount++;
    // Wait for the next edit button to appear (or bail out quickly if list is empty).
    await waitForElement(findSkillsEditButton, { timeout: 2000 });
  }
  return deletedCount;
}

function checkAndDeleteSkills() {
  if (window.location.href.includes('/details/skills/')) {
    deleteAllSkills();
  }
}

// ---------------------------------------------------------------------------
// Auto-connect flow
// ---------------------------------------------------------------------------
const pageType = signal(PageType.Unidentified);
const isRunning = signal(false);
const clickCount = signal(0);
const sessionCap = signal(100);
const currentUrl = signal('');
const activePort = signal(/** @type {chrome.runtime.Port | null} */ (null));

/** Dismiss any send-invite / in-mail modals; resolves once one is dismissed or polling caps out. */
function dismissModals() {
  return new Promise((resolve) => {
    let attempts = 0;
    const id = setInterval(() => {
      // Preferred: "Send without a note" on the add-note modal.
      const sendWithoutNote =
        findButtonByText('Send without a note') ||
        findButtonByText('Send without note');
      if (sendWithoutNote) focusClick(sendWithoutNote);

      const closeIcon = document.querySelector(Selectors.CloseSendInMailsModalButton);
      const closeBtn = closeIcon?.parentElement;
      if (closeBtn) focusClick(closeBtn);

      const dismiss = document.querySelector(Selectors.SendInMailsModalDismissButton);
      if (dismiss) focusClick(dismiss);

      const sendBtn =
        document.querySelector(Selectors.SendButtonFromSendInviteModal) ||
        findButtonByText('Send now') ||
        findButtonByText('Send');
      if (sendBtn) focusClick(sendBtn);

      attempts++;
      if (
        sendWithoutNote ||
        sendBtn ||
        dismiss ||
        closeBtn ||
        attempts > MAX_POLL_ATTEMPTS
      ) {
        clearInterval(id);
        resolve(null);
      }
    }, POLL_INTERVAL_MS);
  });
}

/** Scroll until a connect button appears, then click it. `finder` may be a
 *  CSS selector string or a function returning an element (or null). */
function findAndClickConnect(finder) {
  let attempts = 0;
  const id = setInterval(() => {
    window.scrollTo(0, document.body.scrollHeight);
    let btn = null;
    if (typeof finder === 'function') btn = finder();
    else if (typeof finder === 'string') btn = document.querySelector(finder);
    // Always fall back to a visible "Connect" span button.
    if (!btn) btn = findButtonByText('Connect');
    if (btn) {
      clearInterval(id);
      onConnectButtonFound(btn);
    } else if (++attempts > MAX_POLL_ATTEMPTS) {
      clearInterval(id);
      onNoConnectButton();
    }
  }, POLL_INTERVAL_MS);
}

function clickNextPage() {
  const btn = document.querySelector(Selectors.NextPageButton);
  if (btn) btn.click();
}

function onConnectButtonFound(btn) {
  focusClick(btn);
  btn.setAttribute('disabled', 'disabled');
  // Defer the post-click work (count++ / modal dismissal / pacing) to the orchestrator.
  void postClickCycle();
}

function onNoConnectButton() {
  clickNextPage();
}

/** Single cycle after a successful invite click: bump counts, sleep, then loop or stop. */
async function postClickCycle() {
  clickCount.set(clickCount.get() + 1);
  void dismissModals();

  const dailyCount = await incrementDailyCount();

  // Rate-limit jitter (issue #10).
  await sleep(randomInt(AUTO_CONNECT_MIN_DELAY_MS, AUTO_CONNECT_MAX_DELAY_MS));

  if (!isRunning.get()) return;

  if (isInviteLimitReached()) {
    console.warn('[Linkit] LinkedIn invite-limit modal detected; stopping.');
    stopAutoConnect();
    return;
  }
  if (dailyCount >= LINKIT_DAILY_CAP) {
    console.warn(
      '[Linkit] Daily invite cap reached (' + LINKIT_DAILY_CAP + '); stopping.',
    );
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
function driveAutoConnect() {
  if (!isRunning.get()) return;
  const type = pageType.get();

  // On My Network landing/grow pages, advance to the PYMK "Show all" cohort page first.
  if (type === PageType.MyNetwork) {
    const path = window.location.pathname.replace(/\/+$/, '');
    if (path === '/mynetwork' || path === '/mynetwork/grow') {
      const link = Array.from(
        document.querySelectorAll(Selectors.MyNetworkShowAllPymkLink),
      ).find((a) => /show all|see all/i.test((a.textContent || '').trim()));
      if (link) {
        focusClick(link);
        return;
      }
      window.location.assign(Selectors.MyNetworkPymkCohortUrl);
      return;
    }
  }

  if ([PageType.MyNetwork, PageType.SearchPeople, PageType.Skills].includes(type)) {
    const cssSelector =
      type === PageType.MyNetwork
        ? Selectors.ConnectButtonFromMyNetworkPage
        : type === PageType.SearchPeople
          ? Selectors.ConnectButtonFromSearchPage
          : null;
    // Try the page-specific CSS selector first, fall back to a visible
    // "Connect" span button on either page layout.
    findAndClickConnect(
      () =>
        (cssSelector && document.querySelector(cssSelector)) ||
        findButtonByText('Connect'),
    );
  }
}

function startAutoConnect() {
  isRunning.set(true);
}

function stopAutoConnect() {
  isRunning.set(false);
}

// ---------------------------------------------------------------------------
// URL change watcher — re-classify page type if SPA-navigated.
// ---------------------------------------------------------------------------
function classifyByUrl(url) {
  if (url.includes(Links.PatternOfSearchPage)) {
    pageType.set(PageType.SearchPeople);
    driveAutoConnect();
  } else if (url.includes(Links.PatternOfMyNetworkPage)) {
    pageType.set(PageType.MyNetwork);
    driveAutoConnect();
  } else if (url.includes(Links.PatternOfSkillsPage)) {
    pageType.set(PageType.Skills);
    checkAndDeleteSkills();
  } else {
    pageType.set(PageType.Unidentified);
  }
}

function startUrlWatcher() {
  return setInterval(() => {
    if (window.location.href !== currentUrl.get()) {
      currentUrl.set(window.location.href);
    }
  }, PORT_TICK_MS);
}

// ---------------------------------------------------------------------------
// Port messaging
// ---------------------------------------------------------------------------
function post(port, id, content) {
  port.postMessage({ id, content });
}

function onPortConnected(port) {
  activePort.set(port);
  post(port, MessageId.ConnectionEstablished);
  post(port, MessageId.RunningStateUpdated, isRunning.get());
  post(port, MessageId.ButtonClicksCountUpdated, clickCount.get());

  port.onMessage.addListener((msg) => {
    switch (msg?.id) {
      case MessageId.StartAutoConnect:
        startAutoConnect();
        break;
      case MessageId.StopAutoConnect:
        stopAutoConnect();
        break;
    }
  });
  port.onDisconnect.addListener(() => {
    if (activePort.get() === port) activePort.set(null);
  });
}

function startPortListener() {
  chrome.runtime.onConnect.addListener(onPortConnected);
}

// ---------------------------------------------------------------------------
// One-shot message handler (popup → "deleteSkills" trigger). Issue #4.
// ---------------------------------------------------------------------------
function startMessageListener() {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (!sender || sender.id !== chrome.runtime.id) return;
    if (!request || typeof request !== 'object' || typeof request.action !== 'string') {
      return;
    }
    const ALLOWED_ACTIONS = new Set(['deleteSkills']);
    if (!ALLOWED_ACTIONS.has(request.action)) return;

    if (request.action === 'deleteSkills') {
      checkAndDeleteSkills();
      sendResponse({ success: true });
    }
  });
}

// ---------------------------------------------------------------------------
// Wire signals → port broadcasts.
// ---------------------------------------------------------------------------
function startSignalBroadcasts() {
  clickCount.subscribe((n) => {
    const port = activePort.get();
    if (port) post(port, MessageId.ButtonClicksCountUpdated, n);
  });
  isRunning.subscribe((running) => {
    const port = activePort.get();
    if (port) post(port, MessageId.RunningStateUpdated, running);
    // Kick off the loop whenever running flips true.
    if (running) driveAutoConnect();
  });
  currentUrl.subscribe((url) => classifyByUrl(url));
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
async function loadSessionCapFromSync() {
  const defaults = { maximumAutoConnectionsPerSession: sessionCap.get() };
  const { maximumAutoConnectionsPerSession } = await new Promise((resolve) => {
    chrome.storage.sync.get(defaults, resolve);
  });
  sessionCap.set(clampSessionCap(maximumAutoConnectionsPerSession));
}

(async () => {
  startSignalBroadcasts();
  startMessageListener();

  if (window.location.href.includes('/details/skills/')) {
    pageType.set(PageType.Skills);
  }
  checkAndDeleteSkills();

  await loadSessionCapFromSync();
  startPortListener();
  startUrlWatcher();
  // Seed initial URL classification.
  currentUrl.set(window.location.href);
})();
