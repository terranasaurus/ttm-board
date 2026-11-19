# Clinician Ops Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build these four things: per-clinician branded morning emails with short
chart prep and paid-mileage numbers, Sunday period-close and payroll-preview emails,
and a nightly PHI-free KPI push into a role-scoped dashboard page in the TTM Kan
portal.

**Architecture:** One Google Apps Script project (`ops/clinician-ops/`, deployed
with clasp, owned by terran@) does all PHI work inside Google: Calendar, Drive
charts, Maps, Vertex Gemini and Gmail. Pure logic lives in dual-mode files
(Apps Script globals + CommonJS exports) tested with `node --test`. Nightly, it
POSTs counts only, HMAC-signed, to a Next.js API route in the Kan fork, which
upserts into `team` schema tables. Plain Next.js API routes in `apps/web` (better-auth
session + `@kan/db` repo) serve the `/dashboard` page with server-side access scoping.
No tRPC and no `apps/api` dependency, so Part B works whether or not the fork adopts
upstream's NestJS split (kanbn/kan #710).

**Tech Stack:** Apps Script V8, clasp, Node 24 `node:test`, Vertex AI
`generateContent` (structured JSON), Next.js 15 pages router, better-auth, Drizzle,
Postgres (Supabase), zod, vitest, Tailwind (v4 after the upstream sync).

**Spec:** `docs/superpowers/specs/2026-11-19-clinician-ops-design.md`

## Global Constraints

- No PHI (child/family names, addresses, DOBs, chart text) in Kan, its database,
  or this repo. This repo is public today. No staff config, Google file IDs,
  calendar IDs or secrets in code.
- Paid miles = Maps driving distance between consecutive visits on the same day,
  whatever happens in between. Never home → first visit or last visit → home.
- Visit hours = sum of visit durations + 15 min × (visits − 1) per day. Admin
  (`Admin…`, not `Admin Support…`) is paid at the PT rate. `Admin Support…` is
  paid at that job's rate.
- Mileage rate is $0.725, read from the Settings tab, never hard-coded beyond
  test fixtures.
- Pay periods: biweekly Mon → Sun. Anchor period ends Sun 2026-02-22, paid Fri
  2026-02-27. Holiday payday → prior business day. Run-by = 2 business days
  before payday. Enter-by = 1 business day before run-by.
- Prep is 100–150 words per patient (hard cap 150), rendered by our code from
  Gemini JSON.
- Gemini only through Vertex (`USE_VERTEX` stays true). Model from Script
  Property `GEMINI_MODEL` = `gemini-4-hydrogen`, with a `GEMINI_FALLBACK_MODEL`.
- Progress notes are due at 6, 12, 18, 24 and 30 months of age (not 36). Next due
  = first of those after the latest eval/progress note.
- Stale = no completed visit in more than 7 days (Settings `staleDays`).
- Kan fork rules: new files, not upstream edits (exception: one line in
  `TtmNav.tsx`). Tables go only through
  `packages/db/ttm-migrations/*.sql`.
- Brand: green `#134c00`, orange `#ff7900`, gold `#ffb000`, gray `#b3b3b3`.
  Email font stack `Montserrat, Arial, sans-serif`.
- Commit messages end with the session's two attribution lines. Never commit
  `.clasp.json`.

## Review Focus

1. **Overlapping events for one clinician** (co-treats, double-booked
   placeholders). Visit hours must count overlapping time once (interval union).
   Legs follow start order, and a leg between two visits at the same address is
   0 mi. Test: Task A2 `overlapping visits are not double-counted`.
2. **Dates across DST and day boundaries** (DST ended 2026-11-01; events ending
   after midnight). All date math is in `America/Los_Angeles` calendar dates. Pay
   periods spanning a DST change must still be 14 days. Test: Task A1 `period
   spanning DST stays 14 days`.
3. **A clinician with zero visits** in a day or a whole period (new hire). Emails
   still send ("No visits today"). The payroll row shows zeros, and the dashboard
   shows an empty state, never a crash. Tests: Task A7 `zero-visit clinician
   renders zero row`, and Task B4 `clinician with no rows gets empty data`.
4. **Gemini output that isn't clean JSON or runs over budget** (code fences,
   prose, 300 words). Parse what's salvageable, trim to 150 words, and otherwise
   show "prep unavailable". The email still sends. Test: Task A5 `fenced JSON
   parses` / `garbage returns null card`.
5. **Login email casing differs from staff email** (`Jordan@…`). Access matching
   is case-insensitive, and an unknown user sees an empty state, not someone
   else's data. Test: Task B4 `scope matches email case-insensitively`.

---

## Part A: Apps Script engine (`ops/clinician-ops/`)

File map:

