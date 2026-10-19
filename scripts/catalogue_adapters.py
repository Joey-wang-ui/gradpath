"""Read explicit degree labels in retained university catalogues; do not infer degrees from subjects."""
import re
from urllib.parse import urljoin,urlparse,parse_qsl,urlencode,urlunparse
from bs4 import BeautifulSoup

MASTER=re.compile(r'^(?:M(?!inor|ajor)[A-Za-z.]*|LL\.?M\.?)(?:\s*[/,&]\s*(?:M[A-Za-z.]*|PhD|Ph\.D\.))*$',re.I)
CANON={'m.s.':'MS','m.a.':'MA','m.arch':'MArch','m.arch.':'MArch','m.eng.':'MEng','meng':'MEng','m.ed.':'MEd','med':'MEd','msed':'MSEd','m.fin.':'MFin','ll.m.':'LLM','sc.m.':'ScM','s.m.':'SM','a.m.':'AM','m.p.h.':'MPH','m.p.a.':'MPA'}
FULL={'Master of Science in Engineering':'MSE','Master of Science':'MS','Master of Arts':'MA','Master of Fine Arts':'MFA','Master of Business Administration':'MBA','Master of Public Health':'MPH','Master of Engineering':'MEng','Master of Education':'MEd','Master of Laws':'LLM','Master of Music':'MM','Master of Architecture':'MArch','Master of Social Work':'MSW','Master of Public Policy':'MPP','Master of Public Administration':'MPA'}

def text(e):return e.get_text(' ',strip=True).replace('\u200b','').replace('\xa0',' ') if e else ''
def clean_url(url):
 p=urlparse(url);q=[(k,v) for k,v in parse_qsl(p.query) if not k.lower().startswith(('utm_','src'))]
 return urlunparse((p.scheme,p.netloc,p.path,p.params,urlencode(q),''))
def degree(value):
 raw=value.strip();return CANON.get(raw.lower(),CANON.get(raw.replace('.','').lower(),raw.replace('.','') if '.' in raw and ' ' not in raw else raw))
MASTER_CODES = set("MS MA MFA MEng MBA MSE MPH LLM MM MPS MPA MHS MSW MSD MPP MAT MSBA MEd MHA MCS MSPH MAS MLA MArch MEM MSL MFin MBE MMH ScM MDiv MTS MDes MF MSF MUP MVS MBAn SM AM EdM MCIT MQM MSN MISM MAR MRP MFS MILR MDS MAEL MSAE MSCE MSEnvE MSCSE MSErSc MSEE MGA MSIM MSME MDevEng MDP MICS MIDS MIMS MJ MAAD MAnlytx MAIML MCP MFE MNSD MSSE MTM MUD MSI MURP MLArch MCM MSWE MAAE MANSC MARCH MHRIR MMUS MME MSUD MIPA MAcc MSCP MSUA MSDT MiM SMF MIM PMASE MBID MCRP MID PMML PMOSH MRED MSEEM MITA MALD MESM MSDS MSFS MSt MSc MAM MAMFT MPPM MSM MASc MEDS METL MAPS MRes MPAcc MST MMT MCMH MHP MSA MSAI MSIT MPM MLAUD MUPD MRE MTE MALS MLIS MPAff MSES MPAc Masters".split())
def is_master(code):
 return code.startswith('Master of ') or code in {"Master's", "Master’s"} or any(degree(p.strip()) in MASTER_CODES for p in re.split(r'[/,&]',code))

