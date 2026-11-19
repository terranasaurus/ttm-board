# Clinician Ops: daily emails, mileage, payroll preview, KPI dashboard

Status: draft for Terran's approval · 2026-11-19

## Why

TTM is growing from one field clinician (Terran) to several (Cassandra, Jordan,
more hires coming). Today each piece runs separately, only for Terran, or by
hand:

- **TTM Chart Review** (Apps Script) emails Terran a Gemini session-prep briefing
  each weekday. It's about 400 words per patient, too long to actually read, and
  only Terran is set up.
- **Terran's Mileage Tracker** (Sheet) logged Terran's legs through July. Other
  clinicians' mileage is worked out by hand at payroll time.
- **TTM Patient Tracker** (Sheet, fed by a calendar-reading script) already
  tracks visits per patient and "Not Seen Recently".
- Payroll (Gusto, biweekly) has Terran adding mileage by hand.

The goal is one polished system that works for every field clinician:

- Short, branded morning emails clinicians will actually use.
- Accurate mileage numbers clinicians enter in Gusto themselves, so payroll stops
  depending on Terran's manual entry.
- A Sunday-night payroll preview for Terran and Sheila.
- A KPI dashboard inside the TTM portal (the Kan fork), where each clinician sees
  only their own numbers and admins see everyone.

## Goals

1. **Morning email, per clinician, weekdays.** Today's visits, a 100–150 word prep
   per patient, projected paid miles for today, and yesterday's paid miles.
   Uses TTM colors and logo.
2. **Mileage for pay = miles between consecutive visits on the same day only.**
   Home → first visit and last visit → home are unpaid commute and are never
   counted.
3. **Clinician period-close email** (Sunday night when a pay period ends): their
   total paid miles for the period and how to enter it in Gusto.
4. **Payroll preview email** to Terran and Sheila (same Sunday night): per
   clinician and TTM totals for visits, mileage $, visit hours $, charting/admin
   hours $, Admin Support hours $.
5. **KPI dashboard page in Kan** (`/dashboard`). Clinicians see only their own
   numbers. Terran and Sheila can switch between clinicians or view the team.
   Updated nightly, plus an admin "Refresh now" button.
6. **Adding a hire = one row** in a config sheet. No code change.
7. **Gemini runs on Vertex AI** (BAA-covered). The model is a single setting,
   targeting `gemini-4-hydrogen`.

## Non-goals

- Clinicians don't confirm or submit mileage in our system. They enter it in
  Gusto (app → More → Expenses → Mileage). Ours is the estimate admins check
  against.
- No writes to Gusto. Rates are entered in our config sheet by hand.
- No GPS tracking. Mileage comes from calendar locations plus Google Maps
  driving distance.
- No reimbursement of commute legs (decided 2026-11-19).

## Anti-goals (failure even if it "works")

- **Any PHI on the Kan site, in the Kan database, or in this repo.** That means no
  child or family names, addresses, DOBs, or chart content. Kan only ever receives
  counts and minutes keyed by clinician email. This repo is **public**: no staff
  config, folder IDs, calendar IDs or secrets in code. Those live in Apps Script
  Script Properties, the config sheet, or Vercel env vars.
- Emails long enough that clinicians stop reading them.
- A clinician being able to see another clinician's numbers.
- Patient data sent to a non-BAA AI endpoint (AI Studio). Vertex only for real data.
- Changes to upstream Kan files beyond the minimum, which would make the weekly
  upstream-sync PRs painful.

## Constraints

- **Kan fork conventions** (`docs/ttm/PLATFORM_DECISION.md`): new files, not edits.
  Views go under `apps/web/src/views/ttm/`, pages under `apps/web/src/pages/`, and
  the sidebar link goes in `TtmNav.tsx`. New tables go only in the `team` schema
  via `packages/db/ttm-migrations/` (see `0001_ttm_doc.sql`), with Drizzle schema
  in `packages/db/src/schema/` and a router in `packages/api/src/routers/`
  (pattern: `ttmDoc.ts`). Hosted on Vercel with Supabase Postgres.
- **AGPL-3.0.** Fine for our use. Staff using the portal can ask for its source.
- **Apps Script limits:** 6 min per execution. Maps DirectionFinder quota is
  per-account per day, so distances are cached.
- **Gusto pay schedule:** every other week, periods run Mon → Sun, payday is Fri.
  The anchor is the period ending Sun 2026-02-22, paid Fri 2026-02-27. Verified:
  Nov 2–15 is paid Fri Nov 20. **The first new Sunday email is Sun Nov 29**
  (period Nov 16–29, payday Dec 4).
