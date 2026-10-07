"""Local dev server for the app: like `python3 -m http.server`, but tells the
browser not to cache, so edits to data and modules always load fresh."""
import http.server
import os
import sys


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)))  # serve app/ from anywhere
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5173
    http.server.ThreadingHTTPServer(('', port), NoCacheHandler).serve_forever()
