from __future__ import annotations

import argparse
import concurrent.futures
import json
import re
import unicodedata
from dataclasses import dataclass
from pathlib import Path

import pdfplumber


TASK_HEADING = re.compile(r"(?m)^\s*(1[0-2]|[1-9])\.\s*([^\n]+)")
POINTS = re.compile(r"(\d+(?:[,.]\d+)?)\s+(?:Punkt|pont)", re.IGNORECASE)
TOTAL_POINTS = re.compile(r"insgesamt\s*:?[ ]*(\d+(?:[,.]\d+)?)\s+(?:Punkt|pont)", re.IGNORECASE)
ESSAYS = re.compile(r"(?im)^\s*II\.\s+(?:ESSAYS|AUFS[ÄA]TZE)")


@dataclass(frozen=True)
class Marker:
    number: int
    page_index: int
    top: float
    title: str


def clean(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    ascii_value = normalized.encode("ascii", "ignore").decode("ascii").lower()
    return re.sub(r"(^-|-$)", "", re.sub(r"[^a-z0-9]+", "-", ascii_value))


def sequential_markers(pdf: pdfplumber.PDF) -> list[Marker]:
    markers: list[Marker] = []
    wanted = 1
    start_page = next(
        (index for index, page in enumerate(pdf.pages)
         if re.search(r"I\.\s*.?UFGABEN.*KURZ", page.extract_text() or "", re.IGNORECASE | re.DOTALL)),
        0,
    )
    for page_index, page in enumerate(pdf.pages[start_page:], start=start_page):
        words = page.extract_words(use_text_flow=True, keep_blank_chars=False)
        for word_index, word in enumerate(words):
            if wanted > 12:
                return markers
            marker_text = word["text"] in {f"{wanted}.", str(wanted)}
            if not marker_text or word["x0"] > 115 or word["top"] < 55:
                continue
            tail = [candidate["text"] for candidate in words[word_index + 1 : word_index + 16]]
            title = clean(" ".join(tail))
            if not title or len(title) < 3 or not re.search(r"\bAufgabe(?:n)?\b", title, re.IGNORECASE):
                continue
            markers.append(Marker(wanted, page_index, float(word["top"]), title))
            wanted += 1
    return markers


def text_blocks(pdf: pdfplumber.PDF) -> dict[int, tuple[str, str, float]]:
    text = "\n".join(page.extract_text() or "" for page in pdf.pages)
    essay = ESSAYS.search(text)
    if essay:
        text = text[:essay.start()]
    matches = list(TASK_HEADING.finditer(text))
    selected = []
    cursor = 0
    for number in range(1, 13):
        match = next((item for item in matches
                      if int(item.group(1)) == number
                      and item.start() >= cursor
                      and POINTS.search(text[item.start():item.start() + 320])), None)
        if match is None:
            raise ValueError(f"answer heading {number} not found")
        selected.append(match)
        cursor = match.end()
    result: dict[int, tuple[str, str, float]] = {}
    for index, match in enumerate(selected):
        end = selected[index + 1].start() if index + 1 < len(selected) else len(text)
        block = clean(text[match.start():end])
        points = TOTAL_POINTS.search(block)
        if points:
            maximum_text = points.group(1)
        else:
            heading_points = POINTS.findall(text[match.start():match.end() + 80])
            maximum_text = heading_points[0] if heading_points else ""
        if not maximum_text:
            raise ValueError(f"point total missing for answer {index + 1}: {block[:160]}")
        title = clean(match.group(2).split("(")[0])
        result[index + 1] = (title, block, float(maximum_text.replace(",", ".")))
    return result


def curriculum(year: int) -> tuple[str, str]:
    if year >= 2024:
        return "NAT_2020", "NAT 2020"
    if year >= 2017:
        return "NAT_2012", "NAT 2012"
    return "NAT_2007", "NAT 2007"


def prepare_exam(folder: Path, output_root: Path, render: bool, force: bool = False) -> dict:
    year_text, session_text = folder.name.split("_", 1)
    year = int(year_text)
    session = "spring" if session_text == "tavasz" else "autumn"
    label = "Frühjahr" if session == "spring" else "Herbst"
    exam_pdf = pdfplumber.open(folder / "feladatsor.pdf")
    answer_pdf = pdfplumber.open(folder / "megoldas.pdf")
    try:
        markers = sequential_markers(exam_pdf)
        if len(markers) != 12:
            raise ValueError(f"found {len(markers)} task headings instead of 12")
        answers = text_blocks(answer_pdf)
        out_dir = output_root / folder.name
        if render:
            out_dir.mkdir(parents=True, exist_ok=True)
        tasks = []
        for index, marker in enumerate(markers):
            next_marker = markers[index + 1] if index + 1 < len(markers) else None
            last_page = next_marker.page_index if next_marker else marker.page_index
            image_paths = []
            for page_index in range(marker.page_index, last_page + 1):
                page = exam_pdf.pages[page_index]
                top = marker.top - 8 if page_index == marker.page_index else 55
                bottom = next_marker.top - 8 if next_marker and page_index == next_marker.page_index else page.height - 45
                if bottom <= top + 20:
                    continue
                relative = Path(folder.name) / f"task-{marker.number:02d}-part-{len(image_paths) + 1}.webp"
                image_paths.append(relative.as_posix())
                if render:
                    target_file = output_root / relative
                    if force or not (target_file.exists() and target_file.stat().st_size > 0):
                        cropped = page.crop((24, max(0, top), page.width - 24, min(page.height, bottom)))
                        image = cropped.to_image(resolution=150, antialias=True).original.convert("RGB")
                        image.save(target_file, "WEBP", quality=86, method=6)
            answer_title, rubric, maximum = answers[marker.number]
            title = answer_title or marker.title
            code, code_name = curriculum(year)
            tasks.append({
                "number": marker.number,
                "slug": f"official-{year}-{session}-{marker.number:02d}-{slugify(title)[:70]}",
                "title": f"{year} {label} · {marker.number}. {title}",
                "maximumPoints": maximum,
                "curriculumCode": code,
                "curriculumName": code_name,
                "imagePaths": image_paths,
                "rubric": rubric,
            })
        if render:
            expected_names = {Path(p).name for task in tasks for p in task["imagePaths"]}
            for extra in out_dir.glob("*.webp"):
                if extra.name not in expected_names:
                    extra.unlink()
        return {"year": year, "session": session, "sourceFolder": folder.name, "tasks": tasks}
    finally:
        exam_pdf.close()
        answer_pdf.close()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, default=Path("erettsegik_2006_2026"))
    parser.add_argument("--output", type=Path, default=Path("tmp/real-exam-import"))
    parser.add_argument("--render", action="store_true")
    parser.add_argument("--force", action="store_true", help="Force re-rendering even if images exist")
    args = parser.parse_args()

    folders = sorted(path for path in args.source.iterdir() if path.is_dir())
    exams = []
    failures = []

    for folder in folders:
        try:
            exam_data = prepare_exam(folder, args.output / "images", args.render, args.force)
            exams.append(exam_data)
            print(f"OK {folder.name}", flush=True)
        except Exception as error:
            failures.append({"folder": folder.name, "error": str(error)})
            print(f"FAIL {folder.name}: {error}", flush=True)

    args.output.mkdir(parents=True, exist_ok=True)
    manifest = {"exams": exams, "failures": failures}
    (args.output / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Prepared {len(exams)} exams and {sum(len(exam['tasks']) for exam in exams)} tasks; failures={len(failures)}", flush=True)
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
