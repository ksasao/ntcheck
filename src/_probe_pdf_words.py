import pathlib
import pdfplumber

p = next(pathlib.Path('.').glob('*.pdf'))
page = pdfplumber.open(str(p)).pages[0]
words = page.extract_words(use_text_flow=False, keep_blank_chars=False)
keys = ('2015/05', '2015/06', '2015/07', '2018/11', '2021/11')
hits = [w for w in words if any(k in str(w.get('text', '')) for k in keys)]
print('hits', len(hits))
for w in sorted(hits, key=lambda x: (x['top'], x['x0'])):
    print(f"{w['text']} | x0={w['x0']:.2f} top={w['top']:.2f} x1={w['x1']:.2f}")
