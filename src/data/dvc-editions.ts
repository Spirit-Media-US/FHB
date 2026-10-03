// THE DIVINE VOICE COLOR AUDIENCE EDITIONS — moved here from src/pages/print.astro
// (2026-10-03) so /print and the catalog order form /print/order/ read ONE list. Prices are
// ISBNS.json's; scripts/pricing-verify.mjs asserts every order form's prices against
// functions/dvc-checkout.ts on the BUILT pages.
export interface DvcEdition {
	slug: string;
	title: string;
	/** the order-form row's own name where it differs from the card title */
	rowTitle?: string;
	groupHeading?: string;
	sub: string;
	hb: number;
	pb: number;
	spec: (b: 'hb' | 'pb') => string;
	trim?: string;
}

// ── The one-line spec every order row carries (Kevin 2026-08-29) ──
// "Chosen Bible $99.99 6x9 Hardback" — title, price and format together, so a buyer
// choosing between 28 rows can tell them apart without scrolling back to the section
// heading. The facts that actually decide it: TRIM, BINDING, LARGE PRINT or not, and PAGE
// COUNT (the only number that separates Regular from Large Print at a glance).
//
// Every value below is MEASURED, not assumed:
//   page counts read off the built interiors in projects/fhb-print-bible/current/
//     — targeted 888pp, journaling 848pp @ 8x10, large print 1,134 + 1,142 + 680pp
//       across three volumes (the single 1,016pp Large Print is retired)
//   binding read off the APPROVED cover for each ISBN. The general hardback is CASE
//     LAMINATE (2026-08-24-general/APPROVALS.json approves COVER-Case for the general
//     hardback — recorded there against the B&W ISBN it was approved under, which the
//     colour numbers 336-2/337-9/338-6 have since replaced; the BINDING is unchanged),
//     so it must NOT claim a dust jacket; jacket files exist but are not the approved
//     binding. NOTHING claims a dust jacket: every sheet says case laminate, the ISBNs sit
//     in `hardcover_case_laminate`, the delivered cover is ...-CASE-888pp.pdf, and the
//     journaling sheet states "No dust jacket: not offered at 8 x 10". Jacket PDFs exist
//     but carry no ISBN and no delivery record — they are not what ships.
// ONE BINDING PER SPEC, because one spec is printed on one ROW and a row is one binding
// (Kevin 2026-09-17: "HB needs to list HB and PB needs to list PB. No HB or PB on the same
// line"). A single constant naming both bindings put "Hardback ... or Paperback" on the
// hardback row, which reads as indecision about what is being bought.
//
// "(case laminate)" IS OFF THE STOREFRONT. It is Ingram's vocabulary — it stays in the
// metadata sheets and the ISBN records, where it is a required fact, and never appears in
// front of a buyer. Matches the Large Print rows, which already read "6×9 Large Print
// Hardback".
// The TRIM is binding-independent; the binding is not. Split so a row that sells BOTH
// bindings can state the trim once without naming a binding it does not exclusively sell
// (the bulk form's rows do exactly this since 2026-09-18 — see BindingQty.astro). One
// definition each, so the two can never drift apart.
export const trimTargeted = '6×9';
export const trimJournaling = '8×10 Wide Margin';
export const binding = (b: 'hb' | 'pb') => (b === 'hb' ? 'Hardback' : 'Paperback');
export const specTargeted = (b: 'hb' | 'pb') => `${trimTargeted} ${binding(b)}`;
export const specJournaling = (b: 'hb' | 'pb') => `${trimJournaling} ${binding(b)}`;

