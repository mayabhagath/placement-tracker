# Placement Tracker

A calendar-based tracker for campus placement season — log every company's rounds (OA, interviews, HR, etc.), see them laid out on a calendar, and track status per round. If a company rejects you at round one, you can easily remove remove the rest of the rounds from the calendar. 

**Live demo:** https://placement-tracker-maya.vercel.app 

## Features

- **Company-grouped tracking** — every company is organized separately
- **Calendar view** — all rounds across all companies laid out by date, colour-coded by status
- **Cascading round management** — marking a round as "Rejected" offers the option to clear that company's remaining rounds in one click
- **Status tracking per round** — Upcoming, Awaiting Result, Cleared, Offer, Rejected
- **Local persistence** — your data is saved automatically in the browser (`localStorage`), no sign-in or backend required
- **Zero dependencies at runtime** — a single self-contained HTML file; no build step, no server, works offline once loaded

## Tech stack

- **React 18**, written in JSX, precompiled to plain JS (no in-browser transpilation)
- Plain CSS via inline styles — no framework
- Icons as hand-rolled inline SVG (no icon library dependency)
- Browser `localStorage` for persistence
- Deployed as a static site on [Vercel](https://vercel.com)

## Project structure

```
placement-tracker/
├── index.html        # the deployed app — self-contained, includes React + compiled component
├── src/
│   └── App.jsx        # readable JSX source (for reference / future edits)
└── README.md

`index.html` is the only file actually needed to run or deploy the app — `src/App.jsx` is just a human-readable source, since `index.html` contains the precompiled, minified version.

## Running locally

No install, no build step:

```bash
git clone https://github.com/<your-username>/placement-tracker.git
cd placement-tracker
```

Then just open `index.html` in your browser.


## Data & privacy

All data stays in your browser's local storage on your device. There's no backend, no account system, and nothing is sent anywhere. Clearing your browser's site data (or switching browsers/devices) will reset the tracker.
Data persists as long as you open the file on the same device, and in the same browser. 

