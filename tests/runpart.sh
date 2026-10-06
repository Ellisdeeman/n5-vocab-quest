br=$1; shift
for t in "$@"; do echo "== $t $br"; BROWSER=$br timeout 420 node $t.js 2>&1 | grep -E "^FAIL|SUMMARY|passed|Error|CRASH|crashed"; done
echo "ALLDONE $br"
