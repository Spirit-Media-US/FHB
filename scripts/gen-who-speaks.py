#!/usr/bin/env python3
"""Generates the /who-speaks-in-scripture/ data (unit 2gm, 2026-10-31): per-book words and verses
spoken by our Father, the Son and the Holy Spirit, MEASURED from the LOCKED English canon's
Divine Voice Color tags. Writes src/data/who-speaks.json and public/data/who-speaks-by-book.csv.

READ-ONLY on canon. Same counting as dvc_claim.py / fhb-edition.py `_dvc_figures_at` (build_book._speech_spans:
FRAGMENT level, words over merged spans, a verse counts for a speaker when any fragment is his), but
split per book, taken from the locked tree AT THE LOCK COMMIT (not the live community tree, which has
moved since the lock). Refuses to write unless the book sums equal the locked `dvc_figures` field
(whole-canon figures: never mixed with edition numbers).

  python3 scripts/gen-who-speaks.py          write both files
  python3 scripts/gen-who-speaks.py --check  exit 1 if the committed files differ from a fresh measurement
  python3 scripts/gen-who-speaks.py --selftest-names  prove the names reconcile REFUSES an altered count

Unit 2gz (2026-11-01) adds measure_names(): how the locked English text NAMES the Father (/names-of-god-the-father/).
Same locked tree, same refusal pattern. METHOD (documented on the page too, reproducible from this file):
  1. Token = the capitalised word Father (or Father's); the plural Fathers is human and never counted.
  2. Term = the words that directly precede it, read back from the token: an optional epithet word (only
     words that the text itself puts between a determiner and Father, collected in pass 1) and then the
     determiner (our/your/my/the/his/her/their/no/a/one/O). No determiner and no epithet = bare "Father".
  3. Overlay (NOT additive, same tokens): the word(s) after the token when it continues "Father of ...".
  4. Every token lands in exactly one term; the term counts must equal an independent raw recount of the
     token regex over the same text, per book and in total, and the verse total must equal the locked
     whole-canon verse figure. Anything else refuses to write.
"""
import collections, csv, glob, importlib.util, io, json, os, re, subprocess, sys, tarfile, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CANON_REPO = "/home/deploy/bin/tools-api"
LOCKED_TREE = "pipelines/translation/output/locked"
STATE = f"{CANON_REPO}/pipelines/translation/output/CANON_EDITION_STATE.json"
BB = "/home/deploy/projects/fhb-print-bible/build_book.py"
SNAKE = {"jesus_words": "jesusWords", "son_words": "sonWords", "father_words": "fatherWords", "spirit_words": "spiritWords"}
NAMES = {"F": "father", "S": "son", "H": "spirit"}
JSON_OUT = os.path.join(ROOT, "src/data/who-speaks.json")
CSV_OUT = os.path.join(ROOT, "public/data/who-speaks-by-book.csv")
CSV_FIELDS = ["book", "testament", "father_words", "father_verses", "son_words", "son_verses",
              "spirit_words", "spirit_verses", "book_verses", "read_url"]


