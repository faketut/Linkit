// Linkit content script entry — runs on LinkedIn pages declared in manifest.
//
// Responsibilities:
//  1. Detect what kind of LinkedIn page we're on (search / mynetwork / skills).
//  2. Drive the auto-connect loop on search + mynetwork pages.
//  3. Bulk-delete skills on the skills page.
//  4. Talk to the popup via a long-lived chrome.runtime.Port.
//
// Implementation is split across:
//   - utils.js        tiny signal store + DOM helpers
//   - skills.js       skills-page bulk deletion
//   - autoConnect.js  connect-button scan loop + modal + pagination
//   - messaging.js    URL watcher + port + message listener
//   - index.js        boot (this file)

import { clampSessionCap } from '../shared/constants.js';
import { sessionCap } from './autoConnect.js';
import {
  seedInitialUrl,
  startMessageListener,
  startPortListener,
  startSignalBroadcasts,
  startUrlWatcher,
} from './messaging.js';

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
  startPortListener();

  await loadSessionCapFromSync();
  startUrlWatcher();
  seedInitialUrl();
})();
