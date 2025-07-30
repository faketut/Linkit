# Linkit

Linkit is a browser extension for automating LinkedIn tasks such as connecting with people and managing skills.

## Features

- Automates sending connection requests on LinkedIn search and My Network pages.
- Allows bulk deletion of skills from your LinkedIn profile.
- Provides a popup UI for quick actions.
- Options page for configuration.

## Project Structure

- **manifest.json**: Chrome extension manifest (v3).
- **images/**: Extension icons.
- **pages/assets/**: Bundled JavaScript assets for popup and options pages.
- **pages/src/**: HTML for popup and options pages.
- **tab/tab.js**: Main content script injected into LinkedIn pages.

## How It Works

- The extension injects `tab/tab.js` into LinkedIn pages matching people search, My Network, and skills URLs.
- The popup (`pages/src/popup.html`) allows users to trigger actions like deleting all skills.
- The options page (`pages/src/options.html`) provides configuration.
- Communication between popup/options and content scripts is handled via Chrome messaging APIs.

## Permissions

- `scripting`, `storage`: For injecting scripts and saving settings.
- `host_permissions`: Access to all LinkedIn pages.

## Development

- Source HTML is in `pages/src/`.
- JavaScript is bundled into `pages/assets/`.
- Content script logic is in [`tab/tab.js`](tab/tab.js).

## Usage

1. Install the extension in your browser.
2. Navigate to LinkedIn and use the popup to automate actions.
3. Configure options as needed in the options
