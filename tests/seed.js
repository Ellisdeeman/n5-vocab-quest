module.exports=()=>{const now=Date.now(),c={};const today=new Date().toLocaleDateString('en-CA');
 for(let i=0;i<200;i++)c[i]={box:1+i%4,due:i<14?now-3600e3:now+864e5*(1+i%3),ok:3,bad:i<3?5:0,lapses:i<3?2:0,run:0,seen:now-864e5};
 for(let i=0;i<6;i++)c[10000+i]={box:1,due:now-6e4,ok:1,bad:0};
 localStorage.setItem('n5VocabQuest.v1',JSON.stringify({cards:c,xp:2400,streak:7,levels:['n5'],answered:1500,dailyHistory:{[today]:1}}));
 localStorage.setItem('n5VocabQuest.kana.v1',JSON.stringify({cards:{'あ':{box:2,due:now-1000,ok:1,bad:0},'い':{box:2,due:now-1000,ok:1,bad:0},'ア':{box:2,due:now-1000,ok:1,bad:0},'う':{box:3,due:now+864e5,ok:3,bad:0}}}));
 localStorage.setItem('jlptVocabQuest.kanji.v1',JSON.stringify({cards:{'一':{box:1,due:now-1000,ok:1,bad:0,l:'n5'},'二':{box:1,due:now-1000,ok:1,bad:0,l:'n5'},'三':{box:1,due:now-1000,ok:1,bad:1,l:'n5'},'日':{box:2,due:now-1000,ok:1,bad:0,l:'n5'},'人':{box:2,due:now-1000,ok:1,bad:0,l:'n5'}},unl:{n5:10}}));
 localStorage.setItem('jlptVocabQuest.time.v1',JSON.stringify({goalMin:60,goalItems:20,goalNew:10,days:{[today]:{sec:22*60,items:177,newW:33}}}));
 localStorage.setItem('jlptVocabQuest.audioLesson.v1',JSON.stringify({on:true,url:'https://example.com/lesson',min:30,cur:1,total:30,opened:today+':1',log:{}}));};