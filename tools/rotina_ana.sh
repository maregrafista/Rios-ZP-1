#!/bin/bash
# Rotina automática (a cada 4 h): busca as leituras da ANA, lança no app e publica no GitHub.
export PATH="/Library/Frameworks/Python.framework/Versions/3.13/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
cd "$(dirname "$0")/.." || exit 1
echo "=== $(date '+%d/%m/%Y %H:%M') ==="
python3 tools/ana_api.py --lancar 30 || { echo "Falha ao consultar a ANA; nada foi lançado."; exit 1; }
bash tools/sincronizar.sh
