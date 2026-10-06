for t in tgames tduecard tdue tkfix tidk tkanji tdaily tpath tal tgoal tkaudit tstyle; do for br in webkit chromium; do echo "== $t $br"; BROWSER=$br timeout 900 node $t.js 2>&1 | grep -E "^FAIL|SUMMARY|passed|Error|CRASH|crashed"; done; done
for br in webkit chromium; do echo "== tsw $br"; echo old3 > /tmp/swt/ROOT; BROWSER=$br FROM=old3 timeout 400 node tsw.js 2>&1 | grep -E "^FAIL|SUMMARY|Error|CRASH"; done
echo ALLDONE
