"""Build small display copies; retain original university assets and provenance."""
from pathlib import Path
import base64,hashlib,json,shutil
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
CRESTS=ROOT/'frontend/assets/crests'


def build():
    originals=json.loads((CRESTS/'manifest.json').read_text())
    result={}
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path=shutil.which('chromium'))
        page=browser.new_page()
        for sid,asset in originals.items():
            source=(CRESTS/asset['file']).read_bytes()
            if hashlib.sha256(source).hexdigest()!=asset['sha256']:
                raise ValueError('Original crest checksum mismatch: '+sid)
            data='data:image/png;base64,'+base64.b64encode(source).decode()
            resized=page.evaluate('''async url => {
                const image=new Image();image.src=url;await image.decode();
                const scale=Math.min(1,96/Math.max(image.naturalWidth,image.naturalHeight));
                const canvas=document.createElement('canvas');
                canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));
                canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
                const ctx=canvas.getContext('2d');ctx.imageSmoothingQuality='high';
                ctx.drawImage(image,0,0,canvas.width,canvas.height);
                return {data:canvas.toDataURL('image/webp',0.82),width:canvas.width,height:canvas.height};
            }''',data)
            small=base64.b64decode(resized['data'].split(',',1)[1])
            result[sid]={'sourceSha256':asset['sha256'],'sha256':hashlib.sha256(small).hexdigest(),'width':resized['width'],'height':resized['height'],'dataURL':resized['data']}
        browser.close()
    (CRESTS/'display-previews.json').write_text(json.dumps(result,separators=(',',':'))+'\n')
    print('Original crest bytes:',sum((CRESTS/a['file']).stat().st_size for a in originals.values()))
    print('Display crest bytes:',sum(len(base64.b64decode(a['dataURL'].split(',',1)[1])) for a in result.values()))


if __name__=='__main__':build()
