"""Review boundary: explicit master’s labels, retained source bytes, stable application IDs."""
from copy import deepcopy
import hashlib
import json
from pathlib import Path

import pytest
from scripts.catalogue_adapters import extract_catalogue, split_degree, is_master
from scripts.import_reviewed_programs import merge_reviewed
from scripts.map_data import build_map
from scripts.school_catalog import load_catalog

DATA=Path(__file__).resolve().parents[1]/'frontend/data'


@pytest.mark.parametrize('title,expected',[
    ('Computer Science (MS)',('Computer Science','MS')),
    ('Medicine (MD)',None),('Medicine (MD/PhD)',None),
    ('Music',None),('Music (MM)',('Music','MM')),
    ('Architecture, MSD: Robotics and Autonomous Systems',('Architecture, MSD: Robotics and Autonomous Systems','MSD')),
])
def test_only_explicit_master_labels(title,expected):
    assert split_degree(title)==expected


def test_no_undergraduate_or_doctoral_degrees_are_published_as_masters():
    catalog=json.loads((DATA/'programs.json').read_text())
    for school in catalog['schools']:
        for unit in school['colleges']:
            for p in unit['programs']:
                assert is_master(p['degree']), (school['schoolId'],p['english'],p['degree'])
                if 'PhD' in p['degree'] or '/JD' in p['degree']:
                    assert p['admissionMode']=='check-route'


def test_snapshot_evidence_and_legacy_ids_survive_imports():
    catalog=json.loads((DATA/'programs.json').read_text());cache={};reviewed=set()
    ids={p['id'] for s in catalog['schools'] for c in s['colleges'] for p in c['programs']}
    baseline=json.loads((DATA/'sources/programs-reference-2026-10-19.json').read_text())
    old={p['id'] for s in baseline['schools'] for c in s['colleges'] for p in c['programs']}
    assert old<=ids
    for s in catalog['schools']:
        for c in s['colleges']:
            for p in c['programs']:
                for evidence in p.get('sourceEvidence',[]):
                    path=(DATA/'sources/catalogues'/evidence['file']).resolve()
                    assert path.is_relative_to((DATA/'sources/catalogues').resolve())
                    if path not in cache:cache[path]=hashlib.sha256(path.read_bytes()).hexdigest()
                    assert cache[path]==evidence['sha256']
                    reviewed.add(s['schoolId'])
        assert not s.get('coverage',{}).get('completeCatalogueReviewed',False)
    assert len(reviewed)>=14


def test_importer_requires_source_text_and_preserves_stable_id(tmp_path):
    html=b'<h1>Computer Science (MS)</h1>';(tmp_path/'index.html').write_bytes(html)
    evidence={'id':'index','url':'https://catalog.mit.edu/','file':'index.html','sha256':hashlib.sha256(html).hexdigest()}
    old={'id':'mit--kept','name':'计算机','english':'Computer Science','degree':'MS','deliveryMode':'unknown'}
    directory={'schools':[{'schoolId':'mit','colleges':[{'id':'mit-college','name':'School','english':'School','programs':[old]}]}]}
    program={'english':'Computer Science','degree':'MS','field':'计算机','url':'https://catalog.mit.edu/cs/','level':'masters','evidenceIds':['index']}
    review={'schoolId':'mit','reviewed':True,'reviewedAt':'2026-10-19','evidence':[evidence],'colleges':[{'name':'School','english':'School','url':'https://catalog.mit.edu/','programs':[program]}]}
    schools=[{'id':'mit','homepage':'https://www.mit.edu/'}]
    result=merge_reviewed(directory,review,schools,tmp_path)
    assert result['schools'][0]['colleges'][0]['programs'][0]['id']=='mit--kept'
    assert len(result['schools'][0]['colleges'][0]['programs'])==1
    assert directory['schools'][0]['colleges'][0]['programs'][0].get('sourceEvidence') is None
    invalid=deepcopy(review);invalid['colleges'][0]['programs'][0]['english']='Invented Degree'
    with pytest.raises(ValueError,match='not supported'):merge_reviewed(directory,invalid,schools,tmp_path)
    (tmp_path/'index.html').write_bytes(b'tampered')
    with pytest.raises(ValueError,match='checksum'):merge_reviewed(directory,review,schools,tmp_path)


def test_map_coordinates_and_all_states_have_a_source():
    schools=load_catalog()['schools'];geo=build_map(schools)
    assert len(geo['points'])==53
    assert len(geo['states'])==51
    assert {p['id'] for p in geo['points']}=={s['id'] for s in schools}
    assert all(0<p['x']<1120 and 0<p['y']<720 for p in geo['points'])
    altered=deepcopy(schools);altered[0]['longitude']=10
    with pytest.raises(ValueError):build_map(altered)
