"""Validate the reference degree directory without implying current-cycle verification."""
import json
from pathlib import Path
import re
from urllib.parse import urlparse

DATA = Path(__file__).resolve().parents[1] / 'frontend' / 'data'


def load_program_catalog(schools: list[dict], path: Path = DATA / 'programs.json') -> dict:
    directory = json.loads(path.read_text(encoding='utf-8'))
    if directory.get('status') != 'reference' or directory.get('verifiedAt') is not None:
        raise ValueError('Reference entries must not claim current official verification')
    known = {s['id']: s for s in schools}
    seen_schools, seen_units, seen_programs = set(), set(), set()
    # Some official schools use a second institutional domain.
    aliases = {'washu': {'washu.edu', 'wustl.edu'}, 'uchicago': {'uchicago.edu', 'chicagobooth.edu'}, 'washington': {'washington.edu', 'uw.edu'}}
    for entry in directory['schools']:
        sid = entry['schoolId']
        if sid not in known or sid in seen_schools:
            raise ValueError('Every school must have one correctly associated directory')
        seen_schools.add(sid)
        host = urlparse(known[sid]['homepage']).hostname
        domain = '.'.join(host.split('.')[-2:])
        allowed = aliases.get(sid, {domain})

        def official(url):
            parsed = urlparse(url)
            if parsed.scheme != 'https' or parsed.username or parsed.password or not any(parsed.hostname == d or (parsed.hostname or '').endswith('.' + d) for d in allowed):
                raise ValueError(f'Expected an official university HTTPS link for {sid}')

        official(entry['catalogURL'])
        if not entry['colleges']:
            raise ValueError('Academic units are required')
        for unit in entry['colleges']:
            if unit['id'] in seen_units or not all(unit.get(k) for k in ('name', 'english', 'programs')):
                raise ValueError('Academic units must be unique and named')
            seen_units.add(unit['id'])
            official(unit['url'])
            for program in unit['programs']:
                pid = program['id']
                if not re.fullmatch(re.escape(sid) + r'--[a-z0-9-]+', pid) or pid in seen_programs:
                    raise ValueError('Degree IDs must be unique and belong to their university')
                seen_programs.add(pid)
                if not all(program.get(k) for k in ('name', 'english', 'degree', 'field', 'note')):
                    raise ValueError('Degree identity and route notes are required')
                if program['admissionMode'] not in {'check-current-cycle', 'check-route'}:
                    raise ValueError('A supported admissions route is required')
                if program['sourceLevel'] not in {'program', 'college'}:
                    raise ValueError('Distinguish direct program sources from college entry points')
                if {'deadline', 'tuition', 'acceptanceRate'} & program.keys():
                    raise ValueError('Unverified admissions terms must not be invented')
                official(program['url'])
    if seen_schools != set(known):
        raise ValueError('The degree browser must cover every catalogue university')
    return directory
