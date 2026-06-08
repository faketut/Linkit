// URL watcher + popup port + one-shot message handler + signal → port broadcasts.

import { Links, MessageId, PORT_TICK_MS, PageType } from '../shared/constants.js';
import {
  clickCount,
  driveAutoConnect,
  isRunning,
  pageType,
  startAutoConnect,
  stopAutoConnect,
} from './autoConnect.js';
import { checkAndDeleteSkills } from './skills.js';
import { signal } from './utils.js';

const currentUrl = signal('');
const activePort = signal(/** @type {chrome.runtime.Port | null} */ (null));

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

export function startUrlWatcher() {
  return setInterval(() => {
    if (window.location.href !== currentUrl.get()) {
      currentUrl.set(window.location.href);
    }
  }, PORT_TICK_MS);
}

/** Seed initial URL classification — classifyByUrl will set pageType and
 *  trigger skills cleanup / auto-connect as appropriate. */
export function seedInitialUrl() {
  currentUrl.set(window.location.href);
}

// ---------------------------------------------------------------------------
// Port messaging (popup ↔ content)
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

export function startPortListener() {
  chrome.runtime.onConnect.addListener(onPortConnected);
}

// ---------------------------------------------------------------------------
// One-shot message handler (popup → "deleteSkills" trigger). Issue #4.
// ---------------------------------------------------------------------------
export function startMessageListener() {
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
export function startSignalBroadcasts() {
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
