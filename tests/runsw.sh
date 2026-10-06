BROWSER=webkit timeout 900 node tstyle.js 2>&1 | grep -E "^FAIL|SUMMARY" -A2
for br in webkit chromium; do echo "== tsw $br"; echo old3 > /tmp/swt/ROOT; BROWSER=$br FROM=old3 timeout 400 node tsw.js 2>&1 | grep -E "^FAIL|SUMMARY|Error|CRASH"; done
echo ALLDONE
