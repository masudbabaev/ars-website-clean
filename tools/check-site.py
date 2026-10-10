from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote
from collections import Counter
import json,re
root=Path(__file__).resolve().parents[1]
void={'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}
class Page(HTMLParser):
 def __init__(self):super().__init__();self.ids=[];self.refs=[];self.stack=[];self.errors=[];self.scripts=[];self.keys=[]
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if 'id' in a:self.ids.append(a['id'])
  for k in ('src','href'):
   if a.get(k):self.refs.append(a[k])
  if tag=='script' and a.get('src'):self.scripts.append(a['src'])
  for k in ('data-i18n','data-i18n-html','data-i18n-aria-label'):
   if k in a:self.keys.append(a[k])
  if tag not in void:self.stack.append(tag)
 def handle_startendtag(self,tag,attrs):
  self.handle_starttag(tag,attrs)
  if tag not in void:self.handle_endtag(tag)
 def handle_endtag(self,tag):
  if not self.stack:self.errors.append('unmatched '+tag);return
  if self.stack[-1]!=tag:self.errors.append('closing '+tag+' while '+self.stack[-1]+' is open')
  if tag in self.stack:
   while self.stack and self.stack.pop()!=tag:pass
pages={}
for path in root.rglob('*.html'):
 if 'templates' in path.parts:continue
 p=Page();p.feed(path.read_text());pages[path]=p
errors=[]
for path,p in pages.items():
 if path.name!='departments.html':
  errors.extend(f'{path.relative_to(root)}: {s}' for s in p.errors)
  if p.stack:errors.append(f'{path.name}: unclosed {p.stack}')
 errors.extend(f'{path.name}: duplicate id {id}' for id,n in Counter(p.ids).items() if n>1)
 for ref in p.refs:
  u=urlsplit(ref)
  if u.scheme or u.netloc:continue
  dest=(root/u.path.lstrip('/')) if u.path.startswith('/') else ((path.parent/u.path) if u.path else path)
  dest=dest.resolve()
  if dest.is_dir():dest=dest/'index.html'
  if not dest.exists():errors.append(f'{path.relative_to(root)}: missing {ref}')
  elif u.fragment and dest in pages and unquote(u.fragment) not in pages[dest].ids:errors.append(f'{path.relative_to(root)}: missing anchor {ref}')
 if path.name!='departments.html' and 'route-redirect.js' not in ' '.join(p.scripts):
  assert any('script.js?v=39' in s for s in p.scripts),(path,'no common script')
print('\n'.join(errors));print('Pages:',len(pages),'Errors:',len(errors))
if errors:raise SystemExit(1)
# Conservative CSS block balance and undefined tokens.
css=(root/'styles.css').read_text()+(root/'projects.css').read_text()
assert css.count('{')==css.count('}'),'CSS braces'
defined=set(re.findall(r'(--[\w-]+)\s*:',css));used=set(re.findall(r'var\((--[\w-]+)',css))
used-= {'--node-color','--node-x','--node-y','--dot-position','--reveal-delay'}
assert not used-defined,('Undefined CSS variables',used-defined)
print('Links, fragments, HTML nesting, ids, scripts and CSS token references passed.')
