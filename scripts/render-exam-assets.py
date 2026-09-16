"""Render every page of one official exam; deliberately contains no task parsing."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import pdfplumber


def render(pdf_path: Path, destination: Path, prefix: str, resolution: int) -> list[dict[str, object]]:
    destination.mkdir(parents=True, exist_ok=True)
    pages: list[dict[str, object]] = []
    with pdfplumber.open(pdf_path) as pdf:
        for index, page in enumerate(pdf.pages, start=1):
            filename = f"{prefix}-{index:03d}.webp"
            target = destination / filename
            if not target.exists() or target.stat().st_size == 0:
                page.to_image(resolution=resolution, antialias=True).original.convert("RGB").save(
                    target, "WEBP", quality=90, method=6
                )
            pages.append({"id": f"{prefix}-{index:03d}", "file": f"pages/{filename}", "page": index})
    return pages


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--exam", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--resolution", type=int, default=180)
    args = parser.parse_args()
    exam_pdf = args.exam / "feladatsor.pdf"
    solution_pdf = args.exam / "megoldas.pdf"
    if not exam_pdf.is_file() or not solution_pdf.is_file():
        raise SystemExit("Both feladatsor.pdf and megoldas.pdf are required.")
    payload = {
        "examPages": render(exam_pdf, args.output / "pages", "exam", args.resolution),
        "solutionPages": render(solution_pdf, args.output / "pages", "solution", args.resolution),
    }
    (args.output / "pages.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
