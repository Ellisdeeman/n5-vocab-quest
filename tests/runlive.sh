L=https://ellisdeeman.github.io/n5-vocab-quest/
for br in webkit chromium; do for t in tduecard tstyle; do echo "== $t $br"; BROWSER=$br URL=$L timeout 600 node $t.js 2>&1 | grep -E "^FAIL|SUMMARY|Error"; done; done
for t in tdue tkfix tidk tkanji tdaily tal tgoal tkaudit; do echo "== $t webkit"; BROWSER=webkit URL=$L timeout 700 node $t.js 2>&1 | grep -E "^FAIL|SUMMARY|Error"; done
echo ALLDONE