def measure():
    st = json.load(open(STATE, encoding="utf-8"))
    if st.get("state") != "locked":
        raise SystemExit("gen-who-speaks: canon edition is not locked; refusing")
    fig = st["dvc_figures"]
    commit, version = st["locked_commit"], st["version"]
    spec = importlib.util.spec_from_file_location("_bb", BB)
    bb = importlib.util.module_from_spec(spec)
    try:
        spec.loader.exec_module(bb)
    except SystemExit:
        pass
    order = json.load(open(os.path.join(ROOT, "src/lib/bible_structure.json")))["order"]
    r = subprocess.run(["git", "-C", CANON_REPO, "archive", commit, LOCKED_TREE], capture_output=True)
    if r.returncode:
        raise SystemExit("gen-who-speaks: cannot read locked tree: " + r.stderr.decode()[:300])
    books = {}
    with tempfile.TemporaryDirectory() as td:
        with tarfile.open(fileobj=io.BytesIO(r.stdout)) as tf:
            tf.extractall(td, filter="data")
        base = os.path.join(td, LOCKED_TREE)
        for f in sorted(glob.glob(os.path.join(base, "*", "[0-9]*.json"))):
            book = os.path.basename(os.path.dirname(f))
            b = books.setdefault(book, {"words": collections.Counter(), "verses": collections.Counter(), "book_verses": 0})
            for v in json.load(open(f, encoding="utf-8")).get("verses") or []:
                if not isinstance(v, dict):
                    continue
                b["book_verses"] += 1
                nv = {"text": v.get("fhb_text") or ""}
                for s, c in SNAKE.items():
                    if v.get(s):
                        nv[c] = v[s]
                if not any(nv.get(x) for x in bb.SPEECH_FIELDS):
                    continue
                seen = set()
                for a, z, who in bb._speech_spans(nv, nv["text"]):
                    who = who.rstrip("B")
                    b["words"][who] += len(nv["text"][a:z].split())
                    seen.add(who)
                for who in seen:
                    b["verses"][who] += 1
    if sorted(books) != sorted(order):
        raise SystemExit("gen-who-speaks: book list differs from bible_structure order")
    rows = []
    for i, name in enumerate(order):
        b = books[name]
        row = {"book": name, "testament": "OT" if i < 39 else "NT", "book_verses": b["book_verses"],
               "read_url": "https://fathersheartbible.com/read/" + name.lower().replace(" ", "-") + "/"}
        for k, n in NAMES.items():
            row[f"{n}_words"], row[f"{n}_verses"] = b["words"][k], b["verses"][k]
        rows.append(row)
    tot = {n: {"words": sum(r_[f"{n}_words"] for r_ in rows), "verses": sum(r_[f"{n}_verses"] for r_ in rows)}
           for n in NAMES.values()}
    for n, label in (("father", "Father"), ("son", "Son"), ("spirit", "Spirit")):
        for k in ("words", "verses"):
            if tot[n][k] != fig[label][k]:
                raise SystemExit(f"gen-who-speaks: {label} {k}: books sum to {tot[n][k]:,} but the locked "
                                 f"figures field says {fig[label][k]:,}. Refusing to write mismatched numbers.")
    canon_verses = sum(r_["book_verses"] for r_ in rows)
    if canon_verses != fig["_canon"]["verses"]:
        raise SystemExit(f"gen-who-speaks: canon verses {canon_verses} != locked {fig['_canon']['verses']}")
    data = {"edition": version, "locked_commit": commit, "measured_from": "locked English canon, Divine Voice Color tags",
            "totals": tot, "canon": {"books": len(rows), "verses": canon_verses}, "rows": rows}
    buf = io.StringIO()
    w = csv.DictWriter(buf, CSV_FIELDS, lineterminator="\n")
    w.writeheader()
    w.writerows([{k: r_[k] for k in CSV_FIELDS} for r_ in rows])
    return json.dumps(data, indent="\t", ensure_ascii=False) + "\n", buf.getvalue()


# ---------------------------------------------------------------- unit 2gz: names of the Father
NAMES_JSON = os.path.join(ROOT, "src/data/names-of-the-father.json")
NAMES_CSV = os.path.join(ROOT, "public/data/names-of-the-father-terms.csv")
NAMES_BOOK_CSV = os.path.join(ROOT, "public/data/names-of-the-father-by-book.csv")
TOKEN = re.compile(r"(?<![\w’'])Father(?:’s|'s)?(?![\w’'])")
DETS = {"our", "your", "my", "his", "her", "their", "the", "a", "no", "one", "o"}
SPLIT = re.compile(r"[\s—–-]+")
WORD = re.compile(r"[^A-Za-z]")
# Context words reported beside the term table (word counts, not referent counts: "Lord" also names the Son).
CONTEXT = {"God": re.compile(r"\bGod(?:’s|'s)?\b"), "Lord": re.compile(r"\bLord(?:’s|'s)?\b"),
           "LORD": re.compile(r"\bLORD\b")}


