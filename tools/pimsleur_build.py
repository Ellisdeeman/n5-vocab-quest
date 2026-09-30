#!/usr/bin/env python3
"""Build data/pimsleur-ja.json: words introduced per Pimsleur Japanese lesson.
UNOFFICIAL — compiled from learner notes; not affiliated with Pimsleur. Word lists only (word, kana, English, lesson).
Sources: see pimsleur_words.py (Kirby no Nihongo blog lessons 1–17; Andres Castano's notes lessons 1–30; Brainscape spot check 1–15).
Each word is matched to an existing app vocab entry (N5–N1) by kanji or kana plus meaning; unmatched words get a
Pimsleur-set id (50000 + index) and TTS audio at audio/pm/w/<index>.mp3 (edge-tts ja-JP-NanamiNeural, same encode as the levels).
usage: pimsleur_build.py [--audio]"""
import json, re, sys, os, subprocess
sys.path.insert(0, os.path.dirname(__file__))
from pimsleur_words import LEVELS, SOURCES, MATCH_OVERRIDE
B = '/workspace/n5-game/'
LV = ['n5', 'n4', 'n3', 'n2', 'n1']; LOFF = {'n5': 0, 'n4': 10000, 'n3': 20000, 'n2': 30000, 'n1': 40000}; PM_OFF = 50000
STOP = set('to a an the of be (with in on at for is it one i'.split())
def forms(s): return [re.sub(r'[～〜~\s]', '', re.sub(r'[（(].*?[)）]', '', p)) for p in re.split(r'[;；,、]', s) if p.strip()]
def toks(en): return {w for w in re.findall(r"[a-z']+", en.lower().replace("o'clock", "oclock")) if w not in STOP and len(w) > 1}
def stem(w): return re.sub(r'(ing|ed|es|s)$', '', w) if len(w) > 4 else w
def strip_masu(k):   # 食べます → 食べる-ish comparisons are done via the dictionary form list below
    return k
MASU = {'わかります': 'わかる', 'はなします': 'はなす', 'たべます': 'たべる', 'のみます': 'のむ', 'します': 'する', 'かいます': 'かう', 'あります': 'ある', 'あげます': 'あげる', 'いきます': 'いく',
        'きます': 'くる', 'はいります': 'はいる', 'あらいます': 'あらう', 'いいます': 'いう', 'こたえます': 'こたえる', 'たずねます': 'たずねる', 'まちます': 'まつ', 'みます': 'みる', 'あきます': 'あく',
        'しまります': 'しまる', 'あいます': 'あう', 'かえります': 'かえる', 'すごします': 'すごす', 'つきます': 'つく'}
KMASU = {'分かります': '分かる', '話します': '話す', '食べます': '食べる', '飲みます': '飲む', '買います': '買う', '行きます': '行く', '来ます': '来る', '入ります': '入る', '洗います': '洗う', '言います': '言う',
         '答えます': '答える', '尋ねます': '尋ねる', '待ちます': '待つ', '見ます': '見る', '開きます': '開く', '閉まります': '閉まる', '会います': '会う', '帰ります': '帰る', '過ごします': '過ごす', '着きます': '着く'}
