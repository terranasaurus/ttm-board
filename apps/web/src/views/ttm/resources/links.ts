// Links shown on the Resources page. Edit here to add or change one.
//
// status:
//   "live" – ready to use
//   "soon" – planned; shown greyed with the note, so the team knows it's coming
//
// Never link folders that hold patient records, or the Owner-Admin
// (Confidential) folder. Drive enforces sharing, but the portal shouldn't
// advertise them.

export interface ResourceLink {
  label: string;
  href?: string;
  note?: string;
  status?: "live" | "soon";
  /** Internal portal link (opens in the same tab). */
  internal?: boolean;
}

export interface ResourceGroup {
  id: string;
  title: string;
  description?: string;
  links: ResourceLink[];
}

const drive = (id: string) => `https://drive.google.com/drive/folders/${id}`;

export const LIBRARY: ResourceGroup = {
  id: "library",
  title: "Resource library",
  description: "Where TTM's own material lives. Drive asks you to sign in with your @terranthroughmilestones.com account.",
  links: [
    { label: "Docs", href: "/docs", internal: true, note: "Onboarding modules, SOPs, meeting notes" },
    { label: "Training modules (Drive)", href: drive("1dbNEYXDRswKD-VXCm1oeDzrZUKZPuCF1"), note: "Original slide decks with speaker notes" },
    { label: "Parent education documents (Drive)", href: drive("1I8diYajUURlwJDcChYNw1QMc4sthnE9p"), note: "Handouts to share with families" },
    { label: "TTM brand package (Drive)", href: drive("1G1ZQYaW0UJ9kwzY3-0EZSYr5LLlZTebc"), note: "Logos, colors, letterhead" },
    { label: "Clinician Toolbox", href: "/toolbox", internal: true, note: "Calculators, outcome measures, milestones" },
  ],
};

export const EMPLOYEE: ResourceGroup = {
  id: "employee",
  title: "Employee hub",
  description: "Pay, benefits and HR. Your personal details stay in Gusto, never in the portal.",
  links: [
    { label: "Gusto", href: "https://app.gusto.com/login", note: "Pay stubs, W-2s, direct deposit, tax withholding", status: "live" },
    { label: "Time off & sick leave", href: "https://app.gusto.com/login", note: "Balance is on your Gusto pay stub", status: "live" },
    { label: "Mileage reimbursement", note: "Log it the way Onboarding Module 02 shows; Terran reimburses through payroll", status: "live" },
    { label: "Retirement plan", note: "Not set up yet. Details will be posted here", status: "soon" },
    { label: "Health insurance", note: "Not set up yet. Details will be posted here", status: "soon" },
    { label: "Employee handbook & required notices", note: "Coming with the handbook", status: "soon" },
    { label: "Hurt at work? Claim form (DWC-1)", href: "https://www.dir.ca.gov/dwc/forms.html", note: "Get care first, then tell Terran the same day", status: "live" },
  ],
};

/** Free, reputable learning for pediatric / early-intervention PT. */
export const LEARNING: ResourceLink[] = [
  { label: "Physical Therapy Board of California", href: "https://www.ptbc.ca.gov", note: "License renewal and continuing competency rules" },
  { label: "APTA Pediatrics", href: "https://pediatricapta.org", note: "Fact sheets, clinical practice guidelines" },
  { label: "CDC Learn the Signs. Act Early.", href: "https://www.cdc.gov/act-early/", note: "Milestones, family materials" },
  { label: "CanChild", href: "https://canchild.ca", note: "Free measures and research summaries (GMFCS, FMS…)" },
];

/**
 * Optional link to the team's NotebookLM notebook, set in Vercel as
 * NEXT_PUBLIC_TTM_NOTEBOOK_URL so it can change without a code change.
 */
export const NOTEBOOK_ENV = "NEXT_PUBLIC_TTM_NOTEBOOK_URL";
