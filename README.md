# Rios ZP-1

App web instalável (PWA): níveis observados e previsão dos rios da ZP-1 em referência ao NR da carta.

## Arquivos
- `index.html`, `styles.css`, `app.js`: o app, sem dependências.
- `data.json`: dados prontos, gerados por `tools/atualizar.py`. Não editar.
- `dados/`: a planilha `.xlsx` de leituras. `dados/base/` guarda a base acumulada e as tabelas editáveis (`estacoes.json` com o NR adotado; `sipam.json` e `sipam_prog.json` com o boletim SipamHidro).
- `tools/atualizar.py`: lê a planilha, cadastra só os dias novos, refaz o controle de qualidade, recalcula a previsão e grava `data.json`.
- `tools/sincronizar.sh`: `git pull`, `atualizar.py`, commit e push. Só age se a planilha mudou.
- `files/`: fichas F-43.

## Atualizar
1. Envie a nova planilha para `dados/`.
2. A tarefa agendada roda `tools/sincronizar.sh`. À mão: `bash tools/sincronizar.sh`.

Um valor por dia (a última leitura). Dia fechado com valor diferente não sobrescreve a base e aparece em `dados/base/relatorio.txt` (`--revisar` aceita). Requer `pip install openpyxl`.

Para mudar um NR: edite `nr_adotado_m` em `dados/base/estacoes.json` e rode `python3 tools/atualizar.py --forcar`.

## Instalar
Cada pessoa confirma no próprio aparelho. Android: Chrome → ⋮ → Instalar app. iPhone: Safari → Compartilhar → Adicionar à Tela de Início.

## Teste local
`python3 -m http.server 8000` e abrir http://localhost:8000.

## Texto para compartilhar

```
*Rios ZP-1* · nível e previsão dos rios da Zona de Praticagem 1 (Manaus, Itacoatiara, Parintins, Juruti, Óbidos, Santarém, Oriximiná e Porto Trombetas).

• Nível observado e previsão de 100 dias, sempre em relação ao NR da carta (ou ao zero da régua)
• Alerta de cruzamento do NR e comparação com o boletim SipamHidro
• Calculadora de FAQ (folga abaixo da quilha) com calado e squat
• Para celular e computador; instale pelo navegador (Android: Chrome ⋮ › Instalar app; iPhone: Safari › Compartilhar › Adicionar à Tela de Início)

Previsões empíricas, de caráter informativo.
https://maregrafista.github.io/Rios-ZP-1/
```

O mesmo texto está no app (Ciência › Compartilhar o app). `tools/gerar_artefato.py` gera `artefato/index.html`, a versão de arquivo único hospedada como artefato do Claude.

## Lançar uma leitura avulsa

Estação, régua (m) e data, em qualquer ordem e com ou sem vírgulas:

```
python3 tools/lancar.py "Manaus, 25 m, 10/12/2025"
python3 tools/lancar.py "10/12/2025 25,3 Santarém"
```

Também vale escrever uma linha por leitura em `dados/lancamentos.txt` (pode ser editado no GitHub pelo celular). A rotina agendada lê o arquivo, lança no app, move as linhas para `dados/base/lancamentos_log.txt` e publica. Use `--simular` para só conferir como a linha foi entendida.