def _slug(book):
    return book.lower().replace(" ", "-")


def _locked_chapters(commit):
    """Yield (book, chapter_number, [verse_text...]) from the locked tree AT THE LOCK COMMIT."""
    r = subprocess.run(["git", "-C", CANON_REPO, "archive", commit, LOCKED_TREE], capture_output=True)
    if r.returncode:
        raise SystemExit("gen-who-speaks: cannot read locked tree: " + r.stderr.decode()[:300])
    out = []
    with tempfile.TemporaryDirectory() as td:
        with tarfile.open(fileobj=io.BytesIO(r.stdout)) as tf:
            tf.extractall(td, filter="data")
        base = os.path.join(td, LOCKED_TREE)
        for f in sorted(glob.glob(os.path.join(base, "*", "[0-9]*.json"))):
            d = json.load(open(f, encoding="utf-8"))
            vs = [(v.get("verse"), v.get("fhb_text") or "") for v in (d.get("verses") or []) if isinstance(v, dict)]
            out.append((os.path.basename(os.path.dirname(f)), int(os.path.basename(f)[:-5]), vs))
    return out


_TOK = re.compile(r"[A-Za-z]+(?:[\u2019'][A-Za-z]+)?|[,;:.!?\"\u201c\u201d()\u2014\u2013]")


def _prev_words(text, end):
    """Words before `end`, lowercased; any punctuation or dash is kept as the break marker '|'."""
    return [("|" if not x[0].isalpha() else x.lower()) for x in _TOK.findall(text[:end])]


def _classify(text, m, mods):
    """Term for one Father token: [epithet words] + determiner + 'Father'. Reads back at most 2 epithets,
    never across punctuation or a dash."""
    prev = _prev_words(text, m.start())
    chain = []
    i = len(prev) - 1
    while i >= 0 and len(chain) < 2 and prev[i] in mods and prev[i] not in DETS:
        chain.insert(0, prev[i])
        i -= 1
    det = prev[i] if i >= 0 and prev[i] in DETS else ""
    parts = ([det] if det else []) + chain
    parts = ["O" if x == "o" else x for x in parts]
    return (" ".join(parts) + " Father").strip() if parts else "Father"


def _epithets(chapters):
    """Pass 1: words the text itself places between a determiner and Father (DET w Father, no punctuation)."""
    c = collections.Counter()
    for _b, _n, vs in chapters:
        for _v, t in vs:
            for m in TOKEN.finditer(t):
                p = _prev_words(t, m.start())
                if len(p) >= 2 and p[-1] not in DETS and p[-1] != "|" and p[-2] in DETS:
                    c[p[-1]] += 1
    return c


def reconcile_names(data, fig, raw_total, raw_by_book):
    """Refuse (SystemExit) unless every term count reconciles. Pure, so selftest can feed it a tampered copy."""
    rows = data["terms"]
    tot = sum(r_["count"] for r_ in rows)
    if tot != raw_total or tot != data["totals"]["tokens"]:
        raise SystemExit(f"gen-who-speaks: terms sum to {tot:,} but the independent recount says {raw_total:,}")
    for b, n in raw_by_book.items():
        got = sum(r_["by_book"].get(b, 0) for r_ in rows)
        if got != n:
            raise SystemExit(f"gen-who-speaks: {b}: terms sum to {got} but recount says {n}")
    for r_ in rows:
        if sum(r_["by_book"].values()) != r_["count"]:
            raise SystemExit(f"gen-who-speaks: term {r_['term']!r}: by-book sums differ from its count")
    if data["canon"]["verses"] != fig["_canon"]["verses"] or data["canon"]["books"] != fig["_canon"]["books"]:
        raise SystemExit("gen-who-speaks: names canon size != locked whole-canon figure")


