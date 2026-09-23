"""Render the original Újkor.hu task-book pages used by each imported task.

The DOCX content is source data. Answer-key books are deliberately excluded.
"""

import json
import shutil
import subprocess
import tempfile
import unicodedata
from pathlib import Path

import pdfplumber
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
TASKS = ROOT / "data" / "ujkor-tasks.json"
INPUT = ROOT / "ujkor.hu-feladatok"
OUTPUT = ROOT / "static" / "ujkor-pages"
MANIFEST = ROOT / "scripts" / "ujkor-page-map.json"


def normalize(value: str) -> str:
    value = unicodedata.normalize("NFKD", value.casefold())
    return "".join(char for char in value if char.isalnum())


def source_book(prefix: str) -> Path:
    matches = [path for path in INPUT.glob(f"{prefix}_*.docx") if "megoldasok" not in path.name]
    if len(matches) != 1:
        raise ValueError(f"Expected one task book for {prefix}, found {len(matches)}")
    return matches[0]


def render_book(scope: str, prefix: str, tasks: list[dict], temp: Path) -> dict:
    pdf = temp / f"{scope}.pdf"
    subprocess.run([
        shutil.which("soffice") or "soffice", "-env:UserInstallation=file:///tmp/abipro-ujkor-pages-soffice",
        "--headless", "--convert-to", "pdf", "--outdir", str(temp), str(source_book(prefix))
    ], check=True, capture_output=True)
    converted = temp / source_book(prefix).with_suffix(".pdf").name
    converted.rename(pdf)

    with pdfplumber.open(pdf) as book:
        text = [normalize(page.extract_text() or "") for page in book.pages]
    ordered = sorted((task for task in tasks if task["scope"] == scope), key=lambda task: task["collectionPosition"])
    matches = []
    cursor = (0, 0)
    for task in ordered:
        heading = normalize(task["heading"])
        match = None
        for page in range(cursor[0], len(text)):
            offset = text[page].find(heading, cursor[1] if page == cursor[0] else 0)
            if offset >= 0:
                match = (page, offset)
                break
        if match is None:
            raise ValueError(f"Could not locate original page for {task['slug']}: {task['heading']}")
        matches.append((task["slug"], *match))
        cursor = (match[0], match[1] + len(heading))

    task_pages = {}
    for index, (slug, first, _) in enumerate(matches):
        if index + 1 == len(matches):
            last = len(text) - 1
        else:
            next_page, next_offset = matches[index + 1][1:]
            # A new heading below the page header means the preceding task
            # continues on that page. The normal page header is ~70 chars.
            last = next_page if next_page == first or next_offset > 120 else next_page - 1
        if last < first:
            raise ValueError(f"Invalid page interval for {slug}")
        task_pages[slug] = list(range(first + 1, last + 2))

    used_pages = sorted({page for pages in task_pages.values() for page in pages})
    raster_prefix = temp / scope
    subprocess.run([
        shutil.which("pdftoppm") or "pdftoppm", "-f", str(used_pages[0]), "-l", str(used_pages[-1]),
        "-scale-to-x", "1500", "-scale-to-y", "-1", "-jpeg", "-jpegopt", "quality=88",
        str(pdf), str(raster_prefix)
    ], check=True, capture_output=True)

    dimensions = {}
    for page in used_pages:
        raster = temp / f"{scope}-{page:03d}.jpg"
        if not raster.exists():
            raise FileNotFoundError(raster)
        with Image.open(raster) as image:
            target = OUTPUT / f"{scope}-{page:03d}.webp"
            image.save(target, "WEBP", quality=82, method=6)
            dimensions[page] = (image.width, image.height)
        raster.unlink()
    print(f"{scope}: {len(ordered)} tasks mapped to {len(used_pages)} original pages")
    return {
        slug: [
            {"url": f"/ujkor-pages/{scope}-{page:03d}.webp", "width": dimensions[page][0],
             "height": dimensions[page][1], "page": page}
            for page in pages
        ]
        for slug, pages in task_pages.items()
    }


def main():
    tasks = json.loads(TASKS.read_text())
    OUTPUT.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="abipro-ujkor-pages-") as directory:
        temp = Path(directory)
        manifest = {}
        manifest.update(render_book("global", "01", tasks, temp))
        manifest.update(render_book("hungarian", "02", tasks, temp))
    if len(manifest) != len(tasks) or set(manifest) != {task["slug"] for task in tasks}:
        raise ValueError("Page manifest does not cover every Újkor.hu task")
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    print(f"Wrote {MANIFEST} with {len(manifest)} tasks")


if __name__ == "__main__":
    main()
