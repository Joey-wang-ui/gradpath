"""The public preview never enables paid API access, even when the app has a key."""
from http.server import ThreadingHTTPServer
import json
from threading import Thread
from urllib.error import HTTPError
from urllib.request import Request,urlopen

from scripts.serve_preview import PreviewHandler


def test_public_preview_is_read_only_and_renders_html(monkeypatch):
    monkeypatch.setenv('GRADPATH_OPENAI_API_KEY','mock-only-never-call')
    server=ThreadingHTTPServer(('127.0.0.1',0),PreviewHandler)
    thread=Thread(target=server.serve_forever,daemon=True);thread.start()
    base=f'http://127.0.0.1:{server.server_port}'
    try:
        with urlopen(base) as response:
            assert response.headers['Content-Type'].startswith('text/html')
            assert b'gradpath.js' in response.read()
        with urlopen(base+'/api/assistant/status') as response:
            assert json.load(response)['available'] is False
        try:
            urlopen(Request(base+'/api/assistant/chat',data=b'{}',headers={'Content-Type':'application/json'}))
        except HTTPError as error:
            assert error.code==405
            assert json.load(error)['error']['code']=='preview_only'
        else:raise AssertionError('Public preview unexpectedly accepted a model request')
        for path in ('/.env','/backend/assistant.py','/frontend/data/schools.json'):
            try:urlopen(base+path)
            except HTTPError as error:assert error.code==404
            else:raise AssertionError('Nonpublic file was served')
    finally:
        server.shutdown();server.server_close();thread.join()
