# Per-edition product page data

One file per edition: `src/data/editions/<slug>.json`, rendered by `src/pages/bibles/[slug].astro`
at the URL `/bibles/<slug>-bible`. `teen.json` is the reference — match its depth, not just its
shape. Front matter for every edition is already extracted from the shipping interiors in
`frontmatter.json` (keyed by slug: `audience`, `pillars[].title/line/verses[][ref,text]`); read
it, never retype it.

```jsonc
{
  "slug": "dads",                        // matches /print and the cover asset name
  "name": "Dad's Bible",                 // the <h1>, and the name on /print
  "title": "Father’s Heart Bible — Dad's Bible",  // the long name, JSON-LD only
  "sub": "…",                            // the audience line under the h1; start from the
                                         // /print subtitle, refine for the page
  "isbn": "979-8-89307-…",
  "price": 99.99,
  "pages": 876,                          // 788 for the journaling edition
  "published": "September 2026",         // display; ISO is derived
  "trim": "6 x 9 in",                    // optional — 8 x 10 in for journaling
  "binding": "Hardcover, case laminate with dust jacket",   // optional
  "audienceNoun": "dads",                // "What makes this a Bible for dads"
  "audienceSingular": "a dad",           // "written for a dad, before Genesis 1:1"
  "hook": {                              // the one passage that opens the page
    "h2": "…",                           // the section heading above the passage
    "ref": "…", "href": "/read/…#v…",
    "text": "…",                         // FHB text, verbatim from canon
    "father": ["…"], "son": [], "spirit": [],   // spans to color, verbatim substrings
    "note": "…"                          // 2–3 sentences on why this passage, for this reader
  },
  "relatedGuide": { "href": "/bible-for/dads", "label": "Bible verses for dads" },  // optional;
                                         // omit if no /bible-for page exists yet
  "listing": {
    "short350": ["…"],                   // the 30-second answer, ~350 words
    "long": [{ "h": "…", "body": ["…"] }],       // 4 sections, the Ingram/Amazon long description
    "features": ["…"],                   // What's inside bullets
    "keywords": ["…"],                   // 20–25, lowercase, real search terms — the chips
    "keywordsSchema": ["…"],             // optional; the ~10 that go in JSON-LD keywords
    "bisac": [["BIB018070", "BIBLES / …"]]
  },
  "faq": [{ "q": "…", "a": "…" }]        // 4–6, specific to this edition, HTML allowed
}
```

## What is NOT in this file

Do not write these into a per-edition file — the template supplies them for all sixteen from
`shared.json`, and a copy here would be sixteen places to fix one typo:

- the preface ("Why this translation exists"), all eight sections
- the "Hearing your Father’s voice" passages
- "About this translation", the credits table, and the Kevin White / Spirit Media bios
- the front-matter list (Presentation page, Abba Father, …). The pillars row is generated
  from `frontmatter.json`, so it names this edition's reader automatically.
- the three pillar pages and their verses — those come from `frontmatter.json`, keyed by slug
  (the journaling edition is keyed `divinevoice` there, and has no pillars at all)

## Rules

- **Facts are shared; audience is not.** All sixteen editions are the identical translation and
  the identical 876 pages (the journaling edition is 788pp at 8×10). Only the cover, the opening
  audience page and the three pillar pages differ — verified by diffing the interiors. Never write
  that an edition has its own notes, summaries or prayers. Write instead about who it was made for.
- Shared numbers, correct: 66 books · 1,189 chapters · 31,085 verses · 1,354 study notes across
  777 chapters (1,075 background, 248 revealing the Father, 31 manuscript) · 170 translation rules
  · our Father 125,457 words across 5,623 verses · the Son 39,936 · more than one word in four.
- **Scripture is quoted from FHB only, never another translation**, and never invented.
- Reading is free in 25 languages; **listening is English and Telugu only** — do not widen it.
- American spelling. Never call our Father "God" where "our Father" is meant, but "God" is right
  where God is meant as God.
- Colour words BLUE / RED / PURPLE get colored in the page, so write them in caps in prose.
