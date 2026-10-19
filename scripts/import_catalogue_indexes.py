"""Rebuild reviewed master’s entries from retained official index captures. No network requests."""
from pathlib import Path
import json,sys,hashlib
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from scripts.catalogue_adapters import extract_catalogue
from scripts.import_reviewed_programs import merge_reviewed,normalized
from scripts.program_catalog import load_program_catalog
from scripts.collect_programs import official_domains,require_official
root=Path(__file__).resolve().parents[1]/'frontend/data';sources=root/'sources/catalogues';schools=json.loads((root/'schools.json').read_text())['schools'];directory=json.loads((root/'programs.json').read_text())
backup=root/'sources/programs-reference-2026-10-19.json'
if not backup.exists():backup.write_text(json.dumps(directory,ensure_ascii=False,indent=2)+'\n')
if '--from-reference' in sys.argv:directory=json.loads(backup.read_text())
reports=[]
for r in json.loads((sources/'index-captures.json').read_text()):
 if r['status']!='captured':continue
 parsed=extract_catalogue(r['schoolId'],(sources/r['file']).read_bytes(),r['url'])
 if not parsed:continue
 entry=next(s for s in directory['schools'] if s['schoolId']==r['schoolId']);units={};used_existing=set();prior=[(u,p) for u in entry['colleges'] for p in u['programs']]
 domains=official_domains(next(s for s in schools if s['id']==r['schoolId']))
 for p in parsed:
  try:require_official(p['url'],domains)
  except ValueError:continue
  unit=p['unit'];unit_type=p['unitType'];english_unit='Official graduate programme directory — unit classification pending' if unit_type=='directory' else unit
  old_unit=next((u for u in entry['colleges'] if normalized(u['english'])==normalized(english_unit)),None)
  if old_unit:display=old_unit['name']
  else:display='学院待归类 · 官网目录' if unit_type=='directory' else english_unit
  target=units.setdefault(english_unit,{'name':display,'english':english_unit,'url':r['url'],'unitType':unit_type,'programs':[]})
  candidates=[(u,old) for u,old in prior if normalized(old['english'])==normalized(p['english']) and normalized(old['degree'])==normalized(p['degree']) and old['id'] not in used_existing and (not old.get('campus') or old['campus']==p.get('campus')) and (old.get('deliveryMode','unknown')=='unknown' or old.get('deliveryMode')==p.get('deliveryMode'))]
  if len(candidates)>1:
   candidates=[(u,old) for u,old in candidates if normalized(english_unit) in normalized(u['english']) or normalized(u['english']) in normalized(english_unit)]
  incoming={k:p[k] for k in ['english','degree','url','field','admissionMode','note','campus','deliveryMode']};incoming['evidenceIds']=['index'];incoming['sourceLevel']='college' if p['url'].rstrip('/')==r['url'].rstrip('/') else 'program';incoming['level']='masters'
  if len(candidates)==1:
   used_existing.add(candidates[0][1]['id'])
   incoming['existingId']=candidates[0][1]['id'];incoming['name']=candidates[0][1]['name'];incoming['reconcileCollegeFromOfficialSource']=True
  target['programs'].append(incoming)
 review={'schoolId':r['schoolId'],'reviewed':True,'reviewedAt':'2026-10-19','reviewMethod':'Explicit master’s degree labels and programme links in retained official catalogue HTML; degree terms and route restrictions checked by adapter. Admissions terms not imported.','evidence':[{'id':'index','url':r['url'],'file':r['file'],'sha256':r['sha256']}],'colleges':list(units.values()),'completeCatalogueReviewed':False,'officialMastersTotal':None}
 try:
  candidate=merge_reviewed(directory,review,schools,sources)
 except Exception as exc:
  print('REVIEW ERROR',r['schoolId'],str(exc));continue
 directory=candidate;entry=next(s for s in directory['schools'] if s['schoolId']==r['schoolId']);entry['catalogURL']={'stanford': 'https://gradadmissions.stanford.edu/explore-programs', 'ucsb': 'https://engage.graddiv.ucsb.edu/portal/programs', 'tufts': 'https://www.tufts.edu/graduate-programs', 'yale': 'https://gsas.yale.edu/programs-of-study'}.get(r['schoolId'],r['url']);reports.append({'schoolId':r['schoolId'],'imported':len(parsed),'units':len(units),'sourceURL':r['url']})
 (sources/r['schoolId']/(Path(r['file']).stem+'.reviewed.json')).write_text(json.dumps(review,ensure_ascii=False,indent=2)+'\n')
 print(r['schoolId'],'merged',len(parsed),'source entries')
directory['scope']='硕士项目与学位方向目录；部分院校按官网目录扩充，并非全校完整目录声明。';directory['verification']='按保留的官方目录页面整理的条目附带来源校验值；其余参考条目仍待核对。项目名称目录核对不等于当季招生资格、时间与费用已核验。'
# The global reference status stays conservative while any retained entries remain unreviewed.
p=root/'programs.pending.json';p.write_text(json.dumps(directory,ensure_ascii=False,indent=2)+'\n');load_program_catalog(schools,p);p.replace(root/'programs.json')
(sources/'import-report.json').write_text(json.dumps(reports,ensure_ascii=False,indent=2)+'\n')
print('Source-backed imports:',sum(x['imported'] for x in reports),'across',len({r['schoolId'] for r in reports}),'schools; total entries',sum(len(c['programs']) for s in directory['schools'] for c in s['colleges']))

coverage=[]
for entry in directory['schools']:
 programmes=[p for c in entry['colleges'] for p in c['programs']]
 known=[p for p in programmes if p.get('sourceEvidence')]
 coverage.append({'schoolId':entry['schoolId'],'currentProgrammeCount':len(programmes),'officialCatalogueNamedEntries':len(known),'referenceOnlyEntries':len(programmes)-len(known),'status':'partially-reviewed' if known else 'reference-only','officialMastersTotal':None,'completeCatalogueReviewed':False,'sourceURLs':sorted({e['url'] for p in known for e in p['sourceEvidence']})})
(sources/'coverage-report.json').write_text(json.dumps({'asOf':'2026-10-19','scope':'Masters only, including clearly marked joint and restricted routes. Counts are directory entries, not independent application counts.','publicEntryCount':sum(e['currentProgrammeCount'] for e in coverage),'sourceBackedEntryCount':sum(e['officialCatalogueNamedEntries'] for e in coverage),'schools':coverage},ensure_ascii=False,indent=2)+'\n')
