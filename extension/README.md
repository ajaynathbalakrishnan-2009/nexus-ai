# Nexus AI Focus Guard extension

The GitHub Pages website cannot block unrelated browser domains by itself. This Chromium extension provides the browser enforcement layer for Edge and Chrome.

## Install locally

1. Open `edge://extensions` or `chrome://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked**.
4. Select this `extension/` folder.
5. Keep the extension enabled.

Behavior:

- Blocks YouTube, Instagram, Facebook, TikTok, X, and Twitter from 11 PM to 5 AM using the device local time.
- The popup can activate a three-hour lock immediately.
- Checks the policy every minute and after browser startup.
- Redirects blocked pages to `blocked.html`.
- Stores only the lock timestamp and extension state in browser extension storage.

The Android companion has a separate Usage Access, AccessibilityService, and notification-listener integration. Windows native-app blocking remains a desktop companion feature and is not provided by GitHub Pages alone.
