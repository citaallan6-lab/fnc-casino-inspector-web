/* FNC Inspector PRO V9 — painel de verificação local sem API ou servidor. */
(function(){'use strict';
  const $=id=>document.getElementById(id), M=window.FNCAIEngine;
  if(!window.FNCVisionAPI||!M||!$('aiGame'))return;
  const store=window.FNCVisionAPI;
  let running=true,previousKey='',latest=null,lastCount=-1,checks=0,lastChecked=0;
  const fmt=(n)=>Number(n).toLocaleString('pt-BR');
  const pt=(r)=>r==null?'—':(100*r).toFixed(1).replace('.',',')+'%';
  const money=(n)=>Number(n).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const hh=(h)=>`${String(h).padStart(2,'0')}:00 – ${String((h+1)%24).padStart(2,'0')}:00`;
  function writeStatus(s,warn=false){$('aiStatus').textContent=s;$('aiStatus').className='notice'+(warn?' warn':'')}
  function render(force=false){
    if(!running&&!force)return;
    const all=store.getRecords(),game=$('aiGame').value,filtered=all.filter(r=>!r.demo&&r.game===game);
    const signature=[game,filtered.length,filtered.at(-1)?.uid||'',filtered.at(-1)?.timestamp||'',all.length].join('|');
    if(!force&&signature===previousKey)return;
    previousKey=signature;latest=M.inspect(all,game);lastCount=latest.n;lastChecked=Date.now();checks++;
    const d=latest,o=d.overall,v=d.verification;
    $('aiAnalyzed').textContent=fmt(d.n);
    $('aiDays').textContent=fmt(d.days);
    $('aiProfit').textContent=pt(o.ratio);
    $('aiCheckTime').textContent=new Date(lastChecked).toLocaleTimeString('pt-BR');
    $('aiRevision').textContent=String(checks);
    $('aiGameLabel').textContent=game;
    $('aiRecommendation').textContent='Nenhum horário confiável para jogar';
    $('aiRecommendation').className='ai-recommendation';
    $('aiReason').textContent=d.n?'A análise automática não estabelece que um horário futuro terá mais pagamentos. Só podemos informar padrões anteriores e seus testes.':'Sem registros reais ainda. Ative FNC Vision OCR ou importe resultados na aba Resultados.';
    $('aiCandidate').textContent=v?hh(v.hour):'—';
    $('aiCandidateNote').textContent=v?
       (v.confirmed?'Anomalia observada em dados posteriores; exige auditoria independente, não é sinal de aposta.':`Hipótese escolhida no treino: ${pt(v.trainRate)} de giros com lucro individual. ${v.enough?'Não se confirmou superioridade robusta no teste posterior.':'Amostra de teste insuficiente.'}`):'Nenhuma faixa horária com amostra suficiente para comparação.';
    $('aiTest').textContent=v&&v.testRate!=null?`${pt(v.testRate)} (${v.testN} rodadas)`:'—';
    $('aiBaseline').textContent=v&&v.otherRate!=null?`${pt(v.otherRate)} (${v.otherN} rodadas)`:'—';
    $('aiQuality').replaceChildren();
    const issues=d.issues.length?d.issues:['Sem alertas elementares. Isso não autentica as rodadas nem comprova previsão.'];
    for(const text of issues){const p=document.createElement('div');p.className='rule';p.textContent=text;$('aiQuality').appendChild(p)}
    const label=`Nova análise de ${game}: ${d.n} rodadas reais em ${d.days} dia(s). `;
    writeStatus(label+(v&&v.confirmed?'Há uma anomalia histórica a conferir, mas não há garantia de ganho.':'Nenhuma vantagem temporal verificada para orientar apostas.'),!(v&&v.confirmed));
    $('aiSummary').textContent=`${new Date().toLocaleString('pt-BR')} · ${game} · ${d.n} rodadas · RTP observado ${pt(o.rtp)} · saldo registrado ${money(o.net)} · ${d.status}.`;
  }
  $('aiGame').addEventListener('change',()=>render(true));
  $('aiRefresh').addEventListener('click',()=>render(true));
  $('aiToggle').addEventListener('click',()=>{
    running=!running;$('aiToggle').textContent=running?'Pausar análises':'Retomar análises';
    $('aiMode').textContent=running?'ATIVO · REAVALIA A CADA NOVA RODADA':'PAUSADO';
    if(running)render(true);
    else writeStatus('Análises pausadas. A captura Vision pode continuar funcionando separadamente.',true);
  });
  $('aiOpenVision').addEventListener('click',()=>store.openVision());
  $('aiExport').addEventListener('click',()=>{
    render(true);if(!latest)return;
    const report={created_at:new Date().toISOString(),type:'auditoria-estatistica-local',platform:'3ss.vip',target:latest.game,
      sample:{records:latest.n,days:latest.days,ocr:latest.ocr,automatic_ocr:latest.auto,original_ids:latest.withId},
      aggregated:latest.overall,chronological_validation:latest.verification,quality_warnings:latest.issues,
      conclusion:'Não há horário comprovadamente seguro ou favorável para apostar. Dados do cassino podem ser incompletos e amostras históricas não prevêem sorteios futuros.'};
    const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download='fnc-inspector-v9-relatorio.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1200);
  });
  window.addEventListener('fnc:datachange',()=>render());
  setInterval(()=>{if(running&&document.visibilityState==='visible')render()},10000);
  render(true);
})();
