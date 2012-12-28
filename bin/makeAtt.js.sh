#!/bin/sh -x

cd ../src/node-phone/public/javascript/attfactory
rm -f att.a1.js att.a2.js att.a3.js

cat wcg-2.26.gh.js >> att.a1.js
cat att-phono-0.1.js >> att.a1.js

cat h2s-phono-v2.js >> att.a2.js
cat att-phono-0.1.js >> att.a2.js

cat phono.05.js >> att.a3.js
cat att-phono-0.1.js >> att.a3.js

mv att.a1.js ..
mv att.a2.js ..
mv att.a3.js ..

