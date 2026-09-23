"""Extract Újkor.hu anthology tasks without interpreting source text as instructions."""
import json
import re
import shutil
import subprocess
import tempfile
from io import BytesIO
from pathlib import Path
from docx import Document
from docx.table import Table
from docx.text.paragraph import Paragraph
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / "ujkor.hu-feladatok"
OUTPUT = ROOT / "data" / "ujkor-tasks.json"
ASSETS = ROOT / "static" / "ujkor"
SOFFICE = shutil.which("soffice") or str(Path.home() / ".cache/codex-runtimes/codex-primary-runtime/dependencies/bin/override/soffice")
HEADING = re.compile(r"^\s*(\d+)\.?\s+(.{3,}?)\s*\(K/(\d+(?:[.,]\d+)?)\)", re.I)
REL = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}embed"


def blocks(path):
    doc = Document(path)
    current = None
    result = []
    for el in doc.element.body.iterchildren():
        if el.tag.endswith("}p"):
            p = Paragraph(el, doc)
            line = p.text.strip()
            match = HEADING.match(line)
            if match:
                current = {
                    "number": int(match.group(1)), "heading": line,
                    "title": match.group(2).strip()[:200],
                    "maxPoints": float(match.group(3).replace(",", ".")),
                    "body": [], "images": []
                }
                result.append(current)
                continue
            if current and line and not re.fullmatch(r"[_\s.]+", line):
                current["body"].append(line)
        elif el.tag.endswith("}tbl") and current:
            table = Table(el, doc)
            rows = [" | ".join(cell.text.strip().replace("\n", " / ") for cell in row.cells)
                    for row in table.rows]
            if rows:
                current["body"].append("\n".join(rows))
        if current:
            for node in el.iter():
                if node.tag.endswith("}blip"):
                    rid = node.attrib.get(REL)
                    if rid and rid in doc.part.related_parts:
                        current["images"].append(doc.part.related_parts[rid].blob)
    return result


def normalized_heading(s):
    return re.sub(r"\W+", "", s.casefold().replace("–", "-"))


def split_headings_without_printed_total(tasks):
    # Four source headings omit (K/n), so the regular task parser initially folds
    # them into the preceding task. Keep the existing slugs stable and add these
    # as separately addressable tasks using the point totals in their rubrics.
    extras = [
        ("ujkor-global-029", "30. In der Aufgabe geht es um den Stadtstaat von Athen im Altertum.", 4, "ujkor-global-extra-030", 0),
        ("ujkor-global-057", "29. In der Aufgabe geht es um die westeuropäische Gesellschaft im Mittelalter.", 3, "ujkor-global-extra-029", 0),
        ("ujkor-global-161", "22. Die Aufgabe bezieht sich auf die Merkmale der globalisierten Welt.", 2, "ujkor-global-extra-022", 0),
        ("ujkor-hungarian-056", "29. In der Aufgabe geht es um die Dreiteilung von Ungarn.", 4, "ujkor-hungarian-extra-029", 1),
    ]
    by_slug = {task["slug"]: task for task in tasks}
    added = []
    for slug, heading, points, extra_slug, image_start in extras:
        parent = by_slug[slug]
        marker = "\n\n" + heading + "\n\n"
        if parent["body"].count(marker) != 1 or parent["answerKey"].count(marker) != 1:
            raise ValueError(f"Expected one unnumbered-total heading in task and key: {heading}")
        parent["body"], body = parent["body"].split(marker, 1)
        parent["answerKey"], answer_key = parent["answerKey"].split(marker, 1)
        images = parent["images"][image_start:]
        parent["images"] = parent["images"][:image_start]
        added.append({
            "slug": extra_slug, "scope": parent["scope"],
            "collectionPosition": parent["collectionPosition"] + 0.5,
            "title": re.sub(r"^\d+\.\s*", "", heading), "heading": heading,
            "maxPoints": points, "body": body, "images": images,
            "answerKey": answer_key, "answerHeading": heading,
        })

    # The second Kádár task has a printed K/5 in the task book, but its answer
    # heading lacks that suffix and was folded into the previous key.
    prior = by_slug["ujkor-hungarian-116"]
    current = by_slug["ujkor-hungarian-117"]
    heading = "2. Die Aufgabe bezieht sich auf die Kádár-Ära."
    marker = "\n\n" + heading + "\n\n"
    if prior["answerKey"].count(marker) != 1:
        raise ValueError("Could not split the second Kádár answer key.")
    prior["answerKey"], current["answerKey"] = prior["answerKey"].split(marker, 1)
    current["answerHeading"] = heading
    return tasks + added