def main():
    D = {l: json.load(open(B + f'data/{l}.json', encoding='utf-8')) for l in LV}
    byJ, byK = {}, {}
    for l in LV:
        for i, w in enumerate(D[l]['words']):
            gid = LOFF[l] + i
            for f in forms(w[0]): byJ.setdefault(f, []).append(gid)
            for f in forms(w[1]): byK.setdefault(f, []).append(gid)
    word = lambda gid: D[LV[gid // 10000]]['words'][gid % 10000]
    def match(jp, kana, en):
        kj = KMASU.get(jp, jp); kk = MASU.get(kana, kana)
        want = {stem(t) for t in toks(en)}
        cands = []
        for gid in dict.fromkeys(byJ.get(kj, []) + byJ.get(jp, []) + byK.get(kk, []) + byK.get(kana, [])):
            w = word(gid); has = {stem(t) for t in toks(w[2])}
            jpHit = kj in forms(w[0]) or jp in forms(w[0]); kanaHit = kk in forms(w[1]) or kana in forms(w[1])
            kanjiWord = bool(re.search(r'[\u4e00-\u9fff]', jp))
            # kanji spelling must agree when both sides are written in kanji; the meaning must overlap
            if kanjiWord and re.search(r'[\u4e00-\u9fff]', w[0]) and not jpHit: continue
            if want & has: cands.append((0 if jpHit else 1, gid // 10000, gid))
        return sorted(cands)[0][2] if cands else None
    pm, out, stats = [], {}, {}
    pmIndex = {}
    for lv, lessons in LEVELS.items():
        L = {}
        for n, (conf, src, words) in sorted(lessons.items()):
            ws = []
            for jp, kana, en in words:
                gid = MATCH_OVERRIDE.get(jp) or match(jp, kana, en)
                if gid is None:
                    key = (jp, kana)
                    if key not in pmIndex: pmIndex[key] = len(pm); pm.append([jp, kana, en])
                    gid = PM_OFF + pmIndex[key]
                ws.append([jp, kana, en, gid])
            L[str(n)] = {'conf': conf, 'src': list(src), 'words': ws}
        out[str(lv)] = {'lessons': L}
    data = {'meta': {'title': 'Pimsleur Japanese — words per lesson',
                     'label': 'Unofficial, compiled from learner notes; not affiliated with Pimsleur.',
                     'note': 'Word lists only (word, kana reading, English meaning, lesson). No course audio or transcripts. Lesson placement can differ between course editions.',
                     'confidence': {'high': 'two independent learner sources agree', 'medium': 'one detailed learner source', 'none': 'no reliable list found'},
                     'sources': SOURCES, 'levelsCovered': sorted(LEVELS), 'pmOffset': PM_OFF,
                     'audio': 'audio/pm/w/<index>.mp3 — edge-tts ja-JP-NanamiNeural (-10%), MP3 mono 24 kHz 40 kbps'},
            'levels': out, 'pm': pm}
    os.makedirs(B + 'data', exist_ok=True)
    json.dump(data, open(B + 'data/pimsleur-ja.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    nm = sum(1 for l in out.values() for x in l['lessons'].values() for w in x['words'] if w[3] < PM_OFF)
    nt = sum(len(x['words']) for l in out.values() for x in l['lessons'].values())
    print(f'lessons {sum(len(l["lessons"]) for l in out.values())} words {nt} matched {nm} pimsleur-set {len(pm)}')
    if '--show' in sys.argv:
        for l in out.values():
            for n, x in l['lessons'].items():
                for w in x['words']:
                    print(n, w[0], w[2], '→', ('%s %s %s' % (LV[w[3] // 10000], word(w[3])[0], word(w[3])[2][:50])) if w[3] < PM_OFF else 'PM')
    if '--audio' in sys.argv: audio(pm)
def audio(pm):
    raw = B + 'audio_pm/raw/'; dst = B + 'audio_pm/out/pm/w/'; os.makedirs(raw, exist_ok=True); os.makedirs(dst, exist_ok=True)
    jobs = [[re.sub(r'[、,]', '、', k).replace('ゔ', 'ヴ'), f'{raw}{i}.mp3', '-10%'] for i, (j, k, e) in enumerate(pm)]
    json.dump(jobs, open(B + 'audio_pm/jobs.json', 'w'), ensure_ascii=False)
    subprocess.run([sys.executable, B + 'src/tts_gen.py', B + 'audio_pm/jobs.json', '6'], check=True)
    FILT = "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.06,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.18,areverse"
    for i in range(len(pm)):
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', f'{raw}{i}.mp3', '-af', FILT, '-ac', '1', '-ar', '24000', '-c:a', 'libmp3lame', '-b:a', '40k', f'{dst}{i}.mp3'], check=True)
    json.dump({'engine': 'edge-tts 7.2.8', 'voice': 'ja-JP-NanamiNeural', 'count': len(pm), 'text': [j[0] for j in jobs]}, open(dst + '../manifest.json', 'w'), ensure_ascii=False)
    print('audio', len(pm))
if __name__ == '__main__': main()
