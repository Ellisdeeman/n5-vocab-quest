import sys, json
sys.path.insert(0,'/tmp/fsrs/x')
from fsrs import Scheduler, Card, Rating, State
from datetime import datetime, timezone, timedelta
T0=datetime(2026,1,1,12,0,tzinfo=timezone.utc)
seqs={
 "good_chain":[(0,3),(60,3),(660,3),None,None,None,None],   # minutes offsets; None = review at due
 "easy_first":[(0,4),None,None,None],
 "again_lapse":[(0,3),(1,3),(11,3),None,None,("due",1),("rel",3),None,None],
 "hard_mix":[(0,2),(6,3),(20,3),None,("due",2),None,("due",4),None],
 "late_review":[(0,3),(1,3),(11,3),("late",30,3),("late",90,3),("late",2,1),("rel",3),None],
 "again_new":[(0,1),(1,1),(2,3),(12,3),None,None],
}
out={}
for ret in (0.9,0.85,0.95):
  sch=Scheduler(desired_retention=ret,enable_fuzzing=False,maximum_interval=1095)
  for name,seq in seqs.items():
    c=Card(); now=T0; log=[]
    for st in seq:
      if st is None: now=c.due; r=3
      elif st[0]=="due": now=c.due; r=st[1]
      elif st[0]=="rel": now=c.due; r=st[1]
      elif st[0]=="late": now=c.due+timedelta(days=st[1]); r=st[2]
      else: now=T0+timedelta(minutes=st[0]); r=st[1]
      c,_=sch.review_card(c,Rating(r),now)
      log.append({"t":int(now.timestamp()*1000),"r":r,"s":c.stability,"d":c.difficulty,"state":int(c.state),"step":c.step,"due":int(c.due.timestamp()*1000)})
    out[f"{name}@{ret}"]=log
json.dump({"params":list(Scheduler().parameters),"maxIvl":1095,"seqs":out},open('/workspace/pwt/fsrs_ref.json','w'),indent=0)
print(len(out)); print(json.dumps(out["good_chain@0.9"][-1]))
