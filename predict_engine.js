/* FNC Inspector V10 — modelo real de classificação logística probabilística.
 * Funciona 100% local, sem API e sem acesso a resultados futuros do servidor.
 * NUNCA usar saídas como garantia ou indicação segura de apostar. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FNCPredict=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const sigmoid=(z)=>z>=0?1/(1+Math.exp(-z)):Math.exp(z)/(1+Math.exp(z));
const brier=(ys,ps)=>ys.reduce((s,y,i)=>s+(y-ps[i])**2,0)/ys.length;
const logLoss=(ys,ps)=>ys.reduce((s,y,i)=>s-y*Math.log(clamp(ps[i],1e-6,1-1e-6))-(1-y)*Math.log(clamp(1-ps[i],1e-6,1-1e-6)),0)/ys.length;
const day=(ms)=>new Date(ms).toISOString().slice(0,10);
function clean(all,game){const now=Date.now();const data=(Array.isArray(all)?all:[]).filter(r=>r&&!r.demo&&r.game===game).map(r=>{
 const ms=Date.parse(r.timestamp),bet=Number(r.bet),payout=Number(r.payout);
 if(!Number.isFinite(ms)||ms<1||ms>now+60000||!Number.isFinite(bet)||bet<=0||!Number.isFinite(payout)||payout<0)return null;
 return {ms,bet,payout,round_id:String(r.round_id||''),uid:String(r.uid||''),notes:String(r.notes||''),source_url:String(r.source_url||'')};
}).filter(Boolean).sort((a,b)=>a.ms-b.ms||a.uid.localeCompare(b.uid));
 const seen=new Set();return data.filter(r=>{const key=r.round_id?`${r.round_id}/${day(r.ms)}`:`${r.ms}/${r.bet}/${r.payout}`;if(seen.has(key))return false;seen.add(key);return true});}
function outcome(r,target){const m=r.payout/r.bet;if(target==='any')return +(m>0);if(target==='big')return +(m>=10);return +(m>1)}
function features(prior){const last=prior[prior.length-1];const recent=(n)=>prior.slice(-n);const frac=(n)=>{const ar=recent(n);return ar.length?ar.reduce((s,r)=>s+r.y,0)/ar.length:0};
 let streak=0;if(last){for(let i=prior.length-1;i>=0&&prior[i].y===last.y&&streak<12;i--)streak++;}
 const hr=new Date(last?.ms||Date.now()).getHours(),h=(hr+new Date(last?.ms||Date.now()).getMinutes()/60)/24*2*Math.PI;
 const lastRatio=last?last.payout/last.bet:0;
 const avgR=recent(10).reduce((s,r)=>s+Math.min(10,r.payout/r.bet),0)/Math.max(1,recent(10).length);
 return [frac(3),frac(10),frac(30),last?last.y:0,Math.min(10,streak)/10,Math.log1p(Math.min(50,lastRatio))/Math.log(51),avgR/10,Math.sin(h),Math.cos(h)];}
function samples(data,target){const prior=data.map(r=>({...r,y:outcome(r,target)}));const xs=[],ys=[];
 for(let i=30;i<prior.length;i++){xs.push(features(prior.slice(0,i)));ys.push(prior[i].y);}
 return {xs,ys,prior};}
function scaleFit(X){const D=X[0].length,avg=Array.from({length:D},(_,j)=>X.reduce((s,v)=>s+v[j],0)/X.length),std=avg.map((m,j)=>Math.max(.1,Math.sqrt(X.reduce((s,v)=>s+(v[j]-m)**2,0)/X.length)));
 return {avg,std};}
function transform(v,s){return v.map((x,i)=>clamp((x-s.avg[i])/s.std[i],-5,5));}
function train(X,Y,lambda=.02,epochs=380,rate=.09){const p=X[0].length,w=new Array(p).fill(0),base=clamp(Y.reduce((a,b)=>a+b,0)/Y.length,.01,.99);let bias=Math.log(base/(1-base));
 for(let step=0;step<epochs;step++){const dw=new Array(p).fill(0);let db=0;
  for(let i=0;i<X.length;i++){let z=bias;for(let j=0;j<p;j++)z+=w[j]*X[i][j];const e=sigmoid(z)-Y[i];db+=e;for(let j=0;j<p;j++)dw[j]+=e*X[i][j];}
  const eta=rate/(1+step/400);bias-=eta*db/X.length;for(let j=0;j<p;j++)w[j]-=eta*(dw[j]/X.length+lambda*w[j]);
 }
 return {w,bias};}
function predict(m,x){return clamp(sigmoid(m.bias+x.reduce((a,v,j)=>a+v*m.w[j],0)),.001,.999)}
function assess(all,game,target='profit'){
 const allClean=clean(all,game),data=allClean.slice(-1800),n=data.length,days=new Set(data.map(r=>day(r.ms))).size;
 const base={game,target,rounds:n,days,status:'INSUFICIENTE',forecast:null,validation:null,test:null,quality:[],method:'Regressão logística L2 com recursos defasados; treino e teste cronológicos.'};
 if(allClean.length>1800)base.quality.push(`Usando as 1.800 rodadas mais recentes de ${allClean.length} para manter o navegador responsivo.`);
 if(!n){base.quality.push('Nenhuma rodada real cadastrada.');return base;}
 const ocr=data.filter(r=>/OCR|VISION/i.test(r.notes)).length;
 if(ocr)base.quality.push(`${ocr} rodada(s) obtidas por captura visual: confirme os valores e os giros sem prêmio.`);
 const noId=data.filter(r=>!r.round_id||/^VISION[-_]/i.test(r.round_id)).length;
 if(noId)base.quality.push(`${noId} rodada(s) sem ID de origem verificável.`);
 if(days<3)base.quality.push(`Somente ${days} dia(s) de dados; padrões de horário podem ser ruído.`);
 if(n<400){base.quality.push(`São necessárias pelo menos 400 rodadas completas para iniciar este teste (atual: ${n}).`);return base;}
 const {xs,ys,prior}=samples(data,target),sN=ys.length,a=Math.floor(sN*.6),b=Math.floor(sN*.8);
 if(a<100||b-a<50||sN-b<50)return base;
 const trainY=ys.slice(0,a),valY=ys.slice(a,b),testY=ys.slice(b);
 const rateBase=clamp(trainY.reduce((s,x)=>s+x,0)/trainY.length,.0001,.9999);
 const extreme=(trainY.reduce((s,x)=>s+x,0)<8 || trainY.filter(y=>!y).length<8);
 if(extreme){base.quality.push('Muito poucos exemplos de uma das classes. Treino interrompido para evitar previsão enganosa.');return base;}
 const normal=scaleFit(xs.slice(0,a));const nx=xs.map(x=>transform(x,normal));
 const candidates=[.005,.03,.15,.5].map(lambda=>{const model=train(nx.slice(0,a),trainY,lambda);const pred=nx.slice(a,b).map(x=>predict(model,x));return {lambda,model,vLoss:brier(valY,pred),vLogLoss:logLoss(valY,pred)};}).sort((x,y)=>x.vLoss-y.vLoss);
 const best=candidates[0],valBase=brier(valY,valY.map(()=>rateBase)),testML=nx.slice(b).map(x=>predict(best.model,x)),testBrier=brier(testY,testML),testBaseline=brier(testY,testY.map(()=>rateBase));
 const testGap=testBaseline-testBrier;const vGap=valBase-best.vLoss;
 const holdout={size:testY.length,positives:testY.reduce((s,x)=>s+x,0),mlBrier:testBrier,baselineBrier:testBaseline,mlLogLoss:logLoss(testY,testML),baselineLogLoss:logLoss(testY,testY.map(()=>rateBase)),skill:testGap,accuracy:testY.filter((y,i)=>(testML[i]>=.5?1:0)===y).length/testY.length,baselineAccuracy:testY.filter(y=>(rateBase>=.5?1:0)===y).length/testY.length};
 // Série de treino e teste mantém ordem. Não revendicamos que a IA demonstrou uma vantagem só por uma pequena melhora casual.
 const validated=days>=3&&vGap>.004&&testGap>.004&&holdout.size>=75;
 const next=features(prior),p=predict(best.model,transform(next,normal));
 const positive=prior.reduce((s,r)=>s+r.y,0);const recent=prior.slice(-100);const baselineOverall=positive/n;
 const validRange=clamp(1.96*Math.sqrt(Math.max(.0001,p*(1-p))/Math.max(1,holdout.size)),.02,.35);
 return {...base,status:validated?'MELHORIA RETROSPECTIVA':'SEM VANTAGEM PREDITIVA VALIDADA',forecast:{p,baseline:baselineOverall,lower:clamp(p-validRange,0,1),upper:clamp(p+validRange,0,1),validated,observationTime:new Date().toISOString(),recentRate:recent.reduce((s,r)=>s+r.y,0)/recent.length},validation:{size:valY.length,modelBrier:best.vLoss,baselineBrier:valBase,lambda:best.lambda},test:holdout,trainingSize:trainY.length,quality:base.quality.concat(validated?['Melhoria apenas retrospectiva; é necessário validar previsões registradas antes dos novos resultados.']:['O modelo não demonstrou vantagem consistente sobre a frequência histórica.']),method:'Regressão logística L2 com nove variáveis de resultados anteriores; escolha de regularização na validação e avaliação em período posterior. Reestimativas frequentes não substituem teste prospectivo.'};
}
return {clean,samples,train,features,assess,outcome};
});
