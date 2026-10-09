#!/bin/bash
# Serve o app neste computador em http://localhost:8787 (instalável como PWA no Chrome/Edge).
cd "$(dirname "$0")/.." && exec /usr/bin/python3 -m http.server 8787 --bind 127.0.0.1
