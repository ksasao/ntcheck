from __future__ import annotations

import json
import re
from pathlib import Path

import pdfplumber


ROOT = Path(__file__).resolve().parent
PDF_PATH = next(ROOT.glob("*.pdf"))
OUT_PATH = ROOT / "events.json"
PDF_WIDTH = 595.5
PDF_HEIGHT = 842.25
CHECK_GAP_X = 8.4

MANUAL_NAME_BY_REGION_DATE = {
    ("海外", "2015/06/19,20,21"): "NT深圳",
}

MANUAL_CHECK_POS_BY_REGION_DATE = {
    ("未分類", "2021/11/06,07"): (200.67, 128.75),
    ("海外", "2018/11/02,03,04"): (22.66, 579.89),
}

REGION_MARKERS = [
    ("北陸", "地域別NTイベント北陸"),
    ("東海", "地域別NTイベント東海"),
    ("関東", "地域別NTイベント関東"),
    ("関西", "地域別NTイベント関西"),
    ("北海道", "地域別NTイベント北海道"),
    ("東北", "地域別NTイベント東北"),
    ("九州", "地域別NTイベント九州"),
    ("中国", "地域別NTイベント中国"),
    ("海外", "地域別NTイベント海外"),
    ("その他", "地域別NTイベントその他"),
]

REGION_NAMES = {region for region, _ in REGION_MARKERS}

DATE_RE = re.compile(r"\d{4}/\d{2}/\d{2}(?:,\d{2}/\d{2}|[.,]\d{2})*")
ROW_TOLERANCE = 4.0


def median(values: list[float]) -> float:
    ordered = sorted(values)
    n = len(ordered)
    mid = n // 2
    if n % 2:
        return ordered[mid]
    return (ordered[mid - 1] + ordered[mid]) / 2


def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text.replace("\u3000", " ").replace("\xa0", " ")).strip()


def detect_region(line: str) -> str | None:
    compact = line.replace(" ", "")
    for region, marker in REGION_MARKERS:
        if marker in compact:
            return region
    if ("地域別" in compact or "NTイベント" in compact) and len(compact) <= 40:
        for region in REGION_NAMES:
            if region in compact:
                return region
    if len(compact) <= 6:
        for region in REGION_NAMES:
            if compact == region:
                return region
    return None


def cluster_rows(words: list[dict[str, object]]) -> list[list[dict[str, object]]]:
    rows: list[list[dict[str, object]]] = []
    current: list[dict[str, object]] = []
    anchor_top: float | None = None

    for word in sorted(words, key=lambda item: (float(item["top"]), float(item["x0"]))):
        if not current:
            current.append(word)
            anchor_top = float(word["top"])
            continue

        assert anchor_top is not None
        if abs(float(word["top"]) - anchor_top) <= ROW_TOLERANCE:
            current.append(word)
        else:
            rows.append(current)
            current = [word]
            anchor_top = float(word["top"])

    if current:
        rows.append(current)

    return rows


def row_text(words: list[dict[str, object]]) -> str:
    return normalize(" ".join(str(word["text"]) for word in words))


def lane_key(words: list[dict[str, object]]) -> int:
    min_x0 = min(float(word["x0"]) for word in words)
    return lane_key_from_x(min_x0)


def lane_key_from_x(x0: float) -> int:
    if x0 < 130:
        return 0
    if x0 < 360:
        return 1
    return 2


def parse_event_chunk(words: list[dict[str, object]], current_region: str) -> dict[str, str] | None:
    text = normalize(" ".join(str(word["text"]) for word in words))
    match = DATE_RE.search(text)
    if not match:
        return None

    date_text = match.group(0).replace(".", ",")
    name = normalize(text[match.end():])
    name = re.sub(r"^[□■･・:：\-\s]+", "", name)
    name = re.sub(r"(?:\s*[□■･・]+)+$", "", name)
    name = re.sub(r"(?:\s*(?:見学|出展|地域別|NTイベント|開催地一覧))+$", "", name)

    if not name or name in {"見学", "出展", "見学 出展"}:
        return None
    if name.startswith("地域別NTイベント") or name.startswith("開催地一覧"):
        return None
    if name == "NTイベント":
        return None
    if re.fullmatch(r"\d{4}", name):
        return None

    tokens = [token.strip() for token in date_text.split(",") if token.strip()]
    base = parse_token(tokens[0], (2026, 1, 1))
    if not base:
        return None

    end = base
    fallback = base
    for token in tokens[1:]:
        parsed = parse_token(token, fallback)
        if parsed:
            end = parsed
            fallback = parsed

    return {
        "name": name,
        "region": current_region,
        "dateText": date_text,
        "dateStart": to_iso(base),
        "dateEnd": to_iso(end),
    }