- **Brand:** green `#134c00`, orange `#ff7900`, gold `#ffb000`, gray `#b3b3b3`,
  Montserrat (email falls back to Arial). Logo `apps/web/public/ttm-logo.svg`.
  Gmail can't show SVG, so the email uses a PNG export served from the portal
  domain (public, no PHI).

## Approaches considered

How the dashboard gets data without PHI touching the website:

- **A. Nightly push of counts from Google to a Kan endpoint (chosen).** PHI stays in
  Google (BAA). Kan stores only aggregates, the dashboard is fast, and Kan holds no
  Google credentials. Data is as of last night, and an admin "Refresh now" button
  triggers an immediate push.
- B. Kan reads a summary Sheet live through a service account. Always current, but
  it puts a Google key in Vercel, pages load slower, and one sharing mistake on the
  Sheet exposes it.
- C. Move the whole engine into Kan/Vercel. Ruled out: chart content would pass
  through Vercel, which only signs a BAA on Enterprise.

Dashboard placement: Terran chose **inside Kan as a page** (over a separate
subdomain), accepting the upkeep on upstream merges.

## Design

### 1. Apps Script project "TTM Clinician Ops"

- **Replaces TTM Chart Review.** It reuses that script's Drive v2 / Shared Drive
  chart reading, PDF text extraction, Vertex call and diagnostics. Owned by
  terran@ (same as today).
- **Source lives in this repo** at `ops/clinician-ops/`, pushed with `clasp`.
  Pure logic (event classification, legs, hours, pay-period math, payload
  building, word-count trimming) goes in plain JS modules with unit tests run in
  Node. Google-service glue stays thin.
- **Config, none of it in code:**
  - **Ops Config sheet** (new, in the Shared Drive):
    - `Staff` tab: name, email, calendarId, title pattern, role
      (clinician / admin), PT hourly rate, Admin Support rate (blank if none),
      active flag.
    - `Settings` tab: mileage rate (0.725), pay-period anchor dates, paid-gap
      minutes (15), long-drive flag threshold, stale-days threshold, admin
      recipients (terran@, sheila@), bank-holiday list.
  - **Script Properties:** GCP project, Vertex location, `GEMINI_MODEL`
    (`gemini-4-hydrogen`), `GEMINI_FALLBACK_MODEL`, Kan push URL, push secret,
    patient-folder parent ID, Patient Tracker ID.
  - **Model check.** Before cutover, run the existing `probeVertexModels()` (with
    `gemini-4-hydrogen` added) to confirm the project and region can call it. If
    the call fails, use the fallback model and send an admin alert email.

### 2. Day model (shared by every output)

For one clinician and one date, read their calendar and classify events:

- **Visit:** title matches the clinician's pattern / TTM session format. Cancelled
  and no-show events are excluded, using the same rules the Patient Tracker script
  uses. The builder should read that script and reuse its matching so counts agree.
- **Admin (charting/clinical admin):** title starts with `Admin`, not
  `Admin Support`. Paid at the PT rate.
- **Admin Support:** title starts with `Admin Support`. Paid at the Admin Support
  rate. Only counted for staff who have that rate.
- **Everything else:** ignored.

From that day:

- **Paid legs** = consecutive visits in start-time order, using event locations.
  Distance comes from Google Maps driving distance, cached by address pair.
  Identical addresses = 0 mi. A missing or unresolvable location flags the leg and
  counts it as 0 until fixed.
- **Paid miles** = sum of paid legs. Never include home.
- **Visit hours** = sum of visit durations + 15 min × (visits − 1). Example:
  5 visits = 6 h.
- **Long-drive flag:** a leg whose Maps drive time exceeds the threshold (default
  25 min). Shown for admin review and never changes pay automatically.
- **Admin hours / Admin Support hours** = sum of those block durations.

### 3. Morning email (weekdays, ~7:00 PT, per active clinician)

Subject: `Today: 4 visits · ~13.2 paid mi`. Layout, with HTML rendered by our
code, not Gemini:

```
[TTM logo]                       Wed, Nov 19
YESTERDAY  14.6 paid mi (2 drives between visits)
TODAY      4 visits · ~13.2 paid mi projected
-------------------------------------------------
9:15  Child Name · existing · last seen 11/12
  Last time: <1–2 bullets>
  Today: <2–3 bullets, each tagged to a goal, e.g. STG 2>
  Parent: <1 bullet: something to celebrate or a home tip>
  [!] Notes stale (last note 18 days ago)   (only when true)
... next patient ...
-------------------------------------------------
Route: Visit 1 → 2  4.1 mi · 2 → 3  9.1 mi (long drive flagged)
supports, not replaces, your clinical judgment
```

