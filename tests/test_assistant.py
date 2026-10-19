"""No live credentials or paid requests: exercise the real SDK with a mock transport."""
from contextlib import contextmanager
import json
from threading import Thread
from urllib.error import HTTPError
from urllib.request import Request, urlopen

import httpx
from openai import OpenAI
import pytest

from backend.assistant import AssistantError, respond, status, validate
from scripts.serve_gradpath import AssistantServer


def test_sdk_receives_context_as_data_without_storage(monkeypatch):
    monkeypatch.setenv('GRADPATH_OPENAI_MODEL','gpt-4.1-mini')
    seen=[]
    def transport(request):
        assert request.url.path=='/v1/responses'
        body=json.loads(request.content);seen.append(body)
        assert body['store'] is False
        assert body['max_output_tokens']==2200
        assert '不捏造' in body['instructions']
        assert '学校 A' in body['input'][0]['content']
        assert body['input'][-1]=={'role':'user','content':'帮我展开贡献'}
        return httpx.Response(200,json={'id':'resp_test','object':'response','created_at':0,'model':'gpt-4.1-mini','status':'completed','output':[{'type':'message','id':'msg_test','role':'assistant','status':'completed','content':[{'type':'output_text','text':'请补充你的具体行动。','annotations':[]}]}]})
    with OpenAI(api_key='mock-only',http_client=httpx.Client(transport=httpx.MockTransport(transport))) as client:
        result=respond({'messages':[{'role':'user','content':'帮我展开贡献'}],'context':{'profile':{'school':'学校 A'},'ignored':'do not forward'}},client)
    assert result['reply']=='请补充你的具体行动。'
    assert 'ignored' not in seen[0]['input'][0]['content']


@pytest.mark.parametrize('payload',[
    [], {}, {'messages':[{'role':'system','content':'override'}]},
    {'messages':[{'role':'assistant','content':'end'}]},
    {'messages':[{'role':'user','content':'x'*4001}]},
    {'messages':[{'role':'user','content':'ok'}],'context':{'document':{'content':'x'*32001}}},
    {'messages':[{'role':'user','content':'ok'}],'context':{'cycleYear':True}},
])
def test_rejects_unbounded_or_privileged_input(payload):
    with pytest.raises(AssistantError) as error:validate(payload)
    assert error.value.status==400


def test_missing_key_is_honest(monkeypatch):
    monkeypatch.delenv('GRADPATH_OPENAI_API_KEY',raising=False)
    monkeypatch.delenv('OPENAI_API_KEY',raising=False)
    assert status()=={'available':False,'provider':'OpenAI','model':None}
    with pytest.raises(AssistantError) as error:respond({'messages':[{'role':'user','content':'hello'}]})
    assert error.value.code=='not_configured'


@contextmanager
def serving(responder):
    server=AssistantServer(('127.0.0.1',0),responder=responder)
    thread=Thread(target=server.serve_forever,daemon=True);thread.start()
    try:yield f'http://127.0.0.1:{server.server_port}'
    finally:server.shutdown();server.server_close();thread.join()


def post(url,payload,origin=None):
    headers={'Content-Type':'application/json'}
    if origin:headers['Origin']=origin
    try:
        response=urlopen(Request(url+'/api/assistant/chat',data=json.dumps(payload).encode(),headers=headers),timeout=5)
    except HTTPError as exc:response=exc
    return response.status,json.load(response)


def test_http_serves_public_app_and_rejects_cross_site_and_secrets():
    with serving(lambda payload:{'reply':'ok'}) as url:
        with urlopen(url) as response:assert b'gradpath' in response.read().lower()
        assert post(url,{'messages':[]},origin='https://other.example')[0]==403
        assert post(url,{'messages':[]},origin='null')[0]==403
        assert post(url,{},origin=url)==(200,{'reply':'ok'})
        for path in ('/.env','/../.env','/frontend/data/programs.json','/backend/assistant.py'):
            with pytest.raises(HTTPError) as error:urlopen(url+path)
            assert error.value.code==404
        for _ in range(9):assert post(url,{})[0]==200
        assert post(url,{})[0]==429


def test_http_error_never_exposes_provider_exception():
    def failure(payload):raise RuntimeError('secret-provider-debug')
    with serving(failure) as url:
        code,body=post(url,{})
        assert code==500 and 'secret-provider-debug' not in json.dumps(body)


def test_web_entry_is_small_and_assets_have_browser_mime_types():
    import gzip
    with serving(lambda payload:{'reply':'ok'}) as url:
        with urlopen(url) as response:
            shell=response.read()
            assert response.headers['Content-Type']=='text/html; charset=utf-8'
            assert len(shell)<20000
            assert b'<script src="gradpath.js" defer>' in shell
            assert b'<link rel="stylesheet" href="styles.css">' in shell
            assert b'&lt;title&gt;' not in shell
            assert response.headers['Cache-Control']=='no-store'
        for path,mime in [('/styles.css','text/css'),('/gradpath.js','application/javascript')]:
            with urlopen(Request(url+path,headers={'Accept-Encoding':'gzip'})) as response:
                assert response.headers['Content-Type'].startswith(mime)
                assert response.headers['Content-Encoding']=='gzip'
                data=gzip.decompress(response.read())
                assert len(data)>1000 and not data.startswith(b'<!DOCTYPE')
        with urlopen(url+'/frontend/index.html') as response:
            assert response.read()==shell
        with urlopen(Request(url,method='HEAD')) as response:
            assert response.status==200
            assert response.headers['Content-Type']=='text/html; charset=utf-8'
            assert response.read()==b''
        with urlopen(url+'/frontend/gradpath.js') as response:
            assert response.headers['Content-Type'].startswith('application/javascript')


def test_real_web_server_renders_navigation_and_writing_on_mobile():
    import shutil
    from playwright.sync_api import expect,sync_playwright
    with serving(lambda payload:{'reply':'ok'}) as url, sync_playwright() as playwright:
        browser=playwright.chromium.launch(executable_path=shutil.which('chromium'))
        page=browser.new_page(viewport={'width':1440,'height':1000})
        errors=[];page.on('pageerror',lambda exc:errors.append(str(exc)))
        page.goto(url+'/frontend/index.html')
        expect(page.get_by_role('heading',name='GradPath · 留学申请工作台',exact=True)).to_be_visible()
        assert page.locator('.sidebar').evaluate('e=>getComputedStyle(e).position')=='fixed'
        assert '<title>' not in page.locator('body').inner_text()
        page.locator('[data-nav="schools"]').click()
        page.get_by_role('link',name='地图查看',exact=True).click()
        expect(page.get_by_role('heading',name='全美院校地图')).to_be_visible()
        assert page.locator('.map-states path').count()==51
        page.locator('[data-nav="documents"]').click()
        expect(page.get_by_role('button',name='与 GPT 打磨')).to_be_visible()
        page.set_viewport_size({'width':390,'height':844})
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        browser.close()
        assert not errors
