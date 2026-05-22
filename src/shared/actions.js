import { Links } from './constants.js';

/** Open a popup-to-content-script Port on the active tab. */
export async function connectToActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return null;
  return chrome.tabs.connect(tab.id);
}

export function openMyNetwork() {
  chrome.tabs.create({ url: Links.MyNetworkPage });
}

export function openSearchPeople() {
  chrome.tabs.create({ url: Links.SearchPeoplePage });
}

export function openOptions() {
  chrome.runtime.openOptionsPage();
}

/**
 * Trigger skill deletion on the currently-active LinkedIn skills page.
 * Sends a one-shot message; the content script validates the sender and
 * whitelists the action name (see issue #4).
 */
export function requestDeleteSkills() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab) return;
    const url = tab.url || '';

    if (!url.includes('linkedin.com')) {
      alert('Please navigate to LinkedIn first.\n\nGo to: https://www.linkedin.com/');
      return;
    }
    if (!url.includes('/details/skills/')) {
      alert(
        'Please navigate to your LinkedIn skills page first.\n\n' +
          'Go to: https://www.linkedin.com/in/[your-username]/details/skills/',
      );
      return;
    }

    chrome.tabs.sendMessage(tab.id, { action: 'deleteSkills' }, (response) => {
      if (chrome.runtime.lastError) {
        // Content script not yet injected — inject it manually then retry once.
        chrome.scripting
          .executeScript({ target: { tabId: tab.id }, files: ['src/content/index.js'] })
          .then(() => {
            setTimeout(() => {
              chrome.tabs.sendMessage(tab.id, { action: 'deleteSkills' });
            }, 1000);
          })
          .catch(() => {
            alert('Please refresh the LinkedIn skills page and try again.');
          });
        return;
      }
      if (!response?.success) {
        console.warn('Linkit: delete-skills request was not acknowledged.');
      }
    });
  });
}
