# Handshake AI Task Alert

A local Chrome extension that watches the currently open Handshake AI dashboard and alerts you when the page changes from no-task to task-available.

## What it does
- Checks the active Handshake AI tab every 10 seconds.
- Detects configurable task-availability keywords in visible page text.
- Alerts with a desktop notification and extension badge.
- Does not log in, submit tasks, click task controls, or solve/generate Handshake work.
- Uses your existing logged-in browser session; credentials are never stored.

## Install
1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked**.
4. Select this `handshake-task-alert` folder.
5. Open your Handshake AI dashboard in Chrome and keep the tab open.
6. Click the extension icon and enable monitoring.

## Important
The 10-second polling interval is intentionally configurable. Use it only if permitted by Handshake's current terms/policies and avoid excessive traffic. The extension performs checks against the already-loaded page rather than attempting to bypass authentication or platform controls.
