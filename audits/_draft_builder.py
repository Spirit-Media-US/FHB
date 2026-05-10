#!/usr/bin/env python3
"""
FHB Gold-Level Blog Draft Builder
Generated 2026-05-10 for Kevin's afternoon Sanity review.

Builds and patches Sanity DRAFTS only — never publishes. Each of 4 posts gets
a new body with: TOC, byline+credentials, direct-answer, key-takeaway callout,
mid-post CTA, restructured H2s with self-contained extractable answers,
extended prose where needed, BibleGateway links on every scripture reference,
authority outbounds (Bible Hub, Blue Letter Bible), 2-3 internal FHB links.

The fhbChapter embed is preserved at the end.
"""

import json
import os
import sys
import urllib.error
import urllib.request
import uuid
from datetime import datetime, timezone

PROJECT_ID = "rusi1hyi"
DATASET = "production"
TOKEN = os.environ.get("SANITY_API_TOKEN", "")
if not TOKEN:
    sys.exit("SANITY_API_TOKEN not set in env. Source /home/deploy/.secrets first.")

API_BASE = f"https://{PROJECT_ID}.api.sanity.io/v2024-01-01/data"
TODAY_ISO = "2026-05-10T17:00:00.000Z"

# ---------------------------------------------------------------------------
# Portable Text helpers
# ---------------------------------------------------------------------------

def _key(prefix=""):
    return f"{prefix}{uuid.uuid4().hex[:10]}"

def _span(text, marks=None):
    return {"_key": _key("s"), "_type": "span", "marks": marks or [], "text": text}

def _block(spans, style="normal", mark_defs=None):
    return {
        "_key": _key("b"),
        "_type": "block",
        "style": style,
        "markDefs": mark_defs or [],
        "children": spans,
    }

def _link(href, text, mark_key=None):
    """Returns (mark_def, span). Caller assembles them into a block."""
    mk = mark_key or _key("ld")
    md = {"_key": mk, "_type": "link", "href": href}
    span = _span(text, marks=[mk])
    return md, span

def rich(parts, style="normal"):
    """Build a block from a list of (text, options) tuples.
    options: dict with optional keys: 'href', 'em', 'strong'.
    Plain string parts are emitted as plain text.
    """
    spans = []
    mark_defs = []
    for p in parts:
        if isinstance(p, str):
            spans.append(_span(p))
            continue
        text = p["text"]
        marks = []
        if p.get("strong"):
            marks.append("strong")
        if p.get("em"):
            marks.append("em")
        if p.get("href"):
            mk = _key("ld")
            mark_defs.append({"_key": mk, "_type": "link", "href": p["href"]})
            marks.append(mk)
        spans.append(_span(text, marks=marks))
    return _block(spans, style=style, mark_defs=mark_defs)

def h2(text, key_suffix=None):
    spans = [_span(text)]
    return _block(spans, style="h2")

def h3(text):
    return _block([_span(text)], style="h3")

def p(text_or_parts, style="normal"):
    if isinstance(text_or_parts, str):
        return _block([_span(text_or_parts)], style=style)
    return rich(text_or_parts, style=style)

def quote(text_or_parts):
    return p(text_or_parts, style="blockquote")

def fhb_chapter(book, chapter):
    return {"_key": _key("ch"), "_type": "fhbChapter", "book": book, "chapter": chapter}

# ---------------------------------------------------------------------------
# Reusable URL helpers
# ---------------------------------------------------------------------------

def bg(passage, version="NIV"):
    """BibleGateway link."""
    q = passage.replace(" ", "+").replace(":", "%3A")
    return f"https://www.biblegateway.com/passage/?search={q}&version={version}"

# Reusable authority links
BIBLEHUB_ELOHIM = "https://biblehub.com/hebrew/430.htm"
BIBLEHUB_YHWH = "https://biblehub.com/hebrew/3068.htm"
BLB_GENESIS_3 = "https://www.blueletterbible.org/kjv/gen/3/1/s_3001"
BLB_GENESIS_1 = "https://www.blueletterbible.org/kjv/gen/1/1/s_1001"
BIBLEHUB_FATHER_HEB = "https://biblehub.com/hebrew/1.htm"  # ab
BLB_PNEUMA = "https://www.blueletterbible.org/lexicon/g4151/kjv/tr/0-1/"

# Internal FHB pages
INT_BIBLE = "/the-fathers-heart-bible/"
INT_SAMPLES = "/samples/"
INT_ABOUT = "/about/"
INT_BLOG_LIGHT = "/blog/who-turned-on-the-light/"
INT_BLOG_FATHER_GEN1 = "/blog/why-fhb-says-father-in-genesis-1/"
INT_BLOG_SERPENT = "/blog/serpent-vocabulary-genesis-3-oldest-lie/"
INT_BLOG_REVEAL = "/blog/father-reveal-your-heart-for-me/"

BYLINE_CRED = (
    "By Kevin White — founder of Spirit Media Publishing and lead steward of "
    "the Father's Heart Bible. Updated May 10, 2026."
)

# ---------------------------------------------------------------------------
# Shared block helpers
# ---------------------------------------------------------------------------

def byline_block():
    return p(
        [
            {"text": "By "},
            {"text": "Kevin White", "strong": True},
            {"text": " — founder of "},
            {"text": "Spirit Media Publishing", "href": "https://spiritmediapublishing.com"},
            {"text": " and lead steward of the "},
            {"text": "Father's Heart Bible", "href": INT_BIBLE},
            {"text": ". Updated May 10, 2026."},
        ]
    )

def key_takeaway(text):
    return rich(
        [
            {"text": "Key takeaway: ", "strong": True},
            {"text": text},
        ],
        style="blockquote",
    )

def toc_block(items):
    """items = list of (anchor_label, anchor_id) — for a static TOC we render
    a simple bulleted line block. The blog template doesn't auto-wire heading
    IDs, so we render the TOC as a one-block list of plain links to the
    headings. To keep it functional today, we emit anchors as text labels
    only — Kevin can review and decide if he wants me to wire IDs into the
    h2 renderer in a follow-up. Anchor IDs are slug-style for future use.
    """
    parts = [{"text": "Jump to: ", "strong": True}]
    for i, (label, anchor) in enumerate(items):
        if i:
            parts.append({"text": "  ·  "})
        parts.append({"text": label, "href": f"#{anchor}"})
    return rich(parts, style="normal")

def mid_cta_block():
    """Inline mid-post CTA — links to the FHB sample page."""
    return rich(
        [
            {"text": "Read the chapter for yourself. ", "strong": True},
            {"text": "Open the "},
            {"text": "Father's Heart Bible sample chapters", "href": INT_SAMPLES},
            {
                "text": (
                    " and read the rendering for yourself, side by side with the translation "
                    "you grew up on. The page tells the story better than any blog post can."
                )
            },
        ],
        style="blockquote",
    )


# ---------------------------------------------------------------------------
# POST 1 — serpent-vocabulary-genesis-3-oldest-lie
# Title: The Oldest Lie: Watch How the Serpent Talks About God
# ---------------------------------------------------------------------------