| File | Responsibility |
|---|---|
| `ops/clinician-ops/appsscript.json` | Manifest (V8, `America/Los_Angeles`, Drive v2 advanced service, scopes from Chart Review + `script.send_mail` not needed + `spreadsheets`, `maps` none needed) |
| `ops/clinician-ops/.claspignore`, `.clasp.json.example`, `README.md` | Deploy setup. README: clasp login/push, Script Properties list, Ops Config sheet layout, trigger install, calendar-sharing onboarding step |
| `src/lib/periods.js` | Pay-period math |
| `src/lib/dayModel.js` | Event classification, legs, hours, flags |
| `src/lib/progressNotes.js` | Next progress-note due date |
| `src/lib/prep.js` | Prompt, response schema, parse, word budget |
| `src/lib/render.js` | Brand constants + HTML for all emails |
| `src/lib/payroll.js` | Payroll rows and totals |
| `src/lib/kpi.js` | KPI payload + signing string |
| `src/gas/config.js` | Reads Script Properties + Ops Config sheet |
| `src/gas/google.js` | Calendar read, Maps distance (cached), Drive chart read (ported from Chart Review), Vertex call, Patient Tracker read |
| `src/gas/main.js` | Trigger entry points, `doGet` refresh, `installTriggers`, `probeVertexModels`, dry-run helpers |
| `test/*.test.js` | `node --test` suites for `src/lib/*` |

Dual-mode pattern, used at the end of every `src/lib/*.js`:

```js
if (typeof module !== "undefined") module.exports = { /* public fns */ };
```

Lib files may not call any Google service. They take plain data and injected
functions. Run all tests with `node --test ops/clinician-ops/test/`.

### Task A1: Project scaffold + pay periods

**Files:** Create the scaffold files above, `src/lib/periods.js`, and
`test/periods.test.js`.

