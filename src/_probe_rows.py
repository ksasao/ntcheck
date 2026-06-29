import pathlib
import pdfplumber
from collections import defaultdict

p = next(pathlib.Path('.').glob('*.pdf'))
page = pdfplumber.open(str(p)).pages[0]
words = page.extract_words(use_text_flow=False, keep_blank_chars=False)
# cluster by rounded top to inspect target rows
rows = defaultdict(list)
for w in words:
    rows[round(float(w['top']), 1)].append(w)

target_tops = [128.3, 505.2, 579.9]
for tt in target_tops:
    # pick nearest existing row key
    key = min(rows.keys(), key=lambda k: abs(k - tt))
    print(f"\n--- target={tt} nearest={key} ---")
    for w in sorted(rows[key], key=lambda x: float(x['x0'])):
        print(f"{w['text']} | x0={w['x0']:.2f} x1={w['x1']:.2f} top={w['top']:.2f}")
