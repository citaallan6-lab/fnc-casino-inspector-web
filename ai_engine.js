/* FNC AI — motor estatístico auditável. Não prevê RNG nem instrui apostas. */
(function(root, factory){
  const engine=factory();
  if (typeof module==='object' && module.exports) module.exports=engine;
  else root.FNCAIEngine=engine;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const GAMES=['Fortune Tiger','Fortune Ox','Fortune Rabbit'];
  function wilson(k,n,z=1.96){
    if(!n)return [0,1];const p=k/n,den=1+z*z/n,mid=(p+z*z/(2*n))/den;
    const err=z*Math.sqrt((p*(1-p)+z*z/(4*n))/n)/den;
    return [Math.max(0,mid-err),Math.min(1,mid+err)];
  }
  const dayKey=(ms)=>{const d=new Date(ms);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
  const uniqDays=(arr)=>new Set(arr.map(r=>dayKey(r.ms))).size;
  function normalize(all,game){
    const now=Date.now();
    const items=(Array.isArray(all)?all:[]).filter(r=>r&&!r.demo&&(!game||r.game===game)).map(r=>{
      const ms=Date.parse(r.timestamp),bet=Number(r.bet),paid=Number(r.payout);
      if(!Number.isFinite(ms)||ms<=0||ms>now+60000||!Number.isFinite(bet)||bet<=0||!Number.isFinite(paid)||paid<0)return null;
      return {ms,bet,paid,game:r.game,round_id:String(r.round_id||''),notes:String(r.notes||''),source_url:String(r.source_url||''),uid:String(r.uid||'')};
    }).filter(Boolean).sort((a,b)=>a.ms-b.ms || a.uid.localeCompare(b.uid));
    return items;
  }
  function accum(rows){
    const sumBet=rows.reduce((a,r)=>a+r.bet,0),sumPaid=rows.reduce((a,r)=>a+r.paid,0);
    const profitable=rows.filter(r=>r.paid>r.bet).length;
    return {n:rows.length,profit:profitable,ratio:rows.length?profitable/rows.length:null,
      rtp:sumBet>0?sumPaid/sumBet:null,net:sumPaid-sumBet,interval:wilson(profitable,rows.length)};
  }
  function inspect(all,game){
    const rows=normalize(all,game),n=rows.length,overall=accum(rows);
    const ocr=rows.filter(r=>/VISION.*OCR|VISION V8|VISION V9/i.test(r.notes)).length;
    const auto=rows.filter(r=>/AUTOM[AÁ]TICO/i.test(r.notes)).length;
    const withId=rows.filter(r=>r.round_id&&!r.round_id.startsWith('VISION-')).length;
    const days=uniqDays(rows);
    const issues=[];
    if(n<300)issues.push(`Apenas ${n} rodadas reais (necessárias ao menos 300 para um teste exploratório).`);
    if(days<10)issues.push(`Cobertura de ${days} dia(s); use múltiplos dias para testar horários.`);
    if(ocr)issues.push(`${ocr} resultado(s) vieram de OCR e precisam de conferência, incluindo giros sem prêmio.`);
    if(auto)issues.push(`${auto} leitura(s) automáticas: uma detecção perdida pode distorcer as taxas.`);
    if(withId<n)issues.push(`${n-withId} rodada(s) sem ID original verificável.`);
    // Separação temporal antes de escolher candidatos. Sem treino com dados posteriores.
    const cut=Math.floor(n*0.7);
    const train=rows.slice(0,cut),test=rows.slice(cut);
    const selected=[];
    for(let hr=0;hr<24;hr++){
      const tr=train.filter(r=>new Date(r.ms).getHours()===hr);
      const other=train.filter(r=>new Date(r.ms).getHours()!==hr);
      if(tr.length>=20&&other.length>=60&&uniqDays(tr)>=3){
        const a=accum(tr),b=accum(other);
        selected.push({hour:hr,train:tr.length,trainRate:a.ratio,lift:a.ratio-b.ratio});
      }
    }
    selected.sort((a,b)=>b.lift-a.lift);
    const candidate=selected[0]||null;
    let verification=null;
    if(candidate){
      const tr=test.filter(r=>new Date(r.ms).getHours()===candidate.hour);
      const other=test.filter(r=>new Date(r.ms).getHours()!==candidate.hour);
      const a=accum(tr),b=accum(other);
      // Compara período que não participou da escolha do horário.
      const enough=n>=300 && days>=10 && test.length>=80 && tr.length>=20 && other.length>=60 && uniqDays(tr)>=3 && uniqDays(test)>=4;
      // É um aviso de possível anomalia, nunca uma recomendação de aposta.
      const confirmed=!!enough && a.interval[0]>b.interval[1] && a.net>0 && a.rtp>1;
      verification={hour:candidate.hour,trainRate:candidate.trainRate,trainN:candidate.train,
        testN:a.n,testRate:a.ratio,otherN:b.n,otherRate:b.ratio,
        candidateCI:a.interval,otherCI:b.interval,days:uniqDays(tr),
        enough,confirmed,net:a.net,rtp:a.rtp};
    }
    return {game,n,days,overall,ocr,auto,withId,issues,verification,
      status:verification&&verification.confirmed?'ANOMALIA HISTÓRICA A CONFERIR':'SEM HORÁRIO DE GANHO COMPROVADO',
      note:'Um horário com pagamentos anteriores não prevê novos pagamentos em jogos aleatórios. Uma anomalia estatística pode refletir viés, seleção de amostra ou acaso.'};
  }
  return {GAMES,normalize,wilson,accum,inspect};
});
