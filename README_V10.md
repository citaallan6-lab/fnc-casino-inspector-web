# FNC Inspector PRO V10 — IA Preditiva local

## Instalar no site já existente

1. Faça backup do histórico pelo menu Resultados → Exportar CSV.
2. Abra https://github.com/citaallan6-lab/fnc-casino-inspector-web
3. Na raiz, substitua `index.html`, `ai_panel.js`, `service-worker.js`, `manifest.webmanifest` e adicione `predict_engine.js`, `predict_panel.js`. Os demais arquivos V9 permanecem iguais. Para facilitar, pode reenviar **todos** os arquivos do ZIP SITE (não envie o ZIP compactado).
4. Confirme as alterações na `main`. Em `Settings → Pages` verifique `Deploy from a branch`, `main`, `/(root)`.
5. Aguarde o GitHub Pages atualizar e force recarregamento com Ctrl + Shift + R.
6. Entre em `IA Preditiva V10`, selecione o jogo e o evento-alvo.

## Como funciona na prática

- Regressão logística L2 real, treinada no navegador; não é prompt para chatbot nem sinal inventado.
- Usa apenas resultados anteriores: pagamentos recentes, frequências dos últimos 3/10/30 giros, sequências, multiplicador anterior e codificação cíclica de hora.
- Divide os dados em ordem cronológica: 60% treino, 20% validação e 20% teste retrospectivo. Escolhe o parâmetro de regularização com a validação, sem usar o teste para escolher o modelo.
- Calcula uma **probabilidade experimental para o próximo giro**, a taxa histórica de referência e um erro Brier comparativo (menor é melhor).
- O botão `Registrar previsão antes do próximo giro` grava no `localStorage` a estimativa e a hora. Quando uma rodada posterior chegar ao histórico, o painel marca o resultado observado sem alterar a previsão original. Exporte os registros JSON para guardar uma cópia.
- Precisa de no mínimo **400 giros completos**, incluindo os de pagamento zero, do mesmo jogo; usa no máximo as 1.800 rodadas mais recentes para o navegador continuar responsivo.
- Quando novos resultados são salvos pela importação, extensão ou FNC Vision V8, o treinamento é disparado novamente.
- As estatísticas são locais; o projeto não envia capturas ou histórico para uma API remota de IA. A captura visual requer permissão explícita do Chrome e OCR calibrado.

## Como verificar se é útil

Compare o erro Brier da IA com o erro da frequência histórica. Um erro pontualmente menor não prova previsão futura. A estimativa não deve ser usada como recomendação de aposta. Recolha novas rodadas e verifique a seção de previsões prospectivas.

**Limites fundamentais:** em caça-níqueis com sorteios independentes e seguros, modelos baseados em histórico geralmente não aprendem uma vantagem verdadeira; taxas de 85–90% não são garantidas. Ganhar um prêmio (payout > 0) não é o mesmo que lucrar. A V10 não está comprovadamente integrada à tela real da 3SS: sem resultados coletados/validados, não haverá previsões credíveis.

## APIs pagas

Não são necessárias para classificação estatística local. Um serviço pago pode aumentar poder computacional e ajudar na leitura visual, mas não oferece conhecimento de sorteios futuros. Nunca coloque uma chave de API privada diretamente nos arquivos públicos do GitHub Pages.

## Privacidade e backups

Histórico e previsões são salvos somente no navegador, usando `localStorage`. Limpar dados do site pode apagá-los. Exporte backups. Não publique capturas pessoais, senhas, cookies, tokens ou API keys.

## Testes

O `test_predict.js` executado com Node confere: entrada vazia/demo; separação temporal; probabilidades finitas; cenário aleatório sem vantagem observada; cenário com dependência histórica sintética, no qual o algoritmo aprende de fato. Testes de interface no Chrome podem exigir ambiente fora das restrições desta sessão.
