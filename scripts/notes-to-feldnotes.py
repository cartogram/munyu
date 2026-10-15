# Rebuild Matt's speaker notes in the feldnotes Obsidian vault from the
# deck's notes, so edits made in index.html show up there too. Each scene
# where Matt speaks gets the slide's text, Simon's lead-in where he hands
# over (folded), and Matt's part, and any unlabelled notes, which are shared.
# The file's header (everything above the first act) is kept, with its
# "Pulled from the deck … on <date>" set to today. Python, not Node: the
# standard library has an HTML parser and the repo has none.
#
#   python3 scripts/notes-to-feldnotes.py [--check] [path/to/Speaker Notes.md]
#
# The path defaults to the vault checked out beside this repo. --check writes
# nothing: it prints how a sync would change the file (leaving the date
# alone, so only the notes show) and exits 1 if it would.
import datetime, difflib, pathlib, re, sys
from html.parser import HTMLParser

ROOT = pathlib.Path(__file__).resolve().parent.parent
TARGET = ROOT.parent / 'feldnotes' / '01 Projects' / 'Your UI is not my UI' / 'Your UI is not my UI - Speaker Notes.md'

VOID = {'br','img','source','meta','link','input','hr','use','path','circle','rect','line','polyline','polygon'}

class Node:
	def __init__(s, tag, attrs, parent):
		s.tag, s.attrs, s.parent, s.kids = tag, dict(attrs), parent, []
	def cls(s): return s.attrs.get('class','').split()
	def find_all(s, pred):
		for k in s.kids:
			if isinstance(k, Node):
				if pred(k): yield k
				yield from k.find_all(pred)

class P(HTMLParser):
	def __init__(s):
		super().__init__(convert_charrefs=True); s.root = Node('root', [], None); s.cur = s.root
	def handle_starttag(s, tag, attrs):
		n = Node(tag, attrs, s.cur); s.cur.kids.append(n)
		if tag not in VOID: s.cur = n
	def handle_startendtag(s, tag, attrs):
		s.cur.kids.append(Node(tag, attrs, s.cur))
	def handle_endtag(s, tag):
		n = s.cur
		while n is not s.root and n.tag != tag: n = n.parent
		if n is not s.root: s.cur = n.parent
	def handle_data(s, d): s.cur.kids.append(d)

def inline(n):
	"""Markdown for a node's inline content."""
	if n.attrs.get('aria-label') and n.tag not in ('ul', 'ol'): return n.attrs['aria-label']
	out = ''
	for k in n.kids:
		if isinstance(k, str): out += k
		elif k.tag in ('svg', 'img', 'video', 'button', 'aside') or k.attrs.get('aria-hidden') == 'true': continue
		elif k.tag == 'br': out += ' '
		elif k.tag in ('em', 'i', 'cite'):
			t = inline(k).strip(); out += f'*{t}*' if t else ''
		elif k.tag in ('strong', 'b'):
			t = inline(k).strip(); out += f'**{t}**' if t else ''
		else: out += inline(k)
	return re.sub(r'\s+', ' ', out).strip()

def text_blocks(n, skip_notes=True):
	"""The slide's visible text as markdown lines."""
	lines = []
	for k in n.kids:
		if not isinstance(k, Node): continue
		if k.tag in ('aside', 'svg', 'img', 'video', 'button', 'figure', 'template', 'script', 'style'): continue
		if 'notes' in k.cls(): continue
		if k.attrs.get('aria-hidden') == 'true': continue
		if k.tag in ('h1', 'h2', 'h3'):
			t = inline(k)
			if t: lines.append(f'**{t}**')
		elif k.tag == 'p':
			t = inline(k)
			if t: lines.append(t)
		elif k.tag in ('ul', 'ol'):
			for li in k.kids:
				if isinstance(li, Node) and li.tag == 'li':
					t = inline(li)
					if t: lines.append(f'- {t}')
		elif k.tag == 'blockquote':
			t = inline(k)
			if t: lines.append(f'> {t}')
		else:
			lines += text_blocks(k)
	return lines

def note_parts(aside):
	"""The notes split into parts by speaker: (speaker, time, [markdown paragraphs])."""
	parts = []
	cur = None
	for k in aside.kids:
		if not isinstance(k, Node): continue
		if 'speaker' in k.cls():
			cur = [k.attrs.get('data-speaker'), k.attrs.get('data-time'), []]; parts.append(cur); continue
		# the drawer's bullets restate the script, which is what the vault keeps
		if 'notes-bullets' in k.cls(): continue
		if cur is None:
			cur = [None, None, []]; parts.append(cur)
		if 'cue' in k.cls(): cur[2].append(f'*[{inline(k)}]*')
		elif k.tag == 'p':
			t = inline(k)
			if t: cur[2].append(t)
		elif k.tag in ('ul', 'ol'):
			cur[2].append('\n'.join(f'- {inline(li)}' for li in k.kids if isinstance(li, Node) and li.tag == 'li'))
		elif k.tag == 'blockquote': cur[2].append(f'> {inline(k)}')
	return [p for p in parts if p[2]]

