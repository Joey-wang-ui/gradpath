"""Build a self-contained compact preview and the optional HTTP-served entry."""
from pathlib import Path
import json
import base64
import hashlib
import gzip

from school_catalog import load_catalog
from program_catalog import load_program_catalog
from map_data import build_map

FRONTEND = Path(__file__).resolve().parents[1] / 'frontend'
MODULES=('assistant.js','map.js','programs.js','documents.js','applications.js','shortlist.js','seasons.js','app.js')


def replace_section(document: str, name: str, content: str) -> str:
    start = f'<!-- gradpath:{name}:start -->'
    end = f'<!-- gradpath:{name}:end -->'
    before, remainder = document.split(start, 1)
    _, after = remainder.split(end, 1)
    return f'{before}{start}\n{content}\n{end}{after}'


def build() -> None:
    document=(FRONTEND/'index.html').read_text(encoding='utf-8')
    if not document.lstrip().lower().startswith('<!doctype html>'):
        raise ValueError('The page source must be HTML, not escaped text')
    css=(FRONTEND/'styles.css').read_text(encoding='utf-8')
    payload=load_catalog()
    payload['programDirectory']=load_program_catalog(payload['schools'])
    payload['map']=build_map(payload['schools'])
    crests_dir=FRONTEND/'assets/crests'
    crests=json.loads((crests_dir/'manifest.json').read_text(encoding='utf-8'))
    display_path=crests_dir/'display-previews.json'
    displays=json.loads(display_path.read_text()) if display_path.exists() else {}
    for school in payload['schools']:
        if school['id'] not in crests:continue
        asset=crests[school['id']]
        original=(crests_dir/asset['file']).read_bytes()
        if hashlib.sha256(original).hexdigest()!=asset['sha256']:
            raise ValueError('Crest checksum mismatch: '+school['id'])
        image=original
        mime='image/png'
        if small:=displays.get(school['id']):
            if small['sourceSha256']!=asset['sha256']:
                raise ValueError('Display crest must derive from retained original: '+school['id'])
            mime=small['dataURL'].split(';',1)[0].removeprefix('data:')
            if mime not in ('image/png','image/webp'):raise ValueError('Unsupported display crest format')
            image=base64.b64decode(small['dataURL'].split(',',1)[1])
            if hashlib.sha256(image).hexdigest()!=small['sha256']:
                raise ValueError('Display crest checksum mismatch: '+school['id'])
        school['crestFit']='cover' if asset.get('fit')=='cover' else 'contain'
        school['crestDataURL']='data:'+mime+';base64,'+base64.b64encode(image).decode('ascii')
    catalog=json.dumps(payload,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')
    modules='\n'.join((FRONTEND/name).read_text(encoding='utf-8') for name in MODULES)
    full_js='(() => {\nconst SchoolCatalog = '+catalog+';\n'+modules+'\n})();'
    if '</style' in css.lower() or '</script' in full_js.lower():
        raise ValueError('Embedded assets must not contain HTML closing tags')
    # Keep a readable, uncompressed build for compatibility and fixture inspection.
    styled=replace_section(document,'styles',f'<style>\n{css}</style>')
    full_html=replace_section(styled,'script',f'<script>\n{full_js}</script>')
    (FRONTEND/'gradpath-full.html').write_text(full_html,encoding='utf-8')

    # Catalogue data is decoded locally. No fetch, server, API key or remote assets
    # are involved in opening the preview, including an opaque-origin iframe.
    packed=base64.b64encode(gzip.compress(catalog.encode('utf-8'),mtime=0)).decode('ascii')
    bootstrap='''(async () => {
const packedCatalog = "PACKED_CATALOG";
const bytes=Uint8Array.from(atob(packedCatalog),char=>char.charCodeAt(0));
const decoded=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
const SchoolCatalog=JSON.parse(decoded);
APP_MODULES
})().catch(error => {
  const root=document.querySelector('#main-content');
  if(root){
    const title=document.createElement('h1');title.textContent='页面加载未完成';
    const note=document.createElement('p');note.textContent='请使用较新版本的 Chrome、Edge 或 Safari 打开此页面。';
    root.replaceChildren(title,note);
  }
  console.error('Gradpath preview could not start',error);
});'''.replace('PACKED_CATALOG',packed).replace('APP_MODULES',modules)
    if '</script' in bootstrap.lower():raise ValueError('Invalid preview script boundary')
    compact=replace_section(styled,'script',f'<script>\n{bootstrap}</script>')
    for entry in (FRONTEND/'index.html',FRONTEND/'gradpath.html',FRONTEND.parent/'index.html'):
        entry.write_text(compact,encoding='utf-8')

    # HTTP serving remains optional; it is not the user's standalone preview.
    web=FRONTEND/'web';web.mkdir(exist_ok=True)
    shell=replace_section(document,'styles','<link rel="stylesheet" href="styles.css">')
    shell=replace_section(shell,'script','<script src="gradpath.js" defer></script>')
    (web/'index.html').write_text(shell,encoding='utf-8')
    (web/'gradpath.js').write_text(full_js,encoding='utf-8')
    (web/'gradpath.js.gz').write_bytes(gzip.compress(full_js.encode(),mtime=0))
    (web/'styles.css.gz').write_bytes(gzip.compress(css.encode(),mtime=0))
    print('Self-contained preview:',len(compact.encode('utf-8')),'bytes; all',len(payload['schools']),'schools retained')


if __name__=='__main__':build()
