# FNC Casino Inspector PRO V7

Site estático, responsivo e sem dependências externas, feito para Chrome de PC/Android. O painel analisa os **dados que você realmente possui**. Não promete antecipar ganhos.

## O que funciona

- Registrar manualmente rodadas (jogo, data/hora, valor apostado, prêmio, ID, fonte).
- Importar CSV, inclusive separador `;`, e colar dados em formato CSV.
- Salvar resultados no armazenamento local do navegador e exportá-los em CSV, JSON ou relatório TXT.
- Analisar RTP observado, saldo, pagamentos e problemas de integridade.
- Comparar Fortune Tiger, Fortune Ox e Fortune Rabbit por **histórico registrado**.
- Registrar hipóteses de janelas de 3, 5, 10 e 15 minutos, comparar com dados coletados depois e testar frequências antigas e recentes.
- Usar no Android sem APK. Inclui manifesto PWA e cache para abrir o painel depois da primeira visita (dados e arquivos ficam somente naquele navegador).

## Publicar no GitHub Pages (PC)

1. Extraia `FNC_INSPECTOR_SITE_GITHUB.zip`.
2. Abra https://github.com/new e crie um repositório público, por exemplo `fnc-casino-inspector-web`.
3. Dentro do repositório, em `Add file` > `Upload files`, envie **os arquivos da pasta extraída** (`index.html`, `manifest.webmanifest`, `service-worker.js`, `icon.svg`, `.nojekyll`) para a raiz. **Não suba o ZIP como único arquivo.** Confirme em `Commit changes`.
4. Abra `Settings` > `Pages` e selecione `Deploy from a branch`, branch `main`, pasta `/(root)`; clique em `Save`.
5. Abra o link `Visit site` após a publicação. O formato padrão é `https://SEU_USUARIO.github.io/fnc-casino-inspector-web/`.

O GitHub Pages executa HTML/JS e hospeda arquivos estáticos. Ele **não roda Python** nem consegue acessar outra aba do cassino sem uma extensão ou uma integração autorizada.

## Coleta opcional de tabela de histórico no Chrome do PC

1. Extraia o ZIP completo, deixando a pasta `extensao_chrome` no computador.
2. No Chrome do Windows, abra `chrome://extensions`, ative `Modo do desenvolvedor`, escolha `Carregar sem compactação` e selecione a pasta `extensao_chrome`.
3. Clique no ícone da extensão no Chrome, selecione o jogo, copie o ID da extensão e o código de pareamento (dois valores distintos).
4. No site publicado, acesse `Conectar Chrome`, cole os dois valores e clique em `Conectar extensão`.
5. Abra a 3ss.vip em outra aba, faça login por conta própria e mantenha o histórico visível. A extensão tenta ler tabelas HTML a cada 15 segundos. O site tenta sincronizar a cada 15 segundos enquanto sua aba estiver visível.

**Limites importantes da coleta:** esta extensão só tem acesso autorizado a `3ss.vip` e seus subdomínios HTTPS; se a plataforma redirecionar para outro domínio, exibir dados apenas em canvas ou em iframe de domínio terceiro, não haverá extração até adaptar o leitor com dados legítimos da tela. A extração automática **não foi validada na 3SS real**. O sistema não tenta acessar dados ocultos, burlar proteções, interceptar sessões ou executar apostas. **Chrome Android não suporta normalmente este tipo de extensão**, por isso a importação manual/CSV é o caminho móvel.

### Formato para importar resultados

```csv
timestamp,platform,game,round_id,bet,payout,source_url,notes
2026-10-18T11:04:00,3ss.vip,Fortune Tiger,EX-001,1.00,0.00,,exemplo de formato
2026-10-18T11:04:30,3ss.vip,Fortune Ox,EX-002,1.00,2.20,,exemplo de formato
```

As linhas acima **são exemplos de FORMATO, não resultados reais**. Remova-as e importe registros verdadeiros antes de usar a auditoria. Não adicione arquivos com dados reais, senhas, tokens ou credenciais no repositório público.

## Sobre a função de janelas e sinais

O botão `Gerar hipótese de janela` registra o jogo, duração, critério e momento de emissão, antes da janela terminar. Frequências históricas e backtest são números reais sobre os registros, mas **não representam chance comprovada de ganhar no próximo intervalo**. Não há modelo validado com 85–90% de acerto na 3SS e nenhum aplicativo pode prometer esse desempenho a partir de resultados passados de um RNG seguro.

## Privacidade

- Não possui servidor próprio, login interno ou sincronização de resultados entre aparelhos.
- Os resultados do site ficam no armazenamento local do navegador e podem sumir quando dados de navegação forem apagados.
- Os resultados da extensão ficam no `chrome.storage.local` do Chrome. O site só os recebe após pareamento com token privado.
- Não guarda senha, CPF, cookies nem dados pessoais; o site não solicita suas credenciais.
- Faça backup dos resultados em CSV/JSON após sessões importantes.

**Versão:** V7.1 · Site público com dados locais · Integração Chrome experimental · Não afiliado à 3SS.