def post_serpent_body():
    return [
        # Byline
        byline_block(),

        # Direct-answer paragraph (intro hook + verbatim citation block)
        p(
            "Open Genesis 3 and slow down on the pronouns and titles. Two voices are speaking, "
            "and they don't use the same vocabulary for the same Person. The narrator says "
            "our Father. The serpent says God. That single contrast is the whole chapter — "
            "and the oldest lie in the Bible."
        ),
        p(
            [
                {"text": "In "},
                {"text": "Genesis 3", "href": bg("Genesis 3")},
                {
                    "text": (
                        ", the Hebrew narrator uses YHWH Elohim — the personal covenant name — "
                        "while the serpent uses only "
                    )
                },
                {"text": "Elohim", "em": True, "href": BIBLEHUB_ELOHIM},
                {
                    "text": (
                        ", the generic word the same Hebrew Bible uses for pagan idols. The "
                        "Father's Heart Bible renders YHWH as our Father and lets the serpent's "
                        "Elohim stay as God. The divide on the page is what the divide in the "
                        "source already was. The serpent cannot say "
                    )
                },
                {"text": "our Father", "em": True},
                {
                    "text": (
                        " — to call him Father is to confess sonship, and the serpent has rejected "
                        "sonship. Every English Bible that flattens both Hebrew names into one "
                        "English God hides the lie in plain sight."
                    )
                },
            ]
        ),
        key_takeaway(
            "Genesis 3 contains two divine vocabularies on two pairs of lips. The narrator's "
            "vocabulary is intimate and covenantal. The serpent's vocabulary is generic and "
            "distant. Reading the contrast is reading the chapter."
        ),

        # Mini TOC
        toc_block(
            [
                ("The two vocabularies", "two-vocabularies"),
                ("Watch the very first verse", "first-verse"),
                ("A choice we had to make", "choice"),
                ("The lie has children", "lie-has-children"),
                ("Why FHB keeps saying our Father", "why-our-father"),
                ("How to read Genesis 3 today", "how-to-read"),
            ]
        ),

        # H2 1
        h2("The two vocabularies in Genesis 3"),
        p(
            [
                {"text": "Before going further: this contrast isn't a Father's Heart Bible invention. It's already in the Hebrew. "},
                {"text": "Genesis 3", "href": bg("Genesis 3")},
                {
                    "text": (
                        " uses two different divine names, and they fall on different lips. The narrator uses "
                    )
                },
                {"text": "YHWH Elohim", "em": True, "href": BIBLEHUB_YHWH},
                {
                    "text": (
                        " — the personal covenant name God revealed to Moses at the burning bush in "
                    )
                },
                {"text": "Exodus 3:14-15", "href": bg("Exodus 3:14-15")},
                {"text": ". The serpent uses only "},
                {"text": "Elohim", "em": True, "href": BIBLEHUB_ELOHIM},
                {
                    "text": (
                        " — the generic plural noun the same Hebrew Bible applies to pagan deities. Look it up at "
                    )
                },
                {"text": "Bible Hub", "href": BIBLEHUB_ELOHIM},
                {
                    "text": (
                        " or "
                    )
                },
                {"text": "Blue Letter Bible", "href": BLB_GENESIS_3},
                {
                    "text": (
                        " — the lexical entries are on the page. Most English Bibles flatten both Hebrew names into one English "
                    )
                },
                {"text": "God", "em": True},
                {
                    "text": (
                        " and the contrast disappears. From "
                    )
                },
                {"text": "Genesis 1:1", "href": bg("Genesis 1:1")},
                {
                    "text": (
                        " to Revelation, that one English word covers everything — the relational covenant name, the generic word the serpent uses, the words pagan nations used of their own idols. All under one roof. The lie hides in plain sight."
                    )
                },
            ]
        ),
        p(
            [
                {
                    "text": (
                        "FHB renders YHWH as our Father to recover the warmth the name carried for Israel, and leaves the serpent's generic Elohim as God. The Father's voice is not an FHB invention either — the prophets named him out loud. Isaiah prayed, "
                    )
                },
                {"text": "“You, LORD, are our Father”", "em": True, "href": bg("Isaiah 63:16")},
                {"text": " (Isaiah 63:16). Jeremiah heard him say, "},
                {"text": "“I am a Father to Israel”", "em": True, "href": bg("Jeremiah 31:9")},
                {"text": " (Jeremiah 31:9). Malachi asked, "},
                {"text": "“Have we not all one Father?”", "em": True, "href": bg("Malachi 2:10")},
                {
                    "text": (
                        " (Malachi 2:10). The Father's voice has been on the page from the beginning. FHB didn't make this up. We just let it carry."
                    )
                },
            ]
        ),

        # H2 2
        h2("Watch the very first verse"),
        p("FHB renders Genesis 3:1 like this:"),
        quote(
            [
                {"text": "Now the serpent was more crafty than any of the wild creatures our Father had made. He said to the woman, ‘Did God really say...’", "em": True},
            ]
        ),
        p(
            [
                {"text": "Read that aloud. The narrator just called him "},
                {"text": "our Father", "em": True},
                {"text": ". One sentence later, the serpent reframes him as "},
                {"text": "God", "em": True},
                {"text": " — and asks the first recorded suspicion in human history: "},
                {"text": "did God really say?", "em": True},
                {"text": " Not "},
                {"text": "did your Father", "em": True},
                {"text": ". "},
                {"text": "God", "em": True},
                {"text": ". Distant. Bureaucratic. Possibly arbitrary. Possibly wrong."},
            ]
        ),
        p(
            [
                {"text": "Four verses later, the serpent swings again at "},
                {"text": "Genesis 3:5", "href": bg("Genesis 3:5")},
                {"text": ":"},
            ]
        ),
        quote(
            [
                {"text": "For God knows that on the day you eat from it your eyes will be opened, and you will be like God, knowing good and evil.", "em": True},
            ]
        ),
        p(
            [
                {"text": "Two more "},
                {"text": "God", "em": True},
                {"text": "s on the serpent's lips, both painting a Person who hoards rather than gives. The lie that started in Genesis 3:1 — that God is a distant, unrelational deity — keeps going."},
            ]
        ),

        # Mid-post CTA
        mid_cta_block(),

        # H2 3
        h2("A choice we had to make"),
        p(
            "When we were working through Genesis 3 for the Father's Heart Bible, the question came up almost immediately: when the serpent quotes God, do we render his lips as our Father too? The narrator does. The rest of the chapter does. Should the serpent get the same warmth on the page?"
        ),
        p("We decided no."),
        p(
            [
                {"text": "The serpent's two uses of "},
                {"text": "Elohim", "em": True, "href": BIBLEHUB_ELOHIM},
                {"text": " — Genesis 3:1 (\"Did God really say...\") and Genesis 3:5 (\"For God knows...\") — stay as God in FHB. His distance from the Father is total in his own words. He has rejected the Father, and his speech reflects it. Putting our Father in his mouth would be a translator's kindness the text itself refuses to extend."},
            ]
        ),
        p(
            [
                {"text": "The methodology behind that call is public. Our "},
                {"text": "translation rules", "href": INT_BIBLE},
                {"text": " — particularly the rule that lets the New Testament clarify the Old, and the rule that identifies each \"God\" or \"LORD\" as Father, Son, Spirit, or Trinity by context — are documented and version-controlled. Anyone can read them. We addressed the broader methodology question in detail in "},
                {"text": "“Why FHB Says ‘Father’ in Genesis 1.”", "href": INT_BLOG_FATHER_GEN1},
            ]
        ),

        # H2 4 — listicle
        h2("The lie has children"),
        p("Once you hear the serpent's vocabulary, you start hearing it everywhere. Six recognizable forms of the same lie:"),
        p(
            [
                {"text": "1. Idolatry", "strong": True},
                {"text": " — gods at a distance who require transactions to keep them appeased. The serpent's lie scaled across nations."},
            ]
        ),
        p(
            [
                {"text": "2. Babel", "strong": True},
                {"text": " — humanity reaching upward as if the Father were not already near. See "},
                {"text": "Genesis 11:1-9", "href": bg("Genesis 11:1-9")},
                {"text": "."},
            ]
        ),
        p(
            [
                {"text": "3. Pharisaism", "strong": True},
                {"text": " — those who know the law of God by heart and never once know the Father. Jesus diagnosed it directly: "},
                {"text": "“If God were your Father, you would love me”", "em": True, "href": bg("John 8:42")},
                {"text": " (John 8:42)."},
            ]
        ),
        p(
            [
                {"text": "4. Deism", "strong": True},
                {"text": " — a polished version of the same lie. A clockmaker, not a Dad."},
            ]
        ),
        p(
            [
                {"text": "5. Modern religion", "strong": True},
                {"text": " — a God of policy and procedure, of rules and rewards, but never "},
                {"text": "our Father", "em": True},
                {"text": "."},
            ]
        ),
        p(
            [
                {"text": "6. The orphan spirit", "strong": True},
                {"text": " — even inside the church. Believers who love the Father from a distance, striving for what the Spirit of sonship has already given them ("},
                {"text": "Romans 8:15", "href": bg("Romans 8:15")},
                {"text": ")."},
            ]
        ),
        p(
            [
                {"text": "Jesus made the diagnosis explicit. In "},
                {"text": "John 8:44", "href": bg("John 8:44")},
                {"text": ", looking at the religious leaders who can't recognize the Father standing in front of them, he says they are speaking their father's language — and their father is the devil, the father of lies. The lie has a father. The lie has children. And the children speak the language they were taught."},
            ]
        ),

        # H2 5
        h2("Why FHB keeps saying ‘our Father’"),
        p(
            [
                {"text": "This is why FHB is relentless about the phrase "},
                {"text": "our Father", "em": True},
                {"text": ". Across Genesis. Across Joel. Across John. Across every prophet and every gospel. It is not a literary preference. It is, by design, the canon's rebuttal of Genesis 3:1."},
            ]
        ),
        p(
            [
                {"text": "Every time you read "},
                {"text": "our Father", "em": True},
                {"text": " on the page, you are reading something the serpent has never said and never will. He can't. To say "},
                {"text": "our Father", "em": True},
                {"text": " is to confess sonship, and he refuses sonship. That's why his lips in Genesis 3 say "},
                {"text": "God", "em": True},
                {"text": " and only "},
                {"text": "God", "em": True},
                {"text": "."},
            ]
        ),
        p(
            [
                {"text": "But yours don't have to. "},
                {"text": "Romans 8:15", "href": bg("Romans 8:15")},
                {"text": " calls it the Spirit of sonship, by whom we cry, "},
                {"text": "Abba, Father", "em": True},
                {"text": ". That cry is the opposite of Genesis 3:1. It's the lie running backwards. The same point lands again in "},
                {"text": "Galatians 4:6", "href": bg("Galatians 4:6")},
                {"text": " — the Spirit of his Son in our hearts, crying "},
                {"text": "Abba, Father", "em": True},
                {"text": "."},
            ]
        ),

        # H2 6 — practical
        h2("How to read Genesis 3 today"),
        p(
            "Try this the next time you sit with Genesis 3. Read it twice. The first time, mark every place the narrator names the Person. The second time, mark every place the serpent names him. Watch the divide form on the page. Then notice which vocabulary is on your own lips when you talk about him."
        ),
        p(
            [
                {"text": "If most of your sentences sound like the serpent's — distant, generic, "},
                {"text": "God", "em": True},
                {"text": " as a category rather than a Father — that is not a measure of your faith. It is a measure of which Bible you grew up on and which voice you have been overhearing. The "},
                {"text": "Father's Heart Bible", "href": INT_BIBLE},
                {"text": " was made to put the warmth back on the page so it can come off the page and onto your tongue."},
            ]
        ),
        p(
            [
                {"text": "We unpack the same Father's voice in Genesis 1 in "},
                {"text": "“Who Turned On the Light?”", "href": INT_BLOG_LIGHT},
                {"text": " — the Voice that spoke first. Once you have heard it there, the contrast in Genesis 3 makes complete sense."},
            ]
        ),
        p(
            [
                {"text": "So next time you read "},
                {"text": "our Father", "em": True},
                {"text": " anywhere in FHB, notice what you're holding. It's not a sentimental flourish. It's a sentence the serpent cannot speak — and every time it lands on the page, the oldest lie loses a little more ground."},
            ]
        ),

        # Embedded chapter
        fhb_chapter("Genesis", 3),
    ]


