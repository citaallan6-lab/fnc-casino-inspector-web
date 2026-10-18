/* FNC Vision V8. Browser screen-sharing with explicit permission; read-only OCR.
   No remote images are uploaded by app code. OCR runtime is loaded from jsDelivr;
   captured pixels are processed by Tesseract in this browser, not sent to our server.
   Optical readings may be wrong: supervise every session and validate them. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const video=$('visionVideo'),overlay=$('visionOverlay'),viewport=$('visionViewport');
const boxNames={bet:'Aposta',payout:'Prêmio',reels:'Rolos'};
const colors={bet:'#54fbb2',payout:'#ffd87b',reels:'#86b2ff'};
const api=window.FNCVisionAPI;
let stream=null,worker=null,loadingOCR=null,active=false,reading=false,saving=0;
let boxes={},drag=null,candidate=null,lastGray=null,moving=0,still=0,spinning=false,spinStarted=0,lastAutoAt=0,tickTimer=null,cycle=0;
let lastFrameAt=0,lastMotion=0,videoReady=false;
const BOX_KEY='fnc_vision_v8_boxes',EVENT_KEY='fnc_vision_v8_events';
let events=[];
try{const x=JSON.parse(localStorage.getItem(BOX_KEY)||'{}');if(x&&typeof x==='object')boxes=x}catch(e){}
try{const x=JSON.parse(localStorage.getItem(EVENT_KEY)||'[]');if(Array.isArray(x))events=x.slice(-80)}catch(e){}
const currency=n=>Number.isFinite(n)?n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):'—';
function status(message,warning=false){const el=$('visionMessage');el.className='notice'+(warning?' warn':'');el.textContent=message}
function event(message){const line=new Date().toLocaleTimeString('pt-BR')+' · '+message;events.push(line);events=events.slice(-80);try{localStorage.setItem(EVENT_KEY,JSON.stringify(events))}catch(e){}drawEvents()}
function drawEvents(){const e=$('visionLog');e.replaceChildren();for(const line of events.slice(-25).reverse()){const p=document.createElement('p');p.textContent=line;e.append(p)}if(!events.length)e.textContent='Nenhum evento ainda.'}
drawEvents();
function clip(v){return Math.max(0,Math.min(1,v))}
function visibleRect(){const vw=video.videoWidth||16,vh=video.videoHeight||9,W=viewport.clientWidth,H=viewport.clientHeight;const k=Math.min(W/vw,H/vh);return{x:(W-vw*k)/2,y:(H-vh*k)/2,w:vw*k,h:vh*k}}
function updateCanvas(){const W=viewport.clientWidth,H=viewport.clientHeight;if(!W||!H)return;const scale=window.devicePixelRatio||1;overlay.width=Math.round(W*scale);overlay.height=Math.round(H*scale);const ctx=overlay.getContext('2d');ctx.setTransform(scale,0,0,scale,0,0);drawBoxes()}
function drawBoxes(){const c=overlay.getContext('2d');const scale=window.devicePixelRatio||1;c.setTransform(scale,0,0,scale,0,0);c.clearRect(0,0,viewport.clientWidth,viewport.clientHeight);if(!videoReady)return;const b=visibleRect();for(const [key,rect] of Object.entries({...boxes,...(drag?{[drag.kind]:drag.rect}:{})})){if(!rect||rect.w<=0||rect.h<=0)continue;const x=b.x+rect.x*b.w,y=b.y+rect.y*b.h,w=rect.w*b.w,h=rect.h*b.h;c.strokeStyle=colors[key]||'#fff';c.fillStyle=(colors[key]||'#fff')+'24';c.lineWidth=2;c.fillRect(x,y,w,h);c.strokeRect(x,y,w,h);const label=boxNames[key]||key;c.fillStyle='#03110a';c.fillRect(x,y-20,Math.max(65,label.length*8),20);c.fillStyle=colors[key];c.font='bold 12px system-ui';c.fillText(label,x+5,y-6)}}
function normPoint(event){const view=overlay.getBoundingClientRect(),p=visibleRect();return{x:clip((event.clientX-view.left-p.x)/p.w),y:clip((event.clientY-view.top-p.y)/p.h)}}
function mkRect(a,b){return{x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),w:Math.abs(b.x-a.x),h:Math.abs(b.y-a.y)}}
overlay.addEventListener('pointerdown',e=>{if(!videoReady)return;overlay.setPointerCapture(e.pointerId);const kind=$('visionBox').value,p=normPoint(e);drag={kind,start:p,rect:{x:p.x,y:p.y,w:0,h:0}};drawBoxes()});
overlay.addEventListener('pointermove',e=>{if(!drag)return;drag.rect=mkRect(drag.start,normPoint(e));drawBoxes()});
overlay.addEventListener('pointerup',e=>{if(!drag)return;const rect=mkRect(drag.start,normPoint(e));if(rect.w>.008&&rect.h>.008){boxes[drag.kind]=rect;try{localStorage.setItem(BOX_KEY,JSON.stringify(boxes))}catch(e){}event('Região calibrada: '+boxNames[drag.kind]);status('Região '+boxNames[drag.kind]+' marcada. Selecione a próxima área.')}drag=null;lastGray=null;drawBoxes()});
$('visionResetBoxes').addEventListener('click',()=>{if(!confirm('Remover as regiões de leitura OCR deste navegador?'))return;boxes={};lastGray=null;try{localStorage.removeItem(BOX_KEY)}catch(e){}drawBoxes();status('Regiões removidas. Marque novamente os valores.')});
$('visionBox').addEventListener('change',drawBoxes);
if('ResizeObserver' in window)new ResizeObserver(updateCanvas).observe(viewport);else window.addEventListener('resize',updateCanvas);
function stop(){active=false;clearTimeout(tickTimer);tickTimer=null;const old=stream;stream=null;if(old)old.getTracks().forEach(t=>{if(t.readyState==='live')t.stop()});video.pause();video.srcObject=null;videoReady=false;lastGray=null;spinning=false;moving=still=0;candidate=null;$('visionStart').disabled=false;$('visionStop').disabled=true;$('visionRead').disabled=true;$('visionCommit').disabled=true;$('visionBadge').textContent='CAPTURA PARADA';$('visionBadge').className='pill zero';$('visionPlaceholder').classList.remove('hidden');$('visionMotion').textContent='—';drawBoxes();status('Captura encerrada. Os registros salvos continuam no seu navegador.')}
$('visionStop').addEventListener('click',stop);
$('visionStart').addEventListener('click',async()=>{
 if(!navigator.mediaDevices||!navigator.mediaDevices.getDisplayMedia){status('O compartilhamento de tela exige Chrome moderno e HTTPS. Use o endereço do GitHub Pages.',true);return}
 try{
   // Must be requested directly from this click, never on page load.
   const result=await navigator.mediaDevices.getDisplayMedia({video:{frameRate:15},audio:false});
   stream=result;active=true;video.srcObject=result;await video.play();videoReady=true;
   $('visionStart').disabled=true;$('visionStop').disabled=false;$('visionRead').disabled=false;$('visionBadge').textContent='TELA COMPARTILHADA';$('visionBadge').className='pill';$('visionPlaceholder').classList.add('hidden');
   const track=result.getVideoTracks()[0];track.addEventListener('ended',()=>{if(active)stop()});
   updateCanvas();event('Captura da aba iniciada com permissão');status('Captura ativa. Marque Aposta e Prêmio; para modo automático, marque também Rolos.');tick();
 }catch(e){status('Não foi possível compartilhar: '+(e&&e.message||'permissão negada'),true);stop()}
});
function imageFromBox(box,scale=2){if(!videoReady||!video.videoWidth||!box)return null;const crop={sx:Math.max(0,Math.round(box.x*video.videoWidth)),sy:Math.max(0,Math.round(box.y*video.videoHeight)),sw:Math.max(1,Math.min(video.videoWidth,Math.round(box.w*video.videoWidth))),sh:Math.max(1,Math.min(video.videoHeight,Math.round(box.h*video.videoHeight)))};const c=document.createElement('canvas');c.width=Math.max(80,Math.min(1100,crop.sw*scale));c.height=Math.max(50,Math.min(380,crop.sh*scale));const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(video,crop.sx,crop.sy,crop.sw,crop.sh,0,0,c.width,c.height);const image=ctx.getImageData(0,0,c.width,c.height);for(let i=0;i<image.data.length;i+=4){const v=.30*image.data[i]+.59*image.data[i+1]+.11*image.data[i+2];const contrast=v<108?0:v>225?255:(v-108)*2.18;image.data[i]=image.data[i+1]=image.data[i+2]=contrast;}ctx.putImageData(image,0,0);return c}
function loadScript(src){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>reject(Error('Não foi possível carregar o OCR. Verifique a internet.'));document.head.append(s)})}
async function getOCR(){if(worker)return worker;if(loadingOCR)return loadingOCR;loadingOCR=(async()=>{
 status('Carregando o reconhecimento de texto. Isso pode levar alguns segundos.');
 if(!window.Tesseract)await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js');
 if(!window.Tesseract||typeof window.Tesseract.createWorker!=='function')throw Error('Biblioteca OCR indisponível');
 const w=await window.Tesseract.createWorker('eng',1,{logger:()=>{}});
 await w.setParameters({tessedit_char_whitelist:'0123456789.,R$ ',preserve_interword_spaces:'1'});
 worker=w;return w;
 })();try{return await loadingOCR}catch(e){loadingOCR=null;throw e}}
function parseOCRMoney(text){
 // Explicitly ignore arbitrary text and require a visible numeric result. OCR can confuse digits.
 const s=String(text||'').replace(/\s/g,'').replace(/[^0-9,\.]/g,'');
 if(!s||!/\d/.test(s))return null;
 const candidates=s.match(/\d+(?:[.,]\d{1,2})?/g)||[];
 if(candidates.length!==1)return null;
 let n=candidates[0];if(n.includes(',')&&n.includes('.'))n=n.lastIndexOf(',')>n.lastIndexOf('.')?n.replace(/\./g,'').replace(',','.'):n.replace(/,/g,'');else n=n.replace(',','.');
 const value=Number(n);return Number.isFinite(value)&&value>=0&&value<=1e7?value:null;
}
function enoughBoxes(){return !!boxes.bet&&!!boxes.payout}
async function readFrame(automated=false){
 if(reading)return false;if(!active||!enoughBoxes()){status('Antes de ler, compartilhe a aba e marque Aposta e Prêmio na prévia.',true);return false}
 reading=true;$('visionRead').disabled=true;status('Interpretando aposta e prêmio na imagem compartilhada…');
 try{
   const w=await getOCR(),betCanvas=imageFromBox(boxes.bet),payCanvas=imageFromBox(boxes.payout);
   const b=(await w.recognize(betCanvas)).data,p=(await w.recognize(payCanvas)).data;
   const bet=parseOCRMoney(b.text),payout=parseOCRMoney(p.text);
   $('visionBet').textContent=bet===null?'Não reconhecido':currency(bet);
   $('visionPayout').textContent=payout===null?'Não reconhecido':currency(payout);
   if(bet===null||bet<=0||payout===null){candidate=null;$('visionCommit').disabled=true;status('Leitura incompleta. Ajuste as caixas apenas sobre os números e tente novamente.',true);event('OCR incompleto; nenhum resultado salvo');return false}
   candidate={bet,payout,game:$('visionGame').value,readAt:Date.now(),confidence:Math.min(b.confidence||0,p.confidence||0)};
   $('visionCommit').disabled=false;
   if(automated&&$('visionAuto').checked){
     if(candidate.confidence<55){status('OCR detectou valores, mas confiança baixa ('+Math.round(candidate.confidence)+'%). Confirme manualmente.',true);return false}
     return !!saveCandidate(true)
   }
   status('Leitura obtida: '+currency(bet)+' apostado; '+currency(payout)+' pago. Confira visualmente e clique Confirmar e salvar resultado.');
   event('Resultado candidato lido; aguardando confirmação');return true;
 }catch(e){status('Falha ao executar OCR: '+e.message+'; use Resultados → Registro manual, se necessário.',true);event('OCR indisponível: '+e.message);return false}
 finally{reading=false;$('visionRead').disabled=!active}
}
$('visionRead').addEventListener('click',()=>readFrame(false));
function saveCandidate(automated){
 if(!candidate)return false;
 if(Date.now()-candidate.readAt>120000){status('Valor antigo: leia novamente antes de salvar.',true);return false}
 try{
   const now=new Date(),rid='VISION-'+now.getTime()+'-'+(++cycle);
   const result=api.addResult({timestamp:now.toISOString(),platform:'3ss.vip',game:candidate.game,round_id:rid,bet:candidate.bet,payout:candidate.payout,source_url:'',notes:`FNC VISION V8 OCR ${automated?'AUTOMÁTICO EXPERIMENTAL':'CONFIRMADO PELO USUÁRIO'} · confiança OCR ${Math.round(candidate.confidence)}% · leitura da tela, sem ID de servidor`});
   saving++;$('visionSaved').textContent=String(saving);event((automated?'Auto ':'Confirmado ')+candidate.game+': '+currency(candidate.bet)+' → '+currency(candidate.payout));
   status(result.saved?'Rodada salva no histórico local. Exporte os registros periodicamente.':'Rodada incluída em memória, mas armazenamento falhou: exporte agora.',!result.saved);
   candidate=null;$('visionCommit').disabled=true;return result.saved;
 }catch(e){status('Não foi possível guardar a rodada: '+e.message,true);return false}
}
$('visionCommit').addEventListener('click',()=>saveCandidate(false));
$('visionWindows').addEventListener('click',()=>api.openWindows());
$('visionDownload').addEventListener('click',()=>{const data={exportedAt:new Date().toISOString(),events,regions:boxes,description:'Somente logs e calibração; use Resultados → Exportar CSV para rodadas'};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download='fnc-vision-observacoes.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),2000)});
function sampleReels(){const r=boxes.reels;if(!videoReady||!r)return null;const c=document.createElement('canvas');c.width=64;c.height=38;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(video,Math.round(r.x*video.videoWidth),Math.round(r.y*video.videoHeight),Math.max(2,Math.round(r.w*video.videoWidth)),Math.max(2,Math.round(r.h*video.videoHeight)),0,0,64,38);const pix=ctx.getImageData(0,0,64,38).data;const gray=new Uint8Array(64*38);for(let i=0;i<gray.length;i++)gray[i]=(.30*pix[4*i]+.59*pix[4*i+1]+.11*pix[4*i+2])|0;return gray}
function motionRatio(previous,current){if(!previous||!current||previous.length!==current.length)return 0;let changed=0;for(let i=0;i<current.length;i++)if(Math.abs(previous[i]-current[i])>30)changed++;return changed/current.length}
function tick(){
 if(!active)return;
 try{
   if(video.readyState>=2&&boxes.reels){
     const now=Date.now();const gray=sampleReels();const d=motionRatio(lastGray,gray);lastGray=gray;lastMotion=d;
     $('visionMotion').textContent=d>=0.12?'ALTO':d<=0.045?'PARADO':'BAIXO';
     // Need multiple consecutive samples; an animated idle background can still fool this.
     if(d>=.12){moving++;still=0}else if(d<=.045){still++;moving=0}else{moving=0;still=0}
     if(!spinning&&moving>=3){spinning=true;spinStarted=now;event('Movimento visual dos rolos detectado')}
     if(spinning&&still>=4&&now-spinStarted>=900){
       spinning=false;moving=still=0;
       if(now-lastAutoAt>2500){lastAutoAt=now;event('Possível fim de giro detectado');if($('visionAuto').checked)readFrame(true)}
     }
     if(spinning&&now-spinStarted>25000){spinning=false;moving=still=0;event('Movimento longo descartado (sem fim de giro confiável)')}
   }else if(active&&!boxes.reels){$('visionMotion').textContent='SEM REGIÃO'}
 }catch(e){event('Erro na detecção visual: '+e.message)}
 tickTimer=setTimeout(tick,350);
}
$('visionAuto').addEventListener('change',e=>{event(e.target.checked?'Modo automático experimental ativado':'Modo automático desligado');status(e.target.checked?'O monitor tentará salvar ao detectar os rolos pararem. Confira os registros: zeros ou giros podem ser perdidos, criando amostra enviesada.':'Somente leituras e confirmações manuais serão salvas.',e.target.checked)});
window.addEventListener('pagehide',()=>{if(active)stop();if(worker&&typeof worker.terminate==='function')worker.terminate().catch(()=>{})});
updateCanvas();
})();
