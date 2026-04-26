# Tarbiya — Sunday School Check-In

A proof-of-concept barcode check-in / check-out app for a Sunday school. Replaces a slow, error-prone "type the student's name" workflow with a quick camera scan: parents present a barcode (printed or on their phone), staff scan it, the student is checked in or out instantly.

**Live demo:** https://ajmaljalal.github.io/tarbiya-poc/

> Open the demo on a phone. Allow camera access. Use **Manage Students** on a laptop to display barcodes, then scan them from the phone.

---

## The problem

The Sunday school's existing flow:

1. Staff types the student's first or last name into a search box.
2. Multiple matches appear — staff has to disambiguate.
3. Spelling mismatches mean the student often can't be found at all.
4. Once found, staff clicks a Check-In or Check-Out button.

Result: long parent queues at drop-off and pickup, frustrated staff, frequent mistakes.

This PoC swaps step 1–4 for a single barcode scan.

---

## Features

- **Mobile-first UI.** Designed for a phone held one-handed by a staff member at the door.
- **Camera barcode scanner.** Powered by [`html5-qrcode`](https://github.com/mebjas/html5-qrcode) — supports CODE128, QR, EAN, and other common formats out of the box.
- **Two scan modes.** Check-In and Check-Out, with the same camera UI but distinct state transitions and tinted action color (teal for in, amber for out).
- **Live recent-scans feed.** The last 8 scans appear below the camera with name, grade, ID, and timestamp.
- **Smart feedback.** Each scan flashes the camera frame green/red, plays a short chime, and shows a toast. Re-scanning the same code is debounced 1.8 s to prevent duplicates.
- **Manual entry fallback.** Keyboard icon top-right of the scanner opens a modal for typing an ID — useful if a code won't scan or a parent forgot their barcode.
- **Students screen.** Searchable, grade-filterable list of all students, each showing their current in/out status. Tap a row to see (and print) their barcode.
- **Persistence.** All state lives in `localStorage` — survives refresh and offline use. No backend needed.
- **Print-ready barcodes.** The barcode modal has a Print button with print-only CSS that hides the rest of the UI.
- **PoC seed data.** 28 mock students across grades 1–5 with traditional Muslim names.

---

## Tech stack

| Concern        | Choice                                                  |
| -------------- | ------------------------------------------------------- |
| Runtime        | Browser only — no build step, no backend                |
| HTML / CSS     | Hand-written, custom CSS variables, mobile-first        |
| JavaScript     | Vanilla ES modules                                      |
| Scanning       | `html5-qrcode` 2.3.8 (CDN)                              |
| Barcode gen    | `JsBarcode` 3.11.6 (CDN), CODE128 format                |
| Storage        | `localStorage`, namespaced under `tarbiya.*`            |
| Hosting        | GitHub Pages                                            |
| Fonts          | Inter (Google Fonts)                                    |

No npm install, no bundler, no transpilation. Open the folder, serve over HTTP, done.

---

## Project structure

```
tarbiya-poc/
├── index.html              Single page; three views switched by class toggle
├── css/
│   └── styles.css          All styling. Mobile-first, no preprocessor.
├── js/
│   ├── app.js              Top-level controller — view routing + event wiring
│   ├── students.js         Roster, seed data, check-in/out logic
│   ├── scanner.js          Camera lifecycle, cooldown, success/error feedback
│   ├── barcode.js          CODE128 SVG generation
│   ├── storage.js          Thin localStorage wrapper
│   └── ui.js               View switching, toast, formatters, escapeHtml
└── .gitignore
```

Files are deliberately small and single-purpose. Each module has one reason to change.

---

## How it works

### Student records

Each student is an object:

```js
{
  id:        'TRB-0007',          // stable, zero-padded, used as barcode value
  firstName: 'Bilal',
  lastName:  'Ahmed',
  grade:     2,
  status:    'in',                // 'in' | 'out'
  history:   [                    // append-only audit log
    { action: 'check-in',  at: '2026-04-25T13:42:11.000Z' },
    { action: 'check-out', at: '2026-04-25T15:01:54.000Z' },
  ],
}
```

The roster is seeded into `localStorage` on first load (28 students) and never re-seeded after that. Mutations are written back as the whole array — fine at this scale.

### Scan flow

```
[Home]
  └── Start Check-In / Check-Out
       └── [Scanner view]
            ├── start camera (facingMode: 'environment')
            ├── frame loop → onScan(decodedText)
            │     ├── normalize ID (uppercase, trim)
            │     ├── lookup student
            │     ├── apply state transition for current mode
            │     ├── flash frame + chime + toast
            │     └── prepend entry to recent list
            └── back button → stop camera → return to Home
```

State transitions per mode:

| Current status | Mode        | Outcome                          |
| -------------- | ----------- | -------------------------------- |
| `out`          | check-in    | → `in` ✓                         |
| `in`           | check-in    | rejected: "already checked in"   |
| `in`           | check-out   | → `out` ✓                        |
| `out`          | check-out   | rejected: "already checked out"  |
| any            | unknown ID  | rejected: "Unknown code"         |

Rejections still show feedback so staff can see the issue and move on.

### Barcodes

Each student's `id` (e.g. `TRB-0007`) is encoded as a **CODE128** linear barcode — the same format used on shipping labels, library books, and ID cards. Parents can either:

- Save the barcode image to their phone's wallet/photos and present it on screen, or
- Print and laminate a small card.

CODE128 was chosen over QR because the user explicitly asked for "barcode," and CODE128 prints cleanly at small sizes. The scanner library also supports QR, so QR codes containing the ID would work too — switch the format in `js/barcode.js` if preferred.

---

## Local development

```bash
git clone https://github.com/Ajmaljalal/tarbiya-poc
cd tarbiya-poc
python3 -m http.server 8000
# open http://localhost:8000
```

The app **must** be served over HTTP — opening `index.html` via `file://` will silently fail because browsers refuse to load ES modules from file URLs.

To test the camera, use `localhost` or any `https://` origin. Plain HTTP on a non-localhost host (like `http://10.0.0.x:8000` from a phone) will load the UI but block camera access.

### Resetting the data

Open DevTools → Application → Local Storage → clear `tarbiya.*` entries, or run:

```js
Object.keys(localStorage).filter(k => k.startsWith('tarbiya.')).forEach(k => localStorage.removeItem(k));
location.reload();
```

The next load re-seeds the 28 mock students.

---

## Deploying to GitHub Pages

Already deployed for this repo. To redeploy after changes:

```bash
git add .
git commit -m "your change"
git push
```

Pages rebuilds automatically. Configuration: `Settings → Pages → main / (root)`. HTTPS is enforced.

For a fresh fork:

```bash
gh repo create <name> --public --source=. --push
gh api -X POST repos/<owner>/<name>/pages -f 'source[branch]=main' -f 'source[path]=/'
```

---

## Demo / testing flow

A clean way to demo this end-to-end without a printer:

1. Open the live URL on a **laptop**. Go to **Manage Students** → tap any row to display the barcode modal.
2. Open the live URL on a **phone**. Tap **Start Check-In**, allow camera.
3. Point the phone camera at the laptop screen showing the barcode.
4. Frame turns green, chime plays, toast confirms the check-in. The student moves to the recent-scans list.
5. Tap back. Home screen now shows updated stats (e.g. `1 checked in`).
6. Repeat for Check-Out — same flow, opposite transition.

Try the edge cases too: scan the same student twice in check-in mode (should warn "already checked in"), scan an unknown code by holding up some other random barcode (should warn "Unknown code").

---

## Known limitations / what's next

This is a PoC, deliberately scoped tight. Things a production version would need:

- **Auth.** Anyone with the URL can mutate state. Needs at minimum a staff PIN.
- **Multi-device sync.** Each device has its own `localStorage`. Real deployment needs a backend (Firebase, Supabase, or a small Node API) so multiple staff phones see the same roster and live status.
- **Per-day sessions.** Today the status is a flat `in` / `out` flag. A real system would record discrete sessions per Sunday so attendance reports can be generated.
- **Parent management.** Right now any barcode for a registered student works — there's no concept of "this barcode belongs to this parent." Production would tie barcodes to authorized pickup adults.
- **Roster CRUD.** Adding / editing / removing students is not in the UI. The seeded list is the only way in.
- **Reporting.** No exports, no attendance views, no analytics.
- **Offline-friendly PWA.** Add a service worker so the app loads offline once cached.
- **Accessibility pass.** Keyboard navigation works, but the modals could trap focus better and the camera area needs better screen-reader messaging.

None of these are hard — the codebase is small enough that a real version is a couple of evenings of work on top of this scaffold.

---

## License

No license specified — this is a private PoC. Reach out if you want to use the code.
