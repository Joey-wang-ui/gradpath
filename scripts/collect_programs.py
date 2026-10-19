"""Capture official directory pages and candidate degree links for review; never publish guesses."""
import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import urllib.error
import urllib.parse
import urllib.request
import urllib.robotparser

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'frontend'/'data'
AGENT='GradpathCatalogueResearch/1.0'
DEGREES=re.compile(r'\b(master(?:s|\s+of)?|m\.?\s?s\.?|m\.?a\.?|mba|mfa|mph|mfin|meng|mse|med|mpp|mpa|mcs|mims|mim|march|m\.arch)\b',re.I)
OTHER_DEGREES=re.compile(r'\b(ph\.?d|doctor(?:ate|al)?|edd|dba|certificate)\b',re.I)
ALIASES={'washu':{'washu.edu','wustl.edu'},'uchicago':{'uchicago.edu','chicagobooth.edu'},'washington':{'washington.edu','uw.edu'}}

def official_domains(school):
    host=urllib.parse.urlparse(school['homepage']).hostname
    return ALIASES.get(school['id'],{'.'.join(host.split('.')[-2:])})

def require_official(url,domains):
    p=urllib.parse.urlparse(url)
    if p.scheme!='https' or p.username or p.password or not any(p.hostname==d or (p.hostname or '').endswith('.'+d) for d in domains):
        raise ValueError('URL must remain on the university’s official HTTPS domains')
    return urllib.parse.urldefrag(url)[0]

class OfficialRedirect(urllib.request.HTTPRedirectHandler):
    def __init__(self,domains):self.domains=domains
    def redirect_request(self,req,fp,code,msg,headers,newurl):
        require_official(newurl,self.domains)
        return super().redirect_request(req,fp,code,msg,headers,newurl)

class Links(HTMLParser):
    def __init__(self):super().__init__();self.links=[];self.anchor=None;self.words=[];self.skip=0
    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs)
        if tag in {'script','style'}:self.skip+=1
        if tag=='a':self.anchor={'href':attrs.get('href',''),'parts':[]}
    def handle_data(self,data):
        if self.skip:return
        self.words.append(data)
        if self.anchor is not None:self.anchor['parts'].append(data)
    def handle_endtag(self,tag):
        if tag in {'script','style'}:self.skip=max(0,self.skip-1)
        if tag=='a' and self.anchor is not None:
            self.links.append({'href':self.anchor['href'],'label':' '.join(' '.join(self.anchor['parts']).split())});self.anchor=None

def extract_candidates(html,url,domains,degree_scope='masters'):
    parser=Links();parser.feed(html);found={}
    for link in parser.links:
        label=link['label']
        if not label or not (DEGREES.search(label) or (degree_scope=='all' and OTHER_DEGREES.search(label))):continue
        try:target=require_official(urllib.parse.urljoin(url,link['href']),domains)
        except ValueError:continue
        if target.lower().endswith(('.jpg','.png','.zip','.js','.css')):continue
        found[(target,label)]={'label':label,'url':target,'status':'candidate-needs-review','sourceURL':url}
    return list(found.values())

def fetch_page(url,domains):
    require_official(url,domains)
    opener=urllib.request.build_opener(OfficialRedirect(domains))
    with opener.open(urllib.request.Request(url,headers={'User-Agent':AGENT,'Accept':'text/html,application/xhtml+xml'}),timeout=20) as response:
        final=require_official(response.url,domains);content=response.read(4*1024*1024+1)
        if len(content)>4*1024*1024:raise ValueError('Directory page exceeds the capture size limit')
        if 'html' not in response.headers.get('Content-Type','').lower():raise ValueError('Directory is not HTML; review PDF/API/dynamic sources separately')
        return content,final,response.headers.get_content_charset() or 'utf-8'

def failure_status(exc):
    text=str(exc)
    if 'Tunnel connection failed: 403' in text:return 'blocked-network'
    if isinstance(exc,urllib.error.HTTPError):return f'http-{exc.code}'
    return 'fetch-error'