- Gemini returns **structured JSON** (`lastTime[]`, `today[]`, `parent`,
  `checks[]`). Our code renders it, so every email looks the same.
- A **hard budget of 100–150 words per patient.** It's in the prompt, and the code
  checks the word count, trimming bullets from the end if over.
- **Prompt rules carry over from Chart Review:** don't invent anything, flag
  unknowns as `[CHECK: …]`, no absolutes, leave abbreviations alone.
- **New patients** skip "Last time".
- **If a chart can't be read, or Gemini fails,** the card still shows time, name and
  "prep unavailable", and the email still sends.
- **Monday's "yesterday" line** shows the most recent prior workday that had visits.
- **Mobile-first, single column.** Colors: green header bar, orange accents, gold
  for flags.

### 4. Clinician period-close email (Sunday night when a period ends, ~6:00 PM PT)

```
Your mileage for Nov 16 – Nov 29: 142.6 mi
Enter it in Gusto: app → More → Expenses → Mileage, by Tuesday.
Daily: Mon 11/16 12.1 · Tue 11/17 9.8 · ...
```

### 5. Payroll preview email (same Sunday, ~8:00 PM PT, to admin recipients)

Subject: `Payroll preview · Nov 16–29 · run by Wed Dec 2 · payday Fri Dec 4`.

```
CLINICIAN A
  Visits                38
  Mileage               142.6 mi × $0.725 =   $103.39
  Visit hours (est.)    44.5 h × $50.00   = $2,225.00
  Admin hours (est.)    3.0 h × $50.00    =   $150.00
  Admin Support (est.)  4.0 h × $20.00    =    $80.00   (only if > 0)
  Flags: 2 long drives · 1 missing location
... each clinician ...
TTM TOTALS
  Visits · Mileage $ · Visit hours $ · Admin $ · Admin Support $ · Estimated total $
-------------------------------------------------
Daily detail (per clinician): date · visits · paid mi · visit h · admin h
```

- Visits = completed visits. Hours are estimates from the calendar, not timesheets.
- **Holiday handling:** if payday falls on a listed bank holiday (e.g. Fri
  2027-01-01), the subject and a top banner give the adjusted deadline. A reminder
  email goes out the Monday before the period closes so payroll can be submitted
  early.

### 6. Nightly KPI push (~9:00 PM PT) and "Refresh now"

- The script computes the last 90 days of daily rows plus a current snapshot per
  clinician, then POSTs them to Kan. It's idempotent (upsert by clinician + date).
- **Auth:** an HMAC-SHA256 signature of the body with a shared secret, kept in
  Script Properties and Vercel env `TTM_KPI_PUSH_SECRET`, plus a timestamp to block
  replays.
- **The payload is counts only,** keyed by clinician email:
  - **Daily rows:** date, visits, cancellations, paid miles, visit minutes, admin
    minutes, admin-support minutes, long-drive count, missing-location count.
  - **Snapshot:** active patients, stale patients (no completed visit in more than
    the stale-days threshold, default 7, matching the tracker), progress notes due
    within 14 / 30 days, visits scheduled next 7 days.
- **Refresh now** (admin-only button in Kan): a Kan server route calls the Apps
  Script web app (deployed "execute as terran@", guarded by a separate secret).
  The web app runs the push and returns, and the page reloads its data.

### 7. Kan dashboard (`/dashboard`, "Dashboard" in the TTM sidebar section)

- **Tables** (`team` schema, new migration):
  - `ttm_kpi_daily`: clinician email, date, metrics above, updatedAt. Unique on
    (email, date).
  - `ttm_kpi_snapshot`: clinician email, asOf, metrics.
  - Rows older than 90 days are deleted on each push.
- **Clinician names** for display are in the payload (first + last name). That's
  staff data, not PHI.
- **API:**
  - Next.js API route `POST /api/ttm/kpi-push` (signature-verified, no session).
  - tRPC router `ttmKpi` with `get({ clinician?, range })`.
- **Access rule, enforced server-side in the router:**
  - A user sees the rows whose clinician email matches their own Kan login email.
  - Users listed in env `TTM_DASHBOARD_ADMINS` (terran@, sheila@) can pass any
    clinician or `team`.
  - Anyone else gets an empty state.
