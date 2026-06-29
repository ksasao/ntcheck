from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image
import pypdfium2 as pdfium


MAX_HEIGHT = 4096


def render_pdf_to_png(pdf_path: Path, output_path: Path, max_height: int = MAX_HEIGHT) -> Path:
    document = pdfium.PdfDocument(str(pdf_path))
    if len(document) == 0:
        raise ValueError("PDFにページがありません。")

    page = document[0]
    page_width, page_height = page.get_size()
    scale = max_height / page_height
    target_width = max(1, round(page_width * scale))
    target_height = max(1, round(page_height * scale))

    bitmap = page.render(scale=scale).to_pil()
    if bitmap.mode != "RGB":
        bitmap = bitmap.convert("RGB")

    if bitmap.size != (target_width, target_height):
        bitmap = bitmap.resize((target_width, target_height), Image.Resampling.LANCZOS)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    bitmap.save(output_path, format="PNG", optimize=True)
    return output_path


def main() -> None:
    parser = argparse.ArgumentParser(
        description="PDFの先頭ページをX投稿向けの最大高さPNGに変換します。"
    )
    parser.add_argument("pdf", nargs="?", help="入力PDFファイル")
    parser.add_argument("-o", "--output", help="出力PNGファイル")
    parser.add_argument("--max-height", type=int, default=MAX_HEIGHT, help="PNGの最大高さ")
    args = parser.parse_args()

    pdf_path = Path(args.pdf) if args.pdf else next(Path.cwd().glob("*.pdf"), None)
    if pdf_path is None:
        raise SystemExit("PDFファイルが見つかりません。")
    if not pdf_path.exists():
        raise SystemExit(f"PDFが見つかりません: {pdf_path}")

    output_path = Path(args.output) if args.output else pdf_path.with_suffix(".png")
    result = render_pdf_to_png(pdf_path, output_path, args.max_height)
    print(result)


if __name__ == "__main__":
    main()