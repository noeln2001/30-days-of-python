"""
PyMaster 30 - Local Development & Execution Server
Serves the webapp, course images, datasets, and provides safe local Python code execution.
"""

import http.server
import socketserver
import urllib.parse
import json
import subprocess
import sys
import os
import time
import webbrowser

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(BASE_DIR)
CONTENT_ROOT = os.path.join(REPO_ROOT, "30-Days-Of-Python-master")
IMAGES_DIR = os.path.join(CONTENT_ROOT, "images")
DATA_DIR = os.path.join(CONTENT_ROOT, "data")
PROGRESS_FILE = os.path.join(BASE_DIR, "user_progress.json")

PORT = 5000

class PyMasterHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def end_headers(self):
        # Enable CORS and disable aggressive caching for dev
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        # Route /images/* to the repository images directory
        if path.startswith('/images/'):
            filename = path[len('/images/'):]
            img_path = os.path.join(IMAGES_DIR, filename)
            if os.path.isfile(img_path):
                self.serve_custom_file(img_path)
                return

        # Route /data/* to the repository data directory
        if path.startswith('/data/'):
            filename = path[len('/data/'):]
            data_file_path = os.path.join(DATA_DIR, filename)
            if os.path.isfile(data_file_path):
                self.serve_custom_file(data_file_path)
                return

        # Route /api/status
        if path == '/api/status':
            resp = {
                'status': 'online',
                'python_version': sys.version,
                'executable': sys.executable,
                'images_dir_exists': os.path.isdir(IMAGES_DIR),
                'data_dir_exists': os.path.isdir(DATA_DIR)
            }
            self.send_json(resp)
            return

        # Route /api/progress
        if path == '/api/progress':
            progress = {}
            if os.path.isfile(PROGRESS_FILE):
                try:
                    with open(PROGRESS_FILE, 'r', encoding='utf-8') as f:
                        progress = json.load(f)
                except Exception:
                    progress = {}
            self.send_json(progress)
            return

        # Default fallback to static files
        super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(length).decode('utf-8') if length > 0 else '{}'

        try:
            payload = json.loads(body)
        except Exception:
            payload = {}

        if path == '/api/run':
            code = payload.get('code', '')
            t0 = time.time()
            try:
                # Run with timeout protection
                proc = subprocess.run(
                    [sys.executable, '-c', code],
                    cwd=CONTENT_ROOT,
                    capture_output=True,
                    text=True,
                    timeout=8
                )
                t1 = time.time()
                resp = {
                    'success': proc.returncode == 0,
                    'stdout': proc.stdout,
                    'stderr': proc.stderr,
                    'returncode': proc.returncode,
                    'duration_ms': round((t1 - t0) * 1000, 2)
                }
            except subprocess.TimeoutExpired:
                resp = {
                    'success': False,
                    'stdout': '',
                    'stderr': 'Execution timed out (exceeded 8 seconds limit). Check for infinite loops!',
                    'returncode': -1,
                    'duration_ms': 8000
                }
            except Exception as e:
                resp = {
                    'success': False,
                    'stdout': '',
                    'stderr': str(e),
                    'returncode': -1,
                    'duration_ms': 0
                }

            self.send_json(resp)
            return

        if path == '/api/progress':
            try:
                with open(PROGRESS_FILE, 'w', encoding='utf-8') as f:
                    json.dump(payload, f, indent=2)
                self.send_json({'status': 'saved'})
            except Exception as e:
                self.send_json({'status': 'error', 'message': str(e)}, status=500)
            return

        self.send_response(404)
        self.end_headers()

    def serve_custom_file(self, full_path):
        import mimetypes
        ctype, _ = mimetypes.guess_type(full_path)
        if not ctype:
            ctype = 'application/octet-stream'

        try:
            with open(full_path, 'rb') as f:
                content = f.read()
            self.send_response(200)
            self.send_header('Content-Type', ctype)
            self.send_header('Content-Length', str(len(content)))
            self.end_headers()
            self.wfile.write(content)
        except Exception:
            self.send_response(500)
            self.end_headers()

    def send_json(self, data, status=200):
        body = json.dumps(data).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

def run_server(port=PORT):
    # Try specified port, or increment if in use
    for p in range(port, port + 10):
        try:
            socketserver.TCPServer.allow_reuse_address = True
            with socketserver.TCPServer(("", p), PyMasterHandler) as httpd:
                url = f"http://localhost:{p}"
                print("=" * 60)
                print(f"[+] PyMaster 30 Studio is running!")
                print(f"[*] Open in your browser: {url}")
                print(f"[*] In-Browser Python & Local Runner: Active")
                print("=" * 60)
                webbrowser.open(url)
                httpd.serve_forever()
                break
        except OSError:
            continue

if __name__ == "__main__":
    run_server()
