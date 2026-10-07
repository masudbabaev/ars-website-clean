#!/usr/bin/env python3
"""Build the public Projects system using Python 3 + Node; no dependencies.
Only approved, public records belong in data/projects. Never store private drafts here.
"""
from pathlib import Path
from html import escape
from urllib.parse import urlparse, quote
import json, math, re, subprocess

ROOT=Path(__file__).resolve().parents[1]
PEOPLE=json.loads(subprocess.check_output(['node',str(ROOT/'tools/export-people.cjs')]))
STATUS={
 'proposed': ('Təklif', 'Proposed'), 'recruiting': ('Komanda toplanır', 'Recruiting'),
 'active': ('Davam edir', 'Active'), 'completed': ('Tamamlanıb', 'Completed')}
STAGES=[('İdeya','Idea'),('İnkişaf','Develop'),('Əməkdaşlıq','Collaborate'),('Nəşr','Publish')]
FIELDS={'engineering':('Mühəndislik','Engineering'),'life':('Həyat elmləri','Life sciences'), 'data':('Data və süni intellekt','Data & AI'),'humanities':('Sosial və humanitar elmlər','Social sciences & humanities'),'other':('Digər sahələr','Other fields')}
CAREERS={'student':('Tələbə','Student'),'early':('Erkən karyera','Early career'),'experienced':('Təcrübəli tədqiqatçı','Experienced researcher')}
def esc(s): return escape(str(s),quote=True)
def bi(az,en): return {'az':az,'en':en}
def tr(value,tag='span',attrs=''):
 if isinstance(value,(tuple,list)): value=bi(*value)
 if isinstance(value,str): value=bi(value,value)
 return f'<{tag} data-az="{esc(value["az"])}" data-en="{esc(value["en"])}" {attrs}>{esc(value["az"])}</{tag}>'
def heading(az,en): return tr((az,en),'h2')
def url(value):
 if urlparse(value).scheme!='https' or not urlparse(value).netloc: raise ValueError('External URLs must use HTTPS: '+value)
 return esc(value)
def bilingual(value): return isinstance(value,dict) and all(isinstance(value.get(l),str) and value[l].strip() for l in ('az','en'))
def validate(p):
 assert re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*',p['slug']), 'Invalid slug'
 assert p['status'] in STATUS, 'Invalid status'
 for k in ('title','question','summary','why','method'): assert bilingual(p[k]), f'Bilingual {k} required'
 assert p['approval']=={'description':True,'team':True,'outputs':True}, 'Public permissions required'
 assert p['lead'] in PEOPLE, 'Unknown lead'
 ids=[t['person'] for t in p['team']]
 assert len(ids)==len(set(ids)) and p['lead'] in ids, 'Unique team must include lead'
 for t in p['team']:
  assert t['person'] in PEOPLE and bilingual(t['role']) and bilingual(t['note']), 'Invalid team entry'
 assert p['fields'] and all(f in FIELDS for f in p['fields']), 'Invalid fields'
 assert all(isinstance(i,str) and i.strip() for i in p.get('institutions',[])), 'Invalid institutions'
 assert not p.get('open_roles') or p['status']=='recruiting', 'Open roles require recruiting status'
 roleids=[]
 for role in p.get('open_roles',[]):
  assert re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*',role['id']), 'Invalid role id'
  roleids.append(role['id'])
  assert all(bilingual(role[k]) for k in ('title','commitment','description')), 'Bilingual role required'
  assert role['skills'] and all(bilingual(s) for s in role['skills']), 'Role skills required'
  assert role['career_stages'] and all(c in CAREERS for c in role['career_stages']), 'Role career stages required'
 assert len(roleids)==len(set(roleids)), 'Duplicate role id'
 for key in ('updates','milestones'):
  for item in p.get(key,[]):
   from datetime import date
   date.fromisoformat(item['date']); assert bilingual(item['text']), 'Bilingual dated text required'
 for output in p.get('outputs',[]):
  assert bilingual(output['title']) and output.get('type') in ('paper','preprint','dataset','report'), 'Invalid output'
  assert output.get('doi') or output.get('url'), 'Output needs DOI or URL'
  if output.get('doi'): assert re.fullmatch(r'10\.\d{4,9}/\S+',output['doi']), 'Invalid DOI'
  if output.get('url'): url(output['url'])
 if p['status']=='completed': assert p.get('outputs'), 'Completed projects require outputs'

PROJECTS=[]
for path in sorted((ROOT/'data/projects').glob('*.json')):
 p=json.loads(path.read_text())
 # Never include an unapproved record in public pages or browser data.
 if p.get('public') is not True: continue
 validate(p); PROJECTS.append(p)
assert len({p['slug'] for p in PROJECTS})==len(PROJECTS), 'Duplicate project slugs'
PROJECTS.sort(key=lambda p:(not p.get('featured',False),p['slug']))

def link(p): return '/projects/'+p['slug']+'/'
def personlink(pid): return '/people/'+pid+'/'
def action(p):
 return {'proposed':('Rəy bildir','Give feedback'),'recruiting':('Rola müraciət et','Apply to a role'),'active':('Yeniliklərə bax','Follow updates'),'completed':('Nəticələri oxu','Read results')}[p['status']]
