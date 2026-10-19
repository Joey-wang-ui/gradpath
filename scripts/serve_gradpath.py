"""Serve the standalone frontend and a same-origin GPT API; no student text is logged."""
from __future__ import annotations

import argparse
from collections import defaultdict, deque
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import sys
from threading import BoundedSemaphore, Lock
from time import monotonic
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from backend.assistant import AssistantError, respond, status


class AssistantServer(ThreadingHTTPServer):
    daemon_threads = True
    def __init__(self, address, responder=respond):
        super().__init__(address, Handler)
        self.responder = responder
        self.slots = BoundedSemaphore(4)
        self.rate_lock = Lock()
        self.requests_by_ip = defaultdict(deque)

    def allow_request(self, address):
        now = monotonic()
        with self.rate_lock:
            # Bound the limiter itself; inactive IP records expire after one minute.
            for ip, events in list(self.requests_by_ip.items()):
                while events and events[0] < now-60:
                    events.popleft()
                if not events:
                    del self.requests_by_ip[ip]
            events = self.requests_by_ip[address]
            if len(events)>=10:
                return False
            events.append(now)
            return True


class Handler(BaseHTTPRequestHandler):
    server_version = 'Gradpath'
    def log_message(self, *args):
        # Default request logs can include user-supplied URL/query contents.
        pass

    def send_json(self, code, payload):
        body = json.dumps(payload, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.end_headers()
        try:
            if self.command != 'HEAD':
                self.wfile.write(body)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def same_origin(self):
        # Reject browser cross-site submissions, including sandboxed/null origins.
        origin = self.headers.get('Origin')
        return not origin or origin in ('http://'+self.headers.get('Host',''), 'https://'+self.headers.get('Host',''))

    def do_HEAD(self):
        self.do_GET()

    def do_GET(self):
        path = urlsplit(self.path).path
        if path=='/api/assistant/status':
            self.send_json(200, status())
            return
        # Serve only built public entry points, never repository files or .env.
        files = {
            '/':('web/index.html','text/html'),
            '/index.html':('web/index.html','text/html'),
            '/frontend/index.html':('web/index.html','text/html'),
            '/gradpath.html':('gradpath.html','text/html'),
            '/frontend/gradpath.html':('gradpath.html','text/html'),
            '/styles.css':('styles.css','text/css'),
            '/frontend/styles.css':('styles.css','text/css'),
            '/gradpath.js':('web/gradpath.js','application/javascript'),
            '/frontend/web/gradpath.js':('web/gradpath.js','application/javascript'),
            '/frontend/gradpath.js':('web/gradpath.js','application/javascript'),
        }
        if path not in files:
            self.send_json(404, {'error':{'code':'not_found','message':'没有找到这个页面。'}})
            return
        filename, mime = files[path]
        asset = ROOT/'frontend'/filename
        body = asset.read_bytes()
        accepts_gzip = any(part.split(';')[0].strip()=='gzip' and 'q=0' not in part.replace(' ','')
            for part in self.headers.get('Accept-Encoding','').split(','))
        compressed = accepts_gzip and filename in ('web/gradpath.js','styles.css')
        if compressed:
            body = (ROOT/'frontend/web'/('gradpath.js.gz' if filename.endswith('.js') else 'styles.css.gz')).read_bytes()
        self.send_response(200)
        self.send_header('Content-Type', mime+'; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Vary', 'Accept-Encoding')
        if compressed:
            self.send_header('Content-Encoding','gzip')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Referrer-Policy', 'strict-origin-when-cross-origin')
        self.end_headers()
        if self.command != 'HEAD':
            self.wfile.write(body)

    def do_POST(self):
        if urlsplit(self.path).path!='/api/assistant/chat':
            self.send_json(404, {'error':{'code':'not_found','message':'接口不存在。'}})
            return
        try:
            if not self.same_origin():
                raise AssistantError('origin_rejected', '请从本站页面发送问题。', 403)
            if self.headers.get('Content-Type','').split(';')[0].strip()!='application/json':
                raise AssistantError('invalid_request', '请发送 JSON 数据。', 415)
            try:
                length = int(self.headers.get('Content-Length','0'))
            except ValueError:
                length = 0
            if not 0<length<=180000:
                raise AssistantError('payload_too_large', '请求内容过长或长度无效。', 413)
            self.connection.settimeout(12)
            try:
                raw = self.rfile.read(length)
                if len(raw)!=length:
                    raise ValueError('incomplete')
                payload = json.loads(raw)
            except (ValueError, OSError):
                raise AssistantError('invalid_request', '请求内容无法读取，请重试。', 400) from None
            if not self.server.allow_request(self.client_address[0]):
                raise AssistantError('rate_limited', '提问有点频繁，请一分钟后再试。', 429)
            if not self.server.slots.acquire(blocking=False):
                raise AssistantError('busy', '助手正在回复其他同学，请稍后重试。', 429)
            try:
                result = self.server.responder(payload)
            finally:
                self.server.slots.release()
            self.send_json(200, result)
        except AssistantError as exc:
            self.send_json(exc.status, {'error':{'code':exc.code,'message':exc.message}})
        except Exception:
            # Never include provider exception bodies or student content in errors/logs.
            self.send_json(500, {'error':{'code':'internal_error','message':'服务暂时出了点问题，请稍后重试。'}})


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--host', default='127.0.0.1')
    parser.add_argument('--port', type=int, default=8000)
    args = parser.parse_args()
    from dotenv import load_dotenv
    load_dotenv(ROOT/'.env', override=False)
    server = AssistantServer((args.host,args.port))
    print(f'Gradpath server listening on port {server.server_port}; GPT '+('configured' if status()['available'] else 'not configured'), flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__=='__main__':
    main()
