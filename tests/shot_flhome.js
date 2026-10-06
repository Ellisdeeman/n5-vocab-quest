const pw=require('playwright-core');
(async()=>{const b=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
for(const th of ['light','dark']){const ctx=await b.newContext({viewport:{width:320,height:900},deviceScaleFactor:2,colorScheme:th,serviceWorkers:'block'});
await ctx.addInitScript(th=>{if(localStorage.getItem('seeded'))return;localStorage.setItem('seeded',1);const now=Date.now(),D=864e5,cards={};
for(let i=0;i<12;i++)cards[i]={box:2,due:now-36e5,ok:3,bad:1,f:{st:2,sp:null,s:4+i,d:5,lr:now-6*D,due:now-36e5}};
localStorage.setItem('n5VocabQuest.v1',JSON.stringify({cards,levels:['n5','n4'],newLimit:15,pathFocus:'n5',theme:th}));
localStorage.setItem('n5VocabQuest.kana.v1',JSON.stringify({cards:{'あ':{box:2,due:now-36e5,ok:3,bad:0}}}));},th);
const p=await ctx.newPage();await p.goto('http://localhost:8770/?t='+Date.now());await p.waitForSelector('#flHomeGo:not([disabled])',{timeout:15000});await p.waitForTimeout(500);
const el=await p.$('#flHome');await el.scrollIntoViewIfNeeded();const bb=await el.boundingBox();await p.screenshot({path:`/workspace/logs/flhome-${th}.png`,clip:{x:0,y:Math.max(0,bb.y-260),width:320,height:bb.height+280}});await ctx.close();}
await b.close();})();
