"""Read-only public preview: no model calls, credentials or repository file listing."""
import argparse
from http.server import ThreadingHTTPServer
from urllib.parse import urlsplit
try:
    from .serve_gradpath import Handler
except ImportError:
    from serve_gradpath import Handler


class PreviewHandler(Handler):
    def do_GET(self):
        path=urlsplit(self.path).path
        if path=='/api/assistant/status':
            self.send_json(200,{'available':False,'provider':'OpenAI','model':None})
        elif path.startswith('/api/'):
            self.send_json(404,{'error':{'code':'preview_only','message':'此预览只展示页面。'}})
        else:
            super().do_GET()

    def do_POST(self):
        self.send_json(405,{'error':{'code':'preview_only','message':'在线页面预览尚未开启 GPT 服务。'}})


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--host',default='127.0.0.1')
    parser.add_argument('--port',type=int,default=3100)
    args=parser.parse_args()
    server=ThreadingHTTPServer((args.host,args.port),PreviewHandler)
    print(f'Gradpath read-only preview listening on port {server.server_port}',flush=True)
    try:server.serve_forever()
    except KeyboardInterrupt:pass
    finally:server.server_close()


if __name__=='__main__':main()