def split_degree(title,explicit=None):
 title=' '.join(title.split());name=title;code=None
 if explicit:
  e=explicit.strip().replace('Master’s','Masters').replace("Master's",'Masters')
  if MASTER.fullmatch(e) or e in {'AM','SM','ScM','PMASE','PMML','PMOSH'}:code=degree(e)
  elif e.startswith('Master of '):code=FULL.get(e,e)
  elif e in {"Master's",'Masters','Master’s'}:code="Master's"
 if not code:
  for suffix in re.findall(r'\(([^()]*)\)',title)[::-1]:
   if MASTER.fullmatch(suffix.strip()):code=degree(suffix);name=title[:title.rfind('('+suffix+')')].strip();break
 if not code:
  m=re.match(r'^(.*?),\s*((?:M[A-Za-z.]*|LL\.?M\.?))(?:\s*:\s*(.*))?$',title)
  if m and MASTER.fullmatch(m[2]):name=title if m[3] else m[1];code=degree(m[2])
 if not code:
  m=re.match(r'^(.*?)\s+((?:M[A-Z][A-Za-z./]*|M\.[A-Z][A-Za-z./]*|LLM|PMASE|PMML|PMOSH))\s*(?:\(.*\))?$',title)
  if m:name=m[1];code=degree(m[2])
 if not code:
  for full,abbrev in FULL.items():
   if title.endswith(', '+full):name=title[:-len(full)-2];code=abbrev;break
 if not code or not is_master(code):return None
 if explicit:
  name=re.sub(r'\s*(?:[,·.]\s*|\s+|\()'+re.escape(explicit)+r'\)?\s*$','',name,flags=re.I)
 if not name or name.lower() in {'masters','master','master’s','master\'s'}:return None
 return name.strip(' ,.:—-'),code

def category(name):
 n=name.lower()
 for pattern,label in [(r'computer|computing|cyber|software|artificial intelligence','计算机'),(r'data|analytics|statistics|biostat','数据与统计'),(r'financ|account|business|management|market|commerce|economics','商科与经济'),(r'engineer|manufactur|robot|aerospace','工程'),(r'education|teaching|curriculum|pedagog','教育'),(r'health|nurs|medicine|clinical|biomed|dent|epidemi','健康与医学'),(r'polic|public administration|government|international affairs','公共与国际事务'),(r'art|design|architecture|music|theat|cinema|film|dance','艺术与设计'),(r'social|psych|anthrop|sociolog','社会科学'),(r'chem|physics|math|biolog|ecolog|geolog|earth|science','自然科学'),(r'language|history|literature|philosophy|religio|theolog','人文')]:
  if re.search(pattern,n):return label
 return '其他学科'

