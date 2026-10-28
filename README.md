# focusebuddy

A private companion for a better workday: water logging, focused work sessions, and movement breaks. Built with React, TypeScript, Vite, Tailwind CSS, and Lucide. No account, backend, analytics, or camera access.

## Run locally

Use Node.js **26+** and npm. The release was verified with Node 26.5.0 and npm 12.0.1. Node 22.22.2+ or 24.15+ also satisfy the installed tooling’s engine requirements.

```sh
npm ci
npm run dev
```

Open the localhost URL printed by Vite. The default is `http://127.0.0.1:5173`; Vite chooses the next available port if necessary. Keep the same origin and port to access the same browser data.

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run preview
```

`dist/` contains the static production application. Serve it over HTTPS, or localhost for development, for browser APIs such as Web Locks and notifications. No server-side application is needed. Network access is needed to install dependencies; the app makes no application API calls after loading. There is no service worker or offline-install feature in this release.

## Features

- Customizable daily water goal, quick additions, custom amounts, individual corrections and deletion, and undo of the latest addition in the current tab.
- Date-selectable water and break history, with daily work totals.
- Timestamp-based work sessions with pause, resume, end, and refresh recovery.
- Coordinated movement breaks with countdowns, snooze, skip, explicit completion, and interruption records.
- In-app reminders and optional desktop notifications.
- Settings, confirmed resets, validated local storage, and one writable tab at a time.
- Responsive dark interface, native accessible dialogs, visible keyboard focus, and reduced-motion support.

The initial 2,000 ml goal is a customizable preference, not a medical recommendation. Water entries accept whole numbers from 1–2,000 ml; goals accept 250–10,000 ml. Intake may exceed the goal. Logged water does not measure hydration status.

## Timer rules

The default rhythm is 45 minutes of work followed by a 5-minute break. Work intervals accept 1–180 minutes; break durations accept 1–60 minutes.

| State             | What happens                                                                                       |
| ----------------- | -------------------------------------------------------------------------------------------------- |
| Idle              | Start work opens one session and a full work interval.                                             |
| Working           | Work accumulates; the break countdown runs.                                                        |
| Break due         | One reminder appears. Work continues until you start a break, pause, or end the session.           |
| On break          | Work stops accumulating. The break countdown runs.                                                 |
| Ready to complete | The break timer has elapsed. Work remains stopped until explicit completion.                       |
| Paused            | No work or break time accumulates. Resume restores the previous phase and its remaining countdown. |

- Snooze schedules another reminder after five minutes of active work; it creates no break outcome.
- Skip records a skipped break and starts a full work interval.
- Complete break & resume work becomes available after the break duration. It records one completed break, credits the configured duration, and starts a full work interval. Extra time away never counts as work.
- End break early records an interrupted break and starts a full work interval.
- End session stops scheduling. An unfinished break is recorded as interrupted, even if its countdown has elapsed but it has not been explicitly completed.
- Reset break countdown is available while working or when a break is due. It starts a full interval without clearing accumulated work or recording a break.
- Changing the work interval applies at the next full interval or explicit countdown reset. Changing break duration applies to the next break. Water goals update immediately. Notification changes apply immediately; numeric preferences apply when saved.

Durations come from timestamps and recorded work segments, not interval callback counts. UI callbacks refresh the display approximately once per second.

### Refresh, sleep, and inactivity

The owner tab persists a checkpoint approximately every 15 seconds during an open session, plus every state transition. A refresh within 60 seconds of the last checkpoint preserves the phase and original deadline.

If more than 60 seconds pass without a checkpoint, the app conservatively pauses the session at its last checkpoint. Unobserved time counts as neither work nor break time. Resume is explicit. Missed reminders are not replayed.

The browser cannot reliably distinguish sleep, closure, and throttling. Prolonged inactivity may therefore pause the session. Idle and already-paused sessions stay in their existing states. Keep the app open for reminders: it cannot run when closed, and browser or operating-system suspension can delay reminders.

## Calendar dates

Timestamps use Unix epoch milliseconds. Display and daily grouping use the browser’s current local timezone.

- Days run from local midnight to the next local midnight, including 23- or 25-hour daylight-saving days.
- Water belongs to the date of its entry. Editing an amount preserves its timestamp.
- Break outcomes belong to the date they are recorded.
- Work segments crossing midnight are split by overlap when calculating daily totals. Midnight does not end the session.
- The displayed date refreshes while open and when returning to the app. History is never deleted at midnight.
- Changing timezone regroups existing history using the new timezone.

Reset today ends the current session, removes water and break outcomes recorded today, and removes only today’s portions of work segments. Earlier history and settings are preserved. Clear all data removes all focusebuddy records and settings from this browser origin. Both require separate confirmation and cannot be undone.

## Storage and multiple tabs

The sole persisted key remains `posture-buddy:data` for compatibility with existing saved activity. Schema version 1 stores individual water entries, work sessions and segments, break outcomes, settings, current session state, a revision, and recently handled notification event IDs. Totals are derived from records. Future migrations belong in `src/services/storage.ts`.

Unreadable or unsupported stored data is left untouched and editing is disabled. Settings provides an explicit reset. If storage access or saving fails, the application continues in memory and warns that changes may not survive reload. Browser storage can be cleared and is not a backup. There is no export or cloud sync in this release.

Where supported, a Web Lock elects one writable tab. Other tabs display synchronized data read-only and cannot schedule reminders or send notifications. Closing or reloading the owner releases its lock; the next tab reloads the latest saved state before becoming writable. Storage events synchronize followers.

When safe coordination is unavailable, editing stays disabled until the user confirms that other focusebuddy tabs are closed. Keep only one tab open in that fallback mode. If storage itself is unavailable, tabs cannot synchronize data.

## Notifications and privacy

Desktop notifications are off by default. Permission is requested only after explicitly enabling the setting. Permission denial, browser incompatibility, and delivery failure leave in-app reminders available. Blocked permission must be changed in browser settings. Permission and delivery are controlled by the browser and OS; automated tests simulate those APIs rather than verifying an actual OS notification.

The app never requests camera access and does not collect telemetry, upload activity, load remote fonts, or contact a cloud AI service. Browser storage is local to the origin and browser profile. It is not encrypted by the application.

## Code map

| Location                    | Responsibility                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------------- |
| `src/services/engine.ts`    | Pure timestamp-based state transitions, work segments, break outcomes, and resets.          |
| `src/services/storage.ts`   | Schema validation, persistence, failure handling, and future migration entry point.         |
| `src/services/ownership.ts` | Writable-tab election with Web Locks.                                                       |
| `src/hooks/useBuddy.ts`     | React integration, checkpoints, recovery, synchronization, notification delivery, and undo. |
| `src/utils/time.ts`         | Calendar boundaries, duration formatting, and overlap calculations.                         |
| `src/components/`           | Session, water, history, settings, and native dialog interfaces.                            |
| `src/index.css`             | Design tokens, responsive styles, focus states, and reduced motion.                         |

Tests cover state transitions, input validation, pause exclusion, break outcomes, recovery, midnight splitting, DST and timezone changes, persistence failures, resets, notification deduplication, tab synchronization, and primary user interactions.

## Future posture estimation

The next step is a separate opt-in prototype using MediaPipe Pose Landmarker with client-side inference. Evaluate landmark visibility and performance on a MacBook before connecting it to reminders.

Keep camera capture, landmark inference, posture estimation, reminder policy, and UI separate. Require explicit consent, handle denied permission, provide a persistent camera-off control, and stop camera tracks when disabled. Do not upload, record, or persist video frames or biometric data.

Calibrate against the user’s baseline and account for camera angle, lighting, position, and confidence. Use sustained deviations, confidence thresholds, debouncing, cooldowns, and adjustable sensitivity. Suppress brief normal movement and avoid diagnosing posture or claiming to measure spinal alignment from a single front-facing camera.