def get_checkbox_anchor(segment: list[dict[str, object]], date_start_index: int) -> tuple[float, float] | None:
    candidates: list[dict[str, object]] = []
    if date_start_index > 0:
        candidates.append(segment[date_start_index - 1])
    candidates.append(segment[date_start_index])

    for word in candidates:
        text = str(word["text"])
        if "□" in text:
            return float(word["x0"]), float(word["top"])
    return None


def has_name_after_date(words: list[dict[str, object]]) -> bool:
    text = normalize(" ".join(str(word["text"]) for word in words))
    match = DATE_RE.search(text)
    if not match:
        return False
    tail = normalize(text[match.end():])
    return bool(tail)


def extract_events_from_page(page) -> list[dict[str, str]]:
    words = page.extract_words(use_text_flow=False, keep_blank_chars=False)
    rows = cluster_rows(words)

    events: list[dict[str, str]] = []
    region_by_lane: dict[int, str] = {}
    lane_anchor_x_offsets: dict[int, list[float]] = {}
    lane_anchor_y_offsets: dict[int, list[float]] = {}

    for words_in_row in rows:
        lane_words: dict[int, list[dict[str, object]]] = {}
        for word in words_in_row:
            lane = lane_key_from_x(float(word["x0"]))
            lane_words.setdefault(lane, []).append(word)

        for lane in sorted(lane_words):
            segment = sorted(lane_words[lane], key=lambda item: float(item["x0"]))
            text = row_text(segment)
            if not DATE_RE.search(text):
                detected_region = detect_region(text)
                if detected_region:
                    region_by_lane[lane] = detected_region
                continue

            segment_region = region_by_lane.get(lane, "未分類")
            date_indexes = [index for index, word in enumerate(segment) if DATE_RE.search(str(word["text"]))]
            for position, start_index in enumerate(date_indexes):
                end_index = date_indexes[position + 1] if position + 1 < len(date_indexes) else len(segment)
                chunk = segment[start_index:end_index]

                # Some rows split date and name across adjacent lanes (e.g. 九州2016).
                if not has_name_after_date(chunk) and lane + 1 in lane_words:
                    right_words = sorted(lane_words[lane + 1], key=lambda item: float(item["x0"]))
                    last_x1 = float(chunk[-1]["x1"])
                    bridged = [
                        word
                        for word in right_words
                        if (float(word["x0"]) - last_x1) <= 70 and not DATE_RE.search(str(word["text"]))
                    ]
                    if bridged:
                        chunk = chunk + bridged

                event = parse_event_chunk(chunk, segment_region)
                if event:
                    anchor = get_checkbox_anchor(segment, start_index)
                    date_word = segment[start_index]
                    date_x0 = float(date_word["x0"])
                    date_top = float(date_word["top"])

                    if anchor:
                        lane_anchor_x_offsets.setdefault(lane, []).append(date_x0 - float(anchor[0]))
                        lane_anchor_y_offsets.setdefault(lane, []).append(float(anchor[1]) - date_top)
                    elif lane in lane_anchor_x_offsets and lane_anchor_x_offsets[lane]:
                        # Backfill checkbox position when the square glyph is missing in OCR text.
                        estimated_x_offset = median(lane_anchor_x_offsets[lane])
                        estimated_y_offset = median(lane_anchor_y_offsets.get(lane, [0.0]))
                        anchor = (date_x0 - estimated_x_offset, date_top + estimated_y_offset)

                    if anchor:
                        event["checkVisit"] = {"x": round(anchor[0], 2), "y": round(anchor[1], 2)}
                        event["checkExhibit"] = {"x": round(anchor[0] + CHECK_GAP_X, 2), "y": round(anchor[1], 2)}
                    apply_manual_check_position(event)
                    events.append(event)
                else:
                    # OCRで名前が欠落する既知ケースの補完。
                    date_text_match = DATE_RE.search(row_text(chunk))
                    if not date_text_match:
                        continue

                    date_text = date_text_match.group(0).replace(".", ",")
                    manual_name = MANUAL_NAME_BY_REGION_DATE.get((segment_region, date_text))
                    if not manual_name:
                        continue

                    fallback_event = build_event_from_date_text(manual_name, segment_region, date_text)
                    if not fallback_event:
                        continue

                    anchor = get_checkbox_anchor(segment, start_index)
                    date_word = segment[start_index]
                    date_x0 = float(date_word["x0"])
                    date_top = float(date_word["top"])

                    if anchor:
                        lane_anchor_x_offsets.setdefault(lane, []).append(date_x0 - float(anchor[0]))
                        lane_anchor_y_offsets.setdefault(lane, []).append(float(anchor[1]) - date_top)
                    elif lane in lane_anchor_x_offsets and lane_anchor_x_offsets[lane]:
                        estimated_x_offset = median(lane_anchor_x_offsets[lane])
                        estimated_y_offset = median(lane_anchor_y_offsets.get(lane, [0.0]))
                        anchor = (date_x0 - estimated_x_offset, date_top + estimated_y_offset)

                    if anchor:
                        fallback_event["checkVisit"] = {"x": round(anchor[0], 2), "y": round(anchor[1], 2)}
                        fallback_event["checkExhibit"] = {"x": round(anchor[0] + CHECK_GAP_X, 2), "y": round(anchor[1], 2)}
                    apply_manual_check_position(fallback_event)
                    events.append(fallback_event)

    return events


