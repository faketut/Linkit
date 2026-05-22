import { atom } from 'jotai';
import { LINKIT_SESSION_CAP_DEFAULT, clampSessionCap } from './constants.js';

/** Whether the auto-connect loop is currently running. */
export const isRunningAtom = atom(false);

/** Per-session count of successful Invite clicks. */
export const clickCountAtom = atom(0);

/** Maximum auto-connections per session (persisted in chrome.storage.sync). */
export const sessionCapAtom = atom(LINKIT_SESSION_CAP_DEFAULT);

/**
 * Load the session cap from chrome.storage.sync, clamped to the safe range.
 * Returns the loaded value.
 */
export async function loadSessionCap() {
  const defaults = { maximumAutoConnectionsPerSession: LINKIT_SESSION_CAP_DEFAULT };
  const { maximumAutoConnectionsPerSession } = await new Promise((resolve) => {
    chrome.storage.sync.get(defaults, resolve);
  });
  return clampSessionCap(maximumAutoConnectionsPerSession);
}

/** Persist the session cap to chrome.storage.sync. */
export async function saveSessionCap(value) {
  return new Promise((resolve) => {
    chrome.storage.sync.set(
      { maximumAutoConnectionsPerSession: clampSessionCap(value) },
      resolve,
    );
  });
}