// CARD SUBTITLES (Kevin 2026-10-03: every card uniform in structure, length and detail):
// "For " + the edition's metadata-sheet For box (master: projects/fhb-global/fors.d/<slug>.json,
// which the sheet's For row is written from), in order, title-cased, as many entries as fit
// ~125 characters (at least four). Never invented — regenerate from the master, don't hand-edit.
export const dvcEditions: DvcEdition[] = [
	{
		slug: 'athletes',
		title: "Athlete's Bible",
		sub: 'For Christian Athletes, Football Players, Basketball Players, Pickleball Players, Soccer Players, and Baseball Players',
		hb: 99.99,
		pb: 79.99,
		spec: specTargeted,
	},
	{
		slug: 'chosen',
		title: 'Chosen Bible',
		sub: 'For Children in Foster Care, Adopted Sons and Daughters, People Raised Without a Father, and People Who Lost a Father Young',
		hb: 99.99,
		pb: 79.99,
		spec: specTargeted,
	},
	{
		slug: 'couples',
		title: "Couple's Bible",
		sub: 'For Engaged Couples, Newlyweds, Married Couples, Christian Couples, Husbands and Wives, and Blended Families',
		hb: 99.99,
		pb: 79.99,
		spec: specTargeted,
	},
	{
		slug: 'dads',
		title: "Dad's Bible",
		sub: 'For New Dads, First Time Dads, Stepdads, Single Dads, Bonus Dads, Dads-To-Be, Grandfathers, and Fathers-In-Law',
		hb: 99.99,
		pb: 79.99,
		spec: specTargeted,
	},
	{
		slug: 'first-responders',
		title: "First Responder's Bible",
		sub: 'For Firefighters, Police Officers, Paramedics, EMTs, Emergency Dispatchers, Search and Rescue Teams, and Lifeguards',
		hb: 99.99,
		pb: 79.99,
		spec: specTargeted,
	},
	{
		slug: 'graduates',
		title: "Graduate's Bible",
		sub: 'For High School Graduates, College Graduates, Graduate School Graduates, Trade School Graduates, and GED Graduates',
		hb: 99.99,
		pb: 79.99,
		spec: specTargeted,
	},
	{
		slug: 'grandparents',
		title: "Grandparent's Bible",
		sub: 'For Grandmothers, Grandfathers, New Grandparents, Great-Grandparents, and Grandparents Raising Grandchildren',
		hb: 99.99,
		pb: 79.99,
		spec: specTargeted,
	},
	{
		slug: 'intercessors',
		title: "Intercessor's Bible",
		sub: 'For Intercessors, Prayer Warriors, Prayer Teams, Prayer Partners, Prayer Ministry Leaders, and Prayer Chain Members',
		hb: 99.99,
		pb: 79.99,
		spec: specTargeted,
	},
	{
		slug: 'mens',
		title: "Men's Bible",
		sub: 'For Young Men, Single Men, Husbands, Fathers, Men in the Trades, Business Owners, and Men Who Mentor Other Men',
		hb: 99.99,
		pb: 79.99,
		spec: specTargeted,
	},
	{
		slug: 'moms',
		title: "Mom's Bible",
		sub: 'For New Moms, First Time Moms, Stepmoms, Single Moms, Bonus Moms, Moms-To-Be, Grandmothers, Soccer Moms, and Mothers-In-Law',
		hb: 99.99,
		pb: 79.99,
		spec: specTargeted,
	},
	{
		slug: 'nurses',
		title: "Nurse's Bible",
		sub: 'For Registered Nurses, Nurse Practitioners, Licensed Practical Nurses, Nursing Students, and Nursing Assistants',
		hb: 99.99,
		pb: 79.99,
		spec: specTargeted,
	},
	{
		slug: 'pastors',
		title: "Pastor's Bible",
		sub: "For Senior Pastors, Youth Pastors, Church Planters, Missionaries, Pastors' Wives, Seminary Students, and Deaconesses",
		hb: 99.99,
		pb: 79.99,
		spec: specTargeted,
	},
	{
		slug: 'peace',
		title: 'Peace Bible',
		sub: "For People Living with Anxiety, People Who Feel Overwhelmed, People Who Can't Sleep, People in Grief, and Caregivers",
		hb: 99.99,
		pb: 79.99,
		spec: specTargeted,
	},
	{
		slug: 'presidents',
		title: "President's Bible",
		sub: 'For Presidents and Heads of State, Governors, Mayors, Legislators, Judges, Business Executives, Bosses, CEOs, and Supervisors',
		hb: 99.99,
		pb: 79.99,
		spec: specTargeted,
	},
	{
		slug: 'recovery',
		title: 'Recovery Bible',
		sub: 'For People in Recovery, 12-Step Group Members, Sponsors, Families of Those in Recovery, and The Newly Sober',
		hb: 99.99,
		pb: 79.99,
		spec: specTargeted,
	},
	{
		slug: 'seekers',
		title: "Seeker's Bible",
		sub: 'For People Curious About Faith, Skeptics, New Believers, People Raised in Another Faith, and People Raised in No Faith',
		hb: 99.99,
		pb: 79.99,
		spec: specTargeted,
	},
	{
		slug: 'seventeen',
		title: 'Seventeen Bible',
		sub: 'For High School Juniors, High School Seniors, New Drivers, First-Job Holders, and College-Bound Students',
		hb: 99.99,
		pb: 79.99,
		spec: specTargeted,
	},
	{
		slug: 'soldiers',
		title: "Soldier's Bible",
		sub: 'For Active-Duty Service Members, Veterans, Military Spouses, Military Families, and Recruits in Basic Training',
		hb: 99.99,
		pb: 79.99,
		spec: specTargeted,
	},
	{
		slug: 'teachers',
		title: "Teacher's Bible",
		sub: 'For Preschool Teachers, Elementary Teachers, High School Teachers, Special Education Teachers, and Homeschool Parents',
		hb: 99.99,
		pb: 79.99,
		spec: specTargeted,
	},
	{
		slug: 'teen',
		title: 'Teen Bible',
		sub: 'For Middle Schoolers, High Schoolers, Teen Girls, Teen Boys, Teens in Youth Group, 13-Year-Old Boys, and 13-Year-Old Girls',
		hb: 99.99,
		pb: 79.99,
		spec: specTargeted,
	},
	{
		slug: 'womens',
		title: "Women's Bible",
		sub: 'For Young Women, Single Women, Married Women, Widows, Working Women, Women in Ministry, and Women Walking Through Infertility',
		hb: 99.99,
		pb: 79.99,
		spec: specTargeted,
	},
	{
		slug: 'worship-leaders',
		title: "Worship Leader's Bible",
		sub: 'For Worship Pastors, Singers, Songwriters, Church Musicians, Choir Members, Worship Team Members, Violinists, and Cellists',
		hb: 99.99,
		pb: 79.99,
		spec: specTargeted,
	},
	{
		slug: 'journaling',
		title: 'She Hears Her Father\u2019s Voice - Journaling Bible',
		// The order form heads these rows with "Journaling Bible" already, so the row itself
		// carries only the book's own name (Kevin 2026-09-17, both halves of the same note).
		rowTitle: 'She Hears Her Father\u2019s Voice',
		groupHeading: 'Journaling Bible',
		sub: 'For Women \u00b7 Wide Margin \u00b7 Note-Taking \u00b7 8x10 Journaling Edition',
		hb: 124.99,
		pb: 114.99,
		spec: specJournaling,
		// The only edition that is not 6\u00d79. Stated here so the bulk form's one-row-per-
		// edition layout can print the trim without naming a binding \u2014 everything else
		// falls back to trimTargeted.
		trim: trimJournaling,
	},
];
