'use strict';
const MAX_ITEMS=5000;
function validSite(sender){
 try{const u=new URL(sender.url||sender.origin||'');return u.protocol==='https:'&&u.hostname.endsWith('.github.io')||(['localhost','127.0.0.1'].includes(u.hostname)&&u.protocol==='http:')}catch{return false}
}
function validCasino(sender){
 try{const u=new URL(sender.url||'');return u.protocol==='https:'&&(u.hostname==='3ss.vip'||u.hostname.endsWith('.3ss.vip'))}catch{return false}
}
async function ensureToken(){
 const v=await chrome.storage.local.get(['pairToken']);
 if(typeof v.pairToken==='string'&&/^[0-9a-f]{32}$/.test(v.pairToken))return v.pairToken;
 const arr=new Uint8Array(16);crypto.getRandomValues(arr);
 const token=[...arr].map(x=>x.toString(16).padStart(2,'0')).join('');
 await chrome.storage.local.set({pairToken:token});return token;
}
chrome.runtime.onInstalled.addListener(()=>{ensureToken().catch(()=>{})});
chrome.runtime.onMessage.addListener((msg,sender,reply)=>{
 if(!msg||msg.kind!=='FNC_CAPTURE'||!validCasino(sender))return false;
 (async()=>{
  const data=await chrome.storage.local.get(['rounds','lastScan']);
  const stored=Array.isArray(data.rounds)?data.rounds:[];
  const known=new Set(stored.map(r=>r.game+'|'+(r.round_id||`${r.timestamp}|${r.bet}|${r.payout}`)));
  let appended=0;const list=Array.isArray(msg.rows)?msg.rows.slice(0,1000):[];
  for(const r of list){
   if(!r||!['Fortune Tiger','Fortune Ox','Fortune Rabbit'].includes(r.game)||typeof r.timestamp!=='string'||!Number.isFinite(Date.parse(r.timestamp)))continue;
   if(!Number.isFinite(r.bet)||r.bet<=0||!Number.isFinite(r.payout)||r.payout<0)continue;
   const record={timestamp:r.timestamp,game:r.game,round_id:String(r.round_id||'').slice(0,110),bet:r.bet,payout:r.payout,platform:'3ss.vip',source_url:'https://3ss.vip',notes:'Captura experimental de tabela HTML visível'};
   const key=record.game+'|'+(record.round_id||`${record.timestamp}|${record.bet}|${record.payout}`);
   if(!known.has(key)){known.add(key);stored.push(record);appended++}
  }
  await chrome.storage.local.set({rounds:stored.slice(-MAX_ITEMS),lastScan:`Última leitura: ${new Date().toLocaleString('pt-BR')} · ${list.length} linhas visíveis · +${appended} novas`});
  reply({ok:true,newRows:appended,total:stored.length});
 })().catch(e=>reply({ok:false,error:String(e.message)}));
 return true;
});
chrome.runtime.onMessageExternal.addListener((msg,sender,reply)=>{
 (async()=>{
   if(!validSite(sender))return {ok:false,error:'Origem não autorizada'};
   if(!msg||msg.kind!=='FNC_SYNC')return {ok:false,error:'Comando não reconhecido'};
   const token=await ensureToken();
   if(msg.token!==token)return {ok:false,error:'Pareamento inválido'};
   const data=await chrome.storage.local.get(['rounds','lastScan']);
   return {ok:true,rows:(Array.isArray(data.rounds)?data.rounds:[]).slice(-MAX_ITEMS),lastScan:data.lastScan||'Nenhum histórico capturado'};
 })().then(reply).catch(e=>reply({ok:false,error:String(e.message)}));
 return true;
});