- **What the page shows:**
  - **Header:** admins get a switcher (Team · Terran · Cassandra · Jordan …).
    Clinicians see only their own name. Also shows "Updated last night 9:02 PM"
    and, for admins, a Refresh button.
  - **Current pay period tiles:** visits, paid miles (and $), est. visit hours,
    admin hours.
  - **"Needs attention" tiles:** stale patients, progress notes due ≤14 days,
    missing-location legs.
  - **Trends** (last 8 weeks): weekly visits bars, weekly paid miles line, average
    visits per workday.
  - **Team view:** one row per clinician with the same metrics, plus totals.
- **Style:** Kan's existing UI primitives and `views/ttm/ui.tsx` with TTM orange
  accents, working in light and dark mode and on phone width. The chart library is
  the builder's choice. Use one already in the repo if there is one, or a
  lightweight one.

## Decisions made with Terran

- Pay basis is between-patient miles only. Commute is unpaid.
- Clinicians self-enter mileage in Gusto Expenses.
- Rate is $0.725/mi.
- Charting/admin calendar blocks are paid at the PT rate. "Admin Support" is a
  separate job, for things like MilestonesHEP activity reviews, at its own rate
  (set per person in the Staff tab).
- 15 paid minutes between visits counts toward hours.
- Chart prep is 100–150 words per patient, branded.
- Dashboard inside Kan. Nightly data plus a refresh button. About 2 months of
  look-back.
- Model `gemini-4-hydrogen` on Vertex.

## Left to the builder

- Module boundaries inside the Apps Script project, and the test setup for its
  pure logic.
- The chart library, exact tile layout and empty states.
- The Maps distance cache (CacheService plus a sheet-backed cache is fine).
- Exact trigger times within the windows above.
- How the PNG logo is produced and hosted on the portal domain.

## Builder-check answers (my calls unless marked)

- **Existing code to reuse.** Chart Review's source is the "TTM Chart Review" Apps
  Script project, which exports as JSON through the Drive API. The Patient
  Tracker's calendar script is bound to the "TTM Patient Tracker" sheet, and its
  `Raw` tab already holds Provider / Status / Location / Original Title for every
  matched event. Before planning the day model, the builder reads both and copies
  the title matching and status (cancelled / no-show) rules. Google file IDs stay
  out of this public repo: they go in Script Properties or private notes.
- **Snapshot sources.** Active and stale patients come from the Patient Tracker
  `Patients` / `Not Seen Recently` tabs. Each patient is attributed to their
  `Primary Provider`, and co-provider visits count as visits for whoever did them.
  Progress notes due: see open items.
- **Who's on payroll.** The payroll preview includes active `Staff` rows with
  `payroll = yes`. The owner isn't on payroll: she
  gets the morning email and her own dashboard numbers, but no period-close email
  and no payroll row. Sheila is an admin recipient only, and her hours aren't
  tracked from the calendar.
- **Dates.** If payday lands on a bank holiday, it moves to the prior business day.
  The run deadline is 2 business days before payday (Wed for a normal Fri payday).
  Clinicians are told to enter mileage in Gusto 1 business day before the run
  deadline (Tue normally).
- **Calendar and Drive access.** Everyone is in the terranthroughmilestones.com
  Workspace. Each clinician shares their calendar with terran@ ("See all event
  details") as an onboarding step. Chart folders are already in the Shared Drive
  Terran owns. No domain-wide delegation.
- **Kan side.** The snapshot payload also carries the mileage rate and the current
  pay-period dates, so the dashboard shows dollars and the period without its own
  config. "Refresh now" starts the push and returns immediately. The page then
  polls until the data's updated time changes.

## Answered by Terran (2026-11-19)

1. **Paid legs with gaps.** Always pay the direct Maps distance from one visit to
   the next visit that day, whatever happens in between (a break, a trip home, an
   Admin block). The 15 paid travel minutes are added for every visit-to-visit
   move, gap or not.
2. **Progress notes due** come from the child's date of birth: one at every
   6 months of age (6, 12, 18, 24, 30 mo), sent to SDRC for the IFSP. Example: a
   child evaluated at 5 months gets a progress note at 6 months.
   - **Due date** = the next 6-month birthday after the most recent eval or
     progress note in the child's chart folder.
   - **No note at 36 months** (my call). Early intervention ends at 3, so that's
     discharge, not a progress note.
   - **Where the DOB comes from** is up to the builder: the eval doc or an existing
     sheet. It stays in Google and never goes to Kan.
   - The morning email card shows `Progress note due MM/DD (turns 12 mo)` when one
     is due within 30 days.
   - The dashboard gets only the counts due within 14 and 30 days.