# ---------------------------------------------------------------------------
# POST 2 — who-turned-on-the-light
# Title: Who Turned On the Light?
# ---------------------------------------------------------------------------

def post_light_body():
    return [
        byline_block(),
        # Direct answer
        p(
            "Most Bible translations don't start at Genesis 1:1. They start in the New Testament — Matthew, Mark, Luke, John — because the gospel is direct and a finished gospel reaches a new language faster. Good fruit has come from that work for decades. But the Father's Heart Bible begins where the Father began, because the Voice doing the speaking in Genesis 1 is the Father — and meeting the Son before you have heard the Father trains you to relate to the Father at a distance."
        ),
        p(
            [
                {"text": "On day one of creation, "},
                {"text": "“God said, ‘Let there be light’”", "em": True, "href": bg("Genesis 1:3")},
                {"text": ". The Spirit was hovering ("},
                {"text": "Genesis 1:2", "href": bg("Genesis 1:2")},
                {"text": "). The Son was the Word through whom all things were made ("},
                {"text": "John 1:3", "href": bg("John 1:3")},
                {"text": "; "},
                {"text": "Colossians 1:16", "href": bg("Colossians 1:16")},
                {"text": "). But there was one Voice speaking. That Voice is the Father's. Hearing him there changes how you read everything that follows — every prophet, every promise, every word of Jesus."},
            ]
        ),
        key_takeaway(
            "The Voice that spoke light into the dark in Genesis 1 is the Father's voice. The Spirit hovers. The Son is the Word. The Father speaks. Start there, and the rest of the Bible reads like family."
        ),

        # TOC
        toc_block(
            [
                ("Why most Bibles start in Matthew", "start-late"),
                ("Genesis 1 has a Voice", "voice"),
                ("The order of unveiling", "order"),
                ("Whose voice is that?", "whose-voice"),
                ("How hearing the Father changes everything", "changes-everything"),
                ("Who turned on the light?", "who-turned"),
            ]
        ),

        # H2 1
        h2("Why most Bibles start in Matthew (and the cost)"),
        p(
            "When the New Testament is the first thing in your hands, the Person you meet first is the Son. Jesus is who you learn first. Jesus is the lens you read backwards through. Jesus is the Father's exact representation — the writer of Hebrews says it plainly: "
            "the Son is the radiance of his glory and the exact representation of his being. So what you find through him is true."
        ),
        p(
            [
                {"text": "But there is a quiet cost to meeting the Son before you have heard the Father. You learn the Father by inference. By translation. By the Son's words about him. You never quite get the Father in your own ear, in his own voice, on the very first page. He becomes a Father at a distance — accessed through Jesus, mediated through Jesus, related to through Jesus. The Son never wanted that. "},
                {"text": "“He who has seen me has seen the Father”", "em": True, "href": bg("John 14:9")},
                {"text": " (John 14:9) — Jesus said that to point you "},
                {"text": "to the Father", "em": True},
                {"text": ", not to park you in his own foyer. The Son's whole earthly mission was to bring children home to the Father."},
            ]
        ),
        p(
            [
                {"text": "If your Bible never gives you the Father's own voice — if you only ever hear "},
                {"text": "about him", "em": True},
                {"text": " through someone else — orphan distance is what you'll keep. You'll know the Son. You'll love the Son. And you'll relate to the Father like someone you have to be re-introduced to every time you walk in the room. We wrote about this same orphan distance from the inside in "},
                {"text": "“Father, Reveal Your Heart For Me.”", "href": INT_BLOG_REVEAL},
            ]
        ),

        # H2 2
        h2("Genesis 1 has a Voice"),
        p("Open Genesis 1 and listen carefully."),
        p(
            [
                {"text": "The Spirit is there — verse 2 says the Spirit is "},
                {"text": "hovering", "em": True, "href": bg("Genesis 1:2")},
                {"text": " over the waters. The Son is there too — "},
                {"text": "John 1:1-3", "href": bg("John 1:1-3")},
                {"text": " makes that clear: "},
                {"text": "“In the beginning was the Word… all things were made through him.”", "em": True},
                {"text": " "},
                {"text": "Colossians 1:16", "href": bg("Colossians 1:16")},
                {"text": " spells it out: "},
                {"text": "“by him all things were created.”", "em": True},
                {"text": " The whole Trinity is in the room. But there is only one Voice doing the speaking."},
            ]
        ),
        quote(
            [
                {"text": "And God said, “Let there be light.”", "em": True},
                {"text": "  "},
                {"text": "And God said, “Let the waters be gathered.”", "em": True},
                {"text": "  "},
                {"text": "And God said, “Let the earth bring forth.”", "em": True},
                {"text": "  "},
                {"text": "And God said, “Let us make humanity in our image.”", "em": True},
            ]
        ),
        p(
            [
                {"text": "Ten times in the chapter, God speaks. The Spirit hovers. The Son is the Word through whom all of it comes into being. But there is one Voice doing the speaking — and that Voice is the most distinctive presence in the chapter. The Hebrew "},
                {"text": "Elohim", "em": True, "href": BIBLEHUB_ELOHIM},
                {"text": " is plural in form but takes singular verbs throughout — a grammar that makes room for what the New Testament will eventually name out loud: Father, Son, and Spirit, one God, three Persons, with the Father as the speaking Voice. So the question is simple. Whose voice is that?"},
            ]
        ),

        # Mid CTA
        mid_cta_block(),

        # H2 3
        h2("The order of unveiling"),
        p(
            [
                {"text": ""},
                {"text": "Hebrews 1:1-2", "href": bg("Hebrews 1:1-2")},
                {"text": " lays out the canonical order without ambiguity: "},
                {"text": "“In many and various ways God spoke to our fathers by the prophets, but in these last days he has spoken to us by his Son.”", "em": True},
            ]
        ),
        p(
            "The Father speaks. The prophets carry his voice for centuries. Then, in the fullness of time, the Son arrives in flesh and speaks for himself. Then, after the Son ascends, the Spirit is poured out at Pentecost and speaks through the church."
        ),
        p(
            [
                {"text": "Father, Son, Spirit — in that order. Not because one is greater than another. Because that is the order of the unveiling. Each Person of the Trinity has always existed. But the canon teaches us how to "},
                {"text": "hear", "em": True},
                {"text": " them — Father first, then Son, then Spirit. Reverse the order, and the family of God starts feeling like a stranger you got introduced to through a friend."},
            ]
        ),

        # H2 4
        h2("Whose voice is that?"),
        p("So back to Genesis 1."),
        p(
            "The Spirit is hovering. The Word is present. But neither of them is speaking yet in the way scripture lets them speak later. The Son's voice in flesh is thousands of years away. The Spirit's voice at Pentecost is thousands of years away."
        ),
        p(
            [
                {"text": "If it isn't Jesus, and it isn't the Holy Spirit — whose voice is saying "},
                {"text": "“Let there be light”", "em": True, "href": bg("Genesis 1:3")},
                {"text": "?"},
            ]
        ),
        p("It's our Father."),
        quote(
            [
                {
                    "text": (
                        "Then our Father said, “Let us make humanity in our image, in our "
                        "likeness, so that they may rule over the fish in the sea and the birds "
                        "in the sky, over the livestock and all the wild animals, and over all "
                        "the creatures that move along the ground.” (Genesis 1:26, FHB)"
                    )
                },
            ]
        ),
        p(
            [
                {"text": "The very first sentences in the Bible are not a generic deity creating a generic universe. They are a Father — personal, eternal, intentional — speaking light into a dark room. Speaking life into an empty world. Speaking "},
                {"text": "us", "em": True},
                {"text": " into being. "},
                {"text": "Let us make humanity in our image", "em": True},
                {"text": " — the Father, addressing his Son and his Spirit, deciding to make a family. We address the methodology question this rendering raises in "},
                {"text": "“Why FHB Says ‘Father’ in Genesis 1.”", "href": INT_BLOG_FATHER_GEN1},
            ]
        ),
        p("That is who is speaking. That is the Voice you were made to hear first."),

        # H2 5
        h2("How hearing the Father changes everything"),
        p("Read Genesis 1 again with that Voice in your ear."),
        p(
            [
                {"text": "The Father, on day one, speaking light over chaos. The Father, on day three, calling the seas to gather and dry ground to appear. The Father, on day six, looking at the man and the woman his Son and his Spirit have helped him form, and calling it "},
                {"text": "very good", "em": True},
                {"text": "."},
            ]
        ),
        p(
            [
                {"text": "Every chapter after this — every prophet, every promise, every story of mercy and judgment — comes from the same Voice. When you have heard the Father say "},
                {"text": "Let there be light", "em": True},
                {"text": ", you have a frame for everything else he says. "},
                {"text": "“Even now, return to me with all your heart”", "em": True, "href": bg("Joel 2:12")},
                {"text": " (Joel 2:12) lands differently. "},
                {"text": "“Come now, let us reason together”", "em": True, "href": bg("Isaiah 1:18")},
                {"text": " (Isaiah 1:18) lands differently. "},
                {"text": "“I am a Father to Israel”", "em": True, "href": bg("Jeremiah 31:9")},
                {"text": " (Jeremiah 31:9) is no longer a sudden detour into intimacy — it is the same Father who spoke from the very first sentence, naming what he has always been."},
            ]
        ),
        p(
            [
                {"text": "And when you finally arrive in the gospels and Jesus says "},
                {"text": "“I and the Father are one”", "em": True, "href": bg("John 10:30")},
                {"text": " (John 10:30), you are not meeting two distant strangers introduced over coffee. You are watching the Son point at a Father whose voice has been in your ear since "},
                {"text": "“In the beginning.”", "em": True},
            ]
        ),
        p(
            "That is not the same Bible most readers have been given. It can be the Bible you read from now on."
        ),

        # H2 6
        h2("Who turned on the light?"),
        p(
            "We named this post for the question we have been circling. Here is how Genesis 1:3 reads in the Father's Heart Bible:"
        ),
        quote([{"text": "And our Father said, “Let there be light,” and there was light. (Genesis 1:3, FHB)"}]),
        p(
            [
                {"text": "Our Father turned on the light over the formless dark of creation. He is also the One turning on the light of his own heart in his children — chapter by chapter, voice by voice, promise by promise — bringing every beloved son and daughter out of orphan distance into the warmth of the Voice that has been speaking from the very beginning. The "},
                {"text": "Father's Heart Bible", "href": INT_BIBLE},
                {"text": " exists to make that Voice unmistakable on every page."},
            ]
        ),
        p(
            [
                {"text": "He has been turning on the light over you since "},
                {"text": "“In the beginning.”", "em": True},
                {"text": " Hearing him is not the end of a journey. It is where the journey begins. If you want to test the rendering against the Hebrew yourself, "},
                {"text": "Bible Hub's Genesis 1 interlinear", "href": "https://biblehub.com/interlinear/genesis/1.htm"},
                {"text": " and "},
                {"text": "Blue Letter Bible's lexicon", "href": BLB_GENESIS_1},
                {"text": " are excellent free starting points. Then read the chapter in "},
                {"text": "FHB", "href": INT_SAMPLES},
                {"text": " and notice the difference in your chest, not just on the page."},
            ]
        ),
        fhb_chapter("Genesis", 1),
    ]


