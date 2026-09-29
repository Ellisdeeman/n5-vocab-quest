# Build per-level kanji data: data/kanji-nX.json
# Sources: kanji-data (MIT, D. Gouveia; KANJIDIC-derived, EDRDG CC BY-SA 4.0; JLPT levels from J. Waller/tanos.co.uk)
#          KanjiVG r20250816 (CC BY-SA 3.0, Ulrich Apel) for stroke paths + component decomposition
import json, re, hashlib, xml.etree.ElementTree as ET
B='/workspace/n5-game/'; KD='/workspace/kanji/'
K=json.load(open(KD+'kanji.json',encoding='utf-8'))
L=['n5','n4','n3','n2','n1']; LN={'n5':5,'n4':4,'n3':3,'n2':2,'n1':1}; OFF={l:i*10000 for i,l in enumerate(L)}
NS='{http://kanjivg.tagaini.net}'
tree=ET.parse(KD+'kvg.xml'); root=tree.getroot()
jl={c for c,v in K.items() if v['jlpt_new']}
strokes={}; comps={}
def rnd(d): return re.sub(r'(\d+\.\d)\d+',r'\1',d)
for kj in root.iter('kanji'):
    kid=kj.get('id')  # kvg:kanji_065e5
    m=re.fullmatch(r'kvg:kanji_([0-9a-f]{5})',kid or '')
    if not m: continue
    ch=chr(int(m.group(1),16))
    if ch not in jl: continue
    strokes[ch]=[rnd(p.get('d')) for p in kj.iter('path')]
    els=set()
    top=kj.find('g')
    for g in top.iter('g'):
        if g is top: continue
        e=g.get(NS+'element')
        if e and e!=ch: els.add(e)
    comps[ch]=els
print('kvg matched',len(strokes),'of',len(jl))
# vocab
words={}
e5=json.load(open(B+'site_data/n5_embed.json',encoding='utf-8')); words['n5']=e5['words']
for l in L[1:]: words[l]=json.load(open(B+f'site_data/data/{l}.json',encoding='utf-8'))['words']
def first(s): return re.split(r'[;；,、]',s)[0].strip()
H=lambda s:''.join(chr(ord(c)-0x60) if 'ァ'<=c<='ヶ' else c for c in s)
out={}; info={}
allitems={}
for l in L:
    chars=[c for c,v in K.items() if v['jlpt_new']==LN[l]]
    score={c:K[c]['strokes']+(K[c]['freq'] or 2600)/260+(K[c]['grade'] or 9)*0.6 for c in chars}
    placed=[]; done=set(); rest=set(chars)
    while rest:
        ready=[c for c in rest if all((x not in rest) or x==c for x in comps.get(c,()))]
        if not ready: ready=list(rest)
        c=min(ready,key=lambda c:(score[c],c)); placed.append(c); rest.discard(c)
    allitems[l]=placed
# look-alikes (over all JLPT kanji): shared KanjiVG components + stroke closeness
alls=[c for l in L for c in allitems[l]]; lvl={c:l for l in L for c in allitems[l]}
# shape fingerprint: sample points along each stroke path (mini SVG path parser) into a blurred 12x12 grid
import math
TOK=re.compile(r'[MmCcSsLlHhVvZz]|-?\d*\.?\d+(?:e-?\d+)?')
def pts(d):
    t=TOK.findall(d); i=0; cmd=None; x=y=0; out=[]; lc=None
    def num():
        nonlocal i; v=float(t[i]); i+=1; return v
    while i<len(t):
        if re.fullmatch(r'[A-Za-z]',t[i]): cmd=t[i]; i+=1
        if cmd in 'Zz': continue
        rel=cmd.islower(); C=cmd.upper()
        if C=='M': nx,ny=num(),num(); x,y=(x+nx,y+ny) if rel else (nx,ny); out.append((x,y)); cmd='l' if rel else 'L'; lc=None
        elif C=='L': nx,ny=num(),num(); nx,ny=(x+nx,y+ny) if rel else (nx,ny); out+= [(x+(nx-x)*k/4,y+(ny-y)*k/4) for k in range(1,5)]; x,y=nx,ny; lc=None
        elif C=='H': nx=num(); nx=x+nx if rel else nx; out.append((nx,y)); x=nx
        elif C=='V': ny=num(); ny=y+ny if rel else ny; out.append((x,ny)); y=ny
        elif C in 'CS':
            if C=='C': a=[num() for _ in range(6)]
            else: b=[num() for _ in range(4)]; r1=(2*x-lc[0],2*y-lc[1]) if lc else (x,y); a=[r1[0]-(x if rel else 0),r1[1]-(y if rel else 0)]+b
            if rel: a=[a[k]+(x if k%2==0 else y) for k in range(6)]
            x0,y0=x,y
            for k in range(1,7):
                u=k/6; px=(1-u)**3*x0+3*(1-u)**2*u*a[0]+3*(1-u)*u*u*a[2]+u**3*a[4]; py=(1-u)**3*y0+3*(1-u)**2*u*a[1]+3*(1-u)*u*u*a[3]+u**3*a[5]; out.append((px,py))
            lc=(a[2],a[3]); x,y=a[4],a[5]
        else: i+=1
    return out
