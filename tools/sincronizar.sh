#!/bin/bash
# Atualização do Rios ZP-1: puxa o repositório, processa a planilha nova (se houver) e publica.
# Sem remoto configurado ou sem login, processa e commita só no computador e avisa.
set -uo pipefail
cd "$(dirname "$0")/.."
TEM_REMOTO=$(git remote | head -1)
if [ -n "$TEM_REMOTO" ]; then
  git pull --rebase --autostash -q origin main || echo "Aviso: git pull falhou (login ou rede). Seguindo com os arquivos locais."
fi
python3 tools/atualizar.py || exit 1
if [ -n "$(git status --porcelain -- data.json sw.js dados/base)" ]; then
  ATE=$(python3 -c "import json;print(json.load(open('data.json'))['hoje'])")
  git add data.json sw.js dados/base
  git commit -q -m "Atualiza dados até ${ATE}"
  echo "Commit local: dados até ${ATE}."
  if [ -n "$TEM_REMOTO" ]; then
    git push -q origin main && echo "Publicado no GitHub." || echo "Aviso: git push falhou (login do GitHub ausente ou rede). Os dados estão commitados só no computador."
  else
    echo "Aviso: repositório sem remoto no GitHub; nada foi publicado."
  fi
else
  echo "Sem mudanças."
fi