def measure_names():
    st = json.load(open(STATE, encoding="utf-8"))
    if st.get("state") != "locked":
        raise SystemExit("gen-who-speaks: canon edition is not locked; refusing")
    fig, commit, version = st["dvc_figures"], st["locked_commit"], st["version"]
    order = json.load(open(os.path.join(ROOT, "src/lib/bible_structure.json")))["order"]
    chapters = _locked_chapters(commit)
    epi = _epithets(chapters)
    mods = set(epi)
    terms = {}
    raw_by_book, verses_total, ctx = collections.Counter(), 0, collections.Counter()
    verse_hits, first = collections.defaultdict(set), {}
    of = collections.defaultdict(lambda: collections.Counter())
    ofcount = collections.Counter()
    book_verses = collections.Counter()
    for book, ch, vs in chapters:
        for vn, t in vs:
            verses_total += 1
            book_verses[book] += 1
            for k, rx in CONTEXT.items():
                ctx[k] += len(rx.findall(t))
            toks = list(TOKEN.finditer(t))
            raw_by_book[book] += len(TOKEN.findall(t))   # independent recount path
            for m in toks:
                term = _classify(t, m, mods)
                d = terms.setdefault(term, {"term": term, "count": 0, "by_book": collections.Counter()})
                d["count"] += 1
                d["by_book"][book] += 1
                verse_hits[term].add((book, ch, vn))
                first.setdefault(term, (order.index(book), ch, vn, book))
                nxt = t[m.end():].lstrip()
                if re.match(r"of\b", nxt):
                    tail = re.sub(r"^of\s+", "", nxt)
                    mm = re.match(r"[A-Za-z]+", tail)
                    key = mm.group(0) if mm else "?"
                    if key.lower() in DETS or key in ("all",):
                        key = "(a possessive or 'the' phrase)"
                    of[key][book] += 1
                    ofcount[key] += 1
    if sorted(raw_by_book) != sorted(order) or len(book_verses) != 66:
        raise SystemExit("gen-who-speaks: book list differs from bible_structure order")
    rows = []
    for term, d in sorted(terms.items(), key=lambda kv: (-kv[1]["count"], kv[0])):
        bo = sorted(d["by_book"].items(), key=lambda kv: (-kv[1], order.index(kv[0])))
        fb = first[term][3]
        rows.append({"term": term, "count": d["count"], "verses": len(verse_hits[term]),
                     "books": len(d["by_book"]), "top_books": [{"book": b, "count": n} for b, n in bo[:3]],
                     "by_book": dict(d["by_book"]),
                     "first_read_url": f"https://fathersheartbible.com/read/{_slug(fb)}/{first[term][1]}/",
                     "first_ref": f"{fb} {first[term][1]}:{first[term][2]}"})
    all_hits = set().union(*verse_hits.values())
    overlay = [{"term": ("Father of this (people Israel)" if k == "this" else f"Father of {k}") if not k.startswith("(") else "Father of " + k, "count": n,
                "books": len(of[k]), "top_books": [{"book": b, "count": c} for b, c in
                                                   sorted(of[k].items(), key=lambda kv: (-kv[1], order.index(kv[0])))[:3]]}
               for k, n in sorted(ofcount.items(), key=lambda kv: (-kv[1], kv[0]))]
    book_rows = []
    for i, name in enumerate(order):
        r_ = {"book": name, "testament": "OT" if i < 39 else "NT", "tokens": sum(t_["by_book"].get(name, 0) for t_ in rows),
              "book_verses": book_verses[name], "read_url": f"https://fathersheartbible.com/read/{_slug(name)}/"}
        r_["verses_naming"] = len({h for h in all_hits if h[0] == name})
        book_rows.append(r_)
    abba = sum(len(re.findall(r"\bAbba\b", t)) for _b, _n, vs in chapters for _v, t in vs)
    data = {"edition": version, "locked_commit": commit,
            "measured_from": "locked English canon, fhb_text, capitalised token Father",
            "totals": {"tokens": sum(r_["count"] for r_ in rows), "verses_naming": len(all_hits), "terms": len(rows),
                       "abba": abba, "context_words": dict(ctx)},
            "canon": {"books": len(book_verses), "verses": verses_total},
            "epithets": dict(sorted(epi.items(), key=lambda kv: (-kv[1], kv[0]))),
            "terms": rows, "overlay": overlay, "books": book_rows}
    reconcile_names(data, fig, sum(raw_by_book.values()), dict(raw_by_book))
    tbuf = io.StringIO()
    w = csv.writer(tbuf, lineterminator="\n")
    w.writerow(["term", "count", "verses", "books", "top_books", "by_book", "first_ref", "first_read_url"])
    for r_ in rows:
        w.writerow([r_["term"], r_["count"], r_["verses"], r_["books"],
                    "; ".join(f"{x['book']} {x['count']}" for x in r_["top_books"]),
                    "; ".join(f"{b} {n}" for b, n in sorted(r_["by_book"].items(), key=lambda kv: order.index(kv[0]))), r_["first_ref"], r_["first_read_url"]])
    bbuf = io.StringIO()
    w = csv.writer(bbuf, lineterminator="\n")
    w.writerow(["book", "testament", "father_names", "verses_naming_the_father", "book_verses", "read_url"])
    for r_ in book_rows:
        w.writerow([r_["book"], r_["testament"], r_["tokens"], r_["verses_naming"], r_["book_verses"], r_["read_url"]])
    return (json.dumps(data, indent="\t", ensure_ascii=False) + "\n", tbuf.getvalue(), bbuf.getvalue(),
            fig, sum(raw_by_book.values()), dict(raw_by_book))