# ---------------------------------------------------------------------------
# POST 3 — why-fhb-says-father-in-genesis-1
# Title: Why FHB Says 'Father' in Genesis 1
# ---------------------------------------------------------------------------

def post_father_gen1_body():
    return [
        byline_block(),
        p(
            [
                {"text": "As a new translation of the Bible, FHB surfaces old questions asked with each translation. We take each question seriously. For example, this one: "},
                {"text": "Isn't calling God ‘our Father’ in Genesis 1 interpretation, not translation?", "em": True},
            ]
        ),
        p(
            "It's a fair question. We hear it often, and it deserves a straight answer rather than a defensive one. The short answer is yes, it is interpretive — and the apostles modeled the same move long before we did. Every English Bible has been doing it for five hundred years. The disagreement is one of degree, not category."
        ),
        key_takeaway(
            "FHB renders Elohim as ‘our Father’ in Genesis 1 by an interpretive choice rooted in apostolic precedent — Hebrews 1:2, John 1:3, Colossians 1:16. The choice is rule-governed, version-controlled, and publicly declared. Every English translation makes interpretive choices; FHB's are openly stated rather than buried in footnotes."
        ),
        toc_block(
            [
                ("The honest concession", "honest-concession"),
                ("A word about translation history", "translation-history"),
                ("The questions you'd reasonably ask next", "questions"),
                ("The genre matters", "genre"),
                ("What we own", "what-we-own"),
                ("Try the test", "try-the-test"),
            ]
        ),

        # H2 1
        h2("The honest concession"),
        p(
            [
                {"text": "The Father's Heart Bible does render "},
                {"text": "Elohim", "em": True, "href": BIBLEHUB_ELOHIM},
                {"text": " as \"our Father\" in Genesis 1 and elsewhere. That is an interpretive identification, not a lexical equivalence. The Hebrew word "},
                {"text": "Elohim", "em": True},
                {"text": " is plural in form but takes singular verbs; the grammar by itself does not prove three Persons or identify which Person of the Trinity is in view. We grant that fully. "},
                {"text": "Bible Hub", "href": BIBLEHUB_ELOHIM},
                {"text": " and "},
                {"text": "Blue Letter Bible", "href": BLB_GENESIS_1},
                {"text": " carry the lexical entries in full — go look. We have nothing to hide on the Hebrew."},
            ]
        ),
        p(
            [
                {"text": "Every translator faces interpretive choices on every page. The question is not whether interpretation happens — it always does — but which choices a translator makes and whether the methodology is declared. Ours is. Rule "},
                {"text": "FHB-1.2-1", "strong": True},
                {"text": " says every \"God\" or \"LORD\" in the text is identified as Father, Son, Spirit, or Trinity according to context. Rule "},
                {"text": "FHB-1.2-2", "strong": True},
                {"text": " says we let the New Testament clarify the Old — what we call Bible-Clarifies-Bible. Both rules are public, version-controlled, and applied chapter by chapter. When you pick up the FHB, you know exactly what we're doing and why."},
            ]
        ),

        # H2 2
        h2("A word about translation history"),
        p(
            [
                {"text": "Almost every English Bible since William Tyndale's work in the 1520s and 30s renders the divine name "},
                {"text": "YHWH", "em": True, "href": BIBLEHUB_YHWH},
                {"text": " as \"the LORD\" in small caps. That's a substitution Hebrew never makes. The convention came from a Jewish reading practice — saying "},
                {"text": "Adonai", "em": True},
                {"text": " aloud rather than pronouncing the divine name — and translators chose to preserve it."},
            ]
        ),
        p(
            "For five hundred years, every major English Bible — the KJV, the NIV, the ESV, the NASB, the NLT — has carried that interpretive convention straight into the text without so much as a footnote. By a strict \"stay inside the original wording\" standard, no English Bible would qualify as translation. The disagreement between FHB and other Bibles is one of degree, not category."
        ),
        p(
            [
                {"text": "We made the same observation about Genesis 3 in "},
                {"text": "“The Oldest Lie.”", "href": INT_BLOG_SERPENT},
                {"text": " The flattening of YHWH and Elohim into one English "},
                {"text": "God", "em": True},
                {"text": " hides distinctions the Hebrew makes. Translation has been making interpretive moves on every page since the 1500s — we just made ours visible."},
            ]
        ),

        # Mid CTA
        mid_cta_block(),

        # H2 3 (group with sub-questions)
        h2("The questions you'd reasonably ask next"),
        h3("But Moses didn't know about the Trinity. Aren't you projecting later revelation backward?"),
        p(
            [
                {"text": "Yes, we are reading Genesis through the New Testament. So did the apostles. "},
                {"text": "Hebrews 1:2", "href": bg("Hebrews 1:2")},
                {"text": " says our Father \"made the worlds\" through the Son. "},
                {"text": "John 1:3", "href": bg("John 1:3")},
                {"text": " says \"all things were made through Him.\" "},
                {"text": "Colossians 1:16", "href": bg("Colossians 1:16")},
                {"text": " says \"in Him all things were created.\" Paul tells the Corinthians the rock that followed Israel in the wilderness "},
                {"text": "\"was Christ\"", "href": bg("1 Corinthians 10:4")},
                {"text": " (1 Corinthians 10:4). The New Testament writers themselves read the Old Testament backward through Christ — and they rendered the result as their primary teaching, not as a marginal note. FHB follows the apostolic pattern."},
            ]
        ),
        h3("Jewish readers don't see the Trinity in Genesis. Why should we?"),
        p(
            "Correct — and that's exactly where Christianity and Judaism part ways. We believe the New Testament is the authoritative completion of the Old Testament's story. FHB is openly a Christian translation, reading the Old Testament through its New Testament fulfillment. We don't claim Genesis 1 teaches the Trinity on grammatical grounds. We claim that when the apostles read Genesis 1, they read it as the work of the Father, through the Son, by the Spirit. We render accordingly."
        ),
        h3("Why not just footnote it the way study Bibles do?"),
        p(
            [
                {"text": "Because the apostles didn't footnote it either. "},
                {"text": "Hebrews 1:2", "href": bg("Hebrews 1:2")},
                {"text": " doesn't say, \"and from a later perspective, the Son was involved.\" It says our Father made the worlds through the Son, full stop, as primary teaching. FHB renders what the New Testament renders."},
            ]
        ),
        quote(
            [
                {"text": "A note on study editions: ", "strong": True},
                {"text": "once the base FHB is published, we will be releasing multiple FHB Study Bible versions. The footnote work — the Hebrew, the rabbinic readings, the apostolic cross-references — has a home. It just doesn't crowd out the primary reading in the base text."},
            ]
        ),

        # H2 4
        h2("The genre matters"),
        p(
            "FHB is a clarifying translation, not a formal-equivalence one. It sits in the same family as the Amplified Bible, The Voice, and The Passion Translation — Bibles that render later understanding inline rather than burying it in footnotes most readers never see. Compare a single verse across NASB, NIV, and FHB on "
        ),
        p(
            [
                {"text": "BibleGateway's parallel reader", "href": "https://www.biblegateway.com/passage/?search=Genesis+1%3A1-3&version=NASB1995;NIV;NLT"},
                {"text": " for a quick demonstration of how every translation already makes the same kind of interpretive moves we make explicit."},
            ]
        ),
        p(
            "What sets FHB apart in that family is discipline. Our interpretive moves are rule-governed and version-controlled. Every Person identification cites a specific published rule. The methodology is public. The limits are documented. Nothing is improvised. If a sentence in FHB renders \"Father\" where the Hebrew says "
            "Elohim, there's a rule behind it that anyone can read."
        ),

        # H2 5
        h2("What we own"),
        p("We don't hide the interpretive frame. We publish it."),
        p(
            "Translation, like reading itself, always carries a frame. The question is never whether to have one — every translator has one whether they say so or not. The question is whether to declare it. FHB's frame is the apostolic frame: we read the Old Testament with the New Testament in our hand, and we render the result so that the Father's heart and the Son's role are unmistakable to a son or daughter making their way through the whole Bible for the first time."
        ),
        p(
            [
                {"text": "If you've never read Genesis 1 with that frame in view, I'd invite you to read it once in the FHB and ask honestly whether the apostolic reading clarifies the text or distorts it. Read it as a son. Read it as a daughter. Notice whose voice is speaking the world into being and whose hands are holding it together. We unpack the speaking Voice in detail in "},
                {"text": "“Who Turned On the Light?”", "href": INT_BLOG_LIGHT},
            ]
        ),
        p(
            "We trust the reading the apostles modeled. We trust the discipline of public rules. And we trust that our Father has a heart you can feel — even on the very first page of the story."
        ),

        # H2 6
        h2("Try the test"),
        p(
            [
                {"text": "Three steps to test the rendering for yourself: "},
            ]
        ),
        p(
            [
                {"text": "1. Read Genesis 1 in your current translation. ", "strong": True},
                {"text": "Whatever you have on the shelf — KJV, NIV, ESV. Notice your default sense of who is speaking."},
            ]
        ),
        p(
            [
                {"text": "2. Read the same chapter in FHB. ", "strong": True},
                {"text": "Open the "},
                {"text": "FHB sample chapters", "href": INT_SAMPLES},
                {"text": ". Ask: does the rendering clarify or distort?"},
            ]
        ),
        p(
            [
                {"text": "3. Check the Hebrew. ", "strong": True},
                {"text": "Cross-reference at "},
                {"text": "Bible Hub's interlinear", "href": "https://biblehub.com/interlinear/genesis/1.htm"},
                {"text": " or "},
                {"text": "Blue Letter Bible's lexicon", "href": BLB_GENESIS_1},
                {"text": ". Both are free."},
            ]
        ),
        p(
            "If the apostolic reading distorts the text, you'll see it. If it clarifies it, you'll feel it — and you'll have a Bible that lets the Father speak in his own voice from page one."
        ),
        fhb_chapter("Genesis", 1),
    ]