def actionurl(p):
 return {'proposed':'/contact.html?topic=project-feedback&project='+p['slug'], 'recruiting':link(p)+'#open-roles','active':link(p)+'#updates','completed':link(p)+'#outputs'}[p['status']]
def badge(p): return tr(STATUS[p['status']],attrs=f'class="project-status status-{p["status"]}"')
def pathbar(p):
 index=list(STATUS).index(p['status'])
 points=''.join(f'<circle cx="{8+i*28}" cy="8" r="4" class="{"reached" if i<=index else ""}"/>' for i in range(4))
 labels=''.join(tr(v,'li',f'{"aria-current=step" if i==index else ""} class="{"reached" if i<=index else ""}"') for i,v in enumerate(STAGES))
 return f'<div class="project-path"><svg viewBox="0 0 100 16" preserveAspectRatio="none" aria-hidden="true"><path d="M8 8H92"/><path class="path-fill" d="M8 8H{8+index*28}"/>{points}</svg><ol>{labels}</ol></div>'
def constellation(p):
 # Team nodes are actual team members; all edges are membership links to the
 # project hub, not unverified pairwise coauthorship claims.
 count=len(p['team']); angle=(sum(map(ord,p['slug']))%25)/100
 pts=[(160+110*math.cos(angle+2*math.pi*i/count),90+58*math.sin(angle+2*math.pi*i/count)) for i in range(count)]
 edges=''.join(f'<path d="M160 90L{x:.1f} {y:.1f}"/>' for x,y in pts)
 nodes=''.join(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="7"><title>{esc(PEOPLE[t["person"]]["name"])}</title></circle>' for t,(x,y) in zip(p['team'],pts))
 return f'<svg class="project-cover" viewBox="0 0 320 180" role="img" aria-label="{esc(p["title"]["az"])}" data-label-az="{esc(p["title"]["az"])}" data-label-en="{esc(p["title"]["en"])}"><circle class="cover-orbit" cx="160" cy="90" r="70"/>{edges}{nodes}<circle class="cover-hub" cx="160" cy="90" r="12"/></svg>'
def avatars(p):
 team=p['team']; s=''.join(f'<a href="{personlink(t["person"])}" title="{esc(PEOPLE[t["person"]]["name"])}"><img src="/{PEOPLE[t["person"]]["image"]}" width="40" height="40" loading="lazy" alt="{esc(PEOPLE[t["person"]]["name"])}"/></a>' for t in team[:4])
 if len(team)>4:s+=f'<a href="{link(p)}#team">+{len(team)-4}</a>'
 return '<div class="project-avatars">'+s+'</div>'
def chips(p): return '<div class="project-tags">'+''.join(tr(FIELDS[f]) for f in p['fields'])+'</div>'
def card(p,featured=False):
 roles=''.join(tr(r['title'],attrs='class="open-role-chip"') for r in p.get('open_roles',[]))
 body=badge(p)+tr(p['title'],'h3')+tr(p['question'],'p')+chips(p)+pathbar(p)+avatars(p)
 if roles:body+='<div class="role-chips">'+tr(('Mövcud rollar:','Open roles:'))+roles+'</div>'
 body+=f'<a class="button button-primary" href="{actionurl(p)}">{tr(action(p))}</a><a class="project-detail-link" href="{link(p)}">{tr(("Layihəyə bax","View project"))}</a>'
 return f'<article class="project-card {"project-featured" if featured else ""}" data-project="{p["slug"]}">{constellation(p)}<div class="project-card-body">{body}</div></article>'
def proposecard():
 return '<article class="project-card propose-card"><span class="propose-symbol" aria-hidden="true">+</span>'+heading('Növbəti sual sizdən gəlsin.','Bring the next question.')+tr(('Tədqiqat ideyanızı bölüşün və ehtiyacınız olan komandanı təsvir edin.','Share your research idea and describe the team you need.'),'p')+'<a class="button button-primary" href="/join.html?intent=propose">'+tr(('Layihə təklif et','Propose a project'))+'</a></article>'
def empty():return '<div class="project-empty">'+tr(('İlk layihələr üçün yer açırıq.','Making room for the first projects.'),'h2')+tr(('Hazırda təsdiqlənmiş açıq layihə yoxdur. İdeyanız varsa, onu nəzərdən keçirilməsi üçün göndərin.','No approved public projects are listed yet. Submit an idea for review to help shape what comes next.'),'p')+'</div>'
def option(value,label): return tr(label,'option',f'value="{esc(value)}"')
def select(id,label,options,attrs=''):
 return '<label class="project-field" for="'+id+'">'+tr(label)+f'<select id="{id}" {attrs}>'+''.join(option(v,l) for v,l in options)+'</select></label>'
def writepage(filename,title,desc,body,page='projects'):
 header=(ROOT/'templates/header.html').read_text();footer=(ROOT/'templates/footer.html').read_text()
 navpage='people' if page=='person' else page
 header=header.replace(f'href="/{navpage}.html"',f'href="/{navpage}.html" aria-current="page"')
 canonical='https://azresearchsociety.org/'+filename.removesuffix('index.html')
 html=f'''<!doctype html><html lang="az"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>{esc(title['az'])} | ARS</title><meta name="description" content="{esc(desc['az'])}"/>
<meta name="theme-color" content="#071f4a"/><link rel="canonical" href="{canonical}"/>
<meta property="og:type" content="website"/><meta property="og:title" content="{esc(title['az'])} | ARS"/><meta property="og:description" content="{esc(desc['az'])}"/><meta property="og:url" content="{canonical}"/>
<link rel="icon" href="/assets/ars-logo.png?v=22"/><link rel="stylesheet" href="/styles.css?v=38"/><link rel="stylesheet" href="/projects.css?v=38"/>
<script src="/script.js?v=38" defer></script><script src="/project-data.js?v=38" defer></script><script src="/projects.js?v=38" defer></script></head>
<body class="inner-page" data-page="{page}" data-title-az="{esc(title['az'])} | ARS" data-title-en="{esc(title['en'])} | ARS" data-description-az="{esc(desc['az'])}" data-description-en="{esc(desc['en'])}">
<a class="skip-link" href="#main" data-i18n="skip">Əsas məzmuna keç</a>{header}<main id="main">{body}</main>{footer}</body></html>'''
 path=ROOT/filename;path.parent.mkdir(parents=True,exist_ok=True);path.write_text(html)
def hero(title,desc,kicker=('İnsanlar · Layihələr · Nəticələr','People · Projects · Outputs')):
 return '<section class="page-hero project-page-hero"><div class="container">'+tr(kicker,attrs='class="page-eyebrow"')+tr(title,'h1')+tr(desc,'p')+'</div></section>'
def replaceblock(name,block,filename='index.html'):
 path=ROOT/filename;s=path.read_text();pattern=f'<!-- PROJECTS_{name}_START -->.*?<!-- PROJECTS_{name}_END -->'
 s,n=re.subn(pattern,lambda m:f'<!-- PROJECTS_{name}_START -->\n{block}\n<!-- PROJECTS_{name}_END -->',s,flags=re.S);assert n==1,(filename,name);path.write_text(s)

# Additional scientific members, approved by the society, appear on both board surfaces.
SCIENTIFIC_ADDITIONS=['ayten-merdanova', 'orxan-refiyev', 'ali-madayen', 'natiq-soltanov', 'shamxal-baybekov', 'senan-goyushlu', 'elshen-abdullayev']
CARD_SUMMARIES={'ayten-merdanova': ('İstanbul Universiteti-Cerrahpaşa · Doktorantura təhsili', 'Istanbul University-Cerrahpaşa · Doctoral studies', 'Analitik kimya · Spektroskopiya', 'Analytical chemistry · Spectroscopy'), 'orxan-refiyev': ('Imperial College London · Magistr təhsili', 'Imperial College London · MSc studies', 'Enerji sistemləri · Maşın öyrənməsi', 'Energy systems · Machine learning'), 'ali-madayen': ('ODTÜ · PhD məzunu', 'METU · PhD graduate', 'CFD · Biofluid mexanikası', 'CFD · Biofluid mechanics'), 'natiq-soltanov': ('İstanbul Texniki Universiteti', 'Istanbul Technical University', 'CO₂ saxlanması · Rezervuar modelləşdirilməsi', 'CO₂ storage · Reservoir modelling'), 'shamxal-baybekov': ('Insilico Medicine · ADNSU', 'Insilico Medicine · ASOIU', 'Kemoinformatika · QSAR/QSPR', 'Cheminformatics · QSAR/QSPR'), 'senan-goyushlu': ('Neft-Kimya Prosesləri İnstitutu', 'Institute of Petrochemical Processes', 'Neft emalı · Polimer-modifikasiyalı bitum', 'Petroleum refining · Polymer-modified bitumen'), 'elshen-abdullayev': ('Apex Health · Qətər', 'Apex Health · Qatar', 'Süni intellekt · Ürək-damar görüntüləməsi', 'AI · Cardiovascular imaging')}
cards=''
for pid in SCIENTIFIC_ADDITIONS:
 person=PEOPLE[pid]
 assert person['roleKey']=='roleAdvisory'
 institution_az,institution_en,interest_az,interest_en=CARD_SUMMARIES[pid]
 summary='<span class="affiliation">'+tr((institution_az,institution_en))+'<br/>'+tr((interest_az,interest_en))+'</span>'
 cards+=f'<article class="person-card advisory-card" data-profile="{pid}"><div class="portrait-wrap"><img src="/{person["image"]}" alt="{esc(person["name"])}" width="720" height="720" loading="lazy" decoding="async"/></div><h3>{esc(person["name"])}</h3>'+tr(person['role'],'p')+summary+'<div class="flag-line" aria-hidden="true"><i></i><i></i><i></i></div><button class="profile-open" type="button" data-i18n="viewProfile">Profilə bax</button></article>'
for filename in ('index.html','scientific-board.html'):replaceblock('SCIENTIFIC',cards,filename)

# Listing and network share the same data and filter state.
filters=select('project-status',('Status','Status'),[('',('Bütün statuslar','All statuses'))]+list(STATUS.items()))
filters+=select('project-field',('Sahə','Field'),[('',('Bütün sahələr','All fields'))]+list(FIELDS.items()))
roles={r['title']['en']:r['title'] for p in PROJECTS for r in p.get('open_roles',[])}
filters+=select('project-role',('Axtarılan rol','Looking for'),[('',('Bütün rollar','All roles'))]+list(roles.items()))
inst=sorted({i for p in PROJECTS for i in p.get('institutions',[])})
filters+=select('project-institution',('Təşkilat','Institution'),[('',('Bütün təşkilatlar','All institutions'))]+[(i,i) for i in inst])
body=hero(('Bir sual. Ortaq iş. Real nəticə.','One question. Shared work. Real results.'),('Tədqiqat layihələrini kəşf edin, komandaya qoşulun və ya yeni ideya təklif edin.','Discover research projects, join a team, or propose a new idea.'))
body+='<section class="project-list-section"><div class="container"><div class="project-tools" data-project-tools hidden><label class="project-search" for="project-search">'+tr(('Layihə axtar','Search projects'))+'<input type="search" id="project-search" autocomplete="off"/></label><div class="project-filters">'+filters+'</div><div class="project-toolbar"><button type="button" class="text-link" id="project-reset">'+tr(('Filtrləri sıfırla','Reset filters'))+'</button><div class="project-view-switch" role="group" aria-label="Görünüş / View"><button type="button" data-project-view="list" aria-pressed="true">'+tr(('Siyahı','List'))+'</button><button type="button" data-project-view="network" aria-pressed="false">'+tr(('Şəbəkə','Network'))+'</button></div></div></div><p id="project-count" role="status" aria-live="polite"></p>'
body+=('<div id="project-launch-empty">'+empty()+'</div>') if not PROJECTS else ''
body+='<div id="project-no-results" class="project-empty" hidden>'+tr(('Uyğun layihə tapılmadı. Filtrləri dəyişin.','No matching projects. Try changing the filters.'),'p')+'</div>'
body+='<div id="project-list" class="project-grid">'+''.join(card(p,i==0) for i,p in enumerate(PROJECTS))+proposecard()+'</div><section id="project-network" hidden>'+heading('Əməkdaşlıq xəritəsi','Collaboration map')+tr(('Böyük düyünlər layihələri, kiçik düyünlər insanları göstərir. Xətlər komanda üzvlüyünü göstərir; ortaq üzvlər layihələri birləşdirir.','Large nodes are projects; small nodes are people. Lines indicate team membership; shared members connect projects.'),'p')+'<div id="network-canvas"></div></section></div></section>'
writepage('projects.html',bi('Layihələr','Projects'),bi('ARS-in tədqiqat layihələri, komandaları və açıq rolları.','Research projects, teams and open roles at ARS.'),body)

# Homepage: at most three projects, with a permanent proposal tile.
featured=PROJECTS[:3]
home='<section class="section featured-projects" id="projects"><span id="departments" aria-hidden="true"></span><div class="container"><div class="section-heading"><div class="section-label"><span>04</span>'+tr(('Layihələr','Projects'),'p')+'</div>'+heading('İdeyanı birlikdə araşdıraq.','Turn a question into shared work.')+'</div>'
home+='<div class="project-grid">'+''.join(card(p) for p in featured)+proposecard()+'</div>'
openp=next((p for p in PROJECTS if p.get('open_roles')),None)
if openp:
 r=openp['open_roles'][0];home+='<aside class="open-role-highlight">'+tr(('Komandada yeriniz var','A place on the team'),'h3')+tr(r['title'])+' · '+tr(r['commitment'])+f'<a class="button button-primary" href="/join.html?intent=join&amp;project={openp["slug"]}&amp;role={r["id"]}">'+tr(('Müraciət et','Apply'))+'</a></aside>'
home+='<a class="project-all-link" href="/projects.html">'+tr(('Bütün layihələrə bax','See all projects'))+' →</a></div></section>'
replaceblock('HOME',home)
counts=[(len(PROJECTS),('Açıq kataloqdakı layihə','Public projects')),(sum(p['status']=='active' for p in PROJECTS),('Aktiv komanda','Active teams')),(sum(len(p.get('open_roles',[])) for p in PROJECTS),('Açıq rol','Open roles')),(sum(len(p.get('outputs',[])) for p in PROJECTS),('Layihə nəticəsi','Project outputs'))]
stats='<div class="project-stats">'+''.join('<div><strong>'+str(n)+'</strong>'+tr(label)+'</div>' for n,label in counts)+'</div>'+tr(('Göstəricilər yalnız açıq layihə kataloquna aiddir.','Counts refer only to the public project catalogue.'),'p','class="project-count-note"')
for file in ('index.html','about.html'): replaceblock('STATS',stats if PROJECTS else '<!-- Statistics appear after approved projects are published and the site is rebuilt. -->',file)
heroitems=''.join(f'<a class="project-orbit-link orbit-{i}" href="{link(p)}">{tr(p["title"])}</a>' for i,p in enumerate(PROJECTS[:4]))
if not heroitems: heroitems='<a class="project-orbit-link orbit-empty" href="/join.html?intent=propose">'+tr(('İlk layihəni təklif et','Propose the first project'))+' →</a>'
replaceblock('HERO',heroitems)
paths=[(('Tədqiqatçıyam','I’m a researcher'),('Layihə tap','Find a project'),'/projects.html'),(('Mentor olmaq istəyirəm','I’d like to mentor'),('Layihəyə rəhbərlik et','Lead or guide a project'),'/join.html?intent=propose'),(('Təşkilatı təmsil edirəm','I represent an institution'),('Dəstək ver və ya ev sahibliyi et','Sponsor or host a project'),'/projects.html?audience=institution')]
if not PROJECTS:
 paths=[(('Tədqiqatçıyam','I’m a researcher'),('İcmaya qoşul','Join the community'),'/contact.html?topic=membership'),(('Mentor olmaq istəyirəm','I’d like to mentor'),('Gənc tədqiqatçılara rəhbərlik et','Guide early-career researchers'),'/contact.html?topic=mentor'),(('Təşkilatı təmsil edirəm','I represent an institution'),('Tərəfdaş ol','Become a partner'),'/contact.html?topic=partnership')]
replaceblock('PATHS','<div class="container project-entry-paths">'+''.join(f'<a href="{href}">{tr(label)}{tr(cta,"strong")} →</a>' for label,cta,href in paths)+'</div>')

# Detail pages: team, public approach, dated milestones, roles and outputs.
for p in PROJECTS:
 main='<section class="project-detail-head"><div class="container"><a href="/projects.html">'+tr(('Bütün layihələr','All projects'))+' ←</a>'+badge(p)+tr(p['title'],'h1')+tr(p['question'],'p')+chips(p)+pathbar(p)+'</div></section>'
 content=heading('Niyə vacibdir?','Why it matters')+tr(p['why'],'p')+heading('Yanaşma və metod','Approach & method')+tr(p['method'],'p')
 content+='<section id="milestones">'+heading('Mərhələlər','Milestones')+'<ol class="project-timeline">'+''.join(f'<li><time datetime="{m["date"]}">{m["date"]}</time>{tr(m["text"])}</li>' for m in p.get('milestones',[]))+'</ol></section>'
 content+='<section id="team">'+heading('Layihə komandası','Project team')+'<div class="project-team">'
 for t in p['team']:
  person=PEOPLE[t['person']];content+=f'<article><a href="{personlink(t["person"])}"><img src="/{person["image"]}" alt="" width="72" height="72" loading="lazy"/><h3>{esc(person["name"])}</h3></a>'+tr(t['role'],'strong')+tr(t['note'],'p')+'</article>'
 content+='</div></section><section id="open-roles">'+heading('Açıq rollar','Open roles')
 for r in p.get('open_roles',[]):
  content+='<article class="project-role-card">'+tr(r['title'],'h3')+tr(r['commitment'],'strong')+tr(r['description'],'p')+'<div class="project-tags">'+''.join(tr(s) for s in r['skills'])+'</div><p>'+tr(('Uyğun karyera mərhələsi:','Suitable career stages:'))+' '+''.join(tr(CAREERS[c])+' ' for c in r['career_stages'])+f'</p><a class="button button-primary" href="/join.html?intent=join&amp;project={p["slug"]}&amp;role={r["id"]}">'+tr(('Müraciət et','Apply'))+'</a></article>'
 if not p.get('open_roles'):content+=tr(('Hazırda açıq rol yoxdur.','There are no open roles at present.'),'p')
 content+='</section><section id="outputs">'+heading('Nəticələr','Outputs')+'<ol class="publication-list">'
 for o in p.get('outputs',[]):
  dest='https://doi.org/'+quote(o['doi'],safe='/():') if o.get('doi') else o['url']
  content+='<li class="publication-card">'+tr(o['title'],'h3')+f'<a class="publication-badge publication-badge-doi" href="{url(dest)}" target="_blank" rel="noopener noreferrer">{esc("DOI "+o["doi"] if o.get("doi") else o["type"])} ↗</a></li>'
 content+='</ol>'
 if not p.get('outputs'):content+=tr(('Hələ açıq nəticə dərc edilməyib.','No public outputs have been published yet.'),'p')
 content+='</section><section id="updates">'+heading('Yeniliklər','Updates')+'<ol class="project-timeline">'+''.join(f'<li><time datetime="{m["date"]}">{m["date"]}</time>{tr(m["text"])}</li>' for m in sorted(p.get('updates',[]),key=lambda x:x['date'],reverse=True))+'</ol>'
 if not p.get('updates'):content+=tr(('Yeniliklər burada paylaşılacaq.','Updates will appear here.'),'p')
 content+='</section>'
 related=[q for q in PROJECTS if q!=p and set(q['fields'])&set(p['fields'])][:2]
 if related: content+='<section>'+heading('Əlaqəli layihələr','Related projects')+''.join(f'<p><a class="project-detail-link" href="{link(q)}">{tr(q["title"])}</a></p>' for q in related)+'</section>'
 side=badge(p)+tr(('Layihə rəhbəri','Project lead'),'h2')+f'<a href="{personlink(p["lead"])}">{esc(PEOPLE[p["lead"]]["name"])}</a><a class="button button-primary" href="{actionurl(p)}">'+tr(action(p))+'</a><button class="button project-share" type="button" hidden>'+tr(('Linki paylaş','Share link'))+'</button><p class="share-status" role="status"></p>'
 main+='<div class="container project-detail-layout"><div class="project-detail-body">'+content+'</div><aside class="project-side">'+side+'</aside></div>'
 writepage('projects/'+p['slug']+'/index.html',p['title'],p['summary'],main)

# Static profile deep links reuse the existing, supplied profile data.
def assignments(pid): return [(p,next(t for t in p['team'] if t['person']==pid)) for p in PROJECTS if any(t['person']==pid for t in p['team'])]
def assignment_html(pid):
 items=assignments(pid)
 if not items:return tr(('Açıq layihə kataloqunda iştirak hələ göstərilmir.','No project participation is listed in the public catalogue yet.'),'p')
 return ''.join(f'<article class="profile-project"><a href="{link(p)}">{tr(p["title"],"h3")}</a>'+tr(t['role'],'strong')+tr(t['note'],'p')+'</article>' for p,t in items)
def publication_html(o):
 title=esc(o['title']) if o.get('title') else tr(('Nəşr məlumatları təsdiq gözləyir','Publication details awaiting verification'))
 meta=' · '.join(str(o[k]) for k in ('authors','year') if o.get(k))
 badges=('<span class="publication-badge">'+esc(o['journal'])+'</span>') if o.get('journal') else ''
 if o.get('doi') and not o.get('suppressDoi'):
  badges+=f'<a class="publication-badge publication-badge-doi" href="https://doi.org/{esc(o["doi"])}" target="_blank" rel="noopener noreferrer">{esc(o.get("linkLabel") or "DOI "+o["doi"])}</a>'
 note=tr(o['note'],'p','class="publication-meta publication-note"') if o.get('note') else ''
 return '<li class="publication-card"><h4 class="publication-title">'+title+'</h4><p class="publication-meta">'+esc(meta)+'</p><div class="publication-badges">'+badges+'</div>'+note+'</li>'
for pid,person in PEOPLE.items():
 body='<section class="section"><div class="container person-detail"><a href="/people.html">'+tr(('İnsanlara qayıt','Back to People'))+f'</a><div class="person-detail-head"><img src="/{person["image"]}" width="220" height="220" alt="{esc(person["name"])}"/><div><h1>{esc(person["name"])}</h1>'+tr(person['role'],'p')+'</div></div>'+heading('Haqqında','About')+''.join(tr(bi(a,e),'p') for a,e in zip(person['bio']['az'],person['bio']['en']))+heading('Elmi maraqlar','Research interests')+'<div class="project-tags">'+''.join(tr(bi(a,e)) for a,e in zip(person['interests']['az'],person['interests']['en']))+'</div>'+heading('Layihələr','Projects')+assignment_html(pid)
 if person.get('links'):
  body+=heading('Əlaqə və profillər','Contact & profiles')+'<div class="profile-links">'+''.join(f'<a href="{esc(l["url"])}"'+(' target="_blank" rel="noopener noreferrer"' if not l['url'].startswith('mailto:') else '')+'>'+tr(person['linkLabels'][l['labelKey']])+'</a>' for l in person['links'])+'</div>'
 publications=[o for o in person.get('publications',[]) if o.get('verification')=='verified' and o.get('title')]
 if publications:
  body+=heading('Seçilmiş nəşrlər','Selected publications')+'<ol class="publication-list">'+''.join(publication_html(o) for o in publications)+'</ol>'
 body+='</div></section>'
 writepage('people/'+pid+'/index.html',bi(person['name'],person['name']),person['role'],body,'person')
directory='<section class="section" id="directory"><div class="container">'+heading('Tədqiqatçıları tanıyın','Meet the researchers')+'<div class="project-tools" data-people-tools hidden><label class="project-search" for="people-search">'+tr(('Ad və ya elmi maraq','Name or research interest'))+'<input id="people-search" type="search"/></label>'+select('people-project',('Layihəyə görə','By project'),[('',('Bütün insanlar','All people'))]+[(p['slug'],p['title']) for p in PROJECTS])+'</div><p id="people-count" role="status"></p>'
board_groups=[('executive',('İcra Şurası','Executive Board'),'executive-board.html',[(pid,p) for pid,p in PEOPLE.items() if p['roleKey'] not in ('roleAdvisory','roleAdvisoryHead')]),('scientific',('Elmi Məsləhət Şurası','Scientific Advisory Board'),'scientific-board.html',[(pid,p) for pid,p in PEOPLE.items() if p['roleKey'] in ('roleAdvisory','roleAdvisoryHead')])]
for group,label,page,members in board_groups:
 # Keep both previews in sync with the same membership data as the directory.
 preview='<div class="board-preview board-preview-all" aria-hidden="true">'+''.join(f'<img src="/{esc(p["image"])}" alt="" title="{esc(p["name"])}" width="68" height="68" loading="lazy"/>' for pid,p in members)+'</div>'
 people_path=ROOT/'people.html'
 people_html=people_path.read_text()
 pattern=r'(<a class="choice-card reveal" href="'+re.escape(page)+r'">.*?)(<div class="board-preview[^\"]*"[^>]*>.*?</div>)'
 people_html,count=re.subn(pattern,lambda m:m[1]+preview,people_html,flags=re.S)
 assert count==1,('Board preview missing',group)
 people_path.write_text(people_html)
 directory+='<section class="directory-board-group" id="directory-'+group+'" aria-labelledby="directory-'+group+'-title">'+tr(label,'h3','id="directory-'+group+'-title"')+'<p><a class="project-detail-link" href="/'+page+'">'+tr(('Şuranın strukturuna bax','View board structure'))+'</a></p><div class="project-people-grid">'
 for pid,person in members:
  directory+=f'<article class="directory-person" data-person="{pid}"><a href="{personlink(pid)}"><img src="/{person["image"]}" alt="" width="120" height="120" loading="lazy"/><h3>{esc(person["name"])}</h3></a>'+tr(person['role'],'p')+'<div class="project-tags">'+''.join(f'<a href="{link(p)}">{tr(p["title"])}</a>' for p,t in assignments(pid))+ '</div><button type="button" class="directory-quick-view" data-open-profile="'+pid+'" hidden>'+tr(('Qısa profil','Quick profile'))+'</button></article>'
 directory+='</div></section>'
directory+='</div></section>'
# A native modal provides a quick view; ordinary profile links still work without JS.
directory+=(ROOT/'templates/profile-dialog.html').read_text()
replaceblock('PEOPLE',directory,'people.html')

# Join / Propose / Learn. Submissions use the existing contact endpoint.
def inputfield(name,label,kind='text',required=True,hint=None):
 attrs=f'name="{name}" id="join-{name}"'+(' required' if required else '')
 if kind=='textarea': control=f'<textarea {attrs} rows="4" maxlength="3000"'+(f' aria-describedby="hint-{name}"' if hint else '')+'></textarea>'
 else:control=f'<input type="{kind}" {attrs} maxlength="200"'+(' autocomplete="name"' if name.startswith('name-') else ' autocomplete="email"' if name.startswith('email-') else '')+'/>'
 return f'<label class="project-field" for="join-{name}">'+tr(label)+control+(tr(hint,'small',f'id="hint-{name}"') if hint else '')+'</label>'
def form(kind,fields):
 return f'<form class="project-form" data-intent="{kind}" action="https://formspree.io/f/xljdgezl" method="POST"><input type="hidden" name="_subject" value="ARS project {kind}"/><input type="hidden" name="intent" value="{kind}"/><div class="form-honeypot" aria-hidden="true"><label>Leave this field empty<input name="_gotcha" tabindex="-1" autocomplete="off"/></label></div><div class="project-form-grid">'+inputfield('name-'+kind,('Ad və soyad','Full name'))+inputfield('email-'+kind,('E-poçt','Email'),'email')+fields+'</div><label class="form-consent"><input type="checkbox" name="consent" value="yes" required/>'+tr(('Müraciətimin nəzərdən keçirilməsi və cavablandırılması üçün məlumatlarımın emalına razıyam.','I agree to my information being used to review and respond to this request.'))+'</label>'+tr(('Müraciətinizi ARS komandası nəzərdən keçirəcək. Təkliflər və adlar avtomatik dərc edilmir.','The ARS team will review your request. Proposals and names are not published automatically.'),'p','class="project-form-note"')+'<button type="submit" class="button button-primary">'+tr(('Göndər','Submit'))+'</button><p class="project-form-status" role="status" aria-live="polite"></p></form>'
body=hero(('Elmdə növbəti addımınız.','Your next step in research.'),('Komandaya qoşulun, ideya təklif edin və ya əvvəlcə bacarıqlarınızı inkişaf etdirin.','Join a team, propose an idea, or build your skills first.'))
body+='<div class="container join-content"><nav class="join-choices" aria-label="İştirak yolu / Participation path">'+''.join(f'<a class="join-choice" href="#join-{k}" data-join-intent="{k}">{tr(label)}</a>' for k,label in [('join',('Layihəyə qoşul','Join a project')),('propose',('Layihə təklif et','Propose a project')),('learn',('Əvvəlcə öyrən','Learn first'))])+'</nav>'
body+='<section id="join-join" data-join-panel="join">'+heading('Bacarıqlarınıza uyğun rol tapın','Find a role that fits your skills')
if roles:
 body+='<div class="project-filters">'+select('join-field',('Sahə','Field'),[('',('Bütün sahələr','All fields'))]+list(FIELDS.items()))+select('join-career',('Karyera mərhələsi','Career stage'),[('',('Bütün mərhələlər','All stages'))]+list(CAREERS.items()))+'</div><p id="join-role-count" role="status"></p><div id="join-role-results"></div>'
 opts=[('',('Rol seçin','Choose a role'))]+[(p['slug']+'/'+r['id'],bi(p['title']['az']+' — '+r['title']['az'],p['title']['en']+' — '+r['title']['en'])) for p in PROJECTS for r in p.get('open_roles',[])]
 fields=select('join-role',('Layihə və rol','Project and role'),opts,'name="project_role" required')+inputfield('availability',('Həftəlik vaxt imkanınız','Weekly availability'))+inputfield('experience',('Uyğun təcrübə və marağınız','Relevant experience and interest'),'textarea')
 body+=form('join',fields)
else:body+=tr(('Hazırda açıq rol yoxdur. Layihə təklif edə və ya seminar materialları ilə başlaya bilərsiniz.','There are no open roles yet. You can propose a project or start with the workshop materials.'),'p')+'<a class="project-detail-link" href="#join-propose" data-join-intent="propose">'+tr(('Layihə təklif et','Propose a project'))+'</a>'
body+='</section><section id="join-propose" data-join-panel="propose">'+heading('Tədqiqat sualınızı bölüşün','Share your research question')
fields=inputfield('title',('Layihənin adı','Project title'))+inputfield('lead',('Təklif edilən rəhbər','Proposed lead'))+inputfield('question',('Tədqiqat sualı','Research question'),'textarea')+inputfield('public_description',('Açıq təsvir','Public description'),'textarea',True,('Yalnız təsdiqdən sonra paylaşılmasına razı olduğunuz mətni yazın.','Write only what you would permit us to publish after approval.'))+inputfield('method',('Təklif edilən metod — baxış üçün','Proposed method — for review'),'textarea')+inputfield('team_needed',('Lazım olan komanda və bacarıqlar','Team and skills needed'),'textarea')+inputfield('commitment',('Vaxt öhdəliyi','Time commitment'))
body+=tr(('Təklif əvvəlcə nəzərdən keçirilir. Təsvir və komanda görünürlüğü təsdiqləndikdən sonra “Təklif” kimi dərc oluna bilər; rol qəbulu ayrıca açılır. Məxfi məlumat göndərməyin.','Proposals are reviewed first. After the description and team visibility are approved, a project can be published as Proposed; recruitment opens separately. Do not include confidential data.'),'p')+form('propose',fields)+'</section><section id="join-learn" data-join-panel="learn">'+heading('Tədqiqata hazırlaşın','Get ready for research')+tr(('Tədqiqat metodlarını öyrənin, materiallara baxın və əməkdaşlıq yolunuzu seçin.','Explore research methods, review the materials, and choose your collaboration path.'),'p')+'<div class="project-entry-paths"><a href="/workshop.html">'+tr(('Seminar və materiallar','Workshop & materials'))+'</a><a href="/programs.html">'+tr(('Dörd mərhələli yol','The four-stage pathway'))+'</a></div></section></div>'
writepage('join.html',bi('Qoşul','Join'),bi('Layihəyə qoşulun və ya tədqiqat təklifi göndərin.','Join a project or submit a research proposal.'),body,'join')

# Publish only the approved, public catalogue; profile assignments derive from it.
public=[{k:v for k,v in p.items() if k not in ('approval','public')} for p in PROJECTS]
(ROOT/'project-data.js').write_text('/* Generated by tools/build-projects.py. */\nwindow.ARS_PROJECTS = '+json.dumps(public,ensure_ascii=False).replace('<','\\u003c')+';\n')
# GitHub Pages aliases preserve query strings and fragments with a noscript fallback.
(ROOT/'.nojekyll').write_text('')
for alias,target in [('departments','projects'),('projects','projects'),('join','join')]:
 folder=ROOT/alias;folder.mkdir(exist_ok=True)
 html=f'''<!doctype html><html lang="az"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><noscript><meta http-equiv="refresh" content="0;url=/{target}.html"></noscript><link rel="canonical" href="https://azresearchsociety.org/{target}.html"><title>ARS</title><script src="/route-redirect.js" defer></script></head><body data-redirect="/{target}.html"><p><a href="/{target}.html">Davam et / Continue</a></p></body></html>'''
 (folder/'index.html').write_text(html)
 if alias=='departments':(ROOT/'departments.html').write_text(html)
# Keep generated routes in the sitemap; remove stale generated detail pages safely.
expected={ROOT/'projects'/p['slug']/'index.html' for p in PROJECTS}
for stale in (ROOT/'projects').glob('*/index.html') if (ROOT/'projects').exists() else []:
 if stale not in expected: stale.unlink()
pages=sorted(p for p in ROOT.rglob('*.html') if not any(x in p.parts for x in ('templates','tools','data')) and p.name not in ('404.html','departments.html'))
urls=['https://azresearchsociety.org/'+str(p.relative_to(ROOT)).removesuffix('index.html') for p in pages]
(ROOT/'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+''.join('<url><loc>'+esc(u)+'</loc></url>' for u in urls)+'</urlset>\n')
print(f'Built {len(PROJECTS)} approved projects, {len(PEOPLE)} profile pages, listing, join flow and homepage sections.')

# Preserve existing organization facts while deriving its members from profile data.
index=ROOT/'index.html'; source=index.read_text()
def update_organization(match):
 data=json.loads(match.group(1))
 if data.get('@type')!='Organization': return match.group(0)
 prior={m['name']:m for m in data.get('member',[])}
 members=[]
 for pid,person in PEOPLE.items():
  m=prior.get(person['name'],{'@type':'Person','name':person['name'],'jobTitle':person['role']['en']})
  m['jobTitle']=person['role']['en']
  m['url']='https://azresearchsociety.org'+personlink(pid)
  m['image']='https://azresearchsociety.org/'+person['image']
  profiles=[l['url'] for l in person.get('links',[]) if l['url'].startswith('https://')]
  if profiles:m['sameAs']=profiles
  email=next((l['url'][7:] for l in person.get('links',[]) if l['url'].startswith('mailto:')),None)
  if email:m['email']=email
  members.append(m)
 data['member']=members
 return '<script type="application/ld+json">'+json.dumps(data,ensure_ascii=False,indent=2).replace('<','\\u003c')+'</script>'
source=re.sub(r'<script type="application/ld\+json">(.*?)</script>',update_organization,source,flags=re.S)
index.write_text(source)
