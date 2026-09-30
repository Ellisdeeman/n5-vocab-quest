br=$1
for t in tsync tgames tstyle tduecard tdue tkfix tidk tkanji tdaily tpath tal tgoal tkaudit; do echo "== $t $br"; BROWSER=$br timeout 900 node $t.js 2>&1 | grep -E "^FAIL|SUMMARY|passed|Error|CRASH|crashed"; done
echo "ALLDONE $br"