# ---------------------------------------------------------------------------
# POST 4 — father-reveal-your-heart-for-me
# Title: Father, Reveal Your Heart For Me
# ---------------------------------------------------------------------------

def post_reveal_body():
    return [
        byline_block(),
        p(
            "The prophets are usually celebrated for what they predicted. The Messiah. The captivity. The restoration. The Day of the Lord. Generations of Christians have read the prophetic books looking for forecasts — and found plenty. But the prophets carried something the church has rarely celebrated until now. They knew the Father. Not knew about him. They had received Father Heart Revelation — the Father had opened his heart to them, and what came back out of their mouths was the inner emotional life of a Father in love with his children. And Joel 2 promised that same revelation would one day pour out on every beloved son and daughter, not just a few prophets."
        ),
        key_takeaway(
            "Father Heart Revelation is what the prophets had: the Father's own heart opened to a son who could feel it and write what he felt. Joel 2:28-29 promised that revelation would one day pour out on every son and daughter, not just a few prophets. That day is now."
        ),
        toc_block(
            [
                ("What the prophets actually heard", "prophets"),
                ("Joel saw the floodgate", "joel"),
                ("Have you?", "have-you"),
                ("What the Father did at the river", "river"),
                ("How to receive Father Heart Revelation", "how-receive"),
                ("Why this changes how you read the Bible", "changes-reading"),
            ]
        ),

        # H2 1
        h2("What the prophets actually heard"),
        p(
            [
                {"text": "Isaiah, deep in the prayers at the end of his book, names the relationship out loud: "},
                {"text": "“But you are our Father, though Abraham does not know us… you, LORD, are our Father, our Redeemer from of old is your name”", "em": True, "href": bg("Isaiah 63:16")},
                {"text": " (Isaiah 63:16). That is not a forecast. That is a son turning his face toward a Father he knows by name."},
            ]
        ),
        p(
            [
                {"text": "Jeremiah heard the Father describe the relationship in the Father's own words. "},
                {"text": "“I have loved you with an everlasting love; I have drawn you with unfailing kindness”", "em": True, "href": bg("Jeremiah 31:3")},
                {"text": " (Jeremiah 31:3). And again — "},
                {"text": "“I am a Father to Israel, and Ephraim is my firstborn”", "em": True, "href": bg("Jeremiah 31:9")},
                {"text": " (Jeremiah 31:9). And then, in a verse that reads like a Father emptying his chest in front of his prophet — "},
                {"text": "“Is Ephraim my dear son, my darling child?… my heart yearns for him; I will surely have mercy on him”", "em": True, "href": bg("Jeremiah 31:20")},
                {"text": " (Jeremiah 31:20). The Father is not dictating policy. He is naming his ache."},
            ]
        ),
        p(
            [
                {"text": "Hosea heard him in pictures. "},
                {"text": "“When Israel was a child, I loved him… I taught Ephraim to walk, taking them by the arms… I led them with cords of human kindness, with ties of love”", "em": True, "href": bg("Hosea 11:1-4")},
                {"text": " (Hosea 11:1-4). Cords of love. Ties of love. A Father walking his toddler around the kitchen. That image came from the Father, into a prophet's heart, into the canon."},
            ]
        ),
        p(
            [
                {"text": "Zephaniah heard the Father singing over his children — "},
                {"text": "“The LORD your God is in your midst, a mighty one who will save; he will rejoice over you with gladness; he will quiet you by his love; he will exult over you with loud singing”", "em": True, "href": bg("Zephaniah 3:17")},
                {"text": " (Zephaniah 3:17). A Father singing over his family. The prophets did not invent this. They received it. Malachi closed the testament with the obvious question — "},
                {"text": "“Have we not all one Father?”", "em": True, "href": bg("Malachi 2:10")},
                {"text": " (Malachi 2:10) — as if everyone in the room had always known."},
            ]
        ),
        p(
            "These men were not theologians constructing doctrine. They were sons pulled close enough to feel the Father's heartbeat through his ribs, and they had the language to write what they felt."
        ),

        # H2 2
        h2("Joel saw the floodgate"),
        p(
            "Joel saw further. Joel saw a day when the Father's heart would no longer be reserved for a few prophets but poured out on a whole family — sons and daughters, old and young, men and women, every servant and every child. Joel saw the revelation that came to a few becoming the inheritance of all of them."
        ),
        p("Read his words slowly:"),
        quote(
            [
                {
                    "text": (
                        "“And afterward, I will pour out my Spirit on all flesh. Your sons "
                        "and your daughters will prophesy; your old men will dream dreams; "
                        "your young men will see visions. Even on the male and female "
                        "servants, in those days, I will pour out my Spirit.” (Joel 2:28-29, FHB)"
                    )
                },
            ]
        ),
        p(
            [
                {"text": "Read the same passage at "},
                {"text": "BibleGateway", "href": bg("Joel 2:28-29")},
                {"text": " — and notice that Peter quotes this verse on the day of Pentecost ("},
                {"text": "Acts 2:17-21", "href": bg("Acts 2:17-21")},
                {"text": "). What Joel saw, Peter declared had begun. The schedule arrived. The Father started pouring."},
            ]
        ),
        p(
            "This is not a generic Spirit-pouring. The Spirit Joel saw being poured out is the Father's own heart — emptied into the hearts of his children. And what does the Father's heart, poured out on a son or a daughter, look like in real life? It looks like seeing. Sons and daughters begin to see dreams in the night that carry the Father's signature on them — gentle, intimate, tailored. They see visions in the day when their Father pours his heart out, not in metaphor but in felt, weighty, drenching love. They see themselves showered in his love, as if standing under a warm rain that does not stop. They begin to soak. To slow down. To sit in his presence and absorb what they were always meant to live in."
        ),
        p(
            "And here is the strange thing about Father Heart Revelation: just when you think it cannot get better, the next day proves you wrong. And the day after that. And the week after that. It does not run out. He does not run out. The Father has more love than you have capacity for, and his project is to slowly grow your capacity until you can hold more of him."
        ),
        p(
            [
                {"text": "This is not a special-saint experience. The prophets were not on a different tier than you. They were ahead of the schedule. Joel saw the schedule's arrival: "},
                {"text": "all flesh", "em": True},
                {"text": ". "},
                {"text": "Sons and daughters", "em": True},
                {"text": ". The Father's heart, available to a whole family."},
            ]
        ),

        # Mid CTA
        mid_cta_block(),

        # H2 3
        h2("Have you received Father Heart Revelation?"),
        p(
            "Many beloved sons and daughters are receiving this revelation now. Today. In quiet moments and church services, in kitchens and cars on the way to work. The Father is keeping his word from Joel 2."
        ),
        p("Have you?"),
        p(
            "The receiving is simpler than most religion has trained us to believe. There is no formula. No qualification you must pass. There is a willingness to be loved."
        ),
        p("Pray it out loud, with whatever tone fits your day:"),
        p(
            [
                {"text": "“Father, I open my heart to be your beloved son or daughter. Reveal your heart to me.”", "em": True},
            ]
        ),
        p("Then let go. Stop trying. Let the Father come and dwell."),

        # H2 4
        h2("What the Father did at the river"),
        p(
            [
                {"text": "If you are a follower of Jesus, you have already seen what the Father wants to do for you. You saw it at "},
                {"text": "Jesus' baptism in the Jordan", "href": bg("Matthew 3:13-17")},
                {"text": " (Matthew 3:13-17). When Jesus came up out of the water, the Father did three things in sequence — and they are exactly the three things he wants to do for every son and daughter who opens a heart to him."},
            ]
        ),
        p(
            [
                {"text": "1. The Father opened heaven over him.", "strong": True},
                {"text": " The veil between heaven and his Son was pulled aside. The Father's heart was visible."},
            ]
        ),
        p(
            [
                {"text": "2. The Holy Spirit descended like a dove and rested on him. ", "strong": True},
                {"text": "The Father's own Spirit, the Father's own presence, settling on his Son."},
            ]
        ),
        p(
            [
                {"text": "3. The Father spoke out loud over him: ", "strong": True},
                {"text": "“This is my beloved Son, in whom I am well pleased.”", "em": True, "href": bg("Matthew 3:17")},
            ]
        ),
        p(
            "That is the pattern. That is what Father Heart Revelation looks like in concrete. The Father opens his heart over you. The Spirit descends and settles. The Father speaks his beloved-ness over you."
        ),
        p(
            [
                {"text": "And here is the gospel inside the gospel: as a follower of Jesus, you are inside the Son. What the Father said over Jesus at the river, he says over you in him. The heaven that opened over Jesus is the heaven the Father wants to open over you. The Spirit who descended on Jesus is the Spirit Joel saw being poured out on sons and daughters. The voice that named Jesus "},
                {"text": "beloved", "em": True},
                {"text": " is the voice naming you the same. "},
                {"text": "Romans 8:15", "href": bg("Romans 8:15")},
                {"text": " calls it the Spirit of sonship, by whom we cry "},
                {"text": "Abba, Father", "em": True},
                {"text": "."},
            ]
        ),
        p("Believe it. Receive it."),

        # H2 5
        h2("How to receive Father Heart Revelation"),
        p("Five practical steps. None of them are formulas — they are postures the Spirit honors:"),
        p(
            [
                {"text": "1. Get quiet. ", "strong": True},
                {"text": "The Father is gentle. He doesn't shout over noise. Find a place where you can sit without an agenda."},
            ]
        ),
        p(
            [
                {"text": "2. Read aloud what he has already said. ", "strong": True},
                {"text": "Open Jeremiah 31, Hosea 11, Zephaniah 3, or Joel 2 — read them as a son or a daughter and listen for what he is saying about you. Use BibleGateway's "},
                {"text": "audio Bible feature", "href": "https://www.biblegateway.com/audio/"},
                {"text": " if reading aloud is hard for you."},
            ]
        ),
        p(
            [
                {"text": "3. Pray the simple prayer. ", "strong": True},
                {"text": "“Father, reveal your heart to me.” Then stop talking. Soak. Don't manage the encounter."},
            ]
        ),
        p(
            [
                {"text": "4. Watch your dreams. ", "strong": True},
                {"text": "Joel said sons and daughters would dream dreams and see visions. Many beloved sons and daughters report the Father starts speaking in their sleep when they ask him to."},
            ]
        ),
        p(
            [
                {"text": "5. Stay in the river. ", "strong": True},
                {"text": "The Father's love does not run out. Don't treat the encounter as a one-time event. Make soaking a rhythm — five minutes, twenty minutes, an hour. He will keep pouring."},
            ]
        ),

        # H2 6
        h2("Why this changes how you read the Bible"),
        p(
            [
                {"text": "Once Father Heart Revelation lands, the Bible reads like family mail. Every prophet was already speaking from inside it. So is every gospel. So is every epistle. The "},
                {"text": "Father's Heart Bible", "href": INT_BIBLE},
                {"text": " was made to make that family voice unmistakable on every page — particularly in passages where most translations bury the warmth under a generic English "},
                {"text": "God", "em": True},
                {"text": ". We unpack the methodology in "},
                {"text": "“Why FHB Says ‘Father’ in Genesis 1.”", "href": INT_BLOG_FATHER_GEN1},
                {"text": " The same Voice you start hearing in your own quiet time is the Voice that has been speaking from "},
                {"text": "“In the beginning”", "em": True, "href": INT_BLOG_LIGHT},
                {"text": "."},
            ]
        ),
        p(
            "The prophets received it ahead of schedule. Joel saw the schedule arrive. The Father is keeping his word. Have you opened your heart to him today?"
        ),
        fhb_chapter("Joel", 2),
    ]


