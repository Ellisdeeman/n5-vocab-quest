br=$1
for t in tdread tnewcap tflash tflhome tdet tmem tsync tgames tstyle tduecard tdue tkfix tidk tkanji tdaily tpath tal tgoal tkaudit tpims tallmap tsfx tretype tfsrs tkanaatro tkamusic tfopt tflkanji tsmart tgrammar trd tmock tconj tladder tpush tpushlogic tspeak tovf tnoleak tcs; do echo "== $t $br"; BROWSER=$br timeout 900 node $t.js 2>&1 | grep -E "^FAIL|SUMMARY|passed|Error|CRASH|crashed"; done
echo "ALLDONE $br"
