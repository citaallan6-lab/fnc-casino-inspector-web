/* FNC V10: painel de previsão experimental para o próximo resultado OBSERVADO.
   Sem apostas automáticas. Armazenamento local; nenhuma chave/API. */
(()=>{'use strict';
 const $=id=>document.getElementById(id),core=window.FNCPredict,store=window.FNCVisionAPI;
 if(!core||!store||!$('predGame'))return;
 const KEY='fnc_v10_prospective_predictions';let logs=[],latest=null,prev='',forceTimer=null;
 try{const old=JSON.parse(localStorage.getItem(KEY)||'[]');if(Array.isArray(old))logs=old.slice(-300)}catch(e){}
 function persist(){try{localStorage.setItem(KEY,JSON.stringify(logs))}catch(e){status('Falha ao gravar o registro no armazenamento local.',true)}}
 const percent=x=>x==null||!Number.isFinite(x)?'—':(x*100).toLocaleString('pt-BR',{maximumFractionDigits:1,minimumFractionDigits:1})+'%';
 const nfmt=x=>Number(x).toLocaleString('pt-BR');
 const simple=x=>Number.isFinite(x)?Number(x).toFixed(4):'—';
 const targetName={any:'qualquer pagamento acima de zero',profit:'pagamento maior que a aposta',big:'prêmio de 10x ou mais'};
 function status(s,error=false){const el=$('predStatus');el.textContent=s;el.className='notice'+(error?' warn':'')}
 function schedule(){clearTimeout(forceTimer);forceTimer=setTimeout(()=>render(),900)}
 function render(force=false){
 const game=$('predGame').value,target=$('predTarget').value,all=store.getRecords(),subset=all.filter(r=>!r.demo&&r.game===game);
 const sig=`${game}|${target}|${subset.length}|${subset.at(-1)?.uid||''}|${subset.at(-1)?.timestamp||''}`;
 if(!force&&sig===prev){gradeLogs(all);return;}prev=sig;
 latest=core.assess(all,game,target);
 const a=latest,$a=(id,v)=>{$(id).textContent=v};
 $a('predCount',nfmt(a.rounds));$a('predDays',nfmt(a.days));
 $a('predML',a.forecast?percent(a.forecast.p):'—');
 $a('predBase',a.forecast?percent(a.forecast.baseline):'—');
 $a('predQuality',a.forecast&&a.forecast.validated?'RETROSPECTIVA POSITIVA':'SEM VANTAGEM VALIDADA');
 $a('predBrier',a.test?`${simple(a.test.mlBrier)} vs ${simple(a.test.baselineBrier)}`:'—');
 $a('predAccuracy',a.test?`${percent(a.test.accuracy)} vs ${percent(a.test.baselineAccuracy)}`:'—');
 $('predDetail').textContent=a.forecast?`Probabilidade experimental para o próximo giro com ${targetName[target]}. O modelo usa apenas rodadas anteriores. Se o histórico for incompleto ou o jogo for aleatório, a estimativa pode ser inútil.`:'Aguardando histórico completo para iniciar o teste. O programa não produz probabilidades inventadas.';
 $('predSave').disabled=!a.forecast;
 $('predQualityList').replaceChildren();for(const note of a.quality){const el=document.createElement('div');el.className='rule';el.textContent=note;$('predQualityList').append(el)}
 status(a.forecast?(a.forecast.validated?'O modelo superou a referência em partes do histórico, mas ainda NÃO há vantagem futura comprovada. Registre previsões antes de novas rodadas.':'Modelo treinado. Não superou consistentemente a referência histórica. Previsão apenas experimental.'):`Sem modelo treinado: ${a.rounds} rodadas completas (${Math.max(0,400-a.rounds)} faltando para iniciar).`,!!a.quality.length);
 gradeLogs(all);
 }
 function gradeLogs(all){let changed=false;
 for(const item of logs){if(item.checkedAt)continue;
   const data=core.clean(all,item.game);
   const after=data.find(r=>r.ms>item.createdAt && (item.lastSeenUid ? r.uid!==item.lastSeenUid : true));
   if(!after)continue;
   item.outcome=core.outcome(after,item.target);item.checkedAt=Date.now();item.observedRound=after.round_id||after.uid||'sem ID';item.observedAt=after.ms;changed=true;
 }
 if(changed)persist();drawLogs();
 }
 function drawLogs(){const el=$('predHistory');el.replaceChildren();if(!logs.length){el.textContent='Nenhuma previsão prospectiva registrada. O botão salva a estimativa antes do próximo giro.';return;}
 for(const r of [...logs].reverse().slice(0,20)){const div=document.createElement('div');div.className='status-row';
 const left=document.createElement('span');left.style.maxWidth='72%';left.textContent=`${new Date(r.createdAt).toLocaleString('pt-BR')} · ${r.game} · ${targetName[r.target]} · previsão ${percent(r.probability)}`;
 const right=document.createElement('strong');right.textContent=r.checkedAt?(r.outcome?'PAGOU (observado)':'NÃO PAGOU (observado)'):'AGUARDANDO';right.className=r.checkedAt?(r.outcome?'green':'yellow'):'yellow';div.append(left,right);el.append(div)}
 const decided=logs.filter(r=>r.checkedAt),brier=decided.length?decided.reduce((s,r)=>s+(r.outcome-r.probability)**2,0)/decided.length:null;
 $('predProspective').textContent=`${decided.length} previsão(ões) avaliadas · erro Brier ${brier==null?'—':simple(brier)}. Acerto de evento isolado não demonstra capacidade preditiva. Dados podem conter erros de OCR.`;
 }
 $('predGame').addEventListener('change',()=>render(true));$('predTarget').addEventListener('change',()=>render(true));
 $('predRefresh').addEventListener('click',()=>render(true));
 $('predSave').addEventListener('click',()=>{
  render(true);const p=latest?.forecast;if(!p){status('Sem amostra suficiente para registrar previsão.');return;}
  const game=$('predGame').value,target=$('predTarget').value;
  if(logs.some(r=>!r.checkedAt&&r.game===game&&r.target===target)){status('Há uma previsão pendente para este jogo e tipo. Aguarde o próximo resultado.',true);return;}
  const data=core.clean(store.getRecords(),game);const last=data.at(-1);
  const entry={id:`p-${Date.now()}`,game,target,createdAt:Date.now(),lastSeenUid:last?.uid||'',probability:p.p,baseline:p.baseline,validated:p.validated,checkedAt:null};
  logs.push(entry);logs=logs.slice(-300);persist();drawLogs();status('Estimativa registrada AGORA. Só poderá ser avaliada contra uma rodada observada depois deste horário.');
 });
 $('predExport').addEventListener('click',()=>{
  const blob=new Blob([JSON.stringify({exportedAt:new Date().toISOString(),type:'fnc-v10-predicoes-experimentais',records:logs},null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='fnc-v10-previsoes-prospectivas.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1200);
 });
 $('predVision').addEventListener('click',()=>store.openVision());
 window.addEventListener('fnc:datachange',schedule);setInterval(()=>{if(document.visibilityState==='visible')schedule()},15000);
 render(true);
})();