N=12
def grid(c):
    g=[0.0]*(N*N)
    for d in strokes.get(c,[]):
        for (px,py) in pts(d):
            gx,gy=min(N-1,max(0,int(px/109*N))),min(N-1,max(0,int(py/109*N)))
            for dx in (-1,0,1):
                for dy in (-1,0,1):
                    xx,yy=gx+dx,gy+dy
                    if 0<=xx<N and 0<=yy<N: g[yy*N+xx]+=1.0 if dx==dy==0 else 0.35
    n=math.sqrt(sum(v*v for v in g)) or 1
    return [v/n for v in g]
G={}
def sim(a,b):
    if a not in G: G[a]=grid(a)
    if b not in G: G[b]=grid(b)
    cos=sum(x*y for x,y in zip(G[a],G[b]))
    A,Bc=comps.get(a,set()),comps.get(b,set())
    j=len(A&Bc)/len(A|Bc) if A and Bc else 0
    return 0.45*j+0.55*(cos-0.55)/0.45-abs(K[a]['strokes']-K[b]['strokes'])*0.04-abs(L.index(lvl[a])-L.index(lvl[b]))*0.05
LA={}
for a in alls:
    c=sorted(((sim(a,b),b) for b in alls if b!=a),reverse=True)
    LA[a]=[b for s,b in c[:8] if s>0.2][:6]
CUR={'一':'二三','二':'三工','三':'二王','十':'千干士','口':'日田中','小':'少水','上':'土止','下':'不','中':'申','木':'本休','本':'木末','水':'氷永小','少':'小','牛':'午','万':'方力','人':'入八大火','入':'人八込','八':'人入','力':'刀万方九','刀':'力刃','土':'士工上','士':'土','日':'目白田旧','目':'日自白','白':'百日自','大':'犬太天','犬':'大太','太':'大犬','千':'干午','干':'千于','未':'末','末':'未','午':'牛千','牛':'午','右':'石','石':'右','王':'玉主','玉':'王主','己':'已巳','田':'由甲申','由':'田甲申','甲':'申由田','申':'甲由田','貝':'見具','見':'貝','待':'持特','持':'待特','特':'持待','間':'問聞','問':'間聞','聞':'問間','夫':'天失','天':'夫失','失':'夫天','休':'体','体':'休','借':'惜','向':'何','活':'話','話':'活'}
for a,bs in CUR.items():
    if a in LA: LA[a]=list(dict.fromkeys([b for b in bs if b in lvl]+LA[a]))[:6]
KATA=lambda s:''.join(chr(ord(c)+0x60) if 'ぁ'<=c<='ゖ' else c for c in s)
def means(v):
    m=[x for x in v['meanings'] if not re.search(r'radical\s*\(?no',x,re.I)] or v['meanings']
    return m
for c,v in K.items():
    v['meanings']=means(v); v['readings_on']=[KATA(r) for r in (v['readings_on'] or [])]
def reading_str(v):
    on=[r for r in (v['readings_on'] or [])][:2]; kun=[re.sub(r'^-|-$','',r) for r in (v['readings_kun'] or [])][:2]
    return on,kun
for l in L:
    items=[]; ext={}
    lower=L[:L.index(l)+1][::-1]  # own level first, then easier ones
    for c in allitems[l]:
        v=K[c]; on,kun=reading_str(v)
        ex=[]
        for ll in lower:
            for i,w in enumerate(words[ll]):
                if c in w[0] and w[0]!=w[1]:
                    ex.append([OFF[ll]+i,first(w[0]),first(w[1]),w[2].split(';')[0][:60]])
                    if len(ex)>=4: break
            if len(ex)>=4: break
        la=LA[c]
        for b in la:
            if lvl[b]!=l: vb=K[b]; ob,kb=reading_str(vb); ext[b]=[', '.join(vb['meanings'][:2]),ob,kb,vb['strokes']]
        items.append([c,v['strokes'],', '.join(v['meanings'][:3]),v['readings_on'] or [],[re.sub(r'^-|-$','',r) for r in (v['readings_kun'] or [])],v['freq'],v['grade'],la,ex,strokes.get(c,[])])
    d={'level':l,'source':'kanji-data (MIT) · KANJIDIC2 (EDRDG, CC BY-SA 4.0) · JLPT lists: J. Waller (tanos.co.uk) · KanjiVG r20250816 (CC BY-SA 3.0)','items':items,'ext':ext}
    s=json.dumps(d,ensure_ascii=False,separators=(',',':'))
    open(B+f'site_data/kanji/kanji-{l}.json','w',encoding='utf-8').write(s)
    info[l]={'count':len(items),'v':hashlib.md5(s.encode()).hexdigest()[:10],'kb':len(s.encode())//1024,'withEx':sum(1 for x in items if x[8]),'withStrokes':sum(1 for x in items if x[9])}
json.dump(info,open(B+'site_data/kanji_info.json','w'))
print(json.dumps(info))
for l in L: print(l,''.join(allitems[l][:30]))
print('lookalike samples',{c:''.join(LA[c]) for c in '休体日目人入末未土力大千午右王己'}); print('empty LA',sum(1 for c in LA if not LA[c]))
