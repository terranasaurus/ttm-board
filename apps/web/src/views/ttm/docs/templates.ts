// Starter content for new Docs. HTML, as produced by the TipTap editor.
// No patient details belong in Docs; templates say so where it matters.

export interface DocTemplate {
  key: string;
  label: string;
  title: string;
  content: string;
}

const today = () =>
  new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

export const DOC_TEMPLATES: (() => DocTemplate)[] = [
  () => ({
    key: "blank",
    label: "Blank",
    title: "Untitled doc",
    content: "",
  }),
  () => ({
    key: "meeting",
    label: "Team meeting",
    title: `Team sync · ${today()}`,
    content: [
      "<p><strong>Attendees:</strong> Terran, Sheila, Cassandra</p>",
      "<h2>Agenda</h2><ul><li><p>Wins since last sync</p></li><li><p>P0 cards (see My work)</p></li><li><p>Decisions needed (Decide column)</p></li><li><p>Anything blocked</p></li></ul>",
      "<h2>Notes</h2><p></p>",
      "<h2>Decisions</h2><ul><li><p></p></li></ul>",
      "<h2>Action items</h2><p><em>Add each action item to the TTM Team board with an owner label (@Terran, @Sheila, @Cassandra).</em></p><ul><li><p></p></li></ul>",
      "<p><em>No patient names or details in meeting notes. Refer to Drive instead.</em></p>",
    ].join(""),
  }),
  () => ({
    key: "sop",
    label: "SOP",
    title: "SOP: ",
    content: [
      "<h2>Purpose</h2><p>What this procedure is for and when to use it.</p>",
      "<h2>Owner</h2><p>Who keeps this up to date.</p>",
      "<h2>Steps</h2><ol><li><p></p></li><li><p></p></li><li><p></p></li></ol>",
      "<h2>Links</h2><p>Forms, Drive folders, logins (never paste passwords here).</p>",
      `<p><em>Last reviewed: ${today()}</em></p>`,
    ].join(""),
  }),
  () => ({
    key: "onboarding",
    label: "New-hire onboarding",
    title: "Onboarding: ",
    content: [
      "<p><em>HR paperwork (I-9, licenses, credentials) stays in Gusto/Drive, not here.</em></p>",
      "<h2>Before day 1</h2><ul><li><p>Google Workspace account created</p></li><li><p>TTM Portal invite sent</p></li><li><p>EMR access requested</p></li><li><p>Equipment / mileage policy shared</p></li></ul>",
      "<h2>Week 1</h2><ul><li><p>Shadow sessions scheduled</p></li><li><p>Documentation walkthrough</p></li><li><p>HEP: how to assign a program (MilestonesHEP)</p></li><li><p>Billing basics: Clinician Toolbox → Billing units</p></li></ul>",
      "<h2>First 30 days</h2><ul><li><p>Caseload ramp plan agreed</p></li><li><p>First check-in with Terran</p></li></ul>",
      "<h2>Key links</h2><p></p>",
    ].join(""),
  }),
];