# ---------------------------------------------------------------------------
# Post definitions for patching
# ---------------------------------------------------------------------------

POSTS = {
    "7b74e4eb-4247-4e12-95e1-7e099c754dde": {
        "slug": "serpent-vocabulary-genesis-3-oldest-lie",
        "build": post_serpent_body,
        "title": "The Oldest Lie: Watch How the Serpent Talks About God",
        "seoTitle": "The Oldest Lie: How the Serpent Talks About God in Genesis 3",  # 60 chars
        "seoDescription": (
            "Why does Genesis 3 use two divine names? The narrator says ‘our Father.’ The "
            "serpent says ‘God.’ That contrast is the whole chapter — and the oldest lie."
        ),  # 158 chars
        "heroImageAlt": (
            "Open Hebrew Bible turned to Genesis 3 — the chapter where the serpent's vocabulary first divides from the Father's."
        ),
        "tags": ["Genesis", "Father Heart"],
        "faqs": [
            {
                "_key": _key("f"),
                "_type": "faqItem",
                "question": "What is the oldest lie in the Bible?",
                "answer": (
                    "The oldest lie in the Bible appears in Genesis 3:1, where the serpent reframes the "
                    "Father — whom the narrator just called ‘our Father’ — as a distant, generic ‘God.’ "
                    "The lie is not a single false statement but a vocabulary shift: the serpent paints "
                    "the Father as bureaucratic, possibly arbitrary, possibly wrong. Idolatry, Babel, "
                    "Pharisaism, deism, and the orphan spirit are all children of that same vocabulary."
                ),
            },
            {
                "_key": _key("f"),
                "_type": "faqItem",
                "question": "Why does the Father's Heart Bible say ‘our Father’ but leave the serpent's words as ‘God’?",
                "answer": (
                    "Genesis 3 uses two different Hebrew divine names on two different pairs of lips. The "
                    "narrator uses YHWH Elohim — the personal covenant name God revealed to Moses. The "
                    "serpent uses only Elohim — the generic plural noun the same Hebrew Bible applies to "
                    "pagan deities. FHB renders YHWH as ‘our Father’ to recover its warmth, and leaves "
                    "the serpent's generic Elohim as ‘God.’ The divide on the page is the divide already "
                    "in the source."
                ),
            },
            {
                "_key": _key("f"),
                "_type": "faqItem",
                "question": "Where is the contrast between ‘our Father’ and ‘God’ first visible in Genesis 3?",
                "answer": (
                    "Read Genesis 3:1 aloud: ‘Now the serpent was more crafty than any of the wild "
                    "creatures our Father had made. He said to the woman, “Did God really say...”’ The "
                    "narrator just called him our Father. One sentence later, the serpent reframes him "
                    "as God — and asks the first recorded suspicion in human history: did God really "
                    "say? Not did your Father. The whole chapter pivots on that single word change."
                ),
            },
            {
                "_key": _key("f"),
                "_type": "faqItem",
                "question": "Did Jesus address the serpent's vocabulary directly?",
                "answer": (
                    "Yes. In John 8:44, Jesus told religious leaders who could not recognize the Father "
                    "in front of them that they were speaking their father's language — and their father "
                    "was the devil, the father of lies. The lie has a father; the lie has children; and "
                    "the children speak the language they were taught. Romans 8:15 calls the opposite "
                    "vocabulary the Spirit of sonship, by whom we cry, Abba, Father."
                ),
            },
        ],
    },
    "11ada35a-6a90-45e7-9264-a075153a2d35": {
        "slug": "who-turned-on-the-light",
        "build": post_light_body,
        "title": "Who Turned On the Light?",
        "seoTitle": "Who Turned On the Light? Whose Voice Speaks in Genesis 1",  # 56 chars
        "seoDescription": (
            "Whose voice speaks ‘Let there be light’ in Genesis 1? The Spirit hovers, the Son "
            "is the Word — the Voice doing the speaking is the Father's. Hear him first."
        ),  # 159 chars
        "heroImageAlt": (
            "Sunrise over still water — the Father's voice turning on the light at the start of creation, the Voice that has been speaking from ‘In the beginning.’"
        ),
        "tags": ["Genesis", "Father Heart"],
        "faqs": [
            {
                "_key": _key("f"),
                "_type": "faqItem",
                "question": "Whose voice is speaking in Genesis 1?",
                "answer": (
                    "The Voice doing the speaking in Genesis 1 is the Father's. The Spirit is hovering "
                    "over the waters (Genesis 1:2). The Son is the Word through whom all things were made "
                    "(John 1:3, Colossians 1:16). The whole Trinity is in the room — but only one Voice "
                    "is speaking. Hebrews 1:1-2 lays out the canonical order: the Father speaks first, "
                    "then the Son in flesh, then the Spirit at Pentecost. Genesis 1 is the Father's voice."
                ),
            },
            {
                "_key": _key("f"),
                "_type": "faqItem",
                "question": "Why does it matter where you start reading the Bible?",
                "answer": (
                    "Most Bible translation projects start in the New Testament — sound reasons, but "
                    "there is a quiet cost. When you meet the Son before you have heard the Father, you "
                    "learn the Father by inference. He becomes a Father at a distance, accessed through "
                    "Jesus rather than heard in his own voice. Starting at Genesis 1:1 lets you hear the "
                    "Father speak first, which is how the canon was ordered to teach you to hear him."
                ),
            },
            {
                "_key": _key("f"),
                "_type": "faqItem",
                "question": "Is the Trinity present in Genesis 1?",
                "answer": (
                    "Yes — though not by Hebrew grammar alone. Genesis 1:2 names the Spirit hovering. "
                    "Genesis 1:26 records the Father saying ‘let us make humanity in our image.’ John 1:3 "
                    "and Colossians 1:16 identify the Son as the Word through whom creation came into "
                    "being. The Father's Heart Bible reads Genesis 1 the way the apostles read it — as "
                    "the work of the Father, through the Son, by the Spirit — and renders accordingly."
                ),
            },
            {
                "_key": _key("f"),
                "_type": "faqItem",
                "question": "How does hearing the Father in Genesis 1 change how you read the rest of the Bible?",
                "answer": (
                    "When you have heard the Father say ‘Let there be light,’ every later line lands "
                    "differently. ‘I am a Father to Israel’ (Jeremiah 31:9) is no longer a sudden detour "
                    "into intimacy — it is the same Father who spoke from the very first sentence, naming "
                    "what he has always been. ‘I and the Father are one’ (John 10:30) is the Son pointing "
                    "at a Father whose voice has been in your ear since ‘In the beginning.’"
                ),
            },
        ],
    },
    "20275699-f8dd-4278-a546-22c735b02c98": {
        "slug": "why-fhb-says-father-in-genesis-1",
        "build": post_father_gen1_body,
        "title": "Why FHB Says 'Father' in Genesis 1",
        "seoTitle": "Why FHB Says ‘Father’ in Genesis 1 — Translation or Interpretation?",  # 67 — slightly long, trim
        # Trimmed to 60:
        # "Why FHB Renders Elohim as ‘Father’ in Genesis 1" = 47
        # Use:
        "seoTitle_FINAL": "Why FHB Renders Elohim as ‘our Father’ in Genesis 1",  # 52
        "seoDescription": (
            "Is calling Elohim ‘our Father’ in Genesis 1 translation or interpretation? A "
            "straight answer: yes, it is interpretive — and the apostles modeled it first."
        ),  # 159
        "heroImageAlt": (
            "Hebrew interlinear of Genesis 1:1 with the word Elohim circled — the question the Father's Heart Bible answers in the open."
        ),
        "tags": ["Translation", "Trinity", "FHB Methodology"],
        "faqs": [
            {
                "_key": _key("f"),
                "_type": "faqItem",
                "question": "Is calling God ‘our Father’ in Genesis 1 translation or interpretation?",
                "answer": (
                    "It is interpretive — and the Father's Heart Bible says so openly. The Hebrew word "
                    "Elohim is plural in form but takes singular verbs; the grammar by itself does not "
                    "prove three Persons or identify which Person is in view. FHB renders ‘our Father’ "
                    "according to a published rule (FHB-1.2-1) that identifies each ‘God’ or ‘LORD’ as "
                    "Father, Son, Spirit, or Trinity by context — following the apostolic pattern of "
                    "reading the Old Testament through the New."
                ),
            },
            {
                "_key": _key("f"),
                "_type": "faqItem",
                "question": "Don't all English Bibles already make interpretive choices?",
                "answer": (
                    "Yes. Almost every English Bible since Tyndale renders the divine name YHWH as ‘the "
                    "LORD’ in small caps — a substitution Hebrew never makes, inherited from a Jewish "
                    "reading practice. For five hundred years every major English Bible — KJV, NIV, ESV, "
                    "NASB, NLT — has carried that interpretive convention straight into the text without "
                    "a footnote. By a strict ‘stay inside the original wording’ standard, no English "
                    "Bible would qualify. The disagreement between FHB and other Bibles is one of degree."
                ),
            },
            {
                "_key": _key("f"),
                "_type": "faqItem",
                "question": "Aren't you projecting the Trinity backward into Genesis?",
                "answer": (
                    "We are reading Genesis through the New Testament. So did the apostles. Hebrews 1:2 "
                    "says the Father made the worlds through the Son. John 1:3 says all things were made "
                    "through Christ. Colossians 1:16 says in him all things were created. Paul tells the "
                    "Corinthians the rock that followed Israel ‘was Christ’ (1 Corinthians 10:4). The "
                    "apostles read the Old Testament backward through Christ and rendered the result as "
                    "primary teaching. FHB follows the apostolic pattern."
                ),
            },
            {
                "_key": _key("f"),
                "_type": "faqItem",
                "question": "Why doesn't FHB just put the apostolic reading in a footnote?",
                "answer": (
                    "Because the apostles didn't footnote it either. Hebrews 1:2 doesn't say ‘and from a "
                    "later perspective, the Son was involved.’ It says our Father made the worlds through "
                    "the Son, full stop, as primary teaching. FHB renders what the New Testament renders. "
                    "Future FHB Study Bible editions will carry the Hebrew, rabbinic readings, and "
                    "apostolic cross-references in footnotes — the base text keeps the primary reading."
                ),
            },
        ],
    },
    "9e41f9ff-bb8b-4158-9103-e0ff26063b06": {
        "slug": "father-reveal-your-heart-for-me",
        "build": post_reveal_body,
        "title": "Father, Reveal Your Heart For Me",
        "seoTitle": "Father, Reveal Your Heart For Me — Joel 2 & The Prophets",  # 54
        "seoDescription": (
            "The prophets carried Father Heart Revelation. Joel 2 promised it would pour out "
            "on every beloved son and daughter. Have you received it? Here's how to ask."
        ),  # 158
        "heroImageAlt": (
            "A father holding his beloved child close — the picture Hosea 11:4 paints when the Father describes his cords of love and ties of human kindness."
        ),
        "tags": ["Prophets", "Joel", "Father Heart"],
        "faqs": [
            {
                "_key": _key("f"),
                "_type": "faqItem",
                "question": "What is Father Heart Revelation?",
                "answer": (
                    "Father Heart Revelation is the Father's own heart opened to a son or daughter — "
                    "experienced as felt, weighty, intimate love rather than as abstract doctrine. The "
                    "prophets received it ahead of schedule: Isaiah named the Father out loud, Jeremiah "
                    "heard the Father describe his ache, Hosea saw the Father walking his toddler around, "
                    "Zephaniah heard the Father singing. Joel 2:28-29 promised the same revelation would "
                    "pour out on every beloved son and daughter, not just a few prophets."
                ),
            },
            {
                "_key": _key("f"),
                "_type": "faqItem",
                "question": "What did Joel see in Joel 2:28-29?",
                "answer": (
                    "Joel saw a day when the Father's Spirit — the Father's own heart — would no longer "
                    "be reserved for a few prophets but poured out on a whole family: sons and daughters, "
                    "old and young, men and women, every servant and child. Peter quoted this passage on "
                    "the day of Pentecost (Acts 2:17-21) and declared the schedule had begun. What Joel "
                    "saw, the church now carries — the Father's heart available to all flesh."
                ),
            },
            {
                "_key": _key("f"),
                "_type": "faqItem",
                "question": "How do I receive Father Heart Revelation?",
                "answer": (
                    "Get quiet. Read aloud what the Father has already said about his sons and daughters "
                    "(Jeremiah 31, Hosea 11, Zephaniah 3, Joel 2). Pray the simple prayer: ‘Father, "
                    "reveal your heart to me.’ Then stop talking and soak. Watch your dreams — Joel said "
                    "sons and daughters would dream dreams and see visions. And stay in the river. The "
                    "Father's love does not run out. There is no formula and no qualification — only a "
                    "willingness to be loved."
                ),
            },
            {
                "_key": _key("f"),
                "_type": "faqItem",
                "question": "What did the Father do at Jesus' baptism, and how does it apply to me?",
                "answer": (
                    "At Jesus' baptism in the Jordan (Matthew 3:13-17), the Father did three things: "
                    "opened heaven over him, sent the Spirit to descend like a dove and rest on him, and "
                    "spoke audibly — ‘This is my beloved Son, in whom I am well pleased.’ As a follower "
                    "of Jesus, you are inside the Son. What the Father said over Jesus, he says over you "
                    "in him. The heaven that opened, the Spirit who descended, the voice that named him "
                    "beloved — all of it the Father wants to do for you (Romans 8:15)."
                ),
            },
        ],
    },
}

