"""Check catalogue ownership and provenance rather than unverified admissions terms."""
from copy import deepcopy
import json
from pathlib import Path

import pytest
from scripts.program_catalog import load_program_catalog
from scripts.school_catalog import load_catalog


def test_reference_programs_cover_each_university_and_preserve_route_notes():
    schools = load_catalog()['schools']
    catalog = load_program_catalog(schools)
    assert {s['schoolId'] for s in catalog['schools']} == {s['id'] for s in schools}
    assert catalog['verifiedAt'] is None
    assert '并非全校完整' in catalog['scope']
    caltech = next(s for s in catalog['schools'] if s['schoolId'] == 'caltech')
    assert all(p['admissionMode'] == 'check-route' for c in caltech['colleges'] for p in c['programs'])
    nyu = next(s for s in catalog['schools'] if s['schoolId'] == 'nyu')
    cs = [(c['id'],p['id']) for c in nyu['colleges'] for p in c['programs'] if p['english']=='Computer Science']
    assert len(cs) == 2 and len({pid for _,pid in cs}) == 2


@pytest.mark.parametrize('mutation,error', [
    ('wrong-university', 'university HTTPS'),
    ('lookalike-domain', 'university HTTPS'),
    ('missing-school', 'cover every'),
    ('duplicate-degree', 'unique and belong'),
    ('false-verification', 'must not claim'),
    ('invented-deadline', 'must not be invented'),
])
def test_inconsistent_reference_data_is_rejected(tmp_path, mutation, error):
    schools = load_catalog()['schools']
    catalog = deepcopy(load_program_catalog(schools))
    p = catalog['schools'][0]['colleges'][0]['programs'][0]
    if mutation == 'wrong-university':
        p['url'] = 'https://www.stanford.edu/'
    elif mutation == 'lookalike-domain':
        p['url'] = 'https://mit.edu.example.org/'
    elif mutation == 'missing-school':
        catalog['schools'].pop()
    elif mutation == 'duplicate-degree':
        catalog['schools'][0]['colleges'][0]['programs'].append(dict(p))
    elif mutation == 'false-verification':
        catalog['status'] = 'verified'
    else:
        p['deadline'] = '2027-01-01'
    path = tmp_path/'programs.json'
    path.write_text(json.dumps(catalog))
    with pytest.raises(ValueError, match=error):
        load_program_catalog(schools,path)