def main():
    ASSETS.mkdir(parents=True, exist_ok=True)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    all_tasks = []
    stats = []
    for prefix, scope in [("01", "global"), ("02", "hungarian")]:
        files = list(INPUT.glob(f"{prefix}_*.docx"))
        source = next(p for p in files if "megoldasok" not in p.name)
        answers = next(p for p in files if "megoldasok" in p.name)
        tasks = blocks(source)
        keys = blocks(answers)
        matched = 0
        for i, task in enumerate(tasks, 1):
            from difflib import SequenceMatcher
            nearby = [(j, k) for j, k in enumerate(keys) if abs(j - (i - 1)) <= 4]
            ranked = sorted(nearby, key=lambda pair: (
                SequenceMatcher(None, normalized_heading(task["heading"]), normalized_heading(pair[1]["heading"])).ratio()
                - abs(pair[0] - (i - 1)) * .015
            ), reverse=True)
            key = ranked[0][1] if ranked and SequenceMatcher(None, normalized_heading(task["heading"]), normalized_heading(ranked[0][1]["heading"])).ratio() > .7 else None
            if key is None:
                nearby = [k for j, k in enumerate(keys) if abs(j - (i - 1)) <= 3
                          and k["number"] == task["number"] and k["maxPoints"] == task["maxPoints"]]
                if len(nearby) == 1:
                    key = nearby[0]
            if key: matched += 1
            slug = f"ujkor-{scope}-{i:03d}"
            image_paths = []
            for j, image in enumerate(task.pop("images"), 1):
                # WebP keeps the original figures legible without shipping large DOCX media.
                raster = image.startswith(b"\x89PNG") or image.startswith(b"\xff\xd8")
                kind = "webp"
                path = ASSETS / f"{slug}-{j:02d}.{kind}"
                if raster:
                    picture = Image.open(BytesIO(image)).convert("RGB")
                    if picture.width > 1600:
                        picture.thumbnail((1600, 1600 * picture.height // picture.width))
                    picture.save(path, "WEBP", quality=82, method=6)
                else:
                    with tempfile.TemporaryDirectory() as tmp:
                        emf = Path(tmp) / f"{slug}-{j:02d}.emf"
                        emf.write_bytes(image)
                        subprocess.run([SOFFICE, "--headless", "--convert-to", "png", "--outdir", tmp, str(emf)], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                        picture = Image.open(emf.with_suffix(".png")).convert("RGB")
                        picture.save(path, "WEBP", quality=82, method=6)
                image_paths.append(f"/ujkor/{path.name}")
            all_tasks.append({
                "slug": slug, "scope": scope, "collectionPosition": i,
                "title": task["title"], "heading": task["heading"],
                "maxPoints": task["maxPoints"],
                "body": "\n\n".join(task["body"]),
                "images": image_paths,
                "answerKey": "\n\n".join(key["body"]) if key else None,
                "answerHeading": key["heading"] if key else None
            })
        stats.append((scope, len(tasks), matched, len(keys)))
    all_tasks = split_headings_without_printed_total(all_tasks)
    OUTPUT.write_text(json.dumps(all_tasks, ensure_ascii=False, indent=2))
    print(f"Wrote {len(all_tasks)} tasks to {OUTPUT}; source/answer counts: {stats}")
    print(f"Missing answer keys: {[t['slug'] for t in all_tasks if not t['answerKey']]}")


if __name__ == "__main__":
    main()