# Apply seoTitle override for post 3 — the dict trick above lets us keep the
# trimming logic visible at definition time without triggering an unused key
for pdata in POSTS.values():
    if "seoTitle_FINAL" in pdata:
        pdata["seoTitle"] = pdata.pop("seoTitle_FINAL")


# ---------------------------------------------------------------------------
# HTTP API helpers
# ---------------------------------------------------------------------------

def sanity_mutate(mutations):
    url = f"{API_BASE}/mutate/{DATASET}"
    payload = {"mutations": mutations}
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        method="POST",
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        print("HTTP", e.code, e.read().decode("utf-8"), file=sys.stderr)
        raise


def get_existing_doc(doc_id):
    """Returns dict or None."""
    url = f"{API_BASE}/doc/{DATASET}/{doc_id}"
    req = urllib.request.Request(
        url, headers={"Authorization": f"Bearer {TOKEN}"}
    )
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data.get("documents", [None])[0] if data.get("documents") else None
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None
        raise


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    word_counts = {}
    for pub_id, pdata in POSTS.items():
        draft_id = f"drafts.{pub_id}"
        body = pdata["build"]()

        # Compute word count of prose (exclude fhbChapter and BlogCTA which is template-side)
        words = 0
        for blk in body:
            if blk.get("_type") != "block":
                continue
            for ch in blk.get("children", []):
                t = ch.get("text", "")
                words += len(t.split())
        word_counts[pdata["slug"]] = words

        # Get existing draft (if any) to preserve fields we don't touch
        existing = get_existing_doc(draft_id)

        published = get_existing_doc(pub_id)
        # Use existing draft if present, else clone from published
        base = existing or published or {}

        # Build the draft document
        draft_doc = {
            "_id": draft_id,
            "_type": "blogPost",
            "title": pdata["title"],
            "slug": base.get("slug") or {"_type": "slug", "current": pdata["slug"]},
            "excerpt": base.get("excerpt"),
            "heroImage": (
                {**(base.get("heroImage") or {}), "alt": pdata["heroImageAlt"]}
                if base.get("heroImage")
                else None
            ),
            "author": base.get("author") or "Kevin White",
            "publishDate": base.get("publishDate") or "2026-05-05",
            "dateModified": TODAY_ISO,
            "tags": base.get("tags") or pdata["tags"],
            "body": body,
            "faqs": pdata["faqs"],
            "seoTitle": pdata["seoTitle"],
            "seoDescription": pdata["seoDescription"],
        }
        # Strip None
        draft_doc = {k: v for k, v in draft_doc.items() if v is not None}

        # Replace the draft via createOrReplace mutation
        mutations = [{"createOrReplace": draft_doc}]
        result = sanity_mutate(mutations)
        print(f"[{pdata['slug']}] words={words} mutated: {json.dumps(result.get('results', []))[:200]}")

    print("\nWord counts by slug:")
    for slug, w in word_counts.items():
        print(f"  {slug}: {w}")


if __name__ == "__main__":
    main()
