import http.server, socketserver, os, time, urllib.parse
B='/tmp/swt'
class H(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        root=open(B+'/ROOT').read().strip(); p=urllib.parse.urlparse(path).path
        return os.path.join(B, root, p.lstrip('/')) if p!='/' else os.path.join(B, root, 'index.html')
    def do_GET(self):
        root=open(B+'/ROOT').read().strip()
        if root=='offline': self.close_connection=True; self.connection.close(); return
        if urllib.parse.urlparse(self.path).path=='/':
            try: d=float(open(B+'/DELAY').read().strip() or 0)
            except: d=0
            if d: time.sleep(d)
        # always send the real file: builds are swapped by directory, so file dates say nothing about content
        for h in ('If-Modified-Since','If-None-Match'):
            if h in self.headers: del self.headers[h]
        return super().do_GET()
    def end_headers(self): self.send_header('Cache-Control','no-cache'); super().end_headers()
    def log_message(self,*a): pass
class T(socketserver.ThreadingMixIn, http.server.HTTPServer): daemon_threads=True; allow_reuse_address=True
T(('',8768),H).serve_forever()
