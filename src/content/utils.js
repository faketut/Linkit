// Shared content-script utilities: tiny signal store + DOM helpers.

import { LINKIT_INVITE_LIMIT_TEXT } from '../shared/constants.js';

/**
 * Tiny signal helper — replaces the bundled C() store from the legacy bundle.
 * signal(initial) → { get, set, subscribe }; subscribe returns an unsubscriber.
 */
export function signal(initial) {
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

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

export function focusClick(el) {
  el.focus();
  el.click();
}

/**
 * Find a clickable element (button or anchor) whose visible label
 * (e.g. <span>Connect</span>) matches `text` (case-insensitive, trimmed).
 * Skips disabled/muted controls. Pass `exact: false` for substring matches.
 */
export function findButtonByText(text, { root = document, exact = true } = {}) {
  const target = text.trim().toLowerCase();
  const nodes = root.querySelectorAll('button, a[role="button"], a');
  for (const el of nodes) {
    if (el.disabled || el.getAttribute('aria-disabled') === 'true') continue;
    if (el.classList.contains('artdeco-button--muted')) continue;
    const label = (el.innerText || el.textContent || '').trim().toLowerCase();
    if (!label) continue;
    if (exact ? label === target : label.includes(target)) return el;
  }
  return null;
}

/**
 * Issue #5 — event-driven wait helper. Resolves with the first truthy value
 * returned by `selectorOrFn`, or `null` after `timeout` ms.
 */
export function waitForElement(selectorOrFn, { timeout = 5000, root } = {}) {
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

export function isInviteLimitReached() {
  if (document.querySelector('#ip-fuse-limit-alert')) return true;
  const modals = document.querySelectorAll('.artdeco-modal, [role="dialog"]');
  for (const m of modals) {
    if (LINKIT_INVITE_LIMIT_TEXT.test(m.textContent || '')) return true;
  }
  return false;
}