def extract_catalogue(sid,html,base):
 soup=BeautifulSoup(html,'html.parser');main=soup.select_one('#content') or soup.find('main') or soup
 result=[];fallback='研究生官方目录 · 学院待归类'
 def add(title,href,unit=None,explicit=None,keywords=(),route=None):
  parsed=split_degree(title,explicit)
  if not parsed:return
  name,code=parsed;url=clean_url(urljoin(base,href))
  if urlparse(url).scheme not in {'https','http'}:return
  if urlparse(url).scheme=='http':url='https:'+url[5:]
  kw=' '.join(keywords);mode='online' if re.search(r'\bonline\b',kw,re.I) else 'hybrid' if re.search(r'\bhybrid\b',kw,re.I) else 'on-campus' if re.search(r'in.person|on.campus',kw,re.I) else 'unknown'
  restricted=bool(re.search(r'for .*students only|5th.year|undergrad|coterminal|incidental',title,re.I))
  if sid=='upenn' and code=='MBA':restricted=True
  if re.search(r'PhD|Ph\.D|(?:^|/)MD(?:/|$)|(?:^|/)JD(?:/|$)',code):restricted=True
  route=route or ('check-route' if restricted or sid=='caltech' else 'check-current-cycle')
  note='按官方目录项目名称与学位整理；招生资格、先修课及当季要求需另查项目页面。'
  if restricted:note='此条目包含校内衔接或专业方向限制；不能直接视为面向所有人的独立申请项目，请先核对招生路径。'
  result.append({'english':name,'degree':code,'url':url,'unit':unit or fallback,'unitType':'directory' if not unit else 'academic','deliveryMode':mode,'campus':next((m[1] for k in keywords if (m:=re.search(r'In Person \(([^)]+)\)',k))),None),'field':category(name),'admissionMode':route,'note':note,'sourceLabel':title})
 if sid=='stanford':
  for card in soup.select('.su-card.program'):
   a=next((a for a in card.select('.links a[href]') if text(a)=='Program Website'),None)
   if a:add(card.get('data-name',''),a['href'],text(card.select_one('.school')))
 elif sid=='ucsb' and 'cmd=dept' in base:
  for a in soup.select('.list-group a[href]'):
   label=text(a)
   if ' - ' not in label:continue
   codes,name=label.split(' - ',1)
   for code in re.split(r'[/,]',codes):
    code=degree(code.strip())
    if is_master(code):add(name,a['href'],explicit=code,route='check-route' if 'Ph' in codes or 'Credential' in codes else None)
 elif sid=='yale':
  for item in main.select('li.program-listing__item'):
   a=item.select_one('.program-listing__item--info a[href]')
   if not a:continue
   for li in item.select('.program-listing__degree li'):
    label=text(li);code=label.split(' - ')[0]
    if is_master(code):add(text(a),a['href'],'Graduate School of Arts and Sciences',explicit=code)
 elif sid=='ohio-state':
  for a in soup.find_all('a',id=re.compile('DegreesRepeater.*programURL'),href=True):
   label=text(a);hidden=a.select_one('.sr-only');name=text(hidden).rstrip(' -')
   offered=label[len(text(hidden)):].strip() if hidden else ''
   if name and offered.startswith('Master of'):add(name,a['href'],explicit=offered)
 elif sid=='mit':
  section=soup.select_one('#graduatedegreestextcontainer')
  if section:
   for a in section.find_all('a',href=True):
    label=text(a);parts=re.findall(r'\(([^()]*)\)',label)
    if not parts:continue
    name=label[:label.rfind('(')].strip();codes=re.findall(r'\b(?:SM|MASc|MArch|MEng)\b',parts[-1])
    previous=a.find_previous(['h2','h3','h4']);unit=text(previous) if previous else None
    for code in codes:add(name,a['href'],unit,explicit=code,route='check-route' if 'Course' in parts[-1] else None)
 elif sid=='tufts':
  for card in main.select('.program-card-grad'):
   offered=text(card.select_one('.program--degree'))
   if "Master's" not in offered:continue
   a=card.select_one('a.program--cta[href]')
   if not a:continue
   title=text(card.select_one('.program--title')).split(" - Master's")[0]
   unit=text(card.select_one('.icon-program--schools'))
   before=len(result);add(title,a['href'],unit,explicit="Master's",keywords=[text(card.select_one('.program--delivery'))],route='check-route' if 'Doctorate' in offered else None)
   if len(result)>before:result[-1]['campus']=text(card.select_one('.icon-program--campuses')) or None
 elif sid in {'case-western','johns-hopkins'}:
  for item in main.select('li.item'):
   kws=[text(k) for k in item.select('.keyword')]
   if not any(k=="Master's" for k in kws):continue
   unit=text(item.select_one('ul.divisions li')) or next((k for k in kws if any(w in k for w in ['School','College','Institute'])),'')
   add(text(item.select_one('.title')),item.find('a',href=True)['href'],unit,keywords=kws)
 elif sid=='nyu':
  units={a['href']:text(a) for a in soup.find_all('a',href=True) if re.fullmatch(r'/graduate/[^/]+/',a['href'])}
  for item in main.select('li.item'):
   a=item.find('a',href=True)
   if not a or not a['href'].startswith('/graduate/'):continue
   key='/'.join(a['href'].split('/')[:3])+'/'
   add(text(item.select_one('.title')),a['href'],units.get(key))
 elif sid=='cornell':
  container=soup.select_one('#programsbycollegeschooltextcontainer');seen=set()
  if container:
   for h in container.select('h2.toggle'):
    section=h.find_next_sibling('div');unit=text(h)
    for a in section.find_all('a',href=True):
     if a['href'] in seen:continue
     before=len(result);add(text(a),a['href'],unit)
     if len(result)>before:seen.add(a['href'])
  # The official field list additionally includes research master’s degrees.
  container=soup.select_one('#programsbyfieldofstudytextcontainer')
  if container:
   for a in container.find_all('a',href=True):
    if a['href'] not in seen:
     before=len(result);add(text(a),a['href'],'Graduate School · Graduate Fields')
     if len(result)>before:seen.add(a['href'])
 elif sid=='georgia-tech':
  container=soup.select_one('#masterstextcontainer')
  if container:
   for li in container.find_all('li',recursive=False) if container.name=='ul' else container.select('ul > li'):
    name=next((str(n).strip() for n in li.contents if isinstance(n,str) and str(n).strip()),'').rstrip(' .')
    for a in li.find_all('a',href=True):add(name,a['href'],explicit=text(a))
 elif sid=='bu':
  school_names={'cas':'Graduate School of Arts & Sciences','grs':'Graduate School of Arts & Sciences','eng':'College of Engineering','com':'College of Communication','cfa':'College of Fine Arts','cds':'Faculty of Computing & Data Sciences','met':'Metropolitan College','questrom':'Questrom School of Business','qst':'Questrom School of Business','sed':'Wheelock College of Education & Human Development','wheelock':'Wheelock College of Education & Human Development','sph':'School of Public Health','ssw':'School of Social Work','sth':'School of Theology','law':'School of Law','sar':'Sargent College of Health & Rehabilitation Sciences','med':'Chobanian & Avedisian School of Medicine','sdm':'Henry M. Goldman School of Dental Medicine','sha':'School of Hospitality Administration','khc':'Kilachand Honors College'}
  for li in main.select('li.ma'):
   name=str(li.contents[0]).strip().rstrip(' (')
   for a in li.find_all('a',href=True):
    bits=urlparse(a['href']).path.split('/');unit=school_names.get(bits[2] if len(bits)>2 else '')
    add(name,a['href'],unit,explicit=text(a))
 elif sid in {'umich','northwestern','princeton'}:
  for tr in soup.select('table tr'):
   cells=tr.find_all('td',recursive=False)
   if len(cells)<2:continue
   if sid=='umich':
    if len(cells)<8 or not re.search(r'Master',text(cells[3]),re.I):continue
    a=cells[6].find('a',href=True);unit=text(cells[2]);codes=re.findall(r'\b([A-Z][A-Za-z.]+)\s*\(\d+\)',text(cells[5]));codes=[c for c in codes if MASTER.fullmatch(c)]
    if a:
     for code in codes:
      before=len(result);add(text(cells[0]),a['href'],unit,explicit=code)
      if len(result)>before:result[-1]['campus']=text(cells[1]) or None
   elif sid=='northwestern':
    if len(cells)<4 or 'Masters' not in text(cells[3]):continue
    a=cells[0].find('a',href=True)
    if a:add(text(cells[0]),a['href'],text(cells[1]),explicit=text(cells[2]))
   else:
    a=cells[0].find('a',href=True)
    if not a:continue
    for code in re.findall(r'\b(?:M\.[A-Za-z.]+|M[A-Z][A-Za-z]*|A\.M\.|S\.M\.)',text(cells[1])):add(text(cells[0]),a['href'],'Graduate School',explicit=code)
 elif sid=='wisconsin':
  units={a['href']:text(a) for a in soup.find_all('a',href=True) if re.fullmatch('/graduate/[^/]+/',a['href'])}
  for a in main.find_all('a',href=True):
   if not a['href'].startswith('/graduate/'):continue
   h=a.find('h3');label=text(h) if h else text(a);parts=a['href'].split('/');unit=units.get('/'.join(parts[:3])+'/')
   add(label,a['href'],unit)
 elif sid in {'uiuc','upenn'}:
  for a in main.find_all('a',href=True):
   if a['href'].startswith('/graduate/'):add(text(a),a['href'])
 elif sid=='berkeley':
  for tr in soup.select('table tbody tr'):
   cells=tr.find_all('td',recursive=False)
   if len(cells)<3 or 'Masters' not in text(cells[2]):continue
   a=cells[0].find('a',href=True)
   if not a:continue
   fly=soup.select_one(a['href']) if a['href'].startswith('#') else None
   targets=[x for x in fly.find_all('a',href=True) if 'program' in text(x).lower()] if fly else []
   href=next((x['href'] for x in targets if not x['href'].startswith('#')),base+a['href'])
   unit=next((text(x) for x in (fly.find_all(['h2','h3','h4']) if fly else []) if 'School' in text(x) or 'College' in text(x)),None)
   add(text(a),href,unit)
 elif sid=='notre-dame':
  for a in main.find_all('a',href=True):add(text(a),a['href'],'Graduate School')
 return list({(p['url'],p['english'],p['degree'],p['deliveryMode']):p for p in result}.values())
