'use strict';
// Observação somente-leitura do DOM. Sem interceptar requisições, scripts do cassino, jogos ou credenciais.
(function(){
 const ALIASES={
  timestamp:['data e hora','data/hora','data hora','datetime','timestamp','data','date','hora do giro','horário','horario'],
  game:['jogo','game'], round_id:['rodada','id da rodada','id rodada','round id','round_id','round','id'],
  bet:['aposta','valor apostado','aposta total','bet','bet amount','stake'],
  payout:['prêmio','premio','pagamento','ganho','valor ganho','retorno','payout','win','winning']
 };
 const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
 const pick=(headers,aliases)=>headers.findIndex(h=>aliases.some(a=>h===normalize(a)||h.includes(normalize(a))));
 function decimal(x){
  const s=String(x||'').replace(/R\$|\s/g,'').replace(/[^\d.,-]/g,'');if(!s)return NaN;
  const val=s.includes(',')&&s.includes('.')?(s.lastIndexOf(',')>s.lastIndexOf('.')?s.replace(/\./g,'').replace(',','.'):s.replace(/,/g,'')):s.replace(',','.');
  return /^\d+(?:\.\d+)?$/.test(val)?Number(val):NaN;
 }
 function parseTime(raw){
  const s=String(raw||'').trim();
  const br=s.match(/^(\d{2})\/(\d{2})\/(\d{4})[, ]+(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if(br){const d=new Date(`${br[3]}-${br[2]}-${br[1]}T${br[4]}:${br[5]}:${br[6]||'00'}`);return Number.isFinite(d.getTime())?d.toISOString():null}
  if(!/^\d{4}-\d\d-\d\d(?:[ T]\d\d:\d\d)/.test(s))return null;
  const d=new Date(s);return Number.isFinite(d.getTime())?d.toISOString():null;
 }
 function gameName(s,fallback){s=normalize(s);if(s.includes('tiger')||s.includes('tigrinho'))return 'Fortune Tiger';if(s.includes('rabbit')||s.includes('coelho'))return 'Fortune Rabbit';if(s.includes('ox'))return 'Fortune Ox';return fallback}
 function isVisible(el){return !!(el.getClientRects().length)&&getComputedStyle(el).visibility!=='hidden'}
 let current='Fortune Tiger';
 chrome.storage.local.get(['currentGame'],x=>{if(x.currentGame)current=x.currentGame});
 chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes.currentGame)current=changes.currentGame.newValue});
 function scan(){
  let records=[];
  for(const table of document.querySelectorAll('table')){
   if(!isVisible(table))continue;
   const heading=table.querySelector('thead tr')||table.querySelector('tr');if(!heading)continue;
   const headers=[...heading.querySelectorAll('th,td')].map(t=>normalize(t.innerText||t.textContent));
   const col={};for(const key of ['timestamp','game','round_id','bet','payout'])col[key]=pick(headers,ALIASES[key]);
   if(col.timestamp<0||col.bet<0||col.payout<0)continue;
   const trs=[...table.querySelectorAll('tbody tr')];
   for(const row of (trs.length?trs:[...table.querySelectorAll('tr')].slice(1)).slice(0,1500)){
    if(!isVisible(row))continue;
    const cells=[...row.querySelectorAll('td,th')].map(t=>(t.innerText||t.textContent||'').trim());
    const time=parseTime(cells[col.timestamp]),bet=decimal(cells[col.bet]),payout=decimal(cells[col.payout]);
    if(!time||!Number.isFinite(bet)||bet<=0||!Number.isFinite(payout)||payout<0)continue;
    const game=col.game>=0?gameName(cells[col.game],current):current;
    const round_id=col.round_id>=0?String(cells[col.round_id]||'').trim().slice(0,110):'';
    records.push({timestamp:time,bet,payout,game,round_id});
   }
  }
  chrome.runtime.sendMessage({kind:'FNC_CAPTURE',rows:records.slice(0,1000)},()=>{void chrome.runtime.lastError});
 }
 scan();setInterval(scan,15000);
})();