def capture_school(school,entry,out_dir,degree_scope='masters',max_pages=1):
    domains=official_domains(school);school_dir=out_dir/school['id'];school_dir.mkdir(parents=True,exist_ok=True)
    pending=[entry['catalogURL']];seen=set();captures=[];candidates=[];failures=[]
    while pending and len(seen)<max_pages:
        url=pending.pop(0)
        if url in seen:continue
        seen.add(url)
        # A single directory read is a probe. Deeper collection respects robots.txt.
        if max_pages>1:
            parts=urllib.parse.urlsplit(url);robots_url=urllib.parse.urlunsplit((parts.scheme,parts.netloc,'/robots.txt','',''))
            try:
                opener=urllib.request.build_opener(OfficialRedirect(domains))
                with opener.open(urllib.request.Request(robots_url,headers={'User-Agent':AGENT}),timeout=15) as response:rules=response.read(512*1024).decode('utf-8','replace')
                robot=urllib.robotparser.RobotFileParser();robot.parse(rules.splitlines())
                if not robot.can_fetch(AGENT,url):failures.append({'url':url,'status':'robots-disallowed'});continue
            except urllib.error.HTTPError as exc:
                if exc.code!=404:failures.append({'url':url,'status':failure_status(exc)});continue
            except (OSError,ValueError) as exc:failures.append({'url':url,'status':failure_status(exc)});continue
        try:
            content,final,encoding=fetch_page(url,domains);digest=hashlib.sha256(content).hexdigest();filename=digest[:16]+'.html';(school_dir/filename).write_bytes(content)
            meta={'schoolId':school['id'],'url':final,'requestedURL':url,'file':str((school_dir/filename).resolve().relative_to(ROOT)) if school_dir.is_relative_to(ROOT) else str(school_dir/filename),'sha256':digest,'capturedAt':datetime.now(timezone.utc).isoformat(),'status':'captured-not-reviewed'}
            captures.append(meta);links=extract_candidates(content.decode(encoding,'replace'),final,domains,degree_scope);candidates.extend(links)
            if max_pages>1:pending.extend(c['url'] for c in links if c['url'] not in seen)
        except (OSError,ValueError) as exc:failures.append({'url':url,'status':failure_status(exc),'detail':str(exc)[:220]})
    unique={(c['url'],c['label']):c for c in candidates}
    result={'schoolId':school['id'],'catalogURL':entry['catalogURL'],'degreeScope':degree_scope,'status':'captured-needs-review' if captures else (failures[0]['status'] if failures else 'no-capture'),'capturedPages':captures,'candidateCount':len(unique),'candidates':list(unique.values()),'failures':failures,'coverage':'not-reviewed','complete':False}
    (school_dir/'capture.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    return result

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--school',action='append');parser.add_argument('--max-pages',type=int,default=1);parser.add_argument('--degree-scope',choices=['masters','all'],default='masters');parser.add_argument('--output',type=Path,default=DATA/'sources'/'catalogues');args=parser.parse_args()
    if not 1<=args.max_pages<=25:parser.error('--max-pages must be 1–25; broader crawling needs a school-specific adapter')
    schools=json.loads((DATA/'schools.json').read_text())['schools'];entries={e['schoolId']:e for e in json.loads((DATA/'programs.json').read_text())['schools']}
    if args.school and not set(args.school)<={s['id'] for s in schools}:parser.error('Unknown school ID')
    selected=[s for s in schools if not args.school or s['id'] in args.school];args.output.mkdir(parents=True,exist_ok=True)
    with ThreadPoolExecutor(max_workers=4) as pool:results=list(pool.map(lambda s:capture_school(s,entries[s['id']],args.output,args.degree_scope,args.max_pages),selected))
    report={'attemptedAt':datetime.now(timezone.utc).isoformat(),'degreeScope':args.degree_scope,'schoolCount':len(results),'capturedSchoolCount':sum(bool(r['capturedPages']) for r in results),'candidateCount':sum(r['candidateCount'] for r in results),'note':'Captures and link candidates require review; zero candidates is not evidence of zero programmes. No candidate is automatically added to the public directory.','schools':results}
    path=args.output/'collection-report.json';path.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'report':str(path),'schools':len(results),'captured':report['capturedSchoolCount'],'candidates':report['candidateCount'],'statuses':{status:sum(r['status']==status for r in results) for status in sorted({r['status'] for r in results})}},ensure_ascii=False))
    return 0 if report['capturedSchoolCount']==len(results) else 2

if __name__=='__main__':raise SystemExit(main())
