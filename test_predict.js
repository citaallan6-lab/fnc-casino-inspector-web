const assert=require('node:assert/strict');
const M=require('./predict_engine.js');
const g='Fortune Tiger',anchor=Date.now()-40*86400000;
assert.equal(M.assess([],g).forecast,null);
const demo=[{game:g,timestamp:new Date(anchor).toISOString(),bet:1,payout:100,demo:true}];
assert.equal(M.assess(demo,g).rounds,0);
// deterministic seeded pseudorandom history; values are tests and never included in delivered site data.
function make(mode,n=650){let seed=890123;const rand=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/2**32};let last=0;const res=[];
 for(let i=0;i<n;i++){const u=rand(),y=mode==='independent'?+(u<.38):+(u<(last?.78:.15));last=y;
 res.push({uid:'round'+i,game:g,timestamp:new Date(anchor+i*62*60000).toISOString(),bet:1,payout:y?2:0,round_id:'ID'+i,notes:'conferido'});}
 return res;}
const random=M.assess(make('independent'),g,'profit');const patterned=M.assess(make('patterned'),g,'profit');
assert.equal(random.rounds,650);assert.equal(patterned.rounds,650);
assert.ok(random.forecast && Number.isFinite(random.forecast.p));
assert.ok(patterned.test && random.test);
assert.ok(patterned.test.baselineBrier>patterned.test.mlBrier,`Patterned data should give predictive skill: ${JSON.stringify(patterned.test)}`);
assert.equal(M.outcome({payout:0.2,bet:1},'any'),1);
assert.equal(M.outcome({payout:0.2,bet:1},'profit'),0);
assert.equal(M.outcome({payout:12,bet:1},'big'),1);
console.log('OK independent / patterned / payouts / empty / demo');
console.log('independent',random.status,'Brier',random.test.mlBrier.toFixed(4),'vs',random.test.baselineBrier.toFixed(4));
console.log('patterned',patterned.status,'Brier',patterned.test.mlBrier.toFixed(4),'vs',patterned.test.baselineBrier.toFixed(4));
