# Linkit

Linkit is a Chrome extension (Manifest V3) that auto-connects with People You May Know on LinkedIn and bulk-deletes skills from your profile.

## Features

- **Auto-connect on My Network**: opens the "People You May Know" cohort page and clicks Connect on each card, with built-in rate limiting (see safety notice below).
- **Auto-connect on People Search**: same flow, driven from the search results page.
- **Bulk skill deletion**: walks the Skills section of your profile and removes every entry.
- **Popup UI** for one-click actions and a session progress indicator.
- **Options page** to configure the per-session connection cap.

## Installation (released build)

1. Run `npm install && npm run build` (see [Development](#development)).
2. Open `chrome://extensions` (or the equivalent in any Chromium-based browser).
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** and select the generated `dist/` folder.
5. Pin the **Linkit** icon to the toolbar for easy access.

## Usage

1. Sign in to LinkedIn in the same browser.
2. Click the Linkit toolbar icon.
3. Choose an action:
   - **People You May Know** — opens `/mynetwork/` in a new tab and starts the auto-connect flow when you press **START**.
   - **Search People** — opens the People search and starts auto-connect when you press **START**.
   - **Delete All Skills** — opens your skills page and removes every skill.
4. Watch the _Invitations Sent_ counter in the popup. Press **STOP** at any time.

## Project Structure

| Path                   | Purpose                                                                  |
| ---------------------- | ------------------------------------------------------------------------ |
| `manifest.config.js`   | Source of truth for the MV3 manifest (consumed by `@crxjs/vite-plugin`). |
| `vite.config.js`       | Vite + React + CRX build pipeline.                                       |
| `images/`              | Extension icons (16, 128).                                               |
| `src/popup/`           | Popup React app (`index.html`, `main.jsx`, `App.jsx`).                   |
| `src/options/`         | Options React app (`index.html`, `main.jsx`, `App.jsx`).                 |
| `src/content/index.js` | Content script injected into LinkedIn pages.                             |
| `src/shared/`          | Shared constants, atoms, theme, popup→content messaging helpers.         |
| `dist/`                | Build output (loaded as the unpacked extension).                         |

> `npm run build` regenerates everything into `dist/`. Source-tree edits go under `src/**`.

## Architecture

```
popup / options page  ──(chrome.tabs.connect Port)──▶  content script (src/content/index.js)
                      ◀──(postMessage events)──────
```

- The popup opens a long-lived `chrome.runtime.Port` to the active tab.
- Messages use a typed enum (`StartAutoConnect`, `StopAutoConnect`, `ButtonClicksCountUpdated`, `RunningStateUpdated`, `ConnectionEstablished`).
- The skill-deletion action uses a one-shot `chrome.runtime.sendMessage({ action: "deleteSkills" })`; the listener validates `sender.id === chrome.runtime.id` and whitelists the action name (see #4).

### Auto-connect flow

1. User clicks **People You May Know** → popup opens `https://www.linkedin.com/mynetwork/`.
2. Content script detects the URL, sets page type to `MyNetwork`.
3. User clicks **START** → content script clicks the in-page "Show all" PYMK link (or navigates to `/mynetwork/cohort/pymk/`).
4. On the cohort page, the script scrolls, finds `button[aria-label^="Invite "][aria-label$=" to connect"]`, clicks it, dismisses the confirmation modal, and waits a randomised 3–8 s before the next click.
5. Stops on: STOP click, per-session cap, per-day cap (`chrome.storage.local`), or detection of LinkedIn's invite-limit modal.

## Permissions

| Permission                                                                            | Reason                                                            |
| ------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `scripting`                                                                           | Inject `src/content/index.js` on matching LinkedIn pages.         |
| `storage`                                                                             | Persist the per-session cap (`sync`) and daily counter (`local`). |
| `host_permissions: https://www.linkedin.com/{search,mynetwork,in/*/details/skills}/*` | Narrow host scope so the script only runs where it is needed.     |

A strict `content_security_policy` (`script-src 'self'; object-src 'self'`) is declared in the manifest.

## Development

Requirements: **Node 20 LTS** and npm.

```sh
npm install        # install deps
npm run dev        # vite build --watch (rebuilds on save)
npm run build      # one-shot production build → dist/
npm run lint       # ESLint (react + react-hooks, no-unused-vars)
npm run format     # Prettier (writes)
npm run format:check
```

Load `dist/` as an unpacked extension. After any change, click the reload
button on the Linkit row in `chrome://extensions` and re-test the affected
flow.

### Continuous integration

`.github/workflows/ci.yml` runs `npm ci`, `npm run lint`, `npm run
format:check`, and `npm run build` on every push and pull request (Node 20).

### Tech stack

- React 18 + Chakra UI v2 + Emotion (popup, options)
- Jotai for shared popup ↔ options state
- Vanilla JS + tiny signal helper for the content script (no React)
- Vite 5 + `@crxjs/vite-plugin` for MV3 packaging
- ESLint 9 (flat config) + Prettier 3

## Troubleshooting

- **"START" does nothing on My Network.** Reload the tab and the extension; LinkedIn occasionally rolls out new card layouts. If the Invite-button `aria-label` pattern has changed (`"Invite … to connect"`), the selector in `src/shared/constants.js` (`Selectors.ConnectButtonFromMyNetworkPage`) needs an update.
- **Counter stops climbing well below the cap.** LinkedIn may have shown the weekly invite-limit modal; the content script will log `[Linkit] LinkedIn invite-limit modal detected; stopping.` to the page console. Wait at least a week before resuming and consider lowering the per-day cap.
- **Skill deletion stops partway through.** The skill modal selectors are fragile (#5 tracks the refactor). Refresh the page and re-run; failures are logged as `Linkit: error deleting skill: …`.
- **Permission prompt about additional sites.** Linkit only requests `https://www.linkedin.com/...` paths; deny anything else.

## ⚠️ Account-safety notice

LinkedIn enforces invitation limits (historically ~80–100 / week) and may restrict, warn, or temporarily suspend accounts that send invites too rapidly or in too-high volume. To reduce risk, Linkit:

- Waits a randomised **3–8 seconds** between clicks.
- Stops automatically at a **per-session cap** (default 100, configurable on the Options page).
- Stops automatically at a **per-day cap** (default 40, persisted in `chrome.storage.local`).
- Detects LinkedIn's "invite limit reached" modal and stops immediately.

Use at your own risk; lower the caps further if you are unsure.
