'use strict';
const $=id=>document.getElementById(id);
$('id').textContent=chrome.runtime.id;
chrome.storage.local.get(['pairToken','rounds','lastScan','currentGame'],v=>{
 $('token').textContent=v.pairToken||'Feche e reabra a extensão';$('total').textContent=(v.rounds||[]).length+' rodadas capturadas';$('scan').textContent=v.lastScan||'Sem leitura';if(v.currentGame)$('game').value=v.currentGame;
});
$('game').addEventListener('change',()=>chrome.storage.local.set({currentGame:$('game').value}));
$('copy').addEventListener('click',async()=>{await navigator.clipboard.writeText($('token').textContent);$('copy').textContent='Código copiado ✓'});
$('clear').addEventListener('click',()=>{if(confirm('Apagar as rodadas guardadas na extensão?'))chrome.storage.local.set({rounds:[],lastScan:'Histórico apagado'},()=>{$('total').textContent='0 rodadas';$('scan').textContent='Histórico apagado'})});
