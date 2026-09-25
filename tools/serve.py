#!/usr/bin/env python3
"""Static preview server for docs/.  Usage: python3 tools/serve.py [port]"""
import os, sys, functools, http.server, socketserver
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "docs")
os.chdir(os.path.abspath(ROOT))
port = int(sys.argv[1]) if len(sys.argv) > 1 else 8788
H = functools.partial(http.server.SimpleHTTPRequestHandler, directory=os.getcwd())
socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("127.0.0.1", port), H) as s:
    print(f"serving {os.getcwd()} on http://127.0.0.1:{port}", flush=True)
    s.serve_forever()