def callout(kind, title, paras, folded=False):
	head = f'> [!{kind}]{"-" if folded else ""} {title}'
	body = '\n>\n'.join('\n'.join(f'> {l}' if l else '>' for l in p.split('\n')) for p in paras)
	return head + ('\n' + body if body else '')

args = sys.argv[1:]
check = '--check' in args
args = [a for a in args if a != '--check']
target = pathlib.Path(args[0]) if args else TARGET
existing = target.read_text()
header = existing[:existing.index('\n## ')] if '\n## ' in existing else existing
if not check: header = re.sub(r'(Pulled from the deck .*? on )\d{4}-\d{2}-\d{2}', lambda m: m.group(1) + datetime.date.today().isoformat(), header)
src = (ROOT / 'index.html').read_text()
p = P(); p.feed(src)
main = next(p.root.find_all(lambda n: n.tag == 'main'))
acts = [n for n in main.kids if isinstance(n, Node) and 'act-panel' in n.cls()]

# Every frame in order: (act index, act title, frame index, frame title, slide lines, parts).
frames = []
for ai, act in enumerate(acts, 1):
	inner = next(act.find_all(lambda n: 'act-panel-inner' in n.cls()))
	opener = next((n for n in inner.kids if isinstance(n, Node) and 'act-opener' in n.cls()), None)
	act_title = inline(next(opener.find_all(lambda n: 'act-title' in n.cls()))) if opener else act.attrs['data-act'].replace('-', ' ').capitalize()
	si = 0
	for fr in inner.kids:
		if not isinstance(fr, Node): continue
		if fr is opener:
			idx, title = 0, act_title
		elif 'data-scene' in fr.attrs:
			si += 1; idx = si
			h2 = next(fr.find_all(lambda n: n.tag == 'h2'), None)
			title = fr.attrs.get('data-title') or (inline(h2) if h2 else fr.attrs['data-scene'])
		else: continue
		aside = next((n for n in fr.kids if isinstance(n, Node) and 'notes' in n.cls()), None)
		parts = note_parts(aside) if aside else []
		frames.append(dict(ai=ai, act=act_title, si=idx, title=title, slide=text_blocks(fr) if idx else [], parts=parts))

# Matt's parts, unlabelled parts (ours to share), and Simon's lead-in
# where he hands over: his part right before one of Matt's, wherever it sits.
out, last_act, prev = [header.rstrip() + '\n'], None, None
for f in frames:
	mine = [pt for pt in f['parts'] if pt[0] in ('matt', None)]
	if not mine:
		if f['parts']: prev = f['parts'][-1]
		continue
	if f['ai'] != last_act:
		out.append(f'## {f["ai"]} · {f["act"]}\n'); last_act = f['ai']
	time = next((pt[1] for pt in f['parts'] if pt[0] == 'matt' and pt[1]), None)
	out.append(f'### {f["ai"]}.{f["si"]} {f["title"]}' + (f' · {time}' if time else '') + '\n')
	if f['slide']:
		lines = ['> [!abstract] Slide']
		for i, l in enumerate(f['slide']):
			if i and not l.startswith(('- ', '> ')): lines.append('>')
			lines.append(f'> {l}')
		out.append('\n'.join(lines) + '\n')
	for pt in f['parts']:
		if pt[0] == 'simon':
			pass
		elif pt[0] == 'matt' and prev and prev[0] == 'simon':
			out.append(callout('quote', 'Simon' + (f' · {prev[1]}' if prev[1] else ''), prev[2], folded=True) + '\n')
		if pt[0] == 'simon':
			prev = pt; continue
		out.append('\n\n'.join(pt[2]) + '\n')
		prev = pt

result = '\n'.join(out).rstrip() + '\n'
if check:
	diff = list(difflib.unified_diff(existing.splitlines(keepends=True), result.splitlines(keepends=True), 'vault', 'deck'))
	sys.stdout.writelines(diff)
	print(f'{target.name}: ' + ('a sync would change it' if diff else 'in sync with the deck'))
	sys.exit(1 if diff else 0)
if result == existing:
	print(f'{target.name}: already in sync')
else:
	target.write_text(result)
	print(f'{target.name}: updated')
