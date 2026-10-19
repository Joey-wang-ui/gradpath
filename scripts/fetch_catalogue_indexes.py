"""Capture a small manifest of official index URLs without publishing unreviewed entries."""
import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime,timezone
import hashlib
import json
from pathlib import Path

try:
    from .collect_programs import DATA,fetch_page,official_domains,failure_status
except ImportError:
    from collect_programs import DATA,fetch_page,official_domains,failure_status


def capture(pair,schools):
    sid,url=pair
    try:
        content,final,encoding=fetch_page(url,official_domains(schools[sid]))
        digest=hashlib.sha256(content).hexdigest()
        path=DATA/'sources/catalogues'/sid/(digest[:16]+'.html')
        path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(content)
        return {'schoolId':sid,'url':final,'requestedURL':url,'file':str(path.relative_to(DATA/'sources/catalogues')),'sha256':digest,'capturedAt':datetime.now(timezone.utc).isoformat(),'status':'captured','bytes':len(content)}
    except Exception as exc:
        return {'schoolId':sid,'url':url,'status':failure_status(exc),'detail':str(exc)[:130]}


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('manifest',type=Path)
    args=parser.parse_args();manifest=json.loads(args.manifest.read_text())
    pairs=list(manifest.items()) if isinstance(manifest,dict) else [(r['schoolId'],r['url']) for r in manifest]
    if len(pairs)>60:parser.error('Use school-specific collection for more than 60 index pages.')
    schools={s['id']:s for s in json.loads((DATA/'schools.json').read_text())['schools']}
    if any(sid not in schools for sid,_ in pairs):parser.error('Unknown university')
    with ThreadPoolExecutor(max_workers=4) as pool:results=list(pool.map(lambda pair:capture(pair,schools),pairs))
    path=DATA/'sources/catalogues/index-captures.json';prior=json.loads(path.read_text()) if path.exists() else []
    keys={(r['schoolId'],r.get('requestedURL',r['url'])) for r in results}
    prior=[r for r in prior if (r['schoolId'],r.get('requestedURL',r['url'])) not in keys]
    path.write_text(json.dumps(prior+results,ensure_ascii=False,indent=2)+'\n')
    for r in results:print(r['schoolId'],r['status'],r.get('bytes',''),r['url'])


if __name__=='__main__':main()
