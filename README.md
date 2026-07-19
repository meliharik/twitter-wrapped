# Twitter Wrapped

**Your year on X, wrapped.** Turns your account activity into a shareable year-in-review: top posts, activity patterns and stats, rendered entirely client-side.

## How it works

The project has two parts:

- **Web app** (`src/`): a React + Vite single-page app that crunches your data in the browser and renders your Wrapped. Nothing leaves your machine.
- **Chrome extension** (`extension/`): collects your own X data from your logged-in session and hands it to the web app.

## Getting started

```sh
npm install
cp .env.example .env
npm run dev
```

To load the extension, open `chrome://extensions`, enable Developer mode, click **Load unpacked** and select the `extension/` folder.

## Stack

React · Vite · Chrome Extension (Manifest V3)