**Interfaces:**
- Produces `payPeriodFor(dateStr: "YYYY-MM-DD", settings: { anchorPeriodEnd: "2026-02-22", anchorPayday: "2026-02-27", holidays: string[] }) → { start, end, payday, runBy, enterBy, holidayAdjusted: boolean }`. All values are `"YYYY-MM-DD"`.
- Produces `isPeriodCloseDay(dateStr, settings) → boolean` (true on the period's end Sunday).
- Produces `holidayReminderDue(dateStr, settings) → period | null`. Returns the
  period when `dateStr` is the Monday of the period's second week and that
  period's payday was holiday-adjusted.
- Produces `addDays(dateStr, n)` and `weekdayOf(dateStr)`, using date-only
  arithmetic on UTC-noon `Date`s so DST can't shift days.

- [ ] **Step 1:** Write `test/periods.test.js` with:
  - `2026-11-20 period` → `{start:"2026-11-02", end:"2026-11-15", payday:"2026-11-20", runBy:"2026-11-18", enterBy:"2026-11-17"}`.
  - `2026-11-19 period` → start `2026-11-16`, end `2026-11-29`, payday `2026-12-04`, runBy `2026-12-02`, enterBy `2026-12-01`.
  - `holiday payday moves` with holidays `["2027-01-01"]`, for `2026-12-20` →
    payday `2026-12-31`, runBy `2026-12-29`, enterBy `2026-12-28`,
    `holidayAdjusted:true`. `holidayReminderDue("2026-12-21")` returns that period.
  - `period spanning DST stays 14 days`: the period containing `2026-11-01` has
    end − start = 13 days.
  - `isPeriodCloseDay("2026-11-29")` is true. `isPeriodCloseDay("2026-11-22")` is
    false.
- [ ] **Step 2:** Run `node --test ops/clinician-ops/test/periods.test.js`. Expect
  FAIL (module not found).
- [ ] **Step 3:** Implement `periods.js` per the interfaces. Business days skip
  Sat/Sun and `holidays`.
- [ ] **Step 4:** Run it again. Expect all PASS.
- [ ] **Step 5:** Commit: `feat(ops): scaffold clinician-ops and pay-period math`.

### Task A2: Day model (classification, paid legs, hours)

**Files:** Create `src/lib/dayModel.js` and `test/dayModel.test.js`.

**Interfaces:**
- Consumes nothing from earlier tasks.
- Produces `classifyEvent(ev: {title, start: ISO, end: ISO, location, status}, rules: {visitPattern: RegExp, cancelPattern: RegExp}) → "visit" | "admin" | "adminSupport" | null`.
  - `adminSupport`: title matches `/^\s*admin\s*support\b/i`.
  - `admin`: title matches `/^\s*admin\b/i` (and isn't Admin Support).
  - `visit`: title matches `visitPattern` and neither title nor `status` matches
    `cancelPattern`.
- Produces `buildDay(events, rules, distanceFn: (from, to) => {miles, minutes} | null, opts: {paidGapMinutes: 15, longDriveMinutes: 25}) → DayModel`, where:

```
DayModel = { visits: [{start,end,title,location}], legs: [{fromIdx,toIdx,miles,minutes,flag: null|"long"|"missingLocation"}],
             paidMiles, visitMinutes, adminMinutes, adminSupportMinutes, longDriveCount, missingLocationCount }
```

- [ ] **Step 1: Discover the real rules.** Use the Sheets API (or the Sheets MCP)
  to read the `Raw` tab of the "TTM Patient Tracker" sheet. Its ID is in the
  private setup notes, never in the repo. Record the distinct `Status` values and
  5–10 redacted `Original Title` shapes per provider in the PR description, not
  the repo. Set the defaults `visitPattern` and `cancelPattern` (e.g.
  `/cancel|no[\s-]?show|\bCX\b/i`) to match those values. These defaults go in
  the Settings tab (Task A4) and in test fixtures as fake titles.
- [ ] **Step 2:** Write tests, using fake titles and addresses:
  - `five visits = 360 visit minutes`: 5 back-to-back 60-min visits → `visitMinutes` 300 + 60 = 360.
  - `legs are visit-to-visit only`: 3 visits → 2 legs, and `paidMiles` = their sum.
    `distanceFn` is never called with a home address (assert the call log).
  - `gap still pays direct distance`: visits at 9:00 and 13:30 with an `Admin`
    block between → 1 leg, paid, 15 min still added.
  - `same address is 0 miles`, without calling `distanceFn`.
  - `missing location flags leg as 0`: `flag:"missingLocation"`,
    `missingLocationCount:1`.
  - `long drive flagged`: minutes 31 → `flag:"long"`, still paid.
  - `cancelled excluded`: a cancelled visit isn't in `visits` and doesn't create
    legs.
  - `admin vs admin support`: `Admin - charting` 60 → `adminMinutes` 60.
    `Admin Support HEP review` 30 → `adminSupportMinutes` 30.
  - `overlapping visits are not double-counted`: 9:00–10:00 and 9:30–10:30 →
    `visitMinutes` 90 + 15.
- [ ] **Step 3:** Run `node --test ops/clinician-ops/test/dayModel.test.js`. Expect
  FAIL.
- [ ] **Step 4:** Implement. Sort visits by start. Visit minutes = union of
  intervals + `paidGapMinutes` × (visits − 1). Leg miles are rounded to 0.1 per
  leg, and `paidMiles` is the sum of the rounded legs.
- [ ] **Step 5:** Run it again. Expect PASS.
- [ ] **Step 6:** Commit: `feat(ops): day model for visits, paid legs and hours`.

### Task A3: Progress-note due dates

**Files:** Create `src/lib/progressNotes.js` and `test/progressNotes.test.js`.

**Interfaces:**
- Produces `nextProgressNoteDue(dob: "YYYY-MM-DD", lastNoteDate: "YYYY-MM-DD" | null, today: "YYYY-MM-DD") → { due: "YYYY-MM-DD", ageMonths: 6|12|18|24|30 } | null`.
- Produces `dueWithin(result, today, days) → boolean`.
- Month birthdays use calendar months. A DOB on the 31st clamps to the month end.

- [ ] **Step 1:** Write the tests:
  - `eval at 5 months → 6-month note`: dob `2026-01-10`, last `2026-06-12` → `{due:"2026-07-10", ageMonths:6}`.
  - `note on the 12-month birthday → next is 18`: dob `2025-05-01`, last
    `2026-05-01` → `2026-11-01`, 18.
  - `no note at 36`: dob `2024-01-15`, last `2026-07-20` (30-mo note done) → `null`.
  - `no prior note uses today`: dob `2026-03-03`, last `null`, today
    `2026-08-01` → `2026-09-03`, 6.
  - `dob on 31st clamps`: dob `2026-03-31` → 6-month birthday `2026-09-30`.
  - `dueWithin` is true at 14 days, false at 15 days (window 14).
- [ ] **Step 2:** Run the tests. Expect FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the tests again. Expect PASS.
- [ ] **Step 5:** Commit: `feat(ops): progress-note due dates from DOB`.

### Task A4: Config, Google glue, dry run

**Files:** Create `src/gas/config.js`, `src/gas/google.js` and `src/gas/main.js`
(dry-run functions only for now). Port from the existing Chart Review project.
Export its JSON with the Drive API, `exportMimeType:
application/vnd.google-apps.script+json`. The project ID is in the private notes.

**Interfaces:**
- Produces `loadConfig() → { props: {GCP_PROJECT_ID, VERTEX_LOCATION, GEMINI_MODEL, GEMINI_FALLBACK_MODEL, KAN_PUSH_URL, KAN_PUSH_SECRET, REFRESH_SECRET, PATIENT_FOLDERS_PARENT_ID, PATIENT_TRACKER_ID, OPS_CONFIG_ID, LOGO_URL, DASHBOARD_URL}, staff: Staff[], settings: Settings }`, where:

```
Staff    = { name, email, calendarId, visitPattern: RegExp, role: "clinician"|"admin", payroll: boolean, ptRate: number, adminSupportRate: number|null, active: boolean }
Settings = { mileageRate, anchorPeriodEnd, anchorPayday, paidGapMinutes, longDriveMinutes, staleDays, cancelPattern: RegExp, adminRecipients: string[], holidays: string[] }
```

- Produces `getEvents(staff, dateStr) → ev[]` (the A2 shape; status comes from
  the title/description/attendee-declined state per A2 Step 1).
- Produces `distance(from, to) → {miles, minutes} | null`. Uses
  `Maps.newDirectionFinder()` with driving mode, caches in `CacheService`
  (6 h) plus a `DistanceCache` tab in the Ops Config sheet keyed by the
  normalized address pair. Returns null on failure.
- Produces `getTrackerSnapshot(staff, today) → { activePatients, stalePatients, scheduledNext7 }`.
  Reads the tracker's `Patients` / `Raw` tabs, attributes each patient by
  `Primary Provider`, and returns counts only.
- Produces `getChart(patientName)` and `callGemini(prompt, schema)`, ported from
  Chart Review: Drive v2 Shared Drive reading, PDF OCR via temporary Doc, Vertex
  URL. `callGemini` tries `GEMINI_MODEL`, and on a 404 retries
  `GEMINI_FALLBACK_MODEL`, then emails `adminRecipients` once per day about the
  fallback.
- Produces `getDob(patientName) → "YYYY-MM-DD" | null` and
  `getLatestNoteDate(chart) → "YYYY-MM-DD" | null`. DOB comes from the eval doc
  text (pattern `DOB|Date of Birth`), falling back to a `DOB` column if the tracker
  has one.

- [ ] **Step 1:** Create the Ops Config sheet in the TTM Shared Drive.
  - `Staff` tab, with rows for Terran (payroll no), Cassandra and Jordan
    (payroll yes, ptRate 60; Cassandra's adminSupportRate 17).
  - `Settings` tab with the values from Global Constraints, plus `cancelPattern`
    from A2.
  - Put its ID in Script Properties and the private notes only.
- [ ] **Step 2:** Implement the three gas files. Add `probeVertexModels()` with
  `gemini-4-hydrogen` first in its candidate list. Add `dryRunDay(email,
  dateStr)`, which logs the A2 DayModel. Add `dryRunSnapshot(email)`.
- [ ] **Step 3:** In a new Apps Script project, owned by terran@ and linked to the
  same GCP project as Chart Review:
  - `clasp push`.
  - Run `probeVertexModels`. Expect a ✓ on `gemini-4-hydrogen`. If ✗, set
    `GEMINI_MODEL` to the best ✓ and tell Terran.
  - Run `dryRunDay` for Terran and Cassandra on 2026-11-18. Expect visit counts
    to match the tracker's `Raw` rows for that date and provider, and legs
    between visits only.
- [ ] **Step 4:** Commit: `feat(ops): config loader and Google service glue`.

### Task A5: Chart prep (prompt, schema, budget)

**Files:** Create `src/lib/prep.js` and `test/prep.test.js`.

**Interfaces:**
- Produces `PREP_SCHEMA`, a Vertex `responseSchema`: object with `lastTime:
  string[] (≤2)`, `today: string[] (2–3)`, `parent: string`, `checks: string[]`.
- Produces `buildPrepPrompt({time, isNew, coverage, chartText}) → string`.
  - Keeps Chart Review's CRITICAL RULES verbatim.
  - States "Total 100–150 words across all fields. One line per bullet."
  - New patients: `lastTime` empty.
  - Tag each `today` bullet with a goal id (e.g. "STG 2").
- Produces `parsePrep(text) → Prep | null`. Strips markdown fences, then takes the
  first `{…}` block and validates the field types.
- Produces `enforceBudget(prep, max = 150) → Prep`. While the word count is over
  `max`, drop the last `checks`, then the last `today` (keeping at least 1), then
  the last `lastTime`, then truncate `parent`.
- Produces `wordCount(prep) → number`.

- [ ] **Step 1:** Write the tests:
  - `fenced JSON parses`.
  - `garbage returns null card` (`"Sorry, I can't"` → null).
  - `enforceBudget trims to ≤150` (a 300-word fixture ends ≤150 with
    `today.length ≥ 1`).
  - `under-budget unchanged`.
  - `new patient prompt omits last-time section`.
- [ ] **Step 2:** Run the tests. Expect FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the tests again. Expect PASS.
- [ ] **Step 5:** Commit: `feat(ops): structured 150-word chart prep`.

### Task A6: Morning email

**Files:** Create `src/lib/render.js` and `test/render.test.js`. Modify
`src/gas/main.js` (add `morningRun`).

**Interfaces:**
- Consumes `DayModel` (A2), `Prep` (A5), `nextProgressNoteDue` / `dueWithin`
  (A3), and `payPeriodFor` (A1).
- Produces `BRAND = {green:"#134c00", orange:"#ff7900", gold:"#ffb000", gray:"#b3b3b3", font:"Montserrat, Arial, sans-serif"}`.
- Produces `morningSubject(today: DayModel) → "Today: 4 visits · ~13.2 paid mi"`.
  With no visits it's `"Today: no visits"`.
- Produces `renderMorning({staffName, dateLabel, yesterday: {dateLabel, day: DayModel} | null, today: DayModel, cards: Card[], logoUrl}) → html`, where:

```
Card = { time, patientName, isNew, lastSeen, staleDays|null, prep: Prep|null, progressNote: {due, ageMonths}|null }
```

  - The layout follows the spec §3 sketch: 600px single column, inline CSS only,
    green header bar with the logo `<img>` (alt "Terran Through Milestones"),
    gold flags.
  - Footer: "Supports, not replaces, your clinical judgment."
- `morningRun()`:
  - Runs on weekdays only, for every active clinician.
  - Yesterday = most recent prior weekday with visits, looking back up to 7 days.
  - Builds Cards with Gemini once per patient. Per-card errors become null prep.
  - Sends with `GmailApp.sendEmail(..., {htmlBody, name: "TTM Daily Prep"})`.
  - Also: export `apps/web/public/ttm-logo.svg` to
    `apps/web/public/email/ttm-logo-email.png` (600px wide, `rsvg-convert` or
    `sharp`, committed). `LOGO_URL` =
    `https://portal.terranthroughmilestones.com/email/ttm-logo-email.png`.

- [ ] **Step 1:** Write the render tests:
  - The subject formats for 4 visits / 13.2 mi and for none.
  - The html contains `14.6 paid mi`.
  - A stale flag shows only when `staleDays` is not null.
  - The progress line `Progress note due 12/02 (turns 12 mo)` shows when present.
  - `prep:null` renders `prep unavailable`.
  - A new patient has no "Last time" row.
  - No `<script>` or `<style>` blocks (inline CSS only).
- [ ] **Step 2:** Run the tests. Expect FAIL.
- [ ] **Step 3:** Implement `render.js` and `morningRun`. Build the logo PNG.
- [ ] **Step 4:** Run the tests again. Expect PASS. Then run `morningRun` once
  with a `TEST_RECIPIENT` override (Terran only). Terran checks it on phone and
  desktop Gmail.
- [ ] **Step 5:** Commit: `feat(ops): branded morning prep and mileage email`.

### Task A7: Period-close and payroll-preview emails

**Files:** Create `src/lib/payroll.js` and `test/payroll.test.js`. Modify
`render.js` (add two renderers) and `main.js` (add `sundayRun`).

**Interfaces:**
- Consumes `payPeriodFor` / `isPeriodCloseDay` / `holidayReminderDue` (A1),
  `DayModel` (A2), and `Staff` / `Settings` (A4).
- Produces `money(n) → "$1,234.56"`. Rounds half-up on cents via
  `Math.round(n * 100 + 1e-9) / 100`.
- Produces `payrollRow(staff, days: {date, day: DayModel}[], settings) → { name, visits, miles, mileageAmt, visitHours, visitAmt, adminHours, adminAmt, adminSupportHours, adminSupportAmt, longDrives, missingLocations, daily: [...] }`.
  Hours are rounded to 0.25.
- Produces `payrollTotals(rows) → same numeric fields summed + estimatedTotal`.
- Produces `renderPeriodClose({staffName, period, totalMiles, daily})` and
  `renderPayroll({period, rows, totals})`. These follow the spec §4/§5 layouts.
  The Admin Support line is omitted when its hours are 0.
  - Payroll subject: `Payroll preview · Nov 16–29 · run by Wed Dec 2 · payday Fri Dec 4`.
  - When `holidayAdjusted`, the subject is prefixed `[EARLY] ` and the email has
    a gold banner with the adjusted dates.
- `sundayRun()`:
  - If `isPeriodCloseDay(today)`: send period-close to each `payroll` clinician
    (18:00 trigger), then the payroll preview to `adminRecipients` (20:00 trigger).
  - Two separate entry points, `sundayClinicianRun` and `sundayPayrollRun`, each
    checking the date.
  - Also a daily `holidayReminderRun` that emails `adminRecipients` when
    `holidayReminderDue(today)`.

- [ ] **Step 1:** Write the tests:
  - `spec example math`: 142.6 mi × 0.725 → `$103.39`, 44.5 h × 60 → `$2,670.00`,
    3.0 h × 60 → `$180.00`, 4.0 h × 17 → `$68.00`.
  - `totals sum rows`.
  - `zero-visit clinician renders zero row` (no NaN, "0 visits").
  - `admin support line hidden at 0`.
  - `payroll subject` for the Nov 16–29 period.
  - `holiday period subject has [EARLY]`.
- [ ] **Step 2:** Run the tests. Expect FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the tests again. Expect PASS. Run `sundayPayrollRun` with
  `FORCE_DATE=2026-11-15` and `TEST_RECIPIENT`. Terran checks the numbers against
  the Nov 2–15 payroll she ran.
- [ ] **Step 5:** Commit: `feat(ops): period-close and payroll preview emails`.

### Task A8: KPI payload, signed push, refresh endpoint, triggers

**Files:** Create `src/lib/kpi.js` and `test/kpi.test.js`. Modify `main.js` (add
`nightlyPush`, `doGet`, `installTriggers`, `removeOldChartReviewNote`).

**Interfaces:** This is the contract with Part B. Copy it exactly.

```
KpiPayload = {
  version: 1, generatedAt: ISO, mileageRate: number,
  period: { start, end, payday },
  clinicians: [{
    email: lowercase, name: "First Last",
    daily: [{ date, visits, cancellations, paidMiles, visitMinutes, adminMinutes, adminSupportMinutes, longDrives, missingLocations }],  // last 90 days
    snapshot: { activePatients, stalePatients, notesDue14, notesDue30, scheduledNext7 }
  }]
}
```

- Produces `buildPayload(input) → KpiPayload`. Drops every key not listed above.
- Produces `signingString(ts: string, body: string) → ts + "." + body`. The
  headers are `x-ttm-timestamp` (unix seconds) and `x-ttm-signature` (hex
  HMAC-SHA256 of the signing string). In Apps Script use
  `Utilities.computeHmacSha256Signature`, hex-encoded.
- `nightlyPush()` (21:00 daily) builds the payload for all active clinicians and
  POSTs it to `KAN_PUSH_URL`. On non-2xx, it emails `adminRecipients` once.
- `doGet(e)`: if `e.parameter.secret === REFRESH_SECRET`, it starts
  `nightlyPush` (via a 1-minute time trigger, so the call returns immediately) and
  returns `{"started":true}`. Otherwise it returns 403 text.
- `installTriggers()` creates morning (Mon–Fri 07:00), sundayClinician (Sun
  18:00), sundayPayroll (Sun 20:00), holidayReminder (daily 08:00) and
  nightlyPush (daily 21:00), removing duplicates first.

- [ ] **Step 1:** Write the tests:
  - `payload carries no PHI`: given input with `patientName`, `address`, `dob`
    and `title` on days and visits, the JSON contains none of those strings.
  - `email lowercased`.
  - `signature matches node crypto` (computed with `crypto.createHmac` vs a fixed
    expected hex for `ts="1700000000"`, body `{"a":1}`, secret `"s"`).
- [ ] **Step 2:** Run the tests. Expect FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the tests again. Expect PASS.
- [ ] **Step 5:** Commit: `feat(ops): signed nightly KPI push and refresh hook`.

### Task A9: Cutover

- [ ] **Step 1:** Run the full suite with `node --test ops/clinician-ops/test/`.
  Expect all PASS.
- [ ] **Step 2:**
  - Deploy the web app (execute as me, anyone with link). Store the URL and
    `REFRESH_SECRET` as Vercel env `TTM_REFRESH_URL` / `TTM_REFRESH_SECRET` after
    Part B ships.
  - Run `installTriggers`.
  - In the old TTM Chart Review project, run `removeDailyTrigger` so only one
    morning email goes out.
- [ ] **Step 3:** Onboarding check. Confirm Cassandra's and Jordan's calendars
  are shared to terran@ with full details: `dryRunDay` for each returns events.
- [ ] **Step 4:** Update `ops/clinician-ops/README.md` with the runbook (add a
  hire, rotate secrets, change model, what each email is). Commit:
  `docs(ops): clinician-ops runbook`.

---

## Part B: Kan dashboard

**Base branch depends on Terran's upstream-sync decision (PR #7 / kanbn/kan #710).**
Build on whatever `main` is at the time. Nothing here imports `@kan/api` or tRPC, so
it survives either path. Shared server code goes in `packages/server/src/ttm/` if that
package exists on the base, otherwise `apps/web/src/server/ttm/`.

### Task B1: Tables, schema, repository

**Files:**
- Create `packages/db/ttm-migrations/0002_ttm_kpi.sql`.
- Create `packages/db/src/schema/ttmKpi.ts`.
- Create `packages/db/src/repository/ttmKpi.repo.ts`.
- Modify `packages/db/src/schema/index.ts` (one export line).
- Test: `packages/db/src/repository/ttmKpi.repo.test.ts`. If the db package has
  no test DB harness, test the pure date-window helper only.

**Interfaces:**
- Tables (unqualified names, `team` search_path, RLS enabled like
  `0001_ttm_doc.sql`):
  - `ttm_kpi_daily(email varchar(255), date date, visits int, cancellations int, "paidMiles" numeric(7,1), "visitMinutes" int, "adminMinutes" int, "adminSupportMinutes" int, "longDrives" int, "missingLocations" int, name varchar(255), "updatedAt" timestamp default now(), PRIMARY KEY(email, date))`.
  - `ttm_kpi_snapshot(email varchar(255) PRIMARY KEY, name varchar(255), "activePatients" int, "stalePatients" int, "notesDue14" int, "notesDue30" int, "scheduledNext7" int, "mileageRate" numeric(5,3), "periodStart" date, "periodEnd" date, payday date, "generatedAt" timestamp)`.
- Repo:
  - `upsertPayload(db, payload: KpiPayload) → void`. One transaction: upsert
    daily rows, upsert snapshots, then delete daily rows with
    `date < current_date - 90`.
  - `getDaily(db, emails: string[], from: string, to: string)`.
  - `getSnapshots(db, emails: string[])`.
  - `listClinicians(db) → {email, name}[]`.

- [ ] **Step 1:** Write the migration, schema and repo, following
  `0001_ttm_doc.sql` / `ttmDocs.ts` / `ttmDoc.repo.ts`.
- [ ] **Step 2:** Run `pnpm --filter @kan/db typecheck`. Expect it to pass.
  Dry-run `node packages/db/ttm-migrations/migrate-team.mjs` against a local
  Postgres (docker-compose). Expect `0002_ttm_kpi.sql` listed as pending, then
  `--apply` succeeds.
- [ ] **Step 3:** Commit: `feat(db): ttm KPI tables`.

### Task B2: Payload validation + signature verification

**Files:** Create `<ttm server dir>/kpiPush.ts` and `kpiPush.test.ts` (dir per Part B note).

**Interfaces:**
- Produces `kpiPayloadSchema` (zod, mirrors A8 `KpiPayload` exactly, `.strict()`
  at every level).
- Produces `verifyPushSignature({ts, sig, rawBody, secret, nowSec}) → boolean`.
  Uses a timing-safe compare and rejects `|nowSec − ts| > 300`.

- [ ] **Step 1:** Write the vitest tests:
  - The valid signature fixture is identical to A8's (`ts 1700000000`, body
    `{"a":1}`, secret `s`).
  - A tampered body fails.
  - A stale timestamp (`now = ts + 301`) fails.
  - A strict schema rejects an extra `patientName` key.
- [ ] **Step 2:** Run `pnpm --filter <owning package> test -- kpiPush`. Expect FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run it again. Expect PASS.
- [ ] **Step 5:** Commit: `feat(api): KPI push validation and HMAC check`.

### Task B3: Push API route

**Files:** Create `apps/web/src/pages/api/ttm/kpi-push.ts`.

**Interfaces:** `POST` only.
- `export const config = { api: { bodyParser: false } }`. Reads the raw body.
- Verifies with `TTM_KPI_PUSH_SECRET` (B2), parses, then calls `upsertPayload`
  (B1).
- Responses: 200 `{ok:true, clinicians:n}`, 401 on a bad signature, 400 on schema
  failure (no body echo), 405 otherwise.

- [ ] **Step 1:** Add a vitest route test, `apps/web/src/pages/api/ttm/kpi-push.test.ts`,
  that mocks the repo and checks the 401 / 400 / 200 / 405 cases.
- [ ] **Step 2:** Run it. Expect FAIL. Implement it, then run again. Expect PASS.
- [ ] **Step 3:** Commit: `feat(web): signed KPI push endpoint`.

### Task B4: KPI read/refresh API routes + access scope

**Files:**
- Create `<ttm server dir>/kpiScope.ts` and `kpiScope.test.ts`.
- Create `apps/web/src/pages/api/ttm/kpi.ts` (GET) and
  `apps/web/src/pages/api/ttm/kpi-refresh.ts` (POST).
- Session: `auth.api.getSession({ headers })` using the same `initAuth(createDrizzleClient())`
  the base's `pages/api/auth/[...all].ts` uses. 401 when no session.

**Interfaces:**
- `resolveKpiScope({userEmail, requested: "team" | string | undefined, admins: string[], clinicianEmails: string[]}) → { isAdmin: boolean, emails: string[], selected: "team" | string }`:
  - Everything is compared lowercase.
  - Admin: `requested` undefined → `"team"` with all emails, `"team"` → all, an
    email → `[email]`.
  - Non-admin: always `[userEmail]` if it's in `clinicianEmails`, else `[]`.
    `requested` is ignored.
- Admins come from env `TTM_DASHBOARD_ADMINS` (comma-separated).
- `GET /api/ttm/kpi?clinician=<email|team>&weeks=8` returns JSON:

```
{ isAdmin, selected, clinicians: {email,name}[] (admins only, else []),
  period: {start,end,payday,mileageRate}, updatedAt,
  totals: { visits, paidMiles, mileageAmt, visitHours, adminHours },        // current period, over scoped emails
  attention: { stalePatients, notesDue14, missingLocations },
  weekly: [{ weekStart, visits, paidMiles }],                                // last `weeks` weeks
  perClinician: [{ email, name, visits, paidMiles, visitHours, stalePatients, notesDue14 }] }  // team view only
```

  - Visit hours = `visitMinutes / 60`, with the same 15-min rule already applied
    upstream in A2.
- `POST /api/ttm/kpi-refresh` (admins only, else 403) does a
  server-side fetch to `TTM_REFRESH_URL?secret=TTM_REFRESH_SECRET` and returns
  `{started:boolean}`.

- [ ] **Step 1:** Write the `kpiScope` tests:
  - `clinician sees only self`, even when requesting another email.
  - `admin default team`.
  - `admin picks one`.
  - `scope matches email case-insensitively`.
  - `unknown user gets empty`.
  - `clinician with no rows gets empty data`, via a pure `summarize(daily,
    snapshots, period)` helper in the same file returning zeros.
- [ ] **Step 2:** Run the owning package's vitest for `kpiScope`. Expect FAIL.
- [ ] **Step 3:** Implement `kpiScope.ts` (including `summarize`) and both routes.
- [ ] **Step 4:** Run the tests and `pnpm typecheck`. Expect PASS.
- [ ] **Step 5:** Commit: `feat(web): role-scoped KPI API routes`.

### Task B5: Dashboard page

**Files:**
- Create `apps/web/src/pages/dashboard.tsx`, following `my-work.tsx`.
- Create `apps/web/src/views/ttm/dashboard/index.tsx`, `StatTile.tsx` and
  `WeeklyBars.tsx`.
- Modify `apps/web/src/views/ttm/TtmNav.tsx` (one ITEMS entry: `{ name:
  "Dashboard", href: "/dashboard", Icon: HiOutlineChartBar }`, placed first).

**Interfaces:** Consumes `GET /api/ttm/kpi` and `POST /api/ttm/kpi-refresh` (B4) via
`@tanstack/react-query` `useQuery`/`useMutation` with `fetch`.

- **Layout** (spec §7):
  - Header: the admin switcher (Team + each clinician, a segmented control on
    desktop, a select on mobile) and "Updated {relative time}".
  - Admins also get a Refresh button. After clicking, it polls `/api/ttm/kpi` every 10 s
    for up to 3 min until `updatedAt` changes, then shows "Updated".
  - Pay-period tiles: Visits, Paid miles (+$), Visit hours, Admin hours.
  - Attention tiles (gold accent when > 0): Stale patients, Progress notes due
    ≤14 days, Missing addresses.
  - `WeeklyBars`: a dependency-free inline SVG, 8 weekly bars for visits plus a
    miles line, `viewBox`-scaled, with an accessible `<title>`.
  - Team view: a table of `perClinician` with a totals row.
- **Empty state:** "No numbers yet. They update nightly." Show it when there's
  no data or the user isn't a clinician.
- Works in light and dark mode and at 375px width. Uses `views/ttm/ui.tsx`
  primitives and TTM orange for the active state.

- [ ] **Step 1:** Add a vitest test for `WeeklyBars`: renders 8 bars from 8
  points, renders without NaN when all zeros.
- [ ] **Step 2:** Run it. Expect FAIL. Implement the components, then run again.
  Expect PASS.
- [ ] **Step 3:** Run `pnpm typecheck && pnpm lint && pnpm --filter @kan/web test`.
  Expect PASS.
- [ ] **Step 4:** Use Playwright on `pnpm dev` with a seeded local DB (push the A8
  test fixture to the local endpoint). Screenshot the admin team view, a
  clinician view, and the mobile 375px view. Confirm a clinician account can't
  switch.
- [ ] **Step 5:** Commit: `feat(web): TTM KPI dashboard page`.

### Task B6: Go live

- [ ] **Step 1:** On Terran's go-ahead:
  - Apply the migration to Supabase: `migrate-team.mjs --apply` with the
    `kan_app` URL.
  - Set the Vercel env vars `TTM_KPI_PUSH_SECRET`, `TTM_DASHBOARD_ADMINS`,
    `TTM_REFRESH_URL` and `TTM_REFRESH_SECRET`.
- [ ] **Step 2:** Open the PR to `main`. After merge and deploy, run `nightlyPush`
  manually. Expect a 200 and the dashboard to show data for Terran (admin view)
  and Cassandra (own only).
