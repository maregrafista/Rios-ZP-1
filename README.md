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


## v1.7
- Faixas de anomalia (σ, escala do SipamHidro) no gráfico principal, régua de anomalia no cartão da estação e coluna "Anom. σ" na tabela de estações. Camada ligável em Camadas → "Faixas de anomalia".
- Modo apresentação (botão de tela no topo): tela cheia, rotação automática a cada 15 s; setas ←/→, espaço pausa, Esc sai.
- Nova estação: `python3 tools/nova_estacao.py "Nome" --rio "Rio X" --uf PA --nr 2,10` e depois lançar as leituras. Estações fora do esquema fluvial aparecem em "Outras estações". A previsão exige histórico (≥ 1 ano de leituras diárias).

## v1.8 — base histórica ampliada e aba Séries
- `python3 tools/importar_ana.py` lê `dados/ana/*_Cotas.txt` (ANA/Hidroweb) e `dados/fontes/Santarem_regua_longa.xlsx` e grava `dados/base/historico.json` (+ `historico_meta.json`, `historico_relatorio.txt`). Regras: cotas em cm → m; mês consistido (2) prevalece sobre bruto (1); só status 1 e 2; dias sem dado = NaN; trechos em outro zero de régua ou com valores impossíveis ficam em `EXCLUIR` (Itacoatiara até fev/2008, Oriximiná até 1970, Porto Trombetas até 2019).
- `tools/atualizar.py`: série = histórico + leituras (planilha e lançamentos prevalecem). Controle de qualidade: (1) pico local > 0,8 m da mediana de ±5 d; (2) ≥ 3 σ da série quando a sequência tem ≤ 5 dias. Sequências longas além de 3 σ são eventos reais (ex.: vazante de Manaus em out/2024) e não são removidas.
- Previsão usa até os 20 anos anteriores; anomalia (σ) usa os 30 anos mais recentes com dado (mínimo de 8).
- Novas estações: Tabatinga, Novo Airão e Almeirim (NR das fichas F-43/F-41 em `dados/fontes/`). Sem leitura recente (> 45 d) aparecem como "Sem leitura recente" e ficam fora das sínteses.
- Removidas as camadas de incerteza empírica e faixa nominal 95%. Nova aba **Séries** (série completa, máximas/mínimas anuais, curva de permanência, anos análogos, consulta rápida e ficha da série).
- Ao editar `app.js` ou `styles.css` à mão, rode `python3 tools/atualizar.py --regenerar` para renovar o `?v=` e o cache do navegador.

## v1.9
- Almeirim removida. Fontes de régua em `dados/fontes/<Estação>_regua.xlsx` (formato Estação | Data | Nível, última leitura do dia); `importar_ana.py` lê todas.
- Reparo de sinal: a planilha perdia o “−” de níveis negativos (Parintins, 2023–24; também Tabatinga/Trombetas em alguns dias). `atualizar.py` usa o valor da ANA do mesmo dia ou, sem ANA, a continuidade da série. Pico local passou para 0,5 m.
- “Resumo do dia” virou uma folha rolável (sem auto-avanço). Tabelas encolhem no celular (colunas `hm` ocultas); textos de Info e Séries enxugados.