def parse_token(token: str, fallback: tuple[int, int, int]) -> tuple[int, int, int] | None:
    if re.fullmatch(r"\d{4}/\d{2}/\d{2}", token):
        year, month, day = map(int, token.split("/"))
        return year, month, day
    if re.fullmatch(r"\d{2}/\d{2}", token):
        month, day = map(int, token.split("/"))
        return fallback[0], month, day
    if re.fullmatch(r"\d{2}", token):
        return fallback[0], fallback[1], int(token)
    return None


def to_iso(date_value: tuple[int, int, int]) -> str:
    return f"{date_value[0]:04d}-{date_value[1]:02d}-{date_value[2]:02d}"


def build_event_from_date_text(name: str, region: str, date_text: str) -> dict[str, str] | None:
    tokens = [token.strip() for token in date_text.split(",") if token.strip()]
    if not tokens:
        return None

    base = parse_token(tokens[0], (2026, 1, 1))
    if not base:
        return None

    end = base
    fallback = base
    for token in tokens[1:]:
        parsed = parse_token(token, fallback)
        if parsed:
            end = parsed
            fallback = parsed

    return {
        "name": name,
        "region": region,
        "dateText": date_text,
        "dateStart": to_iso(base),
        "dateEnd": to_iso(end),
    }


def apply_manual_check_position(event: dict[str, str]) -> None:
    manual = MANUAL_CHECK_POS_BY_REGION_DATE.get((event["region"], event["dateText"]))
    if not manual:
        return

    x, y = manual
    event["checkVisit"] = {"x": round(x, 2), "y": round(y, 2)}
    event["checkExhibit"] = {"x": round(x + CHECK_GAP_X, 2), "y": round(y, 2)}


def main() -> None:
    with pdfplumber.open(str(PDF_PATH)) as pdf:
        events = extract_events_from_page(pdf.pages[0])

    unique: list[dict[str, str]] = []
    seen: set[tuple[str, str, str, str]] = set()
    for event in events:
        key = (event["name"], event["region"], event["dateStart"], event["dateEnd"])
        if key in seen:
            continue
        seen.add(key)
        unique.append(event)

    payload = {
        "meta": {
            "pdf": PDF_PATH.name,
            "pdfWidth": PDF_WIDTH,
            "pdfHeight": PDF_HEIGHT,
            "backgroundImage": PDF_PATH.with_suffix(".png").name,
        },
        "events": unique,
    }

    OUT_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"wrote {OUT_PATH} ({len(unique)} events)")


if __name__ == "__main__":
    main()