"""Merge reviewed official-page records while preserving existing degree IDs and local draft keys."""
import argparse
from copy import deepcopy
from datetime import date
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import unicodedata

try:
    from .collect_programs import DATA, ROOT, official_domains, require_official
    from .program_catalog import load_program_catalog
except ImportError:
    from collect_programs import DATA, ROOT, official_domains, require_official
    from program_catalog import load_program_catalog

class Text(HTMLParser):
    def __init__(self):super().__init__();self.words=[]
    def handle_data(self,data):self.words.append(data)

def normalized(value):return ' '.join(re.sub(r'[^\w\s]',' ',unicodedata.normalize('NFKC',value)).casefold().split())

def merge_reviewed(directory,review,schools,source_root=DATA/'sources'/'catalogues'):
    sid=review.get('schoolId');school=next((s for s in schools if s['id']==sid),None)
    if not school or review.get('reviewed') is not True:raise ValueError('A known university and explicit page review are required')
    date.fromisoformat(review['reviewedAt']);domains=official_domains(school);evidence={}
    source_root=Path(source_root).resolve()
    for item in review.get('evidence',[]):
        require_official(item['url'],domains)
        path=(source_root/item['file']).resolve()
        if not path.is_relative_to(source_root) or path.suffix!='.html':raise ValueError('Evidence must be retained HTML within the capture directory')
        content=path.read_bytes()
        if hashlib.sha256(content).hexdigest()!=item['sha256']:raise ValueError('Official source snapshot checksum mismatch')
        text=Text();text.feed(content.decode('utf-8','replace'))
        evidence[item['id']]={**item,'text':normalized(' '.join(text.words))}
    if not evidence:raise ValueError('Reviewed records need retained official page evidence')
    result=deepcopy(directory);entry=next(s for s in result['schools'] if s['schoolId']==sid);count=0
    for unit in review.get('colleges',[]):
        require_official(unit['url'],domains)
        existing=next((c for c in entry['colleges'] if normalized(c['english'])==normalized(unit['english'])),None)
        if not existing:
            cid=f'{sid}-unit-'+hashlib.sha256(normalized(unit['english']).encode()).hexdigest()[:10]
            existing={'id':cid,'name':unit.get('name') or unit['english'],'english':unit['english'],'url':unit['url'],'unitType':unit.get('unitType','academic'),'programs':[]};entry['colleges'].append(existing)
        for incoming in unit['programs']:
            require_official(incoming['url'],domains)
            refs=[evidence[k] for k in incoming.get('evidenceIds',[]) if k in evidence]
            if not refs or not any(normalized(incoming['english']) in ref['text'] for ref in refs):raise ValueError('Programme name is not supported by the referenced official-page text')
            if incoming.get('level','masters')!='masters':raise ValueError('Current public directory accepts master’s degrees; other levels require a separate reviewed scope')
            if incoming.get('deliveryMode','unknown') not in {'unknown','on-campus','online','hybrid'}:raise ValueError('Unknown delivery mode')
            if {'deadline','tuition','acceptanceRate'}&incoming.keys():raise ValueError('Do not merge unreviewed admissions terms')
            identity=(normalized(incoming['english']),normalized(incoming['degree']),incoming.get('campus') or None,incoming.get('deliveryMode','unknown'))
            def key(p):return (normalized(p['english']),normalized(p['degree']),p.get('campus') or None,p.get('deliveryMode','unknown'))
            prior=next((p for p in existing['programs'] if key(p)==identity),None)
            explicit=incoming.get('existingId')
            if explicit:
                located=[(c,p) for c in entry['colleges'] for p in c['programs'] if p['id']==explicit]
                if len(located)!=1:raise ValueError('Unknown existing degree ID')
                old_unit,old_program=located[0]
                old_key=key(old_program)
                compatible=old_key[:2]==identity[:2] and (old_key[2] is None or old_key[2]==identity[2]) and (old_key[3]=='unknown' or old_key[3]==identity[3])
                reparent=incoming.get('reconcileCollegeFromOfficialSource') is True
                if not compatible or (old_unit['id']!=existing['id'] and not reparent):raise ValueError('Existing IDs cannot be reassigned to a different college, degree or campus')
                if old_unit['id']!=existing['id']:
                    old_unit['programs'].remove(old_program);existing['programs'].append(old_program)
                prior=old_program
            pid=prior['id'] if prior else sid+'--'+hashlib.sha256((existing['id']+'|'+repr(identity)).encode()).hexdigest()[:16]
            record={**(prior or {}),'id':pid,'name':incoming.get('name') or (prior or {}).get('name') or incoming['english'],'english':incoming['english'],'degree':incoming['degree'],'field':incoming['field'],'url':incoming['url'],'sourceLevel':incoming.get('sourceLevel','program'),'admissionMode':incoming.get('admissionMode','check-current-cycle'),'note':incoming.get('note','项目名称已按留存官网页面整理；当季招生要求仍需单独确认。'),'campus':incoming.get('campus') or None,'deliveryMode':incoming.get('deliveryMode','unknown'),'sourceEvidence':[{k:v for k,v in ref.items() if k!='text'} for ref in refs],'catalogueReviewedAt':review['reviewedAt']}
            if prior:prior.update(record)
            else:existing['programs'].append(record)
            count+=1
    if not count:raise ValueError('No reviewed master’s programmes supplied')
    entry['colleges']=[c for c in entry['colleges'] if c['programs']]
    programmes=[p for c in entry['colleges'] for p in c['programs']];reviewed=sum(bool(p.get('sourceEvidence')) for p in programmes)
    complete=review.get('completeCatalogueReviewed') is True
    expected=review.get('officialMastersTotal')
    if complete and (not isinstance(expected,int) or isinstance(expected,bool) or expected!=len(programmes) or reviewed!=len(programmes)):
        raise ValueError('Completeness requires the official total and evidence for every retained degree')
    entry['coverage']={'status':'catalogue-covered' if complete else 'partially-reviewed','currentProgrammeCount':len(programmes),'reviewedProgrammeCount':reviewed,'officialMastersTotal':expected if isinstance(expected,int) and not isinstance(expected,bool) else None,'reviewedAt':review['reviewedAt'],'completeCatalogueReviewed':complete}
    return result

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('review',type=Path);p.add_argument('--source-root',type=Path,default=DATA/'sources'/'catalogues');p.add_argument('--output',type=Path,default=DATA/'programs.json');args=p.parse_args()
    schools=json.loads((DATA/'schools.json').read_text())['schools'];original=load_program_catalog(schools);review=json.loads(args.review.read_text());result=merge_reviewed(original,review,schools,args.source_root)
    args.output.parent.mkdir(parents=True,exist_ok=True);temp=args.output.with_name(args.output.name+'.pending');temp.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    try:load_program_catalog(schools,temp)
    except Exception:temp.unlink();raise
    temp.replace(args.output);print('Merged reviewed records; existing programme IDs retained. Rebuild the standalone frontend to publish locally.')

if __name__=='__main__':main()