def selftest_names():
    """Failure path: an altered count MUST be refused. Exit 0 only if the reconcile fires on each defect."""
    j, _t, _b, fig, raw, rb = measure_names()
    good = json.loads(j)
    reconcile_names(good, fig, raw, rb)           # untouched must pass
    defects = {}
    d = json.loads(j); d["terms"][0]["count"] += 1; defects["term count +1 (count != by_book)"] = d
    d = json.loads(j); d["terms"][0]["count"] += 1; d["terms"][0]["by_book"]["Matthew"] += 1; defects["term+book +1 (vs recount)"] = d
    d = json.loads(j); d["canon"]["verses"] += 1; defects["canon verses +1 (vs locked figure)"] = d
    for name, d in defects.items():
        try:
            reconcile_names(d, fig, raw, rb)
        except SystemExit as e:
            print("REFUSED as required:", name, "->", str(e)[:90])
            continue
        print("NOT REFUSED (selftest FAILS):", name)
        sys.exit(1)
    print("selftest-names: untouched passes; 3/3 altered copies refused")


if __name__ == "__main__":
    if "--selftest-names" in sys.argv:
        selftest_names()
        sys.exit(0)
    nj, nt, nb = measure_names()[:3]
    j, c = measure()
    if "--check" in sys.argv:
        ok = (open(JSON_OUT).read() == j and open(CSV_OUT).read() == c and open(NAMES_JSON).read() == nj
              and open(NAMES_CSV).read() == nt and open(NAMES_BOOK_CSV).read() == nb)
        print("who-speaks data " + ("current" if ok else "DRIFTED: rerun scripts/gen-who-speaks.py"))
        sys.exit(0 if ok else 1)
    open(JSON_OUT, "w").write(j)
    open(CSV_OUT, "w").write(c)
    open(NAMES_JSON, "w").write(nj)
    open(NAMES_CSV, "w").write(nt)
    open(NAMES_BOOK_CSV, "w").write(nb)
    t = json.loads(j)["totals"]
    print("wrote", JSON_OUT, CSV_OUT, {k: v for k, v in t.items()})
