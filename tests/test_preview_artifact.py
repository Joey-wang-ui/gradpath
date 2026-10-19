"""Preserve full functionality while keeping the original offline preview small."""
import base64,gzip,json,re
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]


def test_single_file_preview_keeps_full_data_without_external_dependencies():
    preview=(ROOT/'frontend/index.html').read_text()
    assert len(preview.encode())<1000000
    assert preview.lstrip().startswith('<!DOCTYPE html>')
    assert not re.search(r'<script[^>]+src=',preview)
    assert not re.search(r'<link[^>]+stylesheet',preview)
    packed=re.search(r'const packedCatalog = "([A-Za-z0-9+/=]+)";',preview)[1]
    payload=json.loads(gzip.decompress(base64.b64decode(packed)))
    source=json.loads((ROOT/'frontend/data/programs.json').read_text())
    actual={p['id'] for s in payload['programDirectory']['schools'] for c in s['colleges'] for p in c['programs']}
    expected={p['id'] for s in source['schools'] for c in s['colleges'] for p in c['programs']}
    assert actual==expected
    assert len(payload['schools'])==53 and len(payload['map']['points'])==53
    assert all(s.get('crestDataURL') for s in payload['schools'])
    assert (ROOT/'index.html').read_text()==preview
    assert (ROOT/'frontend/gradpath.html').read_text()==preview
