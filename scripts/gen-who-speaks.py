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
"""
import collections, csv, glob, importlib.util, io, json, os, subprocess, sys, tarfile, tempfile

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


if __name__ == "__main__":
    j, c = measure()
    if "--check" in sys.argv:
        ok = open(JSON_OUT).read() == j and open(CSV_OUT).read() == c
        print("who-speaks data " + ("current" if ok else "DRIFTED: rerun scripts/gen-who-speaks.py"))
        sys.exit(0 if ok else 1)
    open(JSON_OUT, "w").write(j)
    open(CSV_OUT, "w").write(c)
    t = json.loads(j)["totals"]
    print("wrote", JSON_OUT, CSV_OUT, {k: v for k, v in t.items()})
