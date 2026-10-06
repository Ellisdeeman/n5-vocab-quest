U=https://ellisdeeman.github.io/n5-vocab-quest/
for x in "tgames webkit" "tgames chromium" "tduecard webkit" "tidk webkit" "tstyle webkit"; do set -- $x; echo "== live $1 $2"; URL=$U BROWSER=$2 timeout 900 node $1.js 2>&1 | grep -E "^FAIL|SUMMARY|passed|CRASH|crashed" -A2; done
echo ALLDONE
