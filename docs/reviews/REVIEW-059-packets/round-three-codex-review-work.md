# Round three, leg A's review scripts and logs, copied from its workspace after it returned

## browser-cases.ts

````
import {cpSync,readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {readOutput,runChecks,verdictFile} from '../tools/check-web-hosted.ts';
import {preflight} from '../web/hosted/deploy-preflight.ts';
const root=resolve('review-input/rebuilt'),m=JSON.parse(readFileSync(join(root,'build-manifest.json'),'utf8')),want={commit:m.commit};
const cases=[
 ['browser-second-home',null,`if(location.pathname==='/'){const n=Number(sessionStorage.getItem('r2-home')||0);sessionStorage.setItem('r2-home',String(n+1));if(n===1)console.error('R2_SECOND_HOME');}`],
 ['second-home-inspect-gap',null,`if(location.pathname==='/'){const n=Number(sessionStorage.getItem('r3-gap-home')||0);sessionStorage.setItem('r3-gap-home',String(n+1));if(n===1){const original=window.__violations.splice;window.__violations.splice=function(...args){if(location.pathname==='/')console.error('R3_SECOND_INSPECT_GAP');return original.apply(this,args)}}}`],
 ['opacity-zero','[data-dh2-wording]{opacity:0}',null],
 ['clipped','[data-dh2-wording]{clip-path:inset(50%)}',null],
 ['ancestor-clipped','section:has(>[data-dh2-wording]){overflow:hidden;max-height:0}',null],
 ['display-contents','[data-dh2-wording], [data-dh2-wording] p {display:contents}',null],
 ['second-home-error-late',null,`if(location.pathname==='/'){const n=Number(sessionStorage.getItem('r3-home')||0);sessionStorage.setItem('r3-home',String(n+1));if(n===1)setTimeout(()=>console.error('R3_HOME_LATE'),1600);}`],
 ['nav-opacity',null,`document.addEventListener('click',e=>{if(e.target.closest('a[href="/observer"]')){let n=0;const t=setInterval(()=>{for(const el of document.querySelectorAll('[data-dh2-wording]'))el.style.opacity='0';if(n++>40)clearInterval(t)},20)}});`],
] as const;
for(const [name,css,js] of cases){const d=resolve('review-work-r3/'+name);cpSync(root,d,{recursive:true});const dir=join(d,'.vercel/output/static/assets');if(css){const p=join(dir,readdirSync(dir).find(n=>n.endsWith('.css'))!);writeFileSync(p,readFileSync(p,'utf8')+'\n'+css+'\n');}if(js){const p=join(dir,readdirSync(dir).find(n=>/^Verdict-.*\.js$/.test(n))!);writeFileSync(p,readFileSync(p,'utf8')+'\n'+js+'\n');}const f=readOutput(d);writeFileSync(join(d,'.vercel/output/static/gate-verdict.json'),JSON.stringify(verdictFile(f,want,52)));console.log(name,JSON.stringify({gate:runChecks(f,want),preflight:preflight(d,()=>true)}));}
````

## control-isolation.ts

````
import {readFileSync,writeFileSync,rmSync,cpSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {CONTROLS,readOutput} from '../tools/check-web-hosted.ts';
const root=resolve('review-input/rebuilt'),want={commit:JSON.parse(readFileSync(join(root,'build-manifest.json'),'utf8')).commit};
const source=readFileSync('tools/check-web-hosted.ts','utf8');
const variants=[
 ['address',source.replace(/const ADDRESS = [^;]+;/,'const ADDRESS = /(?!) /;'),[38]],
 ['issuance',source.replace(/const ISSUANCE_ID = [^;]+;/,'const ISSUANCE_ID = /(?!) /;'),[39]],
 ['issuer-before',source.replace(/  \/\\b\(\?:decrypt[^\n]+\n/,'') ,[40,41]],
 ['issuer-all',source.replace(/const ISSUER_FIGURE = \[[\s\S]*?\n\];/,'const ISSUER_FIGURE: RegExp[] = [];'),[40,41,42]],
 ['entity-decimal',source.replace('.replace(/&#(\\d+);/g, (_, d) => String.fromCodePoint(Number(d)))',''),[43,45]],
 ['srcset',source.replace('value.split(",").map((c) => c.trim().split(/\\s+/)[0])','[value.split(/\\s+/)[0]]'),[44]],
 ['attribute-absolute',source.replace(/        else if \(\/\^\[a-z\][^\n]+/,'') ,[45]],
] as const;
for(const [rule,code,indices] of variants){if(code===source){console.log(rule,'INSTRUMENTATION DID NOT CHANGE SOURCE');continue;}const p=resolve('tools/.review-r3-'+rule+'.ts');writeFileSync(p,code);try{const weak=await import(p);for(const i of indices){const [name,check,mutate,detail]=CONTROLS[i];const d=resolve('review-work-r3/isolation-control');cpSync(root,d,{recursive:true});try{mutate(d);const got=weak.runChecks(readOutput(d),want);console.log(JSON.stringify({rule,name,stillHits:got.some((x:any)=>x.check===check&&(!detail||x.detail.includes(detail))),got}));}finally{rmSync(d,{recursive:true,force:true});}}}finally{rmSync(p);}}
````

## probes.ts

````
import {cpSync,readFileSync,writeFileSync,rmSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {CONTROLS,readOutput,runChecks,verdictFile,pageText,decodeEntities} from '../tools/check-web-hosted.ts';
import {preflight,manifestProblems} from '../web/hosted/deploy-preflight.ts';
const root=resolve('review-input/rebuilt'),base=readOutput(root),m=JSON.parse(readFileSync(join(root,'build-manifest.json'),'utf8')),want={commit:m.commit};
const log=(name:string,x:any)=>console.log(name,JSON.stringify(x));
log('baseline',runChecks(base,want));log('baseline preflight public-main stub only',preflight(root,()=>true));
let passed=0;for(const [i,[name,check,mutate,detail]] of CONTROLS.entries()) {const d=resolve('review-work-r3/control-'+i);cpSync(root,d,{recursive:true});try{mutate(d);const got=runChecks(readOutput(d),want),hit=got.some(x=>x.check===check&&(!detail||x.detail.includes(detail)));if(hit)passed++;log('control '+(i+1)+' '+name,{hit,got});}finally{rmSync(d,{recursive:true,force:true});}}
log('detector controls',`${passed}/${CONTROLS.length}`);
function append(f:Map<string,Buffer>,p:string,s:string){f.set(p,Buffer.from(f.get(p)!.toString().replace('</body>',s+'</body>')));}
function persist(name:string,f:Map<string,Buffer>,manifest=m){const d=resolve('review-work-r3/'+name);cpSync(root,d,{recursive:true});for(const [p,b] of f)writeFileSync(join(d,'.vercel/output',p),b);writeFileSync(join(d,'build-manifest.json'),JSON.stringify(manifest));writeFileSync(join(d,'.vercel/output/static/gate-verdict.json'),JSON.stringify(verdictFile(f,want,52)));return d;}
function probe(name:string,p:string,s:string,pre=false){const f=new Map(base);append(f,p,s);log(name,runChecks(f,want));if(pre)log(name+' preflight',preflight(persist(name,f),()=>true));}
const wallet='static/wallet/index.html',home='static/index.html',issuer='static/issuer/index.html',observer='static/observer/index.html';
probe('b18-original',wallet,'<p>Demo account rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh holds confidential balance 5000</p>');
probe('b18-next',home,'<p>Issuance 004625C9F2DDC3E652071A9FFA07507F2151FEE332CB25E8 has confidential balance 5000</p>');
probe('account-entity',wallet,'<p>Demo account &#114;Hb9CJAWyB4rj91VRWn96DkukG4bwdtyTh holds confidential balance 5000</p>',true);
probe('account-markup',wallet,'<p>Demo account rHb9<span>CJAWyB4rj91VRWn96DkukG4bwdtyTh</span> holds confidential balance 5000</p>');
probe('issuance-entity',home,'<p>Issuance &#48;04625C9F2DDC3E652071A9FFA07507F2151FEE332CB25E8 has confidential balance 5000</p>',true);
probe('issuer-figure',issuer,'<p>Decrypted issuer balance: 42</p>');
probe('issuer-figure-next',observer,'<p>Issuer plaintext balance: 73</p>');
probe('issuer-label-after-value',issuer,'<p>42 (decrypted issuer balance)</p>',true);
probe('issuer-negative',issuer,'<p>Decrypted issuer balance: -42</p>',true);
probe('issuer-is',issuer,'<p>Decrypted issuer balance is 42</p>',true);
probe('issuer-cleartext',issuer,'<p>Issuer cleartext balance: 42</p>',true);
probe('issuer-table',issuer,'<table><tr><th>Decrypted issuer balance</th></tr><tr><td>Holder A</td><td>42</td></tr></table>',true);
probe('issuer-negated-example',home,'<p>This site never shows a decrypted issuer balance: 42 is only a documentation example.</p>');
for(const [n,s] of [
 ['scheme-original','<script src="//analytics.example.net/a.js"></script>'],
 ['scheme-next','<link href="//analytics.example.net/a.css" rel="stylesheet">'],
 ['scheme-entity','<script src="&#47;&#47;analytics.example.net/a.js"></script>'],
 ['scheme-srcset','<img srcset="/assets/a.png 1x, //analytics.example.net/a.png 2x">'],
 ['scheme-named','<a href="&sol;&sol;analytics.example.net/a">x</a>'],
 ['scheme-no-semi','<a href="&#47&#47;analytics.example.net/a">x</a>'],
 ['scheme-tab','<a href="/&#9;/analytics.example.net/a">x</a>'],
 ['scheme-backslash','<a href="/\\analytics.example.net/a">x</a>'],
 ['scheme-uppercase-hex','<a href="&#X2f;&#X2f;analytics.example.net/a">x</a>'],
 ['entity-invalid','<p>&#1114112;</p>'],
 ['scheme-double-decode-correct','<a href="&#x26;#47;&#x26;#47;analytics.example.net/a">relative link</a>'],
 ['benign-template-url','<template><a href="//example.net">inert</a></template>'],
] as const){try{probe(n,home,s)}catch(e){log(n+' THREW',String(e));}}
for(const [name,change] of [
 ['readtime-malformed',(x:any)=>x.snapshot.readAt='2'],['endpoint-mismatch',(x:any)=>x.snapshot.endpoint='https://s.altnet.rippletest.net:51234'],['missing-image',(x:any)=>delete x.image],
 ['missing-isolation',(x:any)=>delete x.isolation],['missing-environment',(x:any)=>delete x.environment],['impossible-builtAt',(x:any)=>x.builtAt='2026-99-99T99:99:99.999Z'],
 ['impossible-readAt',(x:any)=>x.snapshot.readAt='2026-99-99T99:99:99.999Z'],
 ['canonical-port',(x:any)=>x.snapshot.canonicalUrl='https://xrpl-confidential-positions.vercel.app:443'],
] as const){const x=structuredClone(m);change(x);log(name+' schema',manifestProblems(x));const f=new Map(base);if(name==='impossible-readAt')for(const [p,b] of f)if(p.endsWith('.html'))f.set(p,Buffer.from(b.toString().replaceAll(m.snapshot.readAt,x.snapshot.readAt)));log(name+' preflight',preflight(persist(name,f,x),()=>true));}
// Correct provenance anywhere in the page can mask an incorrect actual footer.
const prov=`Ledger values were read at validated ledger ${m.snapshot.ledgerIndex} on ${m.snapshot.readAt}.`;
for(const name of ['wrong-footer','comment-endpoint']){const f=new Map(base);for(const [p,b] of f){if(!p.endsWith('.html'))continue;let h=b.toString();if(name==='wrong-footer'){h=h.replace('Ledger values were read at validated ledger <!-- -->'+m.snapshot.ledgerIndex,'Ledger values were read at validated ledger <!-- -->1');h=h.replace('</body>',`<p>${prov}</p></body>`);}else if(p===observer||p===issuer){h=h.replaceAll('read from <code>'+m.snapshot.endpoint+'</code>','read from <code>another public source</code>');h=h.replace('</body>',`<p hidden>read from ${m.snapshot.endpoint}</p></body>`);}f.set(p,Buffer.from(h));}log(name+' gate',runChecks(f,want));log(name+' preflight',preflight(persist(name,f),()=>true));}

const equivalent=new Map(base);for(const [p,b] of equivalent)if(p.endsWith('.html'))equivalent.set(p,Buffer.from(b.toString().replace('Ledger values were read at validated ledger <!-- -->'+m.snapshot.ledgerIndex,'Ledger values were read at validated ledger <!-- -->'+String(m.snapshot.ledgerIndex).slice(0,3)+'<span>'+String(m.snapshot.ledgerIndex).slice(3)+'</span>')));log('equivalent-inline-provenance gate',runChecks(equivalent,want));log('equivalent-inline-provenance preflight',preflight(persist('equivalent-inline-provenance',equivalent),()=>true));
````

## release-probes.ts

````
import {MIMEType} from 'node:util';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {serveOutput} from '../web/hosted/browser-check.ts';
import {compareDeployed} from '../web/hosted/compare-deployed.ts';
const root=resolve('review-input/rebuilt');const inner=serveOutput(root);
try{for(const type of ['text/html; note=";charset=utf-8"; charset=utf-16le','text/html; charset=utf-16le','text/html; charset =utf-16le','text/html; charset= utf-16le','text/html; charset="utf-16le"','text/html; charset=utf8','text/html; charset=unicode-1-1-utf-8','text/html; charset="UTF-8"','text/html; charset=','text/html; charset="utf-8;anything"; charset=utf-16le']){const outer=Bun.serve({hostname:'127.0.0.1',port:0,async fetch(req){const p=new URL(req.url).pathname;const r=await fetch(`http://127.0.0.1:${inner.port}${p}`,{redirect:'manual'});const b=await r.arrayBuffer();const h=new Headers(r.headers);if(h.get('content-type')?.startsWith('text/html'))h.set('content-type',type);return new Response(b,{status:r.status,headers:h});}});try{const result=await compareDeployed(root,`http://127.0.0.1:${outer.port}`);console.log(JSON.stringify({type,effectiveCharset:new MIMEType(type).params.get('charset'),result:result.length?{count:result.length,first:result[0]}:[]}));}finally{outer.stop(true);}}}finally{inner.stop(true);}

console.log('aliases',JSON.stringify(['utf8','unicode-1-1-utf-8'].map(label=>({label,encoding:new TextDecoder(label).encoding}))));
````

## custody-probes.py

````
from pathlib import Path
import subprocess,os,tarfile,io
root=Path.cwd(); dest=root/'review-work-r3/custody-tree';dest.mkdir(exist_ok=True)
buf=subprocess.check_output(['git','archive','HEAD'])
with tarfile.open(fileobj=io.BytesIO(buf)) as t: t.extractall(dest,filter='data')
if not (dest/'node_modules').exists(): (dest/'node_modules').symlink_to(root/'node_modules',target_is_directory=True)
files=['web/app/src/views/CustodyView.tsx','web/api/capability.ts','web/api/custody-sim.ts']
original={p:(dest/p).read_text() for p in files}
cases=[('baseline',None,None,None),
('view-internal-exception',files[0],'A platform that ran the derivation inside its own boundary\n              would change that; it would need the derivation published as a standard, and it is not\n              (issue #10).',''),
('matrix-internal-exception',files[1],', or if the platform itself ran the derivation inside its own boundary, which would need the derivation published as a standard (issue #10)',''),
('simulation-internal-exception',files[2],' A platform that ran the derivation " +\n      "inside its own boundary would change this, and that needs the derivation published (issue #10).',''),
('view-public-data',files[0],'that holds only public data ','') ,
('matrix-public-data',files[1],'Holding only public data, it','It'),
('simulation-public-data',files[2],'. It is hidden from this simulation\'s policy engine too, which holds " +\n      "only public data.','.'),
('view-policy-alternatives',files[0],'give the policy\n              engine the ElGamal secret, and it becomes another party that reads every balance;\n              accept the holder&rsquo;s statement of the amount, and the policy rests on the\n              holder&rsquo;s honesty; or ','')]
for name,p,old,new in cases:
    for path,s in original.items(): (dest/path).write_text(s)
    if p:
        assert old in original[p],name
        (dest/p).write_text(original[p].replace(old,new))
    result=subprocess.run(['bun','test','web/api/disclosure.test.ts','--test-name-pattern','the custody findings keep their exceptions'],cwd=dest,capture_output=True,text=True)
    (root/('review-work-r3/custody-'+name+'.log')).write_text(result.stdout+result.stderr)
    summary=[line for line in (result.stdout+result.stderr).splitlines() if ' pass' in line or ' fail' in line or 'expect(' in line or line.startswith('error:')]
    print(name,'exit='+str(result.returncode),' | '.join(summary))
    if name in ['simulation-internal-exception','view-policy-alternatives']:
        full=subprocess.run(['bun','test','web/api','web/hosted'],cwd=dest,capture_output=True,text=True)
        (root/('review-work-r3/custody-'+name+'-full.log')).write_text(full.stdout+full.stderr)
        print(name,'full exit='+str(full.returncode),' | '.join(line for line in (full.stdout+full.stderr).splitlines() if ' pass' in line or ' fail' in line))
for path,s in original.items(): (dest/path).write_text(s)
````

## text-sweep.py

````
from pathlib import Path
import subprocess,re,json
args=['rg','--files','--hidden','--no-ignore','-g','!.git/**','-g','!node_modules/**','-g','!**/node_modules/**','-g','!docs/reviews/**','-g','!review-work-r3/**','-g','!**/scratchpad/**','-g','!scratchpad/**']
paths=subprocess.check_output(args,text=True).splitlines()
patterns={
'R2-9 environment':r'nothing from the build machine.{0,30}environment reaches the bundle',
'R2-10 corpus negative':r'not (?:knowable|determinable) from (?:any |all )?published source[s]?|no wallet publishes that version|whose version no vendor publishes',
'R2-10 custody derive':r'(?:custodied account|the account) cannot derive (?:its own )?(?:viewing|ElGamal|key)',
'R2-10 custody policy':r'policy engine (?:cannot|can.t) (?:read|enforce)|every policy over a (?:\*\*)?value|every policy over an (?:\*\*)?identity',
'R2-11 header':r'ADR-0004.{0,20}step 4|D-H4 and step 5|step 5 compares',
'R2-12 record':r'each completion has a test that fails',
'R2-2 impossibility':r'only as text in a public commit|build container holds no key|figure labelled as decrypted or plaintext',
'R2-1 limits':r'refuses any address-shaped|a ledger value on a page outside',
'R1-14 balance note':r'its spending balance is not the canonical zero|its inbox is publicly known to be exactly zero',
'B1-5 alias':r'only (?:the )?alias serves|only (?:the )?production alias serves',
'S-6 header':r'step 9 is not built',
'S-9 README':r'does not tell you how to create',
'R1-13 wallet updates':r'cannot be closed by any wallet update|one built on reasons 1.3 cannot be',
}
opened=[];hits=[]
for name in paths:
    p=Path(name)
    if p.is_symlink() or not p.is_file():continue
    data=p.read_bytes();opened.append(name)
    if b'\0' in data and p.suffix not in ['.html','.js','.css','.json','.md','.ts','.tsx','.rs','.txt']:continue
    try:s=data.decode('utf-8')
    except UnicodeDecodeError:continue
    # whitespace-normalized cross-line search, with Markdown emphasis/ticks removed
    chars=[];positions=[];pending=False
    for i,c in enumerate(s):
        if c in '*`':continue
        if c.isspace():
            if not pending:chars.append(' ');positions.append(i)
            pending=True
        else:chars.append(c);positions.append(i);pending=False
    t=''.join(chars)
    for kind,pat in patterns.items():
        for m in re.finditer(pat,t,re.I):
            line=s.count('\n',0,positions[m.start()])+1
            excerpt=t[max(0,m.start()-80):m.end()+180]
            hits.append({'kind':kind,'file':name,'line':line,'context':excerpt})
Path('review-work-r3/sweep-files.txt').write_text('\n'.join(sorted(opened))+'\n')
Path('review-work-r3/text-sweep.json').write_text(json.dumps(hits,indent=2))
for x in hits:print(f"{x['kind']} | {x['file']}:{x['line']} | {x['context']}")
print(f'{len(opened)} files opened; {len(hits)} hits')
````

## browser-cases.log

````
browser-second-home {"gate":[],"preflight":[]}
second-home-inspect-gap {"gate":[],"preflight":[]}
opacity-zero {"gate":[],"preflight":[]}
clipped {"gate":[],"preflight":[]}
ancestor-clipped {"gate":[],"preflight":[]}
display-contents {"gate":[],"preflight":[]}
second-home-error-late {"gate":[],"preflight":[]}
nav-opacity {"gate":[],"preflight":[]}
````

## control-isolation.log

````
{"rule":"address","name":"B1-8's own example on the wallet page","stillHits":false,"got":[]}
{"rule":"issuance","name":"an issuance ID on the capabilities page","stillHits":false,"got":[]}
{"rule":"issuer-before","name":"a decrypted issuer balance on the issuer page","stillHits":false,"got":[]}
{"rule":"issuer-before","name":"a plaintext figure on the overview","stillHits":false,"got":[]}
{"rule":"issuer-all","name":"a decrypted issuer balance on the issuer page","stillHits":false,"got":[]}
{"rule":"issuer-all","name":"a plaintext figure on the overview","stillHits":false,"got":[]}
{"rule":"issuer-all","name":"a figure labelled after its value","stillHits":false,"got":[]}
{"rule":"entity-decimal","name":"an entity-encoded scheme-relative script","stillHits":false,"got":[]}
{"rule":"entity-decimal","name":"an entity-encoded absolute address","stillHits":false,"got":[]}
{"rule":"srcset","name":"an external second srcset candidate","stillHits":false,"got":[]}
{"rule":"attribute-absolute","name":"an entity-encoded absolute address","stillHits":false,"got":[]}
````

## custody-baseline.log

````
bun test v1.3.14 (0d9b296a)
check-web-readonly — architecture §6 step 8, ADR-0003 D1
==============================================================================

  web/app: 33 source file(s)
  web/api: 10 source file(s)

Part 1 — nothing under web/app reaches the signer socket
  ✓ web/app names no socket path, imports no UDS client, opens no socket
  CONTROL ✓ an INJECTED socket reference in web/app is caught by the real detector
  CONTROL ✓ a COMMENTED-OUT socket reference is NOT counted (E-182)
  CONTROL ✓ a BLOCK-commented socket reference is NOT counted
  CONTROL ✓ a socket path inside a STRING LITERAL IS counted — literals are preserved
  CONTROL ✓ a socket path inside a TEMPLATE literal IS counted
  CONTROL ✓ code AFTER a non-nesting block comment is still scanned (the Rust-stripper trap)

Part 2 — the Elysia process builds Status, and never Pair or Prepare
  ✓ web/api constructs a `status` request
  ✓ web/api constructs neither `pair` nor `prepare`
  CONTROL ✓ an INJECTED pair request is caught by the real detector
  CONTROL ✓ a TEMPLATE-LITERAL authority tag is caught — type: `prepare`
  CONTROL ✓ an INJECTED prepare request is caught by the real detector
  CONTROL ✓ the status detector FAILS on a tree with no status request

Part 3 — no route, loader or server function reaches a signing operation
  ✓ no signing operation anywhere in the web tier
  CONTROL ✓ an INJECTED signing call is caught by the real detector
  CONTROL ✓ an INJECTED server function that signs is caught
  CONTROL ✓ PROSE naming another project's signing API is NOT a violation of ours
  CONTROL ✓ ⚠ and the SAME text IS still caught when it is real code, not prose
  CONTROL ✓ a QUOTED brace inside an interpolation does NOT unbalance the scan
  CONTROL ✓ ⚠ a signing call after a NESTED OBJECT LITERAL in an interpolation IS caught
  CONTROL ✓ ⚠ a signing call inside a TEMPLATE interpolation is still code, and IS caught
  CONTROL ✓ ⚠ a socket path in a literal is STILL caught — the ident pass did not replace the value pass

Part 4 — the tier holds NO secret and decrypts nothing
  ✓ no file under web/ reads a secret env var, decrypts, or spawns a process
  CONTROL ✓ a WRAPPED env read is caught — the expression spans lines
  CONTROL ✓ a BRACKET env read is caught — process.env["NAME"]
  CONTROL ✓ a DOTTED env read is caught — process.env.NAME
  CONTROL ✓ DECLARING the forbidden name in order to forbid it is NOT a violation
  CONTROL ✓ an INJECTED secret env read is caught by the real detector
  CONTROL ✓ an INJECTED decryption call is caught
  CONTROL ✓ an INJECTED subprocess spawn is caught
  CONTROL ✓ PROSE naming the secret in a doc string is NOT a violation

Part 5 — exactly one socket client in the whole tier
  ✓ exactly one file references the socket (found 1: web/api/signer-status.ts)
  CONTROL ✓ a SECOND socket client is caught by the real detector
  CONTROL ✓ a file with NO socket reference is not counted as a client
  CONTROL ✓ a `import net from "net"` + net.connect client IS counted
  CONTROL ✓ a second client using node:net/createConnection IS counted

Part 6 — the API binds to loopback, and nothing else
  ✓ every .listen( passes an explicit loopback hostname
  ✓ every `host:` under web/app is a loopback literal
  CONTROL ✓ a DUPLICATE hostname key is caught (the LAST one wins in JS)
  CONTROL ✓ a COMPUTED host key ["host"] is caught
  CONTROL ✓ a QUOTED host key is NOT a false-FAIL
  CONTROL ✓ a dynamic `await import("net")` client IS counted
  CONTROL ✓ a MULTI-LINE `from "net"` import IS counted
  CONTROL ✓ a TYPE-ONLY socket import is NOT counted as a client
  CONTROL ✓ a NON-LITERAL host: beside a legitimate loopback host IS caught
  CONTROL ✓ a bind whose ARGUMENTS CONTAIN PARENTHESES is not a false-FAIL
  CONTROL ✓ a 0.0.0.0 host STILL caught with the widened collector
  CONTROL ✓ a 0.0.0.0 dev-server host IS caught
  CONTROL ✓ a LAN dev-server host IS caught
  CONTROL ✓ the REAL dev-server form is NOT caught
  CONTROL ✓ a source set with NO host: key FAILS rather than passing vacuously
  CONTROL ✓ a BARE .listen(port) with no hostname IS caught
  CONTROL ✓ an explicit 0.0.0.0 bind IS caught
  CONTROL ✓ a non-loopback hostname literal IS caught
  CONTROL ✓ the REAL form is NOT caught
  CONTROL ✓ a source set with NO listen call FAILS rather than passing vacuously

Asserted-uncaught — the disclosure below fails if these ever start passing
  CONTROL ✓ ASSERTED UNCAUGHT: an indirect socket path assembled at runtime
  CONTROL ✓ a hostname computed at run time IS caught — part 6 fails closed
  CONTROL ✓ a hostname read from the environment IS caught
  CONTROL ✓ a LAN hostname ARGUMENT is caught even when a loopback CONSTANT is present
  CONTROL ✓ a Bun.serve( bind is seen, not only .listen(
  CONTROL ✓ ASSERTED UNCAUGHT: a socket reached through a dependency this gate does not read

  What this gate does NOT say:
    1. It is LEXICAL. A socket path assembled at runtime — string concatenation, an array join, a base64 blob — is invisible to it, and that shape is an asserted-uncaught control above.
    2. It reads THIS REPOSITORY'S sources only. A dependency under node_modules that opens a socket is not read, and could not be gated this way; the property there is that nothing in web/app has a reason to call one.
    3. The needle sets are NAMED. A signing helper spelled differently from every entry in SIGNING_NEEDLES is not counted, by name (E-142's narrowing, forced three times since).
    4. It checks SOURCE, not behaviour. It cannot prove that the one socket client sends only what it constructs, and it is not a substitute for reading that file.
    5. It says nothing about what the tier DISCLOSES. Whether a rendered sentence about privacy is true is `claims-check`'s question and the wording tests', not this gate's.
    6. Part 4 is about what the tier HOLDS; parts 1-3 are about what it can REACH. Those are different properties and the gate had only the second when an issuer key was added to the API process (E-212). A secret obtained some way this list does not name is still invisible.
    7. The signing pass BLANKS string literals, so a call assembled as a string and eval'd is invisible to it. That is the price of not treating prose about another project's API as a violation of ours, it is a deliberate trade, and the socket pass — where a literal IS the value — keeps literals for exactly the opposite reason (CLAIMS.md E-203, fourth consumer).
    8. It scans web/app and web/api ONLY. A signing helper, a socket client or a listener placed in any OTHER directory under web/ — a new web/bridge/, say — is not read at all, and the count in Part 5 is over the two directories it loads (REVIEW-036b).
    9. It does not check for MUTATING routes. A .post, .put or .delete that writes is invisible to every part; 'read-only' is checked as 'reaches no signing operation and holds no secret', which is not the same property (REVIEW-036b).
    10. Part 6's bind check is LEXICAL and FAILS CLOSED. It resolves a quoted literal, or ONE level of indirection to a constant declared in the same source set; anything else — an env read, a ternary, a concatenation, a call — is REFUSED rather than assumed loopback. ⚠ It reads `.listen(` and `Bun.serve(` by name: a listener started through some other API, or in a directory this gate does not load, is invisible (REVIEW-037 F2).
    11. ⚠ Part 6's resolver IGNORES LEXICAL SCOPE. A parameter or inner binding that SHADOWS an outer loopback constant resolves to the outer one, so `function start(HOST){ listen({hostname: HOST}) }` called with a routable address passes. Full scope analysis needs a parser; this is a named limit, not an oversight (REVIEW-037 spot-check, E-238).
    12. ⚠ Part 6 matches `.listen(` and `Bun.serve(` BY NAME. A parenthesised `(Bun.serve)(…)`, a bind through a framework helper, or an aliased reference is invisible. Chasing spellings is how a named set pretends to be a property; it is disclosed instead (E-238).
    13. ⚠ A socket reached through an ALIASED dynamic import — `const t = await import(x); t.connect(…)` with the specifier assembled at run time — is invisible. The import spellings are matched; the aliasing is not, and cannot be lexically (E-238).
    14. ⚠ Part 6 reads STRING LITERALS as values, so prose containing `host: "0.0.0.0"` inside a quoted string FALSE-FAILS. That is the unsafe direction chosen deliberately: a false-fail is loud and gets fixed, a false-pass is silent (CLAIMS.md E-203's two-consumer lesson).
    15. It says nothing about WHO MAY ASK. The tier serves every route unauthenticated on loopback, and loopback is not uid-scoped — so a datum this gate certifies as reachable-by-design is reachable by any local user. Egress is a third property beside REACH and HOLD, and no part of this gate looks at it (CLAIMS.md E-228, REVIEW-036c U1).

------------------------------------------------------------------------------
PASS: web/app reaches no socket, web/api builds Status and neither Pair nor
      Prepare, no signing operation exists in the tier, exactly one socket
      client exists, and the API binds to loopback only — under 54 controls,
      a count INCREMENTED BY THE
      HELPER THAT RUNS THEM (E-203), each running through the same detector the
      real checks call.
⚠ A lexical gate over a NAMED SET. See "What this gate does NOT say" above.

web/api/disclosure.test.ts:

 3 pass
 59 filtered out
 0 fail
 10 expect() calls
Ran 3 tests across 1 file. [271.00ms]
````

## custody-matrix-internal-exception.log

````
bun test v1.3.14 (0d9b296a)
check-web-readonly — architecture §6 step 8, ADR-0003 D1
==============================================================================

  web/app: 33 source file(s)
  web/api: 10 source file(s)

Part 1 — nothing under web/app reaches the signer socket
  ✓ web/app names no socket path, imports no UDS client, opens no socket
  CONTROL ✓ an INJECTED socket reference in web/app is caught by the real detector
  CONTROL ✓ a COMMENTED-OUT socket reference is NOT counted (E-182)
  CONTROL ✓ a BLOCK-commented socket reference is NOT counted
  CONTROL ✓ a socket path inside a STRING LITERAL IS counted — literals are preserved
  CONTROL ✓ a socket path inside a TEMPLATE literal IS counted
  CONTROL ✓ code AFTER a non-nesting block comment is still scanned (the Rust-stripper trap)

Part 2 — the Elysia process builds Status, and never Pair or Prepare
  ✓ web/api constructs a `status` request
  ✓ web/api constructs neither `pair` nor `prepare`
  CONTROL ✓ an INJECTED pair request is caught by the real detector
  CONTROL ✓ a TEMPLATE-LITERAL authority tag is caught — type: `prepare`
  CONTROL ✓ an INJECTED prepare request is caught by the real detector
  CONTROL ✓ the status detector FAILS on a tree with no status request

Part 3 — no route, loader or server function reaches a signing operation
  ✓ no signing operation anywhere in the web tier
  CONTROL ✓ an INJECTED signing call is caught by the real detector
  CONTROL ✓ an INJECTED server function that signs is caught
  CONTROL ✓ PROSE naming another project's signing API is NOT a violation of ours
  CONTROL ✓ ⚠ and the SAME text IS still caught when it is real code, not prose
  CONTROL ✓ a QUOTED brace inside an interpolation does NOT unbalance the scan
  CONTROL ✓ ⚠ a signing call after a NESTED OBJECT LITERAL in an interpolation IS caught
  CONTROL ✓ ⚠ a signing call inside a TEMPLATE interpolation is still code, and IS caught
  CONTROL ✓ ⚠ a socket path in a literal is STILL caught — the ident pass did not replace the value pass

Part 4 — the tier holds NO secret and decrypts nothing
  ✓ no file under web/ reads a secret env var, decrypts, or spawns a process
  CONTROL ✓ a WRAPPED env read is caught — the expression spans lines
  CONTROL ✓ a BRACKET env read is caught — process.env["NAME"]
  CONTROL ✓ a DOTTED env read is caught — process.env.NAME
  CONTROL ✓ DECLARING the forbidden name in order to forbid it is NOT a violation
  CONTROL ✓ an INJECTED secret env read is caught by the real detector
  CONTROL ✓ an INJECTED decryption call is caught
  CONTROL ✓ an INJECTED subprocess spawn is caught
  CONTROL ✓ PROSE naming the secret in a doc string is NOT a violation

Part 5 — exactly one socket client in the whole tier
  ✓ exactly one file references the socket (found 1: web/api/signer-status.ts)
  CONTROL ✓ a SECOND socket client is caught by the real detector
  CONTROL ✓ a file with NO socket reference is not counted as a client
  CONTROL ✓ a `import net from "net"` + net.connect client IS counted
  CONTROL ✓ a second client using node:net/createConnection IS counted

Part 6 — the API binds to loopback, and nothing else
  ✓ every .listen( passes an explicit loopback hostname
  ✓ every `host:` under web/app is a loopback literal
  CONTROL ✓ a DUPLICATE hostname key is caught (the LAST one wins in JS)
  CONTROL ✓ a COMPUTED host key ["host"] is caught
  CONTROL ✓ a QUOTED host key is NOT a false-FAIL
  CONTROL ✓ a dynamic `await import("net")` client IS counted
  CONTROL ✓ a MULTI-LINE `from "net"` import IS counted
  CONTROL ✓ a TYPE-ONLY socket import is NOT counted as a client
  CONTROL ✓ a NON-LITERAL host: beside a legitimate loopback host IS caught
  CONTROL ✓ a bind whose ARGUMENTS CONTAIN PARENTHESES is not a false-FAIL
  CONTROL ✓ a 0.0.0.0 host STILL caught with the widened collector
  CONTROL ✓ a 0.0.0.0 dev-server host IS caught
  CONTROL ✓ a LAN dev-server host IS caught
  CONTROL ✓ the REAL dev-server form is NOT caught
  CONTROL ✓ a source set with NO host: key FAILS rather than passing vacuously
  CONTROL ✓ a BARE .listen(port) with no hostname IS caught
  CONTROL ✓ an explicit 0.0.0.0 bind IS caught
  CONTROL ✓ a non-loopback hostname literal IS caught
  CONTROL ✓ the REAL form is NOT caught
  CONTROL ✓ a source set with NO listen call FAILS rather than passing vacuously

Asserted-uncaught — the disclosure below fails if these ever start passing
  CONTROL ✓ ASSERTED UNCAUGHT: an indirect socket path assembled at runtime
  CONTROL ✓ a hostname computed at run time IS caught — part 6 fails closed
  CONTROL ✓ a hostname read from the environment IS caught
  CONTROL ✓ a LAN hostname ARGUMENT is caught even when a loopback CONSTANT is present
  CONTROL ✓ a Bun.serve( bind is seen, not only .listen(
  CONTROL ✓ ASSERTED UNCAUGHT: a socket reached through a dependency this gate does not read

  What this gate does NOT say:
    1. It is LEXICAL. A socket path assembled at runtime — string concatenation, an array join, a base64 blob — is invisible to it, and that shape is an asserted-uncaught control above.
    2. It reads THIS REPOSITORY'S sources only. A dependency under node_modules that opens a socket is not read, and could not be gated this way; the property there is that nothing in web/app has a reason to call one.
    3. The needle sets are NAMED. A signing helper spelled differently from every entry in SIGNING_NEEDLES is not counted, by name (E-142's narrowing, forced three times since).
    4. It checks SOURCE, not behaviour. It cannot prove that the one socket client sends only what it constructs, and it is not a substitute for reading that file.
    5. It says nothing about what the tier DISCLOSES. Whether a rendered sentence about privacy is true is `claims-check`'s question and the wording tests', not this gate's.
    6. Part 4 is about what the tier HOLDS; parts 1-3 are about what it can REACH. Those are different properties and the gate had only the second when an issuer key was added to the API process (E-212). A secret obtained some way this list does not name is still invisible.
    7. The signing pass BLANKS string literals, so a call assembled as a string and eval'd is invisible to it. That is the price of not treating prose about another project's API as a violation of ours, it is a deliberate trade, and the socket pass — where a literal IS the value — keeps literals for exactly the opposite reason (CLAIMS.md E-203, fourth consumer).
    8. It scans web/app and web/api ONLY. A signing helper, a socket client or a listener placed in any OTHER directory under web/ — a new web/bridge/, say — is not read at all, and the count in Part 5 is over the two directories it loads (REVIEW-036b).
    9. It does not check for MUTATING routes. A .post, .put or .delete that writes is invisible to every part; 'read-only' is checked as 'reaches no signing operation and holds no secret', which is not the same property (REVIEW-036b).
    10. Part 6's bind check is LEXICAL and FAILS CLOSED. It resolves a quoted literal, or ONE level of indirection to a constant declared in the same source set; anything else — an env read, a ternary, a concatenation, a call — is REFUSED rather than assumed loopback. ⚠ It reads `.listen(` and `Bun.serve(` by name: a listener started through some other API, or in a directory this gate does not load, is invisible (REVIEW-037 F2).
    11. ⚠ Part 6's resolver IGNORES LEXICAL SCOPE. A parameter or inner binding that SHADOWS an outer loopback constant resolves to the outer one, so `function start(HOST){ listen({hostname: HOST}) }` called with a routable address passes. Full scope analysis needs a parser; this is a named limit, not an oversight (REVIEW-037 spot-check, E-238).
    12. ⚠ Part 6 matches `.listen(` and `Bun.serve(` BY NAME. A parenthesised `(Bun.serve)(…)`, a bind through a framework helper, or an aliased reference is invisible. Chasing spellings is how a named set pretends to be a property; it is disclosed instead (E-238).
    13. ⚠ A socket reached through an ALIASED dynamic import — `const t = await import(x); t.connect(…)` with the specifier assembled at run time — is invisible. The import spellings are matched; the aliasing is not, and cannot be lexically (E-238).
    14. ⚠ Part 6 reads STRING LITERALS as values, so prose containing `host: "0.0.0.0"` inside a quoted string FALSE-FAILS. That is the unsafe direction chosen deliberately: a false-fail is loud and gets fixed, a false-pass is silent (CLAIMS.md E-203's two-consumer lesson).
    15. It says nothing about WHO MAY ASK. The tier serves every route unauthenticated on loopback, and loopback is not uid-scoped — so a datum this gate certifies as reachable-by-design is reachable by any local user. Egress is a third property beside REACH and HOLD, and no part of this gate looks at it (CLAIMS.md E-228, REVIEW-036c U1).

------------------------------------------------------------------------------
PASS: web/app reaches no socket, web/api builds Status and neither Pair nor
      Prepare, no signing operation exists in the tier, exactly one socket
      client exists, and the API binds to loopback only — under 54 controls,
      a count INCREMENTED BY THE
      HELPER THAT RUNS THEM (E-203), each running through the same detector the
      real checks call.
⚠ A lexical gate over a NAMED SET. See "What this gate does NOT say" above.

web/api/disclosure.test.ts:
617 |     expect(view).toMatch(/issue #10/);
618 |     expect(view).toMatch(/holds only public data/);
619 |     expect(view).toMatch(/neither built nor costed/);
620 |   });
621 |   test("the capability matrix's custody row says the same", () => {
622 |     expect(custody.decryptOwnBalance.detail).toMatch(/inside its own boundary/);
                                                   ^
error: expect(received).toMatch(expected)

Expected substring or pattern: /inside its own boundary/
Received: "Only with a standalone ElGamal key, held by something other than the custody platform. Outside the platform the account cannot derive its key, because that needs the seed, and a custody platform never releases the seed."

      at <anonymous> ($USER_TMP/T/r059a3.a9gx52/repo/review-work-r3/custody-tree/web/api/disclosure.test.ts:622:46)
(fail) the custody findings keep their exceptions on every surface > the capability matrix's custody row says the same [0.10ms]

 2 pass
 59 filtered out
 1 fail
 8 expect() calls
Ran 3 tests across 1 file. [42.00ms]
````

## custody-matrix-public-data.log

````
bun test v1.3.14 (0d9b296a)
check-web-readonly — architecture §6 step 8, ADR-0003 D1
==============================================================================

  web/app: 33 source file(s)
  web/api: 10 source file(s)

Part 1 — nothing under web/app reaches the signer socket
  ✓ web/app names no socket path, imports no UDS client, opens no socket
  CONTROL ✓ an INJECTED socket reference in web/app is caught by the real detector
  CONTROL ✓ a COMMENTED-OUT socket reference is NOT counted (E-182)
  CONTROL ✓ a BLOCK-commented socket reference is NOT counted
  CONTROL ✓ a socket path inside a STRING LITERAL IS counted — literals are preserved
  CONTROL ✓ a socket path inside a TEMPLATE literal IS counted
  CONTROL ✓ code AFTER a non-nesting block comment is still scanned (the Rust-stripper trap)

Part 2 — the Elysia process builds Status, and never Pair or Prepare
  ✓ web/api constructs a `status` request
  ✓ web/api constructs neither `pair` nor `prepare`
  CONTROL ✓ an INJECTED pair request is caught by the real detector
  CONTROL ✓ a TEMPLATE-LITERAL authority tag is caught — type: `prepare`
  CONTROL ✓ an INJECTED prepare request is caught by the real detector
  CONTROL ✓ the status detector FAILS on a tree with no status request

Part 3 — no route, loader or server function reaches a signing operation
  ✓ no signing operation anywhere in the web tier
  CONTROL ✓ an INJECTED signing call is caught by the real detector
  CONTROL ✓ an INJECTED server function that signs is caught
  CONTROL ✓ PROSE naming another project's signing API is NOT a violation of ours
  CONTROL ✓ ⚠ and the SAME text IS still caught when it is real code, not prose
  CONTROL ✓ a QUOTED brace inside an interpolation does NOT unbalance the scan
  CONTROL ✓ ⚠ a signing call after a NESTED OBJECT LITERAL in an interpolation IS caught
  CONTROL ✓ ⚠ a signing call inside a TEMPLATE interpolation is still code, and IS caught
  CONTROL ✓ ⚠ a socket path in a literal is STILL caught — the ident pass did not replace the value pass

Part 4 — the tier holds NO secret and decrypts nothing
  ✓ no file under web/ reads a secret env var, decrypts, or spawns a process
  CONTROL ✓ a WRAPPED env read is caught — the expression spans lines
  CONTROL ✓ a BRACKET env read is caught — process.env["NAME"]
  CONTROL ✓ a DOTTED env read is caught — process.env.NAME
  CONTROL ✓ DECLARING the forbidden name in order to forbid it is NOT a violation
  CONTROL ✓ an INJECTED secret env read is caught by the real detector
  CONTROL ✓ an INJECTED decryption call is caught
  CONTROL ✓ an INJECTED subprocess spawn is caught
  CONTROL ✓ PROSE naming the secret in a doc string is NOT a violation

Part 5 — exactly one socket client in the whole tier
  ✓ exactly one file references the socket (found 1: web/api/signer-status.ts)
  CONTROL ✓ a SECOND socket client is caught by the real detector
  CONTROL ✓ a file with NO socket reference is not counted as a client
  CONTROL ✓ a `import net from "net"` + net.connect client IS counted
  CONTROL ✓ a second client using node:net/createConnection IS counted

Part 6 — the API binds to loopback, and nothing else
  ✓ every .listen( passes an explicit loopback hostname
  ✓ every `host:` under web/app is a loopback literal
  CONTROL ✓ a DUPLICATE hostname key is caught (the LAST one wins in JS)
  CONTROL ✓ a COMPUTED host key ["host"] is caught
  CONTROL ✓ a QUOTED host key is NOT a false-FAIL
  CONTROL ✓ a dynamic `await import("net")` client IS counted
  CONTROL ✓ a MULTI-LINE `from "net"` import IS counted
  CONTROL ✓ a TYPE-ONLY socket import is NOT counted as a client
  CONTROL ✓ a NON-LITERAL host: beside a legitimate loopback host IS caught
  CONTROL ✓ a bind whose ARGUMENTS CONTAIN PARENTHESES is not a false-FAIL
  CONTROL ✓ a 0.0.0.0 host STILL caught with the widened collector
  CONTROL ✓ a 0.0.0.0 dev-server host IS caught
  CONTROL ✓ a LAN dev-server host IS caught
  CONTROL ✓ the REAL dev-server form is NOT caught
  CONTROL ✓ a source set with NO host: key FAILS rather than passing vacuously
  CONTROL ✓ a BARE .listen(port) with no hostname IS caught
  CONTROL ✓ an explicit 0.0.0.0 bind IS caught
  CONTROL ✓ a non-loopback hostname literal IS caught
  CONTROL ✓ the REAL form is NOT caught
  CONTROL ✓ a source set with NO listen call FAILS rather than passing vacuously

Asserted-uncaught — the disclosure below fails if these ever start passing
  CONTROL ✓ ASSERTED UNCAUGHT: an indirect socket path assembled at runtime
  CONTROL ✓ a hostname computed at run time IS caught — part 6 fails closed
  CONTROL ✓ a hostname read from the environment IS caught
  CONTROL ✓ a LAN hostname ARGUMENT is caught even when a loopback CONSTANT is present
  CONTROL ✓ a Bun.serve( bind is seen, not only .listen(
  CONTROL ✓ ASSERTED UNCAUGHT: a socket reached through a dependency this gate does not read

  What this gate does NOT say:
    1. It is LEXICAL. A socket path assembled at runtime — string concatenation, an array join, a base64 blob — is invisible to it, and that shape is an asserted-uncaught control above.
    2. It reads THIS REPOSITORY'S sources only. A dependency under node_modules that opens a socket is not read, and could not be gated this way; the property there is that nothing in web/app has a reason to call one.
    3. The needle sets are NAMED. A signing helper spelled differently from every entry in SIGNING_NEEDLES is not counted, by name (E-142's narrowing, forced three times since).
    4. It checks SOURCE, not behaviour. It cannot prove that the one socket client sends only what it constructs, and it is not a substitute for reading that file.
    5. It says nothing about what the tier DISCLOSES. Whether a rendered sentence about privacy is true is `claims-check`'s question and the wording tests', not this gate's.
    6. Part 4 is about what the tier HOLDS; parts 1-3 are about what it can REACH. Those are different properties and the gate had only the second when an issuer key was added to the API process (E-212). A secret obtained some way this list does not name is still invisible.
    7. The signing pass BLANKS string literals, so a call assembled as a string and eval'd is invisible to it. That is the price of not treating prose about another project's API as a violation of ours, it is a deliberate trade, and the socket pass — where a literal IS the value — keeps literals for exactly the opposite reason (CLAIMS.md E-203, fourth consumer).
    8. It scans web/app and web/api ONLY. A signing helper, a socket client or a listener placed in any OTHER directory under web/ — a new web/bridge/, say — is not read at all, and the count in Part 5 is over the two directories it loads (REVIEW-036b).
    9. It does not check for MUTATING routes. A .post, .put or .delete that writes is invisible to every part; 'read-only' is checked as 'reaches no signing operation and holds no secret', which is not the same property (REVIEW-036b).
    10. Part 6's bind check is LEXICAL and FAILS CLOSED. It resolves a quoted literal, or ONE level of indirection to a constant declared in the same source set; anything else — an env read, a ternary, a concatenation, a call — is REFUSED rather than assumed loopback. ⚠ It reads `.listen(` and `Bun.serve(` by name: a listener started through some other API, or in a directory this gate does not load, is invisible (REVIEW-037 F2).
    11. ⚠ Part 6's resolver IGNORES LEXICAL SCOPE. A parameter or inner binding that SHADOWS an outer loopback constant resolves to the outer one, so `function start(HOST){ listen({hostname: HOST}) }` called with a routable address passes. Full scope analysis needs a parser; this is a named limit, not an oversight (REVIEW-037 spot-check, E-238).
    12. ⚠ Part 6 matches `.listen(` and `Bun.serve(` BY NAME. A parenthesised `(Bun.serve)(…)`, a bind through a framework helper, or an aliased reference is invisible. Chasing spellings is how a named set pretends to be a property; it is disclosed instead (E-238).
    13. ⚠ A socket reached through an ALIASED dynamic import — `const t = await import(x); t.connect(…)` with the specifier assembled at run time — is invisible. The import spellings are matched; the aliasing is not, and cannot be lexically (E-238).
    14. ⚠ Part 6 reads STRING LITERALS as values, so prose containing `host: "0.0.0.0"` inside a quoted string FALSE-FAILS. That is the unsafe direction chosen deliberately: a false-fail is loud and gets fixed, a false-pass is silent (CLAIMS.md E-203's two-consumer lesson).
    15. It says nothing about WHO MAY ASK. The tier serves every route unauthenticated on loopback, and loopback is not uid-scoped — so a datum this gate certifies as reachable-by-design is reachable by any local user. Egress is a third property beside REACH and HOLD, and no part of this gate looks at it (CLAIMS.md E-228, REVIEW-036c U1).

------------------------------------------------------------------------------
PASS: web/app reaches no socket, web/api builds Status and neither Pair nor
      Prepare, no signing operation exists in the tier, exactly one socket
      client exists, and the API binds to loopback only — under 54 controls,
      a count INCREMENTED BY THE
      HELPER THAT RUNS THEM (E-203), each running through the same detector the
      real checks call.
⚠ A lexical gate over a NAMED SET. See "What this gate does NOT say" above.

web/api/disclosure.test.ts:
619 |     expect(view).toMatch(/neither built nor costed/);
620 |   });
621 |   test("the capability matrix's custody row says the same", () => {
622 |     expect(custody.decryptOwnBalance.detail).toMatch(/inside its own boundary/);
623 |     expect(custody.decryptOwnBalance.detail).toMatch(/issue #10/);
624 |     expect(custody.proveAndSign.detail).toMatch(/only public data/i);
                                              ^
error: expect(received).toMatch(expected)

Expected substring or pattern: /only public data/i
Received: "The external signer can sign. It cannot apply a policy to the amount, because the transaction carries a proof, not a value: a rule like 'two approvers above $1M' has nothing to read."

      at <anonymous> ($USER_TMP/T/r059a3.a9gx52/repo/review-work-r3/custody-tree/web/api/disclosure.test.ts:624:41)
(fail) the custody findings keep their exceptions on every surface > the capability matrix's custody row says the same [0.10ms]

 2 pass
 59 filtered out
 1 fail
 10 expect() calls
Ran 3 tests across 1 file. [41.00ms]
````

## custody-probes.log

````
baseline exit=0   CONTROL ✓ ⚠ a socket path in a literal is STILL caught — the ident pass did not replace the value pass |   ✓ every .listen( passes an explicit loopback hostname |   CONTROL ✓ a source set with NO host: key FAILS rather than passing vacuously |   CONTROL ✓ a source set with NO listen call FAILS rather than passing vacuously | Asserted-uncaught — the disclosure below fails if these ever start passing |   CONTROL ✓ a hostname computed at run time IS caught — part 6 fails closed |     7. The signing pass BLANKS string literals, so a call assembled as a string and eval'd is invisible to it. That is the price of not treating prose about another project's API as a violation of ours, it is a deliberate trade, and the socket pass — where a literal IS the value — keeps literals for exactly the opposite reason (CLAIMS.md E-203, fourth consumer). |     11. ⚠ Part 6's resolver IGNORES LEXICAL SCOPE. A parameter or inner binding that SHADOWS an outer loopback constant resolves to the outer one, so `function start(HOST){ listen({hostname: HOST}) }` called with a routable address passes. Full scope analysis needs a parser; this is a named limit, not an oversight (REVIEW-037 spot-check, E-238). |  3 pass |  0 fail |  10 expect() calls
view-internal-exception exit=1   CONTROL ✓ ⚠ a socket path in a literal is STILL caught — the ident pass did not replace the value pass |   ✓ every .listen( passes an explicit loopback hostname |   CONTROL ✓ a source set with NO host: key FAILS rather than passing vacuously |   CONTROL ✓ a source set with NO listen call FAILS rather than passing vacuously | Asserted-uncaught — the disclosure below fails if these ever start passing |   CONTROL ✓ a hostname computed at run time IS caught — part 6 fails closed |     7. The signing pass BLANKS string literals, so a call assembled as a string and eval'd is invisible to it. That is the price of not treating prose about another project's API as a violation of ours, it is a deliberate trade, and the socket pass — where a literal IS the value — keeps literals for exactly the opposite reason (CLAIMS.md E-203, fourth consumer). |     11. ⚠ Part 6's resolver IGNORES LEXICAL SCOPE. A parameter or inner binding that SHADOWS an outer loopback constant resolves to the outer one, so `function start(HOST){ listen({hostname: HOST}) }` called with a routable address passes. Full scope analysis needs a parser; this is a named limit, not an oversight (REVIEW-037 spot-check, E-238). | 611 |   // and restoring the old text passed every test (R2-12). | 615 |     expect(view).toMatch(/outside the platform/); | 616 |     expect(view).toMatch(/inside its own boundary/); | error: expect(received).toMatch(expected) |  2 pass |  1 fail |  7 expect() calls
matrix-internal-exception exit=1   CONTROL ✓ ⚠ a socket path in a literal is STILL caught — the ident pass did not replace the value pass |   ✓ every .listen( passes an explicit loopback hostname |   CONTROL ✓ a source set with NO host: key FAILS rather than passing vacuously |   CONTROL ✓ a source set with NO listen call FAILS rather than passing vacuously | Asserted-uncaught — the disclosure below fails if these ever start passing |   CONTROL ✓ a hostname computed at run time IS caught — part 6 fails closed |     7. The signing pass BLANKS string literals, so a call assembled as a string and eval'd is invisible to it. That is the price of not treating prose about another project's API as a violation of ours, it is a deliberate trade, and the socket pass — where a literal IS the value — keeps literals for exactly the opposite reason (CLAIMS.md E-203, fourth consumer). |     11. ⚠ Part 6's resolver IGNORES LEXICAL SCOPE. A parameter or inner binding that SHADOWS an outer loopback constant resolves to the outer one, so `function start(HOST){ listen({hostname: HOST}) }` called with a routable address passes. Full scope analysis needs a parser; this is a named limit, not an oversight (REVIEW-037 spot-check, E-238). | 617 |     expect(view).toMatch(/issue #10/); | 618 |     expect(view).toMatch(/holds only public data/); | 619 |     expect(view).toMatch(/neither built nor costed/); | 622 |     expect(custody.decryptOwnBalance.detail).toMatch(/inside its own boundary/); | error: expect(received).toMatch(expected) |  2 pass |  1 fail |  8 expect() calls
simulation-internal-exception exit=0   CONTROL ✓ ⚠ a socket path in a literal is STILL caught — the ident pass did not replace the value pass |   ✓ every .listen( passes an explicit loopback hostname |   CONTROL ✓ a source set with NO host: key FAILS rather than passing vacuously |   CONTROL ✓ a source set with NO listen call FAILS rather than passing vacuously | Asserted-uncaught — the disclosure below fails if these ever start passing |   CONTROL ✓ a hostname computed at run time IS caught — part 6 fails closed |     7. The signing pass BLANKS string literals, so a call assembled as a string and eval'd is invisible to it. That is the price of not treating prose about another project's API as a violation of ours, it is a deliberate trade, and the socket pass — where a literal IS the value — keeps literals for exactly the opposite reason (CLAIMS.md E-203, fourth consumer). |     11. ⚠ Part 6's resolver IGNORES LEXICAL SCOPE. A parameter or inner binding that SHADOWS an outer loopback constant resolves to the outer one, so `function start(HOST){ listen({hostname: HOST}) }` called with a routable address passes. Full scope analysis needs a parser; this is a named limit, not an oversight (REVIEW-037 spot-check, E-238). |  3 pass |  0 fail |  10 expect() calls
simulation-internal-exception full exit=0   CONTROL ✓ ⚠ a socket path in a literal is STILL caught — the ident pass did not replace the value pass |   ✓ every .listen( passes an explicit loopback hostname |   CONTROL ✓ a source set with NO host: key FAILS rather than passing vacuously |   CONTROL ✓ a source set with NO listen call FAILS rather than passing vacuously | Asserted-uncaught — the disclosure below fails if these ever start passing |   CONTROL ✓ a hostname computed at run time IS caught — part 6 fails closed |     7. The signing pass BLANKS string literals, so a call assembled as a string and eval'd is invisible to it. That is the price of not treating prose about another project's API as a violation of ours, it is a deliberate trade, and the socket pass — where a literal IS the value — keeps literals for exactly the opposite reason (CLAIMS.md E-203, fourth consumer). |     11. ⚠ Part 6's resolver IGNORES LEXICAL SCOPE. A parameter or inner binding that SHADOWS an outer loopback constant resolves to the outer one, so `function start(HOST){ listen({hostname: HOST}) }` called with a routable address passes. Full scope analysis needs a parser; this is a named limit, not an oversight (REVIEW-037 spot-check, E-238). |  184 pass |  0 fail
view-public-data exit=1   CONTROL ✓ ⚠ a socket path in a literal is STILL caught — the ident pass did not replace the value pass |   ✓ every .listen( passes an explicit loopback hostname |   CONTROL ✓ a source set with NO host: key FAILS rather than passing vacuously |   CONTROL ✓ a source set with NO listen call FAILS rather than passing vacuously | Asserted-uncaught — the disclosure below fails if these ever start passing |   CONTROL ✓ a hostname computed at run time IS caught — part 6 fails closed |     7. The signing pass BLANKS string literals, so a call assembled as a string and eval'd is invisible to it. That is the price of not treating prose about another project's API as a violation of ours, it is a deliberate trade, and the socket pass — where a literal IS the value — keeps literals for exactly the opposite reason (CLAIMS.md E-203, fourth consumer). |     11. ⚠ Part 6's resolver IGNORES LEXICAL SCOPE. A parameter or inner binding that SHADOWS an outer loopback constant resolves to the outer one, so `function start(HOST){ listen({hostname: HOST}) }` called with a routable address passes. Full scope analysis needs a parser; this is a named limit, not an oversight (REVIEW-037 spot-check, E-238). | 615 |     expect(view).toMatch(/outside the platform/); | 616 |     expect(view).toMatch(/inside its own boundary/); | 617 |     expect(view).toMatch(/issue #10/); | 618 |     expect(view).toMatch(/holds only public data/); | error: expect(received).toMatch(expected) |  2 pass |  1 fail |  9 expect() calls
matrix-public-data exit=1   CONTROL ✓ ⚠ a socket path in a literal is STILL caught — the ident pass did not replace the value pass |   ✓ every .listen( passes an explicit loopback hostname |   CONTROL ✓ a source set with NO host: key FAILS rather than passing vacuously |   CONTROL ✓ a source set with NO listen call FAILS rather than passing vacuously | Asserted-uncaught — the disclosure below fails if these ever start passing |   CONTROL ✓ a hostname computed at run time IS caught — part 6 fails closed |     7. The signing pass BLANKS string literals, so a call assembled as a string and eval'd is invisible to it. That is the price of not treating prose about another project's API as a violation of ours, it is a deliberate trade, and the socket pass — where a literal IS the value — keeps literals for exactly the opposite reason (CLAIMS.md E-203, fourth consumer). |     11. ⚠ Part 6's resolver IGNORES LEXICAL SCOPE. A parameter or inner binding that SHADOWS an outer loopback constant resolves to the outer one, so `function start(HOST){ listen({hostname: HOST}) }` called with a routable address passes. Full scope analysis needs a parser; this is a named limit, not an oversight (REVIEW-037 spot-check, E-238). | 619 |     expect(view).toMatch(/neither built nor costed/); | 622 |     expect(custody.decryptOwnBalance.detail).toMatch(/inside its own boundary/); | 623 |     expect(custody.decryptOwnBalance.detail).toMatch(/issue #10/); | 624 |     expect(custody.proveAndSign.detail).toMatch(/only public data/i); | error: expect(received).toMatch(expected) |  2 pass |  1 fail |  10 expect() calls
simulation-public-data exit=1   CONTROL ✓ ⚠ a socket path in a literal is STILL caught — the ident pass did not replace the value pass |   ✓ every .listen( passes an explicit loopback hostname |   CONTROL ✓ a source set with NO host: key FAILS rather than passing vacuously |   CONTROL ✓ a source set with NO listen call FAILS rather than passing vacuously | Asserted-uncaught — the disclosure below fails if these ever start passing |   CONTROL ✓ a hostname computed at run time IS caught — part 6 fails closed |     7. The signing pass BLANKS string literals, so a call assembled as a string and eval'd is invisible to it. That is the price of not treating prose about another project's API as a violation of ours, it is a deliberate trade, and the socket pass — where a literal IS the value — keeps literals for exactly the opposite reason (CLAIMS.md E-203, fourth consumer). |     11. ⚠ Part 6's resolver IGNORES LEXICAL SCOPE. A parameter or inner binding that SHADOWS an outer loopback constant resolves to the outer one, so `function start(HOST){ listen({hostname: HOST}) }` called with a routable address passes. Full scope analysis needs a parser; this is a named limit, not an oversight (REVIEW-037 spot-check, E-238). | 624 |     expect(custody.proveAndSign.detail).toMatch(/only public data/i); | 628 |     expect(reasons).toMatch(/outside the platform/); | 629 |     expect(reasons).toMatch(/only public data/); | error: expect(received).toMatch(expected) |  2 pass |  1 fail |  10 expect() calls
view-policy-alternatives exit=0   CONTROL ✓ ⚠ a socket path in a literal is STILL caught — the ident pass did not replace the value pass |   ✓ every .listen( passes an explicit loopback hostname |   CONTROL ✓ a source set with NO host: key FAILS rather than passing vacuously |   CONTROL ✓ a source set with NO listen call FAILS rather than passing vacuously | Asserted-uncaught — the disclosure below fails if these ever start passing |   CONTROL ✓ a hostname computed at run time IS caught — part 6 fails closed |     7. The signing pass BLANKS string literals, so a call assembled as a string and eval'd is invisible to it. That is the price of not treating prose about another project's API as a violation of ours, it is a deliberate trade, and the socket pass — where a literal IS the value — keeps literals for exactly the opposite reason (CLAIMS.md E-203, fourth consumer). |     11. ⚠ Part 6's resolver IGNORES LEXICAL SCOPE. A parameter or inner binding that SHADOWS an outer loopback constant resolves to the outer one, so `function start(HOST){ listen({hostname: HOST}) }` called with a routable address passes. Full scope analysis needs a parser; this is a named limit, not an oversight (REVIEW-037 spot-check, E-238). |  3 pass |  0 fail |  10 expect() calls
view-policy-alternatives full exit=0   CONTROL ✓ ⚠ a socket path in a literal is STILL caught — the ident pass did not replace the value pass |   ✓ every .listen( passes an explicit loopback hostname |   CONTROL ✓ a source set with NO host: key FAILS rather than passing vacuously |   CONTROL ✓ a source set with NO listen call FAILS rather than passing vacuously | Asserted-uncaught — the disclosure below fails if these ever start passing |   CONTROL ✓ a hostname computed at run time IS caught — part 6 fails closed |     7. The signing pass BLANKS string literals, so a call assembled as a string and eval'd is invisible to it. That is the price of not treating prose about another project's API as a violation of ours, it is a deliberate trade, and the socket pass — where a literal IS the value — keeps literals for exactly the opposite reason (CLAIMS.md E-203, fourth consumer). |     11. ⚠ Part 6's resolver IGNORES LEXICAL SCOPE. A parameter or inner binding that SHADOWS an outer loopback constant resolves to the outer one, so `function start(HOST){ listen({hostname: HOST}) }` called with a routable address passes. Full scope analysis needs a parser; this is a named limit, not an oversight (REVIEW-037 spot-check, E-238). |  184 pass |  0 fail
````

## custody-simulation-internal-exception-full.log

````
bun test v1.3.14 (0d9b296a)
check-web-readonly — architecture §6 step 8, ADR-0003 D1
==============================================================================

  web/app: 33 source file(s)
  web/api: 10 source file(s)

Part 1 — nothing under web/app reaches the signer socket
  ✓ web/app names no socket path, imports no UDS client, opens no socket
  CONTROL ✓ an INJECTED socket reference in web/app is caught by the real detector
  CONTROL ✓ a COMMENTED-OUT socket reference is NOT counted (E-182)
  CONTROL ✓ a BLOCK-commented socket reference is NOT counted
  CONTROL ✓ a socket path inside a STRING LITERAL IS counted — literals are preserved
  CONTROL ✓ a socket path inside a TEMPLATE literal IS counted
  CONTROL ✓ code AFTER a non-nesting block comment is still scanned (the Rust-stripper trap)

Part 2 — the Elysia process builds Status, and never Pair or Prepare
  ✓ web/api constructs a `status` request
  ✓ web/api constructs neither `pair` nor `prepare`
  CONTROL ✓ an INJECTED pair request is caught by the real detector
  CONTROL ✓ a TEMPLATE-LITERAL authority tag is caught — type: `prepare`
  CONTROL ✓ an INJECTED prepare request is caught by the real detector
  CONTROL ✓ the status detector FAILS on a tree with no status request

Part 3 — no route, loader or server function reaches a signing operation
  ✓ no signing operation anywhere in the web tier
  CONTROL ✓ an INJECTED signing call is caught by the real detector
  CONTROL ✓ an INJECTED server function that signs is caught
  CONTROL ✓ PROSE naming another project's signing API is NOT a violation of ours
  CONTROL ✓ ⚠ and the SAME text IS still caught when it is real code, not prose
  CONTROL ✓ a QUOTED brace inside an interpolation does NOT unbalance the scan
  CONTROL ✓ ⚠ a signing call after a NESTED OBJECT LITERAL in an interpolation IS caught
  CONTROL ✓ ⚠ a signing call inside a TEMPLATE interpolation is still code, and IS caught
  CONTROL ✓ ⚠ a socket path in a literal is STILL caught — the ident pass did not replace the value pass

Part 4 — the tier holds NO secret and decrypts nothing
  ✓ no file under web/ reads a secret env var, decrypts, or spawns a process
  CONTROL ✓ a WRAPPED env read is caught — the expression spans lines
  CONTROL ✓ a BRACKET env read is caught — process.env["NAME"]
  CONTROL ✓ a DOTTED env read is caught — process.env.NAME
  CONTROL ✓ DECLARING the forbidden name in order to forbid it is NOT a violation
  CONTROL ✓ an INJECTED secret env read is caught by the real detector
  CONTROL ✓ an INJECTED decryption call is caught
  CONTROL ✓ an INJECTED subprocess spawn is caught
  CONTROL ✓ PROSE naming the secret in a doc string is NOT a violation

Part 5 — exactly one socket client in the whole tier
  ✓ exactly one file references the socket (found 1: web/api/signer-status.ts)
  CONTROL ✓ a SECOND socket client is caught by the real detector
  CONTROL ✓ a file with NO socket reference is not counted as a client
  CONTROL ✓ a `import net from "net"` + net.connect client IS counted
  CONTROL ✓ a second client using node:net/createConnection IS counted

Part 6 — the API binds to loopback, and nothing else
  ✓ every .listen( passes an explicit loopback hostname
  ✓ every `host:` under web/app is a loopback literal
  CONTROL ✓ a DUPLICATE hostname key is caught (the LAST one wins in JS)
  CONTROL ✓ a COMPUTED host key ["host"] is caught
  CONTROL ✓ a QUOTED host key is NOT a false-FAIL
  CONTROL ✓ a dynamic `await import("net")` client IS counted
  CONTROL ✓ a MULTI-LINE `from "net"` import IS counted
  CONTROL ✓ a TYPE-ONLY socket import is NOT counted as a client
  CONTROL ✓ a NON-LITERAL host: beside a legitimate loopback host IS caught
  CONTROL ✓ a bind whose ARGUMENTS CONTAIN PARENTHESES is not a false-FAIL
  CONTROL ✓ a 0.0.0.0 host STILL caught with the widened collector
  CONTROL ✓ a 0.0.0.0 dev-server host IS caught
  CONTROL ✓ a LAN dev-server host IS caught
  CONTROL ✓ the REAL dev-server form is NOT caught
  CONTROL ✓ a source set with NO host: key FAILS rather than passing vacuously
  CONTROL ✓ a BARE .listen(port) with no hostname IS caught
  CONTROL ✓ an explicit 0.0.0.0 bind IS caught
  CONTROL ✓ a non-loopback hostname literal IS caught
  CONTROL ✓ the REAL form is NOT caught
  CONTROL ✓ a source set with NO listen call FAILS rather than passing vacuously

Asserted-uncaught — the disclosure below fails if these ever start passing
  CONTROL ✓ ASSERTED UNCAUGHT: an indirect socket path assembled at runtime
  CONTROL ✓ a hostname computed at run time IS caught — part 6 fails closed
  CONTROL ✓ a hostname read from the environment IS caught
  CONTROL ✓ a LAN hostname ARGUMENT is caught even when a loopback CONSTANT is present
  CONTROL ✓ a Bun.serve( bind is seen, not only .listen(
  CONTROL ✓ ASSERTED UNCAUGHT: a socket reached through a dependency this gate does not read

  What this gate does NOT say:
    1. It is LEXICAL. A socket path assembled at runtime — string concatenation, an array join, a base64 blob — is invisible to it, and that shape is an asserted-uncaught control above.
    2. It reads THIS REPOSITORY'S sources only. A dependency under node_modules that opens a socket is not read, and could not be gated this way; the property there is that nothing in web/app has a reason to call one.
    3. The needle sets are NAMED. A signing helper spelled differently from every entry in SIGNING_NEEDLES is not counted, by name (E-142's narrowing, forced three times since).
    4. It checks SOURCE, not behaviour. It cannot prove that the one socket client sends only what it constructs, and it is not a substitute for reading that file.
    5. It says nothing about what the tier DISCLOSES. Whether a rendered sentence about privacy is true is `claims-check`'s question and the wording tests', not this gate's.
    6. Part 4 is about what the tier HOLDS; parts 1-3 are about what it can REACH. Those are different properties and the gate had only the second when an issuer key was added to the API process (E-212). A secret obtained some way this list does not name is still invisible.
    7. The signing pass BLANKS string literals, so a call assembled as a string and eval'd is invisible to it. That is the price of not treating prose about another project's API as a violation of ours, it is a deliberate trade, and the socket pass — where a literal IS the value — keeps literals for exactly the opposite reason (CLAIMS.md E-203, fourth consumer).
    8. It scans web/app and web/api ONLY. A signing helper, a socket client or a listener placed in any OTHER directory under web/ — a new web/bridge/, say — is not read at all, and the count in Part 5 is over the two directories it loads (REVIEW-036b).
    9. It does not check for MUTATING routes. A .post, .put or .delete that writes is invisible to every part; 'read-only' is checked as 'reaches no signing operation and holds no secret', which is not the same property (REVIEW-036b).
    10. Part 6's bind check is LEXICAL and FAILS CLOSED. It resolves a quoted literal, or ONE level of indirection to a constant declared in the same source set; anything else — an env read, a ternary, a concatenation, a call — is REFUSED rather than assumed loopback. ⚠ It reads `.listen(` and `Bun.serve(` by name: a listener started through some other API, or in a directory this gate does not load, is invisible (REVIEW-037 F2).
    11. ⚠ Part 6's resolver IGNORES LEXICAL SCOPE. A parameter or inner binding that SHADOWS an outer loopback constant resolves to the outer one, so `function start(HOST){ listen({hostname: HOST}) }` called with a routable address passes. Full scope analysis needs a parser; this is a named limit, not an oversight (REVIEW-037 spot-check, E-238).
    12. ⚠ Part 6 matches `.listen(` and `Bun.serve(` BY NAME. A parenthesised `(Bun.serve)(…)`, a bind through a framework helper, or an aliased reference is invisible. Chasing spellings is how a named set pretends to be a property; it is disclosed instead (E-238).
    13. ⚠ A socket reached through an ALIASED dynamic import — `const t = await import(x); t.connect(…)` with the specifier assembled at run time — is invisible. The import spellings are matched; the aliasing is not, and cannot be lexically (E-238).
    14. ⚠ Part 6 reads STRING LITERALS as values, so prose containing `host: "0.0.0.0"` inside a quoted string FALSE-FAILS. That is the unsafe direction chosen deliberately: a false-fail is loud and gets fixed, a false-pass is silent (CLAIMS.md E-203's two-consumer lesson).
    15. It says nothing about WHO MAY ASK. The tier serves every route unauthenticated on loopback, and loopback is not uid-scoped — so a datum this gate certifies as reachable-by-design is reachable by any local user. Egress is a third property beside REACH and HOLD, and no part of this gate looks at it (CLAIMS.md E-228, REVIEW-036c U1).

------------------------------------------------------------------------------
PASS: web/app reaches no socket, web/api builds Status and neither Pair nor
      Prepare, no signing operation exists in the tier, exactly one socket
      client exists, and the API binds to loopback only — under 54 controls,
      a count INCREMENTED BY THE
      HELPER THAT RUNS THEM (E-203), each running through the same detector the
      real checks call.
⚠ A lexical gate over a NAMED SET. See "What this gate does NOT say" above.

web/api/disclosure.test.ts:

 184 pass
 0 fail
 317 expect() calls
Ran 184 tests across 7 files. [490.00ms]
````

## custody-simulation-internal-exception.log

````
bun test v1.3.14 (0d9b296a)
check-web-readonly — architecture §6 step 8, ADR-0003 D1
==============================================================================

  web/app: 33 source file(s)
  web/api: 10 source file(s)

Part 1 — nothing under web/app reaches the signer socket
  ✓ web/app names no socket path, imports no UDS client, opens no socket
  CONTROL ✓ an INJECTED socket reference in web/app is caught by the real detector
  CONTROL ✓ a COMMENTED-OUT socket reference is NOT counted (E-182)
  CONTROL ✓ a BLOCK-commented socket reference is NOT counted
  CONTROL ✓ a socket path inside a STRING LITERAL IS counted — literals are preserved
  CONTROL ✓ a socket path inside a TEMPLATE literal IS counted
  CONTROL ✓ code AFTER a non-nesting block comment is still scanned (the Rust-stripper trap)

Part 2 — the Elysia process builds Status, and never Pair or Prepare
  ✓ web/api constructs a `status` request
  ✓ web/api constructs neither `pair` nor `prepare`
  CONTROL ✓ an INJECTED pair request is caught by the real detector
  CONTROL ✓ a TEMPLATE-LITERAL authority tag is caught — type: `prepare`
  CONTROL ✓ an INJECTED prepare request is caught by the real detector
  CONTROL ✓ the status detector FAILS on a tree with no status request

Part 3 — no route, loader or server function reaches a signing operation
  ✓ no signing operation anywhere in the web tier
  CONTROL ✓ an INJECTED signing call is caught by the real detector
  CONTROL ✓ an INJECTED server function that signs is caught
  CONTROL ✓ PROSE naming another project's signing API is NOT a violation of ours
  CONTROL ✓ ⚠ and the SAME text IS still caught when it is real code, not prose
  CONTROL ✓ a QUOTED brace inside an interpolation does NOT unbalance the scan
  CONTROL ✓ ⚠ a signing call after a NESTED OBJECT LITERAL in an interpolation IS caught
  CONTROL ✓ ⚠ a signing call inside a TEMPLATE interpolation is still code, and IS caught
  CONTROL ✓ ⚠ a socket path in a literal is STILL caught — the ident pass did not replace the value pass

Part 4 — the tier holds NO secret and decrypts nothing
  ✓ no file under web/ reads a secret env var, decrypts, or spawns a process
  CONTROL ✓ a WRAPPED env read is caught — the expression spans lines
  CONTROL ✓ a BRACKET env read is caught — process.env["NAME"]
  CONTROL ✓ a DOTTED env read is caught — process.env.NAME
  CONTROL ✓ DECLARING the forbidden name in order to forbid it is NOT a violation
  CONTROL ✓ an INJECTED secret env read is caught by the real detector
  CONTROL ✓ an INJECTED decryption call is caught
  CONTROL ✓ an INJECTED subprocess spawn is caught
  CONTROL ✓ PROSE naming the secret in a doc string is NOT a violation

Part 5 — exactly one socket client in the whole tier
  ✓ exactly one file references the socket (found 1: web/api/signer-status.ts)
  CONTROL ✓ a SECOND socket client is caught by the real detector
  CONTROL ✓ a file with NO socket reference is not counted as a client
  CONTROL ✓ a `import net from "net"` + net.connect client IS counted
  CONTROL ✓ a second client using node:net/createConnection IS counted

Part 6 — the API binds to loopback, and nothing else
  ✓ every .listen( passes an explicit loopback hostname
  ✓ every `host:` under web/app is a loopback literal
  CONTROL ✓ a DUPLICATE hostname key is caught (the LAST one wins in JS)
  CONTROL ✓ a COMPUTED host key ["host"] is caught
  CONTROL ✓ a QUOTED host key is NOT a false-FAIL
  CONTROL ✓ a dynamic `await import("net")` client IS counted
  CONTROL ✓ a MULTI-LINE `from "net"` import IS counted
  CONTROL ✓ a TYPE-ONLY socket import is NOT counted as a client
  CONTROL ✓ a NON-LITERAL host: beside a legitimate loopback host IS caught
  CONTROL ✓ a bind whose ARGUMENTS CONTAIN PARENTHESES is not a false-FAIL
  CONTROL ✓ a 0.0.0.0 host STILL caught with the widened collector
  CONTROL ✓ a 0.0.0.0 dev-server host IS caught
  CONTROL ✓ a LAN dev-server host IS caught
  CONTROL ✓ the REAL dev-server form is NOT caught
  CONTROL ✓ a source set with NO host: key FAILS rather than passing vacuously
  CONTROL ✓ a BARE .listen(port) with no hostname IS caught
  CONTROL ✓ an explicit 0.0.0.0 bind IS caught
  CONTROL ✓ a non-loopback hostname literal IS caught
  CONTROL ✓ the REAL form is NOT caught
  CONTROL ✓ a source set with NO listen call FAILS rather than passing vacuously

Asserted-uncaught — the disclosure below fails if these ever start passing
  CONTROL ✓ ASSERTED UNCAUGHT: an indirect socket path assembled at runtime
  CONTROL ✓ a hostname computed at run time IS caught — part 6 fails closed
  CONTROL ✓ a hostname read from the environment IS caught
  CONTROL ✓ a LAN hostname ARGUMENT is caught even when a loopback CONSTANT is present
  CONTROL ✓ a Bun.serve( bind is seen, not only .listen(
  CONTROL ✓ ASSERTED UNCAUGHT: a socket reached through a dependency this gate does not read

  What this gate does NOT say:
    1. It is LEXICAL. A socket path assembled at runtime — string concatenation, an array join, a base64 blob — is invisible to it, and that shape is an asserted-uncaught control above.
    2. It reads THIS REPOSITORY'S sources only. A dependency under node_modules that opens a socket is not read, and could not be gated this way; the property there is that nothing in web/app has a reason to call one.
    3. The needle sets are NAMED. A signing helper spelled differently from every entry in SIGNING_NEEDLES is not counted, by name (E-142's narrowing, forced three times since).
    4. It checks SOURCE, not behaviour. It cannot prove that the one socket client sends only what it constructs, and it is not a substitute for reading that file.
    5. It says nothing about what the tier DISCLOSES. Whether a rendered sentence about privacy is true is `claims-check`'s question and the wording tests', not this gate's.
    6. Part 4 is about what the tier HOLDS; parts 1-3 are about what it can REACH. Those are different properties and the gate had only the second when an issuer key was added to the API process (E-212). A secret obtained some way this list does not name is still invisible.
    7. The signing pass BLANKS string literals, so a call assembled as a string and eval'd is invisible to it. That is the price of not treating prose about another project's API as a violation of ours, it is a deliberate trade, and the socket pass — where a literal IS the value — keeps literals for exactly the opposite reason (CLAIMS.md E-203, fourth consumer).
    8. It scans web/app and web/api ONLY. A signing helper, a socket client or a listener placed in any OTHER directory under web/ — a new web/bridge/, say — is not read at all, and the count in Part 5 is over the two directories it loads (REVIEW-036b).
    9. It does not check for MUTATING routes. A .post, .put or .delete that writes is invisible to every part; 'read-only' is checked as 'reaches no signing operation and holds no secret', which is not the same property (REVIEW-036b).
    10. Part 6's bind check is LEXICAL and FAILS CLOSED. It resolves a quoted literal, or ONE level of indirection to a constant declared in the same source set; anything else — an env read, a ternary, a concatenation, a call — is REFUSED rather than assumed loopback. ⚠ It reads `.listen(` and `Bun.serve(` by name: a listener started through some other API, or in a directory this gate does not load, is invisible (REVIEW-037 F2).
    11. ⚠ Part 6's resolver IGNORES LEXICAL SCOPE. A parameter or inner binding that SHADOWS an outer loopback constant resolves to the outer one, so `function start(HOST){ listen({hostname: HOST}) }` called with a routable address passes. Full scope analysis needs a parser; this is a named limit, not an oversight (REVIEW-037 spot-check, E-238).
    12. ⚠ Part 6 matches `.listen(` and `Bun.serve(` BY NAME. A parenthesised `(Bun.serve)(…)`, a bind through a framework helper, or an aliased reference is invisible. Chasing spellings is how a named set pretends to be a property; it is disclosed instead (E-238).
    13. ⚠ A socket reached through an ALIASED dynamic import — `const t = await import(x); t.connect(…)` with the specifier assembled at run time — is invisible. The import spellings are matched; the aliasing is not, and cannot be lexically (E-238).
    14. ⚠ Part 6 reads STRING LITERALS as values, so prose containing `host: "0.0.0.0"` inside a quoted string FALSE-FAILS. That is the unsafe direction chosen deliberately: a false-fail is loud and gets fixed, a false-pass is silent (CLAIMS.md E-203's two-consumer lesson).
    15. It says nothing about WHO MAY ASK. The tier serves every route unauthenticated on loopback, and loopback is not uid-scoped — so a datum this gate certifies as reachable-by-design is reachable by any local user. Egress is a third property beside REACH and HOLD, and no part of this gate looks at it (CLAIMS.md E-228, REVIEW-036c U1).

------------------------------------------------------------------------------
PASS: web/app reaches no socket, web/api builds Status and neither Pair nor
      Prepare, no signing operation exists in the tier, exactly one socket
      client exists, and the API binds to loopback only — under 54 controls,
      a count INCREMENTED BY THE
      HELPER THAT RUNS THEM (E-203), each running through the same detector the
      real checks call.
⚠ A lexical gate over a NAMED SET. See "What this gate does NOT say" above.

web/api/disclosure.test.ts:

 3 pass
 59 filtered out
 0 fail
 10 expect() calls
Ran 3 tests across 1 file. [43.00ms]
````

## custody-simulation-public-data.log

````
bun test v1.3.14 (0d9b296a)
check-web-readonly — architecture §6 step 8, ADR-0003 D1
==============================================================================

  web/app: 33 source file(s)
  web/api: 10 source file(s)

Part 1 — nothing under web/app reaches the signer socket
  ✓ web/app names no socket path, imports no UDS client, opens no socket
  CONTROL ✓ an INJECTED socket reference in web/app is caught by the real detector
  CONTROL ✓ a COMMENTED-OUT socket reference is NOT counted (E-182)
  CONTROL ✓ a BLOCK-commented socket reference is NOT counted
  CONTROL ✓ a socket path inside a STRING LITERAL IS counted — literals are preserved
  CONTROL ✓ a socket path inside a TEMPLATE literal IS counted
  CONTROL ✓ code AFTER a non-nesting block comment is still scanned (the Rust-stripper trap)

Part 2 — the Elysia process builds Status, and never Pair or Prepare
  ✓ web/api constructs a `status` request
  ✓ web/api constructs neither `pair` nor `prepare`
  CONTROL ✓ an INJECTED pair request is caught by the real detector
  CONTROL ✓ a TEMPLATE-LITERAL authority tag is caught — type: `prepare`
  CONTROL ✓ an INJECTED prepare request is caught by the real detector
  CONTROL ✓ the status detector FAILS on a tree with no status request

Part 3 — no route, loader or server function reaches a signing operation
  ✓ no signing operation anywhere in the web tier
  CONTROL ✓ an INJECTED signing call is caught by the real detector
  CONTROL ✓ an INJECTED server function that signs is caught
  CONTROL ✓ PROSE naming another project's signing API is NOT a violation of ours
  CONTROL ✓ ⚠ and the SAME text IS still caught when it is real code, not prose
  CONTROL ✓ a QUOTED brace inside an interpolation does NOT unbalance the scan
  CONTROL ✓ ⚠ a signing call after a NESTED OBJECT LITERAL in an interpolation IS caught
  CONTROL ✓ ⚠ a signing call inside a TEMPLATE interpolation is still code, and IS caught
  CONTROL ✓ ⚠ a socket path in a literal is STILL caught — the ident pass did not replace the value pass

Part 4 — the tier holds NO secret and decrypts nothing
  ✓ no file under web/ reads a secret env var, decrypts, or spawns a process
  CONTROL ✓ a WRAPPED env read is caught — the expression spans lines
  CONTROL ✓ a BRACKET env read is caught — process.env["NAME"]
  CONTROL ✓ a DOTTED env read is caught — process.env.NAME
  CONTROL ✓ DECLARING the forbidden name in order to forbid it is NOT a violation
  CONTROL ✓ an INJECTED secret env read is caught by the real detector
  CONTROL ✓ an INJECTED decryption call is caught
  CONTROL ✓ an INJECTED subprocess spawn is caught
  CONTROL ✓ PROSE naming the secret in a doc string is NOT a violation

Part 5 — exactly one socket client in the whole tier
  ✓ exactly one file references the socket (found 1: web/api/signer-status.ts)
  CONTROL ✓ a SECOND socket client is caught by the real detector
  CONTROL ✓ a file with NO socket reference is not counted as a client
  CONTROL ✓ a `import net from "net"` + net.connect client IS counted
  CONTROL ✓ a second client using node:net/createConnection IS counted

Part 6 — the API binds to loopback, and nothing else
  ✓ every .listen( passes an explicit loopback hostname
  ✓ every `host:` under web/app is a loopback literal
  CONTROL ✓ a DUPLICATE hostname key is caught (the LAST one wins in JS)
  CONTROL ✓ a COMPUTED host key ["host"] is caught
  CONTROL ✓ a QUOTED host key is NOT a false-FAIL
  CONTROL ✓ a dynamic `await import("net")` client IS counted
  CONTROL ✓ a MULTI-LINE `from "net"` import IS counted
  CONTROL ✓ a TYPE-ONLY socket import is NOT counted as a client
  CONTROL ✓ a NON-LITERAL host: beside a legitimate loopback host IS caught
  CONTROL ✓ a bind whose ARGUMENTS CONTAIN PARENTHESES is not a false-FAIL
  CONTROL ✓ a 0.0.0.0 host STILL caught with the widened collector
  CONTROL ✓ a 0.0.0.0 dev-server host IS caught
  CONTROL ✓ a LAN dev-server host IS caught
  CONTROL ✓ the REAL dev-server form is NOT caught
  CONTROL ✓ a source set with NO host: key FAILS rather than passing vacuously
  CONTROL ✓ a BARE .listen(port) with no hostname IS caught
  CONTROL ✓ an explicit 0.0.0.0 bind IS caught
  CONTROL ✓ a non-loopback hostname literal IS caught
  CONTROL ✓ the REAL form is NOT caught
  CONTROL ✓ a source set with NO listen call FAILS rather than passing vacuously

Asserted-uncaught — the disclosure below fails if these ever start passing
  CONTROL ✓ ASSERTED UNCAUGHT: an indirect socket path assembled at runtime
  CONTROL ✓ a hostname computed at run time IS caught — part 6 fails closed
  CONTROL ✓ a hostname read from the environment IS caught
  CONTROL ✓ a LAN hostname ARGUMENT is caught even when a loopback CONSTANT is present
  CONTROL ✓ a Bun.serve( bind is seen, not only .listen(
  CONTROL ✓ ASSERTED UNCAUGHT: a socket reached through a dependency this gate does not read

  What this gate does NOT say:
    1. It is LEXICAL. A socket path assembled at runtime — string concatenation, an array join, a base64 blob — is invisible to it, and that shape is an asserted-uncaught control above.
    2. It reads THIS REPOSITORY'S sources only. A dependency under node_modules that opens a socket is not read, and could not be gated this way; the property there is that nothing in web/app has a reason to call one.
    3. The needle sets are NAMED. A signing helper spelled differently from every entry in SIGNING_NEEDLES is not counted, by name (E-142's narrowing, forced three times since).
    4. It checks SOURCE, not behaviour. It cannot prove that the one socket client sends only what it constructs, and it is not a substitute for reading that file.
    5. It says nothing about what the tier DISCLOSES. Whether a rendered sentence about privacy is true is `claims-check`'s question and the wording tests', not this gate's.
    6. Part 4 is about what the tier HOLDS; parts 1-3 are about what it can REACH. Those are different properties and the gate had only the second when an issuer key was added to the API process (E-212). A secret obtained some way this list does not name is still invisible.
    7. The signing pass BLANKS string literals, so a call assembled as a string and eval'd is invisible to it. That is the price of not treating prose about another project's API as a violation of ours, it is a deliberate trade, and the socket pass — where a literal IS the value — keeps literals for exactly the opposite reason (CLAIMS.md E-203, fourth consumer).
    8. It scans web/app and web/api ONLY. A signing helper, a socket client or a listener placed in any OTHER directory under web/ — a new web/bridge/, say — is not read at all, and the count in Part 5 is over the two directories it loads (REVIEW-036b).
    9. It does not check for MUTATING routes. A .post, .put or .delete that writes is invisible to every part; 'read-only' is checked as 'reaches no signing operation and holds no secret', which is not the same property (REVIEW-036b).
    10. Part 6's bind check is LEXICAL and FAILS CLOSED. It resolves a quoted literal, or ONE level of indirection to a constant declared in the same source set; anything else — an env read, a ternary, a concatenation, a call — is REFUSED rather than assumed loopback. ⚠ It reads `.listen(` and `Bun.serve(` by name: a listener started through some other API, or in a directory this gate does not load, is invisible (REVIEW-037 F2).
    11. ⚠ Part 6's resolver IGNORES LEXICAL SCOPE. A parameter or inner binding that SHADOWS an outer loopback constant resolves to the outer one, so `function start(HOST){ listen({hostname: HOST}) }` called with a routable address passes. Full scope analysis needs a parser; this is a named limit, not an oversight (REVIEW-037 spot-check, E-238).
    12. ⚠ Part 6 matches `.listen(` and `Bun.serve(` BY NAME. A parenthesised `(Bun.serve)(…)`, a bind through a framework helper, or an aliased reference is invisible. Chasing spellings is how a named set pretends to be a property; it is disclosed instead (E-238).
    13. ⚠ A socket reached through an ALIASED dynamic import — `const t = await import(x); t.connect(…)` with the specifier assembled at run time — is invisible. The import spellings are matched; the aliasing is not, and cannot be lexically (E-238).
    14. ⚠ Part 6 reads STRING LITERALS as values, so prose containing `host: "0.0.0.0"` inside a quoted string FALSE-FAILS. That is the unsafe direction chosen deliberately: a false-fail is loud and gets fixed, a false-pass is silent (CLAIMS.md E-203's two-consumer lesson).
    15. It says nothing about WHO MAY ASK. The tier serves every route unauthenticated on loopback, and loopback is not uid-scoped — so a datum this gate certifies as reachable-by-design is reachable by any local user. Egress is a third property beside REACH and HOLD, and no part of this gate looks at it (CLAIMS.md E-228, REVIEW-036c U1).

------------------------------------------------------------------------------
PASS: web/app reaches no socket, web/api builds Status and neither Pair nor
      Prepare, no signing operation exists in the tier, exactly one socket
      client exists, and the API binds to loopback only — under 54 controls,
      a count INCREMENTED BY THE
      HELPER THAT RUNS THEM (E-203), each running through the same detector the
      real checks call.
⚠ A lexical gate over a NAMED SET. See "What this gate does NOT say" above.

web/api/disclosure.test.ts:
624 |     expect(custody.proveAndSign.detail).toMatch(/only public data/i);
625 |   });
626 |   test("the custody simulation's reasons say the same", () => {
627 |     const reasons = JSON.stringify(walkFlows());
628 |     expect(reasons).toMatch(/outside the platform/);
629 |     expect(reasons).toMatch(/only public data/);
                          ^
error: expect(received).toMatch(expected)

Expected substring or pattern: /only public data/
Received: "{\"simulation\":true,\"disclaimer\":\"SIMULATION. No custody platform is integrated behind this: no MPC and no HSM. It models a standalone ElGamal key plus an external signer, to show which flows survive and which break. See docs/research/CUSTODY-2026-08-28.md.\",\"flows\":[{\"id\":\"public-payment\",\"label\":\"Send a public XRPL payment\",\"survives\":true,\"blockedBy\":[],\"caveats\":[]},{\"id\":\"onboard-derived\",\"label\":\"Onboard with the ruled derived key\",\"survives\":false,\"blockedBy\":[{\"requirement\":\"seed-material\",\"because\":\"Structural in this simulation: a custody platform never releases seed material, so the account cannot derive its own ElGamal key outside the platform. A platform that ran the derivation inside its own boundary would change this, and that needs the derivation published (issue #10).\"}],\"caveats\":[]},{\"id\":\"onboard-standalone\",\"label\":\"Onboard with a standalone ElGamal key\",\"survives\":true,\"blockedBy\":[],\"caveats\":[\"Only with a standalone ElGamal key, held outside the custody platform (E-117).\"]},{\"id\":\"read-own-balance\",\"label\":\"Read own confidential balance\",\"survives\":true,\"blockedBy\":[],\"caveats\":[\"Only with a standalone ElGamal key, held outside the custody platform (E-117).\"]},{\"id\":\"confidential-send\",\"label\":\"Send a confidential amount\",\"survives\":true,\"blockedBy\":[],\"caveats\":[\"Only with a standalone ElGamal key, held outside the custody platform (E-117).\"]},{\"id\":\"confidential-send-capped\",\"label\":\"Send confidentially, under an amount-capped approval policy\",\"survives\":false,\"blockedBy\":[{\"requirement\":\"policy-over-amount\",\"because\":\"Structural: the transaction carries a proof, not a value, so a rule like 'two approvers above $1M' has no amount to read.\"}],\"caveats\":[\"Only with a standalone ElGamal key, held outside the custody platform (E-117).\"]},{\"id\":\"confidential-send-allowlist\",\"label\":\"Send confidentially, under a destination-allowlist policy\",\"survives\":true,\"blockedBy\":[],\"caveats\":[\"Only with a standalone ElGamal key, held outside the custody platform (E-117).\"]},{\"id\":\"retire-tranches\",\"label\":\"Retire a position in tranches\",\"survives\":true,\"blockedBy\":[],\"caveats\":[\"Only with a standalone ElGamal key, held outside the custody platform (E-117).\",\"Each tranche size and its timing is public: the amount is plaintext on every ConvertBack (CLAIMS.md F-24).\"]}]}"

      at <anonymous> ($USER_TMP/T/r059a3.a9gx52/repo/review-work-r3/custody-tree/web/api/disclosure.test.ts:629:21)
(fail) the custody findings keep their exceptions on every surface > the custody simulation's reasons say the same [0.18ms]

 2 pass
 59 filtered out
 1 fail
 10 expect() calls
Ran 3 tests across 1 file. [40.00ms]
````

## custody-view-internal-exception.log

````
bun test v1.3.14 (0d9b296a)
check-web-readonly — architecture §6 step 8, ADR-0003 D1
==============================================================================

  web/app: 33 source file(s)
  web/api: 10 source file(s)

Part 1 — nothing under web/app reaches the signer socket
  ✓ web/app names no socket path, imports no UDS client, opens no socket
  CONTROL ✓ an INJECTED socket reference in web/app is caught by the real detector
  CONTROL ✓ a COMMENTED-OUT socket reference is NOT counted (E-182)
  CONTROL ✓ a BLOCK-commented socket reference is NOT counted
  CONTROL ✓ a socket path inside a STRING LITERAL IS counted — literals are preserved
  CONTROL ✓ a socket path inside a TEMPLATE literal IS counted
  CONTROL ✓ code AFTER a non-nesting block comment is still scanned (the Rust-stripper trap)

Part 2 — the Elysia process builds Status, and never Pair or Prepare
  ✓ web/api constructs a `status` request
  ✓ web/api constructs neither `pair` nor `prepare`
  CONTROL ✓ an INJECTED pair request is caught by the real detector
  CONTROL ✓ a TEMPLATE-LITERAL authority tag is caught — type: `prepare`
  CONTROL ✓ an INJECTED prepare request is caught by the real detector
  CONTROL ✓ the status detector FAILS on a tree with no status request

Part 3 — no route, loader or server function reaches a signing operation
  ✓ no signing operation anywhere in the web tier
  CONTROL ✓ an INJECTED signing call is caught by the real detector
  CONTROL ✓ an INJECTED server function that signs is caught
  CONTROL ✓ PROSE naming another project's signing API is NOT a violation of ours
  CONTROL ✓ ⚠ and the SAME text IS still caught when it is real code, not prose
  CONTROL ✓ a QUOTED brace inside an interpolation does NOT unbalance the scan
  CONTROL ✓ ⚠ a signing call after a NESTED OBJECT LITERAL in an interpolation IS caught
  CONTROL ✓ ⚠ a signing call inside a TEMPLATE interpolation is still code, and IS caught
  CONTROL ✓ ⚠ a socket path in a literal is STILL caught — the ident pass did not replace the value pass

Part 4 — the tier holds NO secret and decrypts nothing
  ✓ no file under web/ reads a secret env var, decrypts, or spawns a process
  CONTROL ✓ a WRAPPED env read is caught — the expression spans lines
  CONTROL ✓ a BRACKET env read is caught — process.env["NAME"]
  CONTROL ✓ a DOTTED env read is caught — process.env.NAME
  CONTROL ✓ DECLARING the forbidden name in order to forbid it is NOT a violation
  CONTROL ✓ an INJECTED secret env read is caught by the real detector
  CONTROL ✓ an INJECTED decryption call is caught
  CONTROL ✓ an INJECTED subprocess spawn is caught
  CONTROL ✓ PROSE naming the secret in a doc string is NOT a violation

Part 5 — exactly one socket client in the whole tier
  ✓ exactly one file references the socket (found 1: web/api/signer-status.ts)
  CONTROL ✓ a SECOND socket client is caught by the real detector
  CONTROL ✓ a file with NO socket reference is not counted as a client
  CONTROL ✓ a `import net from "net"` + net.connect client IS counted
  CONTROL ✓ a second client using node:net/createConnection IS counted

Part 6 — the API binds to loopback, and nothing else
  ✓ every .listen( passes an explicit loopback hostname
  ✓ every `host:` under web/app is a loopback literal
  CONTROL ✓ a DUPLICATE hostname key is caught (the LAST one wins in JS)
  CONTROL ✓ a COMPUTED host key ["host"] is caught
  CONTROL ✓ a QUOTED host key is NOT a false-FAIL
  CONTROL ✓ a dynamic `await import("net")` client IS counted
  CONTROL ✓ a MULTI-LINE `from "net"` import IS counted
  CONTROL ✓ a TYPE-ONLY socket import is NOT counted as a client
  CONTROL ✓ a NON-LITERAL host: beside a legitimate loopback host IS caught
  CONTROL ✓ a bind whose ARGUMENTS CONTAIN PARENTHESES is not a false-FAIL
  CONTROL ✓ a 0.0.0.0 host STILL caught with the widened collector
  CONTROL ✓ a 0.0.0.0 dev-server host IS caught
  CONTROL ✓ a LAN dev-server host IS caught
  CONTROL ✓ the REAL dev-server form is NOT caught
  CONTROL ✓ a source set with NO host: key FAILS rather than passing vacuously
  CONTROL ✓ a BARE .listen(port) with no hostname IS caught
  CONTROL ✓ an explicit 0.0.0.0 bind IS caught
  CONTROL ✓ a non-loopback hostname literal IS caught
  CONTROL ✓ the REAL form is NOT caught
  CONTROL ✓ a source set with NO listen call FAILS rather than passing vacuously

Asserted-uncaught — the disclosure below fails if these ever start passing
  CONTROL ✓ ASSERTED UNCAUGHT: an indirect socket path assembled at runtime
  CONTROL ✓ a hostname computed at run time IS caught — part 6 fails closed
  CONTROL ✓ a hostname read from the environment IS caught
  CONTROL ✓ a LAN hostname ARGUMENT is caught even when a loopback CONSTANT is present
  CONTROL ✓ a Bun.serve( bind is seen, not only .listen(
  CONTROL ✓ ASSERTED UNCAUGHT: a socket reached through a dependency this gate does not read

  What this gate does NOT say:
    1. It is LEXICAL. A socket path assembled at runtime — string concatenation, an array join, a base64 blob — is invisible to it, and that shape is an asserted-uncaught control above.
    2. It reads THIS REPOSITORY'S sources only. A dependency under node_modules that opens a socket is not read, and could not be gated this way; the property there is that nothing in web/app has a reason to call one.
    3. The needle sets are NAMED. A signing helper spelled differently from every entry in SIGNING_NEEDLES is not counted, by name (E-142's narrowing, forced three times since).
    4. It checks SOURCE, not behaviour. It cannot prove that the one socket client sends only what it constructs, and it is not a substitute for reading that file.
    5. It says nothing about what the tier DISCLOSES. Whether a rendered sentence about privacy is true is `claims-check`'s question and the wording tests', not this gate's.
    6. Part 4 is about what the tier HOLDS; parts 1-3 are about what it can REACH. Those are different properties and the gate had only the second when an issuer key was added to the API process (E-212). A secret obtained some way this list does not name is still invisible.
    7. The signing pass BLANKS string literals, so a call assembled as a string and eval'd is invisible to it. That is the price of not treating prose about another project's API as a violation of ours, it is a deliberate trade, and the socket pass — where a literal IS the value — keeps literals for exactly the opposite reason (CLAIMS.md E-203, fourth consumer).
    8. It scans web/app and web/api ONLY. A signing helper, a socket client or a listener placed in any OTHER directory under web/ — a new web/bridge/, say — is not read at all, and the count in Part 5 is over the two directories it loads (REVIEW-036b).
    9. It does not check for MUTATING routes. A .post, .put or .delete that writes is invisible to every part; 'read-only' is checked as 'reaches no signing operation and holds no secret', which is not the same property (REVIEW-036b).
    10. Part 6's bind check is LEXICAL and FAILS CLOSED. It resolves a quoted literal, or ONE level of indirection to a constant declared in the same source set; anything else — an env read, a ternary, a concatenation, a call — is REFUSED rather than assumed loopback. ⚠ It reads `.listen(` and `Bun.serve(` by name: a listener started through some other API, or in a directory this gate does not load, is invisible (REVIEW-037 F2).
    11. ⚠ Part 6's resolver IGNORES LEXICAL SCOPE. A parameter or inner binding that SHADOWS an outer loopback constant resolves to the outer one, so `function start(HOST){ listen({hostname: HOST}) }` called with a routable address passes. Full scope analysis needs a parser; this is a named limit, not an oversight (REVIEW-037 spot-check, E-238).
    12. ⚠ Part 6 matches `.listen(` and `Bun.serve(` BY NAME. A parenthesised `(Bun.serve)(…)`, a bind through a framework helper, or an aliased reference is invisible. Chasing spellings is how a named set pretends to be a property; it is disclosed instead (E-238).
    13. ⚠ A socket reached through an ALIASED dynamic import — `const t = await import(x); t.connect(…)` with the specifier assembled at run time — is invisible. The import spellings are matched; the aliasing is not, and cannot be lexically (E-238).
    14. ⚠ Part 6 reads STRING LITERALS as values, so prose containing `host: "0.0.0.0"` inside a quoted string FALSE-FAILS. That is the unsafe direction chosen deliberately: a false-fail is loud and gets fixed, a false-pass is silent (CLAIMS.md E-203's two-consumer lesson).
    15. It says nothing about WHO MAY ASK. The tier serves every route unauthenticated on loopback, and loopback is not uid-scoped — so a datum this gate certifies as reachable-by-design is reachable by any local user. Egress is a third property beside REACH and HOLD, and no part of this gate looks at it (CLAIMS.md E-228, REVIEW-036c U1).

------------------------------------------------------------------------------
PASS: web/app reaches no socket, web/api builds Status and neither Pair nor
      Prepare, no signing operation exists in the tier, exactly one socket
      client exists, and the API binds to loopback only — under 54 controls,
      a count INCREMENTED BY THE
      HELPER THAT RUNS THEM (E-203), each running through the same detector the
      real checks call.
⚠ A lexical gate over a NAMED SET. See "What this gate does NOT say" above.

web/api/disclosure.test.ts:
611 |   // and restoring the old text passed every test (R2-12).
612 |   const view = readFileSync(join(import.meta.dir, "../app/src/views/CustodyView.tsx"), "utf8").replace(/\s+/g, " ");
613 |   const custody = CAPABILITY_MATRIX.find((r) => r.id === "custody-simulated")!;
614 |   test("the page names the inside-the-platform exception and the public-data scope", () => {
615 |     expect(view).toMatch(/outside the platform/);
616 |     expect(view).toMatch(/inside its own boundary/);
                       ^
error: expect(received).toMatch(expected)

Expected substring or pattern: /inside its own boundary/
Received: "/** * The custody page, a simulation. * * ⚠ Rendered by the local tier's route and by the hosted build's route alike, * so the page has one body and the two cannot drift (`ADR-0004`; `CLAIMS.md` * E-141's shape is a second copy of one text). * * The capability matrix's custody row is not repeated here: the two findings * say the same thing, and the matrix page carries the row. */ import { Panel } from \"../components/Verdict\"; export function CustodyView({ sim }: { sim: { flows: any[] } }) { // A caveat that several flows share is printed once, numbered, and each flow points at it. const counts = new Map<string, number>(); for (const f of sim.flows) for (const c of f.caveats as string[]) counts.set(c, (counts.get(c) ?? 0) + 1); const notes = [...counts].filter(([, n]) => n > 1).map(([c]) => c); return ( <> <Panel title=\"This is a simulation\" tone=\"warn\"> <p className=\"text-sm leading-relaxed\"> No custody platform is integrated behind this page: no MPC, no HSM, no Harmonize. It models a key-source shape, a standalone ElGamal key plus an external signer, to show which flows survive and which break. </p> </Panel> <Panel title=\"Two findings\"> <div className=\"text-sm space-y-5\"> <div> <h3 className=\"font-semibold mb-1\">1. The derived key does not work with custodial key management</h3> <p className=\"opacity-85 leading-relaxed\"> The ElGamal secret is derived from the master seed, and a custody platform never releases the seed. So the account cannot derive its own ElGamal key or read its own confidential balance outside the platform. </p> <p className=\"opacity-85 leading-relaxed mt-2\"> A standalone ElGamal key gets around this, but then something outside the custody platform holds a permanent decryption key. Who that should be is an open question in this project (CLAIMS.md E-117). </p> </div> <div> <h3 className=\"font-semibold mb-1\">2. Approval policies cannot read a confidential amount</h3> <p className=\"opacity-85 leading-relaxed\"> An approval workflow that holds only public data sees a proof, not a value, so a rule like <em>&ldquo;two approvers above $1M&rdquo;</em> has nothing to check. This is structural, not an integration detail: confidentiality and amount-based approval policies pull against each other. The ways out each cost something: give the policy engine the ElGamal secret, and it becomes another party that reads every balance; accept the holder&rsquo;s statement of the amount, and the policy rests on the holder&rsquo;s honesty; or prove the bound in zero knowledge, which this project has neither built nor costed. </p> </div> </div> </Panel> <Panel title=\"Which flows survive, and which break\"> <p className=\"text-sm mb-2 opacity-80\"> Each flow lists what it needs, and the verdict is computed from what a custody-shaped key source has. </p> {notes.map((c, i) => ( <p key={c} className=\"text-sm mb-2 opacity-80\">Note {i + 1}: {c}</p> ))} <div className=\"mb-4\" /> <div className=\"space-y-3\"> {sim.flows.map((f: any) => ( // ⚠ A class, not a `style` attribute: the hosted build's Content // Security Policy blocks inline style attributes (ADR-0004). <div key={f.id} className={`border-l-2 pl-3 ${f.survives ? \"border-[var(--color-public)]\" : \"border-[var(--color-warn)]\"}`}> <div className=\"text-sm font-medium\"> {f.survives ? \"survives\" : \"breaks\"}: {f.label} {notes.map((c, i) => (f.caveats.includes(c) ? <span key={c} className=\"font-normal opacity-70\"> (note {i + 1})</span> : null))} </div> {f.blockedBy.map((b: any) => ( <p key={b.requirement} className=\"text-xs opacity-80 mt-1\">{b.because}</p> ))} {f.caveats.filter((c: string) => !notes.includes(c)).map((c: string) => ( <p key={c} className=\"text-xs opacity-70 mt-1\">{c}</p> ))} </div> ))} </div> </Panel> </> ); } "

      at <anonymous> ($USER_TMP/T/r059a3.a9gx52/repo/review-work-r3/custody-tree/web/api/disclosure.test.ts:616:18)
(fail) the custody findings keep their exceptions on every surface > the page names the inside-the-platform exception and the public-data scope [2.01ms]

 2 pass
 59 filtered out
 1 fail
 7 expect() calls
Ran 3 tests across 1 file. [44.00ms]
````

## custody-view-policy-alternatives-full.log

````
bun test v1.3.14 (0d9b296a)
check-web-readonly — architecture §6 step 8, ADR-0003 D1
==============================================================================

  web/app: 33 source file(s)
  web/api: 10 source file(s)

Part 1 — nothing under web/app reaches the signer socket
  ✓ web/app names no socket path, imports no UDS client, opens no socket
  CONTROL ✓ an INJECTED socket reference in web/app is caught by the real detector
  CONTROL ✓ a COMMENTED-OUT socket reference is NOT counted (E-182)
  CONTROL ✓ a BLOCK-commented socket reference is NOT counted
  CONTROL ✓ a socket path inside a STRING LITERAL IS counted — literals are preserved
  CONTROL ✓ a socket path inside a TEMPLATE literal IS counted
  CONTROL ✓ code AFTER a non-nesting block comment is still scanned (the Rust-stripper trap)

Part 2 — the Elysia process builds Status, and never Pair or Prepare
  ✓ web/api constructs a `status` request
  ✓ web/api constructs neither `pair` nor `prepare`
  CONTROL ✓ an INJECTED pair request is caught by the real detector
  CONTROL ✓ a TEMPLATE-LITERAL authority tag is caught — type: `prepare`
  CONTROL ✓ an INJECTED prepare request is caught by the real detector
  CONTROL ✓ the status detector FAILS on a tree with no status request

Part 3 — no route, loader or server function reaches a signing operation
  ✓ no signing operation anywhere in the web tier
  CONTROL ✓ an INJECTED signing call is caught by the real detector
  CONTROL ✓ an INJECTED server function that signs is caught
  CONTROL ✓ PROSE naming another project's signing API is NOT a violation of ours
  CONTROL ✓ ⚠ and the SAME text IS still caught when it is real code, not prose
  CONTROL ✓ a QUOTED brace inside an interpolation does NOT unbalance the scan
  CONTROL ✓ ⚠ a signing call after a NESTED OBJECT LITERAL in an interpolation IS caught
  CONTROL ✓ ⚠ a signing call inside a TEMPLATE interpolation is still code, and IS caught
  CONTROL ✓ ⚠ a socket path in a literal is STILL caught — the ident pass did not replace the value pass

Part 4 — the tier holds NO secret and decrypts nothing
  ✓ no file under web/ reads a secret env var, decrypts, or spawns a process
  CONTROL ✓ a WRAPPED env read is caught — the expression spans lines
  CONTROL ✓ a BRACKET env read is caught — process.env["NAME"]
  CONTROL ✓ a DOTTED env read is caught — process.env.NAME
  CONTROL ✓ DECLARING the forbidden name in order to forbid it is NOT a violation
  CONTROL ✓ an INJECTED secret env read is caught by the real detector
  CONTROL ✓ an INJECTED decryption call is caught
  CONTROL ✓ an INJECTED subprocess spawn is caught
  CONTROL ✓ PROSE naming the secret in a doc string is NOT a violation

Part 5 — exactly one socket client in the whole tier
  ✓ exactly one file references the socket (found 1: web/api/signer-status.ts)
  CONTROL ✓ a SECOND socket client is caught by the real detector
  CONTROL ✓ a file with NO socket reference is not counted as a client
  CONTROL ✓ a `import net from "net"` + net.connect client IS counted
  CONTROL ✓ a second client using node:net/createConnection IS counted

Part 6 — the API binds to loopback, and nothing else
  ✓ every .listen( passes an explicit loopback hostname
  ✓ every `host:` under web/app is a loopback literal
  CONTROL ✓ a DUPLICATE hostname key is caught (the LAST one wins in JS)
  CONTROL ✓ a COMPUTED host key ["host"] is caught
  CONTROL ✓ a QUOTED host key is NOT a false-FAIL
  CONTROL ✓ a dynamic `await import("net")` client IS counted
  CONTROL ✓ a MULTI-LINE `from "net"` import IS counted
  CONTROL ✓ a TYPE-ONLY socket import is NOT counted as a client
  CONTROL ✓ a NON-LITERAL host: beside a legitimate loopback host IS caught
  CONTROL ✓ a bind whose ARGUMENTS CONTAIN PARENTHESES is not a false-FAIL
  CONTROL ✓ a 0.0.0.0 host STILL caught with the widened collector
  CONTROL ✓ a 0.0.0.0 dev-server host IS caught
  CONTROL ✓ a LAN dev-server host IS caught
  CONTROL ✓ the REAL dev-server form is NOT caught
  CONTROL ✓ a source set with NO host: key FAILS rather than passing vacuously
  CONTROL ✓ a BARE .listen(port) with no hostname IS caught
  CONTROL ✓ an explicit 0.0.0.0 bind IS caught
  CONTROL ✓ a non-loopback hostname literal IS caught
  CONTROL ✓ the REAL form is NOT caught
  CONTROL ✓ a source set with NO listen call FAILS rather than passing vacuously

Asserted-uncaught — the disclosure below fails if these ever start passing
  CONTROL ✓ ASSERTED UNCAUGHT: an indirect socket path assembled at runtime
  CONTROL ✓ a hostname computed at run time IS caught — part 6 fails closed
  CONTROL ✓ a hostname read from the environment IS caught
  CONTROL ✓ a LAN hostname ARGUMENT is caught even when a loopback CONSTANT is present
  CONTROL ✓ a Bun.serve( bind is seen, not only .listen(
  CONTROL ✓ ASSERTED UNCAUGHT: a socket reached through a dependency this gate does not read

  What this gate does NOT say:
    1. It is LEXICAL. A socket path assembled at runtime — string concatenation, an array join, a base64 blob — is invisible to it, and that shape is an asserted-uncaught control above.
    2. It reads THIS REPOSITORY'S sources only. A dependency under node_modules that opens a socket is not read, and could not be gated this way; the property there is that nothing in web/app has a reason to call one.
    3. The needle sets are NAMED. A signing helper spelled differently from every entry in SIGNING_NEEDLES is not counted, by name (E-142's narrowing, forced three times since).
    4. It checks SOURCE, not behaviour. It cannot prove that the one socket client sends only what it constructs, and it is not a substitute for reading that file.
    5. It says nothing about what the tier DISCLOSES. Whether a rendered sentence about privacy is true is `claims-check`'s question and the wording tests', not this gate's.
    6. Part 4 is about what the tier HOLDS; parts 1-3 are about what it can REACH. Those are different properties and the gate had only the second when an issuer key was added to the API process (E-212). A secret obtained some way this list does not name is still invisible.
    7. The signing pass BLANKS string literals, so a call assembled as a string and eval'd is invisible to it. That is the price of not treating prose about another project's API as a violation of ours, it is a deliberate trade, and the socket pass — where a literal IS the value — keeps literals for exactly the opposite reason (CLAIMS.md E-203, fourth consumer).
    8. It scans web/app and web/api ONLY. A signing helper, a socket client or a listener placed in any OTHER directory under web/ — a new web/bridge/, say — is not read at all, and the count in Part 5 is over the two directories it loads (REVIEW-036b).
    9. It does not check for MUTATING routes. A .post, .put or .delete that writes is invisible to every part; 'read-only' is checked as 'reaches no signing operation and holds no secret', which is not the same property (REVIEW-036b).
    10. Part 6's bind check is LEXICAL and FAILS CLOSED. It resolves a quoted literal, or ONE level of indirection to a constant declared in the same source set; anything else — an env read, a ternary, a concatenation, a call — is REFUSED rather than assumed loopback. ⚠ It reads `.listen(` and `Bun.serve(` by name: a listener started through some other API, or in a directory this gate does not load, is invisible (REVIEW-037 F2).
    11. ⚠ Part 6's resolver IGNORES LEXICAL SCOPE. A parameter or inner binding that SHADOWS an outer loopback constant resolves to the outer one, so `function start(HOST){ listen({hostname: HOST}) }` called with a routable address passes. Full scope analysis needs a parser; this is a named limit, not an oversight (REVIEW-037 spot-check, E-238).
    12. ⚠ Part 6 matches `.listen(` and `Bun.serve(` BY NAME. A parenthesised `(Bun.serve)(…)`, a bind through a framework helper, or an aliased reference is invisible. Chasing spellings is how a named set pretends to be a property; it is disclosed instead (E-238).
    13. ⚠ A socket reached through an ALIASED dynamic import — `const t = await import(x); t.connect(…)` with the specifier assembled at run time — is invisible. The import spellings are matched; the aliasing is not, and cannot be lexically (E-238).
    14. ⚠ Part 6 reads STRING LITERALS as values, so prose containing `host: "0.0.0.0"` inside a quoted string FALSE-FAILS. That is the unsafe direction chosen deliberately: a false-fail is loud and gets fixed, a false-pass is silent (CLAIMS.md E-203's two-consumer lesson).
    15. It says nothing about WHO MAY ASK. The tier serves every route unauthenticated on loopback, and loopback is not uid-scoped — so a datum this gate certifies as reachable-by-design is reachable by any local user. Egress is a third property beside REACH and HOLD, and no part of this gate looks at it (CLAIMS.md E-228, REVIEW-036c U1).

------------------------------------------------------------------------------
PASS: web/app reaches no socket, web/api builds Status and neither Pair nor
      Prepare, no signing operation exists in the tier, exactly one socket
      client exists, and the API binds to loopback only — under 54 controls,
      a count INCREMENTED BY THE
      HELPER THAT RUNS THEM (E-203), each running through the same detector the
      real checks call.
⚠ A lexical gate over a NAMED SET. See "What this gate does NOT say" above.

web/api/disclosure.test.ts:

 184 pass
 0 fail
 317 expect() calls
Ran 184 tests across 7 files. [433.00ms]
````

## custody-view-policy-alternatives.log

````
bun test v1.3.14 (0d9b296a)
check-web-readonly — architecture §6 step 8, ADR-0003 D1
==============================================================================

  web/app: 33 source file(s)
  web/api: 10 source file(s)

Part 1 — nothing under web/app reaches the signer socket
  ✓ web/app names no socket path, imports no UDS client, opens no socket
  CONTROL ✓ an INJECTED socket reference in web/app is caught by the real detector
  CONTROL ✓ a COMMENTED-OUT socket reference is NOT counted (E-182)
  CONTROL ✓ a BLOCK-commented socket reference is NOT counted
  CONTROL ✓ a socket path inside a STRING LITERAL IS counted — literals are preserved
  CONTROL ✓ a socket path inside a TEMPLATE literal IS counted
  CONTROL ✓ code AFTER a non-nesting block comment is still scanned (the Rust-stripper trap)

Part 2 — the Elysia process builds Status, and never Pair or Prepare
  ✓ web/api constructs a `status` request
  ✓ web/api constructs neither `pair` nor `prepare`
  CONTROL ✓ an INJECTED pair request is caught by the real detector
  CONTROL ✓ a TEMPLATE-LITERAL authority tag is caught — type: `prepare`
  CONTROL ✓ an INJECTED prepare request is caught by the real detector
  CONTROL ✓ the status detector FAILS on a tree with no status request

Part 3 — no route, loader or server function reaches a signing operation
  ✓ no signing operation anywhere in the web tier
  CONTROL ✓ an INJECTED signing call is caught by the real detector
  CONTROL ✓ an INJECTED server function that signs is caught
  CONTROL ✓ PROSE naming another project's signing API is NOT a violation of ours
  CONTROL ✓ ⚠ and the SAME text IS still caught when it is real code, not prose
  CONTROL ✓ a QUOTED brace inside an interpolation does NOT unbalance the scan
  CONTROL ✓ ⚠ a signing call after a NESTED OBJECT LITERAL in an interpolation IS caught
  CONTROL ✓ ⚠ a signing call inside a TEMPLATE interpolation is still code, and IS caught
  CONTROL ✓ ⚠ a socket path in a literal is STILL caught — the ident pass did not replace the value pass

Part 4 — the tier holds NO secret and decrypts nothing
  ✓ no file under web/ reads a secret env var, decrypts, or spawns a process
  CONTROL ✓ a WRAPPED env read is caught — the expression spans lines
  CONTROL ✓ a BRACKET env read is caught — process.env["NAME"]
  CONTROL ✓ a DOTTED env read is caught — process.env.NAME
  CONTROL ✓ DECLARING the forbidden name in order to forbid it is NOT a violation
  CONTROL ✓ an INJECTED secret env read is caught by the real detector
  CONTROL ✓ an INJECTED decryption call is caught
  CONTROL ✓ an INJECTED subprocess spawn is caught
  CONTROL ✓ PROSE naming the secret in a doc string is NOT a violation

Part 5 — exactly one socket client in the whole tier
  ✓ exactly one file references the socket (found 1: web/api/signer-status.ts)
  CONTROL ✓ a SECOND socket client is caught by the real detector
  CONTROL ✓ a file with NO socket reference is not counted as a client
  CONTROL ✓ a `import net from "net"` + net.connect client IS counted
  CONTROL ✓ a second client using node:net/createConnection IS counted

Part 6 — the API binds to loopback, and nothing else
  ✓ every .listen( passes an explicit loopback hostname
  ✓ every `host:` under web/app is a loopback literal
  CONTROL ✓ a DUPLICATE hostname key is caught (the LAST one wins in JS)
  CONTROL ✓ a COMPUTED host key ["host"] is caught
  CONTROL ✓ a QUOTED host key is NOT a false-FAIL
  CONTROL ✓ a dynamic `await import("net")` client IS counted
  CONTROL ✓ a MULTI-LINE `from "net"` import IS counted
  CONTROL ✓ a TYPE-ONLY socket import is NOT counted as a client
  CONTROL ✓ a NON-LITERAL host: beside a legitimate loopback host IS caught
  CONTROL ✓ a bind whose ARGUMENTS CONTAIN PARENTHESES is not a false-FAIL
  CONTROL ✓ a 0.0.0.0 host STILL caught with the widened collector
  CONTROL ✓ a 0.0.0.0 dev-server host IS caught
  CONTROL ✓ a LAN dev-server host IS caught
  CONTROL ✓ the REAL dev-server form is NOT caught
  CONTROL ✓ a source set with NO host: key FAILS rather than passing vacuously
  CONTROL ✓ a BARE .listen(port) with no hostname IS caught
  CONTROL ✓ an explicit 0.0.0.0 bind IS caught
  CONTROL ✓ a non-loopback hostname literal IS caught
  CONTROL ✓ the REAL form is NOT caught
  CONTROL ✓ a source set with NO listen call FAILS rather than passing vacuously

Asserted-uncaught — the disclosure below fails if these ever start passing
  CONTROL ✓ ASSERTED UNCAUGHT: an indirect socket path assembled at runtime
  CONTROL ✓ a hostname computed at run time IS caught — part 6 fails closed
  CONTROL ✓ a hostname read from the environment IS caught
  CONTROL ✓ a LAN hostname ARGUMENT is caught even when a loopback CONSTANT is present
  CONTROL ✓ a Bun.serve( bind is seen, not only .listen(
  CONTROL ✓ ASSERTED UNCAUGHT: a socket reached through a dependency this gate does not read

  What this gate does NOT say:
    1. It is LEXICAL. A socket path assembled at runtime — string concatenation, an array join, a base64 blob — is invisible to it, and that shape is an asserted-uncaught control above.
    2. It reads THIS REPOSITORY'S sources only. A dependency under node_modules that opens a socket is not read, and could not be gated this way; the property there is that nothing in web/app has a reason to call one.
    3. The needle sets are NAMED. A signing helper spelled differently from every entry in SIGNING_NEEDLES is not counted, by name (E-142's narrowing, forced three times since).
    4. It checks SOURCE, not behaviour. It cannot prove that the one socket client sends only what it constructs, and it is not a substitute for reading that file.
    5. It says nothing about what the tier DISCLOSES. Whether a rendered sentence about privacy is true is `claims-check`'s question and the wording tests', not this gate's.
    6. Part 4 is about what the tier HOLDS; parts 1-3 are about what it can REACH. Those are different properties and the gate had only the second when an issuer key was added to the API process (E-212). A secret obtained some way this list does not name is still invisible.
    7. The signing pass BLANKS string literals, so a call assembled as a string and eval'd is invisible to it. That is the price of not treating prose about another project's API as a violation of ours, it is a deliberate trade, and the socket pass — where a literal IS the value — keeps literals for exactly the opposite reason (CLAIMS.md E-203, fourth consumer).
    8. It scans web/app and web/api ONLY. A signing helper, a socket client or a listener placed in any OTHER directory under web/ — a new web/bridge/, say — is not read at all, and the count in Part 5 is over the two directories it loads (REVIEW-036b).
    9. It does not check for MUTATING routes. A .post, .put or .delete that writes is invisible to every part; 'read-only' is checked as 'reaches no signing operation and holds no secret', which is not the same property (REVIEW-036b).
    10. Part 6's bind check is LEXICAL and FAILS CLOSED. It resolves a quoted literal, or ONE level of indirection to a constant declared in the same source set; anything else — an env read, a ternary, a concatenation, a call — is REFUSED rather than assumed loopback. ⚠ It reads `.listen(` and `Bun.serve(` by name: a listener started through some other API, or in a directory this gate does not load, is invisible (REVIEW-037 F2).
    11. ⚠ Part 6's resolver IGNORES LEXICAL SCOPE. A parameter or inner binding that SHADOWS an outer loopback constant resolves to the outer one, so `function start(HOST){ listen({hostname: HOST}) }` called with a routable address passes. Full scope analysis needs a parser; this is a named limit, not an oversight (REVIEW-037 spot-check, E-238).
    12. ⚠ Part 6 matches `.listen(` and `Bun.serve(` BY NAME. A parenthesised `(Bun.serve)(…)`, a bind through a framework helper, or an aliased reference is invisible. Chasing spellings is how a named set pretends to be a property; it is disclosed instead (E-238).
    13. ⚠ A socket reached through an ALIASED dynamic import — `const t = await import(x); t.connect(…)` with the specifier assembled at run time — is invisible. The import spellings are matched; the aliasing is not, and cannot be lexically (E-238).
    14. ⚠ Part 6 reads STRING LITERALS as values, so prose containing `host: "0.0.0.0"` inside a quoted string FALSE-FAILS. That is the unsafe direction chosen deliberately: a false-fail is loud and gets fixed, a false-pass is silent (CLAIMS.md E-203's two-consumer lesson).
    15. It says nothing about WHO MAY ASK. The tier serves every route unauthenticated on loopback, and loopback is not uid-scoped — so a datum this gate certifies as reachable-by-design is reachable by any local user. Egress is a third property beside REACH and HOLD, and no part of this gate looks at it (CLAIMS.md E-228, REVIEW-036c U1).

------------------------------------------------------------------------------
PASS: web/app reaches no socket, web/api builds Status and neither Pair nor
      Prepare, no signing operation exists in the tier, exactly one socket
      client exists, and the API binds to loopback only — under 54 controls,
      a count INCREMENTED BY THE
      HELPER THAT RUNS THEM (E-203), each running through the same detector the
      real checks call.
⚠ A lexical gate over a NAMED SET. See "What this gate does NOT say" above.

web/api/disclosure.test.ts:

 3 pass
 59 filtered out
 0 fail
 10 expect() calls
Ran 3 tests across 1 file. [39.00ms]
````

## custody-view-public-data.log

````
bun test v1.3.14 (0d9b296a)
check-web-readonly — architecture §6 step 8, ADR-0003 D1
==============================================================================

  web/app: 33 source file(s)
  web/api: 10 source file(s)

Part 1 — nothing under web/app reaches the signer socket
  ✓ web/app names no socket path, imports no UDS client, opens no socket
  CONTROL ✓ an INJECTED socket reference in web/app is caught by the real detector
  CONTROL ✓ a COMMENTED-OUT socket reference is NOT counted (E-182)
  CONTROL ✓ a BLOCK-commented socket reference is NOT counted
  CONTROL ✓ a socket path inside a STRING LITERAL IS counted — literals are preserved
  CONTROL ✓ a socket path inside a TEMPLATE literal IS counted
  CONTROL ✓ code AFTER a non-nesting block comment is still scanned (the Rust-stripper trap)

Part 2 — the Elysia process builds Status, and never Pair or Prepare
  ✓ web/api constructs a `status` request
  ✓ web/api constructs neither `pair` nor `prepare`
  CONTROL ✓ an INJECTED pair request is caught by the real detector
  CONTROL ✓ a TEMPLATE-LITERAL authority tag is caught — type: `prepare`
  CONTROL ✓ an INJECTED prepare request is caught by the real detector
  CONTROL ✓ the status detector FAILS on a tree with no status request

Part 3 — no route, loader or server function reaches a signing operation
  ✓ no signing operation anywhere in the web tier
  CONTROL ✓ an INJECTED signing call is caught by the real detector
  CONTROL ✓ an INJECTED server function that signs is caught
  CONTROL ✓ PROSE naming another project's signing API is NOT a violation of ours
  CONTROL ✓ ⚠ and the SAME text IS still caught when it is real code, not prose
  CONTROL ✓ a QUOTED brace inside an interpolation does NOT unbalance the scan
  CONTROL ✓ ⚠ a signing call after a NESTED OBJECT LITERAL in an interpolation IS caught
  CONTROL ✓ ⚠ a signing call inside a TEMPLATE interpolation is still code, and IS caught
  CONTROL ✓ ⚠ a socket path in a literal is STILL caught — the ident pass did not replace the value pass

Part 4 — the tier holds NO secret and decrypts nothing
  ✓ no file under web/ reads a secret env var, decrypts, or spawns a process
  CONTROL ✓ a WRAPPED env read is caught — the expression spans lines
  CONTROL ✓ a BRACKET env read is caught — process.env["NAME"]
  CONTROL ✓ a DOTTED env read is caught — process.env.NAME
  CONTROL ✓ DECLARING the forbidden name in order to forbid it is NOT a violation
  CONTROL ✓ an INJECTED secret env read is caught by the real detector
  CONTROL ✓ an INJECTED decryption call is caught
  CONTROL ✓ an INJECTED subprocess spawn is caught
  CONTROL ✓ PROSE naming the secret in a doc string is NOT a violation

Part 5 — exactly one socket client in the whole tier
  ✓ exactly one file references the socket (found 1: web/api/signer-status.ts)
  CONTROL ✓ a SECOND socket client is caught by the real detector
  CONTROL ✓ a file with NO socket reference is not counted as a client
  CONTROL ✓ a `import net from "net"` + net.connect client IS counted
  CONTROL ✓ a second client using node:net/createConnection IS counted

Part 6 — the API binds to loopback, and nothing else
  ✓ every .listen( passes an explicit loopback hostname
  ✓ every `host:` under web/app is a loopback literal
  CONTROL ✓ a DUPLICATE hostname key is caught (the LAST one wins in JS)
  CONTROL ✓ a COMPUTED host key ["host"] is caught
  CONTROL ✓ a QUOTED host key is NOT a false-FAIL
  CONTROL ✓ a dynamic `await import("net")` client IS counted
  CONTROL ✓ a MULTI-LINE `from "net"` import IS counted
  CONTROL ✓ a TYPE-ONLY socket import is NOT counted as a client
  CONTROL ✓ a NON-LITERAL host: beside a legitimate loopback host IS caught
  CONTROL ✓ a bind whose ARGUMENTS CONTAIN PARENTHESES is not a false-FAIL
  CONTROL ✓ a 0.0.0.0 host STILL caught with the widened collector
  CONTROL ✓ a 0.0.0.0 dev-server host IS caught
  CONTROL ✓ a LAN dev-server host IS caught
  CONTROL ✓ the REAL dev-server form is NOT caught
  CONTROL ✓ a source set with NO host: key FAILS rather than passing vacuously
  CONTROL ✓ a BARE .listen(port) with no hostname IS caught
  CONTROL ✓ an explicit 0.0.0.0 bind IS caught
  CONTROL ✓ a non-loopback hostname literal IS caught
  CONTROL ✓ the REAL form is NOT caught
  CONTROL ✓ a source set with NO listen call FAILS rather than passing vacuously

Asserted-uncaught — the disclosure below fails if these ever start passing
  CONTROL ✓ ASSERTED UNCAUGHT: an indirect socket path assembled at runtime
  CONTROL ✓ a hostname computed at run time IS caught — part 6 fails closed
  CONTROL ✓ a hostname read from the environment IS caught
  CONTROL ✓ a LAN hostname ARGUMENT is caught even when a loopback CONSTANT is present
  CONTROL ✓ a Bun.serve( bind is seen, not only .listen(
  CONTROL ✓ ASSERTED UNCAUGHT: a socket reached through a dependency this gate does not read

  What this gate does NOT say:
    1. It is LEXICAL. A socket path assembled at runtime — string concatenation, an array join, a base64 blob — is invisible to it, and that shape is an asserted-uncaught control above.
    2. It reads THIS REPOSITORY'S sources only. A dependency under node_modules that opens a socket is not read, and could not be gated this way; the property there is that nothing in web/app has a reason to call one.
    3. The needle sets are NAMED. A signing helper spelled differently from every entry in SIGNING_NEEDLES is not counted, by name (E-142's narrowing, forced three times since).
    4. It checks SOURCE, not behaviour. It cannot prove that the one socket client sends only what it constructs, and it is not a substitute for reading that file.
    5. It says nothing about what the tier DISCLOSES. Whether a rendered sentence about privacy is true is `claims-check`'s question and the wording tests', not this gate's.
    6. Part 4 is about what the tier HOLDS; parts 1-3 are about what it can REACH. Those are different properties and the gate had only the second when an issuer key was added to the API process (E-212). A secret obtained some way this list does not name is still invisible.
    7. The signing pass BLANKS string literals, so a call assembled as a string and eval'd is invisible to it. That is the price of not treating prose about another project's API as a violation of ours, it is a deliberate trade, and the socket pass — where a literal IS the value — keeps literals for exactly the opposite reason (CLAIMS.md E-203, fourth consumer).
    8. It scans web/app and web/api ONLY. A signing helper, a socket client or a listener placed in any OTHER directory under web/ — a new web/bridge/, say — is not read at all, and the count in Part 5 is over the two directories it loads (REVIEW-036b).
    9. It does not check for MUTATING routes. A .post, .put or .delete that writes is invisible to every part; 'read-only' is checked as 'reaches no signing operation and holds no secret', which is not the same property (REVIEW-036b).
    10. Part 6's bind check is LEXICAL and FAILS CLOSED. It resolves a quoted literal, or ONE level of indirection to a constant declared in the same source set; anything else — an env read, a ternary, a concatenation, a call — is REFUSED rather than assumed loopback. ⚠ It reads `.listen(` and `Bun.serve(` by name: a listener started through some other API, or in a directory this gate does not load, is invisible (REVIEW-037 F2).
    11. ⚠ Part 6's resolver IGNORES LEXICAL SCOPE. A parameter or inner binding that SHADOWS an outer loopback constant resolves to the outer one, so `function start(HOST){ listen({hostname: HOST}) }` called with a routable address passes. Full scope analysis needs a parser; this is a named limit, not an oversight (REVIEW-037 spot-check, E-238).
    12. ⚠ Part 6 matches `.listen(` and `Bun.serve(` BY NAME. A parenthesised `(Bun.serve)(…)`, a bind through a framework helper, or an aliased reference is invisible. Chasing spellings is how a named set pretends to be a property; it is disclosed instead (E-238).
    13. ⚠ A socket reached through an ALIASED dynamic import — `const t = await import(x); t.connect(…)` with the specifier assembled at run time — is invisible. The import spellings are matched; the aliasing is not, and cannot be lexically (E-238).
    14. ⚠ Part 6 reads STRING LITERALS as values, so prose containing `host: "0.0.0.0"` inside a quoted string FALSE-FAILS. That is the unsafe direction chosen deliberately: a false-fail is loud and gets fixed, a false-pass is silent (CLAIMS.md E-203's two-consumer lesson).
    15. It says nothing about WHO MAY ASK. The tier serves every route unauthenticated on loopback, and loopback is not uid-scoped — so a datum this gate certifies as reachable-by-design is reachable by any local user. Egress is a third property beside REACH and HOLD, and no part of this gate looks at it (CLAIMS.md E-228, REVIEW-036c U1).

------------------------------------------------------------------------------
PASS: web/app reaches no socket, web/api builds Status and neither Pair nor
      Prepare, no signing operation exists in the tier, exactly one socket
      client exists, and the API binds to loopback only — under 54 controls,
      a count INCREMENTED BY THE
      HELPER THAT RUNS THEM (E-203), each running through the same detector the
      real checks call.
⚠ A lexical gate over a NAMED SET. See "What this gate does NOT say" above.

web/api/disclosure.test.ts:
613 |   const custody = CAPABILITY_MATRIX.find((r) => r.id === "custody-simulated")!;
614 |   test("the page names the inside-the-platform exception and the public-data scope", () => {
615 |     expect(view).toMatch(/outside the platform/);
616 |     expect(view).toMatch(/inside its own boundary/);
617 |     expect(view).toMatch(/issue #10/);
618 |     expect(view).toMatch(/holds only public data/);
                       ^
error: expect(received).toMatch(expected)

Expected substring or pattern: /holds only public data/
Received: "/** * The custody page, a simulation. * * ⚠ Rendered by the local tier's route and by the hosted build's route alike, * so the page has one body and the two cannot drift (`ADR-0004`; `CLAIMS.md` * E-141's shape is a second copy of one text). * * The capability matrix's custody row is not repeated here: the two findings * say the same thing, and the matrix page carries the row. */ import { Panel } from \"../components/Verdict\"; export function CustodyView({ sim }: { sim: { flows: any[] } }) { // A caveat that several flows share is printed once, numbered, and each flow points at it. const counts = new Map<string, number>(); for (const f of sim.flows) for (const c of f.caveats as string[]) counts.set(c, (counts.get(c) ?? 0) + 1); const notes = [...counts].filter(([, n]) => n > 1).map(([c]) => c); return ( <> <Panel title=\"This is a simulation\" tone=\"warn\"> <p className=\"text-sm leading-relaxed\"> No custody platform is integrated behind this page: no MPC, no HSM, no Harmonize. It models a key-source shape, a standalone ElGamal key plus an external signer, to show which flows survive and which break. </p> </Panel> <Panel title=\"Two findings\"> <div className=\"text-sm space-y-5\"> <div> <h3 className=\"font-semibold mb-1\">1. The derived key does not work with custodial key management</h3> <p className=\"opacity-85 leading-relaxed\"> The ElGamal secret is derived from the master seed, and a custody platform never releases the seed. So the account cannot derive its own ElGamal key or read its own confidential balance outside the platform. A platform that ran the derivation inside its own boundary would change that; it would need the derivation published as a standard, and it is not (issue #10). </p> <p className=\"opacity-85 leading-relaxed mt-2\"> A standalone ElGamal key gets around this, but then something outside the custody platform holds a permanent decryption key. Who that should be is an open question in this project (CLAIMS.md E-117). </p> </div> <div> <h3 className=\"font-semibold mb-1\">2. Approval policies cannot read a confidential amount</h3> <p className=\"opacity-85 leading-relaxed\"> An approval workflow sees a proof, not a value, so a rule like <em>&ldquo;two approvers above $1M&rdquo;</em> has nothing to check. This is structural, not an integration detail: confidentiality and amount-based approval policies pull against each other. The ways out each cost something: give the policy engine the ElGamal secret, and it becomes another party that reads every balance; accept the holder&rsquo;s statement of the amount, and the policy rests on the holder&rsquo;s honesty; or prove the bound in zero knowledge, which this project has neither built nor costed. </p> </div> </div> </Panel> <Panel title=\"Which flows survive, and which break\"> <p className=\"text-sm mb-2 opacity-80\"> Each flow lists what it needs, and the verdict is computed from what a custody-shaped key source has. </p> {notes.map((c, i) => ( <p key={c} className=\"text-sm mb-2 opacity-80\">Note {i + 1}: {c}</p> ))} <div className=\"mb-4\" /> <div className=\"space-y-3\"> {sim.flows.map((f: any) => ( // ⚠ A class, not a `style` attribute: the hosted build's Content // Security Policy blocks inline style attributes (ADR-0004). <div key={f.id} className={`border-l-2 pl-3 ${f.survives ? \"border-[var(--color-public)]\" : \"border-[var(--color-warn)]\"}`}> <div className=\"text-sm font-medium\"> {f.survives ? \"survives\" : \"breaks\"}: {f.label} {notes.map((c, i) => (f.caveats.includes(c) ? <span key={c} className=\"font-normal opacity-70\"> (note {i + 1})</span> : null))} </div> {f.blockedBy.map((b: any) => ( <p key={b.requirement} className=\"text-xs opacity-80 mt-1\">{b.because}</p> ))} {f.caveats.filter((c: string) => !notes.includes(c)).map((c: string) => ( <p key={c} className=\"text-xs opacity-70 mt-1\">{c}</p> ))} </div> ))} </div> </Panel> </> ); } "

      at <anonymous> ($USER_TMP/T/r059a3.a9gx52/repo/review-work-r3/custody-tree/web/api/disclosure.test.ts:618:18)
(fail) the custody findings keep their exceptions on every surface > the page names the inside-the-platform exception and the public-data scope [0.17ms]

 2 pass
 59 filtered out
 1 fail
 9 expect() calls
Ran 3 tests across 1 file. [42.00ms]
````

## no-verdict-secrets.log

````
check-no-secrets over every file under $USER_TMP/T/r059a3.a9gx52/repo/review-work-r3/no-verdict-scan/.vercel/output, with no git filter
controls: 111/111 passed, run through the same scanRepo() as the real check
known-value: NOT RUN (--no-local-store). An unlabelled ElGamal secret is invisible to this run. This is NOT the phase 1 gate.
scanned: 18 file(s) in the tree, 0 history object(s)
allowed (each rule, and how many hits it permitted):

What this gate does NOT catch (each is an asserted-uncaught control):
  - a secret split across two string literals or two lines
  - a secret in UTF-16, base64, gzip or any other re-encoding
  - an unlabelled 64-hex ElGamal secret that is NOT in the local store (no shape rule can tell it from a hash)
  - a seed or key in RFC 1751 words, or as a decimal or byte array
  - a home path under a user name on the generic list
  - a labelled scalar printed in fewer than 48 hex digits: a uniform key is that short with probability below 2^-64
  - a secret listed as an array element under a label, rather than as the value of a key
  - gitignored files, the reflog and unreachable objects: none of them is published
  - a hostname, a machine serial, or a person's name — only paths and email addresses are personal-data classes
check-no-secrets: verdict=PASS-SHAPES-ONLY exit=0
````

## probes.log

````
baseline []
baseline preflight public-main stub only []
control 1 a stray file {"hit":true,"got":[{"check":"inventory","detail":"static/notes.txt is not admitted by the provenance rule"}]}
control 2 a source map {"hit":true,"got":[{"check":"inventory","detail":"static/assets/app.js.map is not admitted by the provenance rule"},{"check":"no-source-maps","detail":"static/assets/app.js.map carries or references a source map"}]}
control 3 a sourceMappingURL comment {"hit":true,"got":[{"check":"no-source-maps","detail":"static/assets/LedgerReading-B_iOHKOV.js carries or references a source map"}]}
control 4 a missing page {"hit":true,"got":[{"check":"inventory","detail":"the page /issuer is missing"},{"check":"no-server-code","detail":"a route's dest \"/issuer/index.html\" is not a file in the output"},{"check":"csp","detail":"script-src admits 'sha256-xz+UR8b3vQhHuXIe478QcGtdX6AvnnFBJ51T65s55JY=', which no page carries"}]}
control 5 a serverless function {"hit":true,"got":[{"check":"inventory","detail":"functions/api.func/.vc-config.json is not admitted by the provenance rule"},{"check":"no-server-code","detail":"functions/api.func/.vc-config.json is a function"}]}
control 6 middleware in config.json {"hit":true,"got":[{"check":"no-server-code","detail":"a route has the key middlewarePath"},{"check":"csp","detail":"route 1 sets headers; only the first route may, because it is the only one any check reads"},{"check":"csp","detail":"the first route does not set a Content-Security-Policy on every path"}]}
control 7 a rewrite to another host {"hit":true,"got":[{"check":"no-server-code","detail":"a route's dest \"https://example.com/x\" is not a file in the output"},{"check":"urls","detail":"config.json names https://example.com/x"}]}
control 8 a top-level overrides key {"hit":true,"got":[{"check":"no-server-code","detail":"config.json has a top-level key overrides"}]}
control 9 the signer socket path in a script {"hit":true,"got":[{"check":"no-socket-secret-or-decryption","detail":"static/assets/LedgerReading-B_iOHKOV.js contains \"signer.sock\""}]}
control 10 a WebAssembly module {"hit":true,"got":[{"check":"no-socket-secret-or-decryption","detail":"static/assets/LedgerReading-B_iOHKOV.js contains \"WebAssembly\""}]}
control 11 a build variable inlined {"hit":true,"got":[{"check":"no-socket-secret-or-decryption","detail":"static/assets/LedgerReading-B_iOHKOV.js contains \"VITE_\""},{"check":"no-socket-secret-or-decryption","detail":"static/assets/LedgerReading-B_iOHKOV.js contains \"WCONF_\""}]}
control 12 a WebSocket {"hit":true,"got":[{"check":"no-other-connection","detail":"static/assets/LedgerReading-B_iOHKOV.js uses new WebSocket"}]}
control 13 a third-party URL {"hit":true,"got":[{"check":"urls","detail":"static/index.html names https://analytics.example.net/x"},{"check":"urls","detail":"static/index.html names https://analytics.example.net/x in an attribute"}]}
control 14 'unsafe-inline' in script-src {"hit":true,"got":[{"check":"csp","detail":"script-src admits 'unsafe-inline'"},{"check":"csp","detail":"script-src admits 'unsafe-inline', which no page carries"}]}
control 15 a widened connect-src {"hit":true,"got":[{"check":"csp","detail":"connect-src is [\"'self'\",\"https://s.devnet.rippletest.net:51234\"], not 'self'"}]}
control 16 an inline script the policy does not admit {"hit":true,"got":[{"check":"csp","detail":"an inline script's hash 'sha256-hUmDl3yY/7GaaX+Zuy8aEy8IzxgpBs7xccqYHs2/7kQ=' is not admitted, so the page would not run"}]}
control 17 no policy at all {"hit":true,"got":[{"check":"csp","detail":"the first route does not set a Content-Security-Policy on every path"}]}
control 18 a script carrying NUL, admitted by its RAW hash {"hit":true,"got":[{"check":"csp","detail":"an inline script's hash 'sha256-RVmozbUrU4087ihZqwQyCzDWVCQgpJBGqR5MItivL2U=' is not admitted, so the page would not run"},{"check":"csp","detail":"script-src admits 'sha256-T3X9OOcz/WLwa1u2rMZuG8aCwaym4pgdmQykR6umnBc=', which no page carries"}]}
control 19 an inline style attribute {"hit":true,"got":[{"check":"csp","detail":"static/index.html carries inline style, which style-src 'self' refuses"}]}
control 20 an input asking for a seed {"hit":true,"got":[{"check":"no-inputs","detail":"static/index.html renders a form control"}]}
control 21 the D-H2 wording removed from the observer page {"hit":true,"got":[{"check":"ledger-wording","detail":"static/observer/index.html renders a ledger value without the D-H2 sentence beginning \"Vercel, which hosts this page, sees your\""}]}
control 22 the network check changed {"hit":true,"got":[{"check":"ledger-wording","detail":"static/issuer/index.html renders a ledger value without the Devnet network check"}]}
control 23 an account panel dropped {"hit":true,"got":[{"check":"accounts","detail":"static/observer/index.html renders 3 account panels, not 4"}]}
control 24 another commit on one page {"hit":true,"got":[{"check":"commit-and-verdict","detail":"static/wallet/index.html does not name commit 3934ae1c4503d2454ab70db7e36fe3046633fd01"}]}
control 25 a cryptography package bundled, with its real notice {"hit":true,"got":[{"check":"licences","detail":"the bundle contains @noble/curves, which is not admitted"}]}
control 26 seroval's whole entry removed {"hit":true,"got":[{"check":"licences","detail":"seroval is admitted and not listed, so a bundled package may be shipped without its notice"}]}
control 27 text before the first notice changed {"hit":true,"got":[{"check":"licences","detail":"the text before the first notice is not the build's fixed header"}]}
control 28 text after the last notice {"hit":true,"got":[{"check":"licences","detail":"the file has text after its last notice"}]}
control 29 a duplicate connect-src placed first {"hit":true,"got":[{"check":"csp","detail":"the directive connect-src appears twice; a browser enforces the first"}]}
control 30 a later catch-all route replacing the policy {"hit":true,"got":[{"check":"csp","detail":"route 1 sets headers; only the first route may, because it is the only one any check reads"}]}
control 31 a path route replacing the policy for /issuer {"hit":true,"got":[{"check":"csp","detail":"route 1 sets headers; only the first route may, because it is the only one any check reads"}]}
control 32 Permissions-Policy removed {"hit":true,"got":[{"check":"csp","detail":"Permissions-Policy is not camera=(), microphone=(), geolocation=(), interest-cohort=()"}]}
control 33 an extra header on the first route {"hit":true,"got":[{"check":"csp","detail":"the first route sets Access-Control-Allow-Origin, which is not one of the expected headers"}]}
control 34 the policy's name repeated in lower case {"hit":true,"got":[{"check":"csp","detail":"the first route sets content-security-policy, which is not one of the expected headers"},{"check":"csp","detail":"the first route sets one header name twice in different case"}]}
control 35 a scheme-relative script {"hit":true,"got":[{"check":"urls","detail":"static/index.html names the scheme-relative //cdn.example.net/a.js"}]}
control 36 the ledger marker and the wording removed together {"hit":true,"got":[{"check":"ledger-wording","detail":"static/observer/index.html is a ledger page and marks no ledger value"},{"check":"ledger-wording","detail":"static/observer/index.html renders a ledger value without the D-H2 sentence beginning \"Vercel, which hosts this page, sees your\""}]}
control 37 a ciphertext on a page that is not a ledger page {"hit":true,"got":[{"check":"ledger-wording","detail":"static/wallet/index.html carries a ciphertext and is not one of the named ledger pages"}]}
control 38 a demo address on the overview {"hit":true,"got":[{"check":"ledger-wording","detail":"static/index.html names an address, rHeah37pL6aFPf59nzWGwujPzSFkp4TUL8, and is not one of the named ledger pages"}]}
control 39 B1-8's own example on the wallet page {"hit":true,"got":[{"check":"ledger-wording","detail":"static/wallet/index.html names an address, rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh, and is not one of the named ledger pages"}]}
control 40 an issuance ID on the capabilities page {"hit":true,"got":[{"check":"ledger-wording","detail":"static/capabilities/index.html names an issuance ID, 007A7A7A7A7A7A7A7A7A7A7A7A7A7A7A7A7A7A7A7A7A7A7A, and is not one of the named ledger pages"}]}
control 41 a decrypted issuer balance on the issuer page {"hit":true,"got":[{"check":"no-issuer-figure","detail":"static/issuer/index.html shows a labelled figure: \"Decrypted issuer balance: 4\""}]}
control 42 a plaintext figure on the overview {"hit":true,"got":[{"check":"no-issuer-figure","detail":"static/index.html shows a labelled figure: \"plaintext balance: 7\""}]}
control 43 a figure labelled after its value {"hit":true,"got":[{"check":"no-issuer-figure","detail":"static/custody/index.html shows a labelled figure: \"balance (decrypted): 1\""}]}
control 44 an entity-encoded scheme-relative script {"hit":true,"got":[{"check":"urls","detail":"static/index.html names the scheme-relative //analytics.example.net/a.js"}]}
control 45 an external second srcset candidate {"hit":true,"got":[{"check":"urls","detail":"static/index.html names the scheme-relative //cdn.example.net/b.png"}]}
control 46 an entity-encoded absolute address {"hit":true,"got":[{"check":"urls","detail":"static/index.html names https://tracker.example.net/x in an attribute"}]}
control 47 the commit's link text changed {"hit":true,"got":[{"check":"commit-and-verdict","detail":"static/custody/index.html does not show commit 3934ae1c4503 as its link text"}]}
control 48 the licence file removed {"hit":true,"got":[{"check":"licences","detail":"static/third-party-licenses.txt is missing"}]}
control 49 a licence notice altered {"hit":true,"got":[{"check":"licences","detail":"@tanstack/history's notice is not its own licence file with only email addresses removed"}]}
control 50 a personal email restored to a notice {"hit":true,"got":[{"check":"licences","detail":"seroval-plugins's notice is not its own licence file with only email addresses removed"}]}
detector controls "50/50"
b18-original [{"check":"ledger-wording","detail":"static/wallet/index.html names an address, rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh, and is not one of the named ledger pages"}]
b18-next [{"check":"ledger-wording","detail":"static/index.html names an issuance ID, 004625C9F2DDC3E652071A9FFA07507F2151FEE332CB25E8, and is not one of the named ledger pages"}]
account-entity []
account-entity preflight []
account-markup []
issuance-entity []
issuance-entity preflight []
issuer-figure [{"check":"no-issuer-figure","detail":"static/issuer/index.html shows a labelled figure: \"Decrypted issuer balance: 4\""}]
issuer-figure-next [{"check":"no-issuer-figure","detail":"static/observer/index.html shows a labelled figure: \"plaintext balance: 7\""}]
issuer-label-after-value []
issuer-label-after-value preflight []
issuer-negative []
issuer-negative preflight []
issuer-is []
issuer-is preflight []
issuer-cleartext []
issuer-cleartext preflight []
issuer-table []
issuer-table preflight []
issuer-negated-example [{"check":"no-issuer-figure","detail":"static/index.html shows a labelled figure: \"decrypted issuer balance: 4\""}]
scheme-original [{"check":"urls","detail":"static/index.html names the scheme-relative //analytics.example.net/a.js"}]
scheme-next [{"check":"urls","detail":"static/index.html names the scheme-relative //analytics.example.net/a.css"}]
scheme-entity [{"check":"urls","detail":"static/index.html names the scheme-relative //analytics.example.net/a.js"}]
scheme-srcset [{"check":"urls","detail":"static/index.html names the scheme-relative //analytics.example.net/a.png"}]
scheme-named []
scheme-no-semi []
scheme-tab []
scheme-backslash []
scheme-uppercase-hex [{"check":"urls","detail":"static/index.html names the scheme-relative //analytics.example.net/a"}]
entity-invalid THREW "RangeError: Arguments contain a value that is out of range of code points"
scheme-double-decode-correct [{"check":"urls","detail":"static/index.html names the scheme-relative //analytics.example.net/a"}]
benign-template-url [{"check":"urls","detail":"static/index.html names the scheme-relative //example.net"}]
readtime-malformed schema ["the manifest's read time \"2\" is not a timestamp"]
readtime-malformed preflight ["the manifest's read time \"2\" is not a timestamp","static/capabilities/index.html does not state the manifest's provenance: \"Ledger values were read at validated ledger 6285074 on 2.\"","static/custody/index.html does not state the manifest's provenance: \"Ledger values were read at validated ledger 6285074 on 2.\"","static/index.html does not state the manifest's provenance: \"Ledger values were read at validated ledger 6285074 on 2.\"","static/issuer/index.html does not state the manifest's provenance: \"Ledger values were read at validated ledger 6285074 on 2.\"","static/observer/index.html does not state the manifest's provenance: \"Ledger values were read at validated ledger 6285074 on 2.\"","static/wallet/index.html does not state the manifest's provenance: \"Ledger values were read at validated ledger 6285074 on 2.\""]
endpoint-mismatch schema ["the manifest's endpoint \"https://s.altnet.rippletest.net:51234\" is not https://s.devnet.rippletest.net:51234"]
endpoint-mismatch preflight ["the manifest's endpoint \"https://s.altnet.rippletest.net:51234\" is not https://s.devnet.rippletest.net:51234"]
missing-image schema ["the manifest's image null is not a build image tag"]
missing-image preflight ["the manifest's image null is not a build image tag"]
missing-isolation schema []
missing-isolation preflight []
missing-environment schema []
missing-environment preflight []
impossible-builtAt schema []
impossible-builtAt preflight []
impossible-readAt schema []
impossible-readAt preflight []
canonical-port schema ["the manifest's canonical address \"https://xrpl-confidential-positions.vercel.app:443\" is not an https origin"]
canonical-port preflight ["the manifest's canonical address \"https://xrpl-confidential-positions.vercel.app:443\" is not an https origin","static/capabilities/index.html does not name the manifest's address \"https://xrpl-confidential-positions.vercel.app:443\"","static/custody/index.html does not name the manifest's address \"https://xrpl-confidential-positions.vercel.app:443\"","static/index.html does not name the manifest's address \"https://xrpl-confidential-positions.vercel.app:443\"","static/issuer/index.html does not name the manifest's address \"https://xrpl-confidential-positions.vercel.app:443\"","static/observer/index.html does not name the manifest's address \"https://xrpl-confidential-positions.vercel.app:443\"","static/wallet/index.html does not name the manifest's address \"https://xrpl-confidential-positions.vercel.app:443\""]
wrong-footer gate []
wrong-footer preflight []
comment-endpoint gate []
comment-endpoint preflight []
equivalent-inline-provenance gate []
equivalent-inline-provenance preflight ["static/capabilities/index.html does not state the manifest's provenance: \"Ledger values were read at validated ledger 6285074 on 2026-10-21T01:32:23.419Z.\"","static/custody/index.html does not state the manifest's provenance: \"Ledger values were read at validated ledger 6285074 on 2026-10-21T01:32:23.419Z.\"","static/index.html does not state the manifest's provenance: \"Ledger values were read at validated ledger 6285074 on 2026-10-21T01:32:23.419Z.\"","static/issuer/index.html does not state the manifest's provenance: \"Ledger values were read at validated ledger 6285074 on 2026-10-21T01:32:23.419Z.\"","static/observer/index.html does not state the manifest's provenance: \"Ledger values were read at validated ledger 6285074 on 2026-10-21T01:32:23.419Z.\"","static/wallet/index.html does not state the manifest's provenance: \"Ledger values were read at validated ledger 6285074 on 2026-10-21T01:32:23.419Z.\""]
````

## release-probes.log

````
{"type":"text/html; note=\";charset=utf-8\"; charset=utf-16le","effectiveCharset":"utf-16le","result":[]}
{"type":"text/html; charset=utf-16le","effectiveCharset":"utf-16le","result":{"count":17,"first":"/capabilities/index.html: served with charset \"utf-16le\", and every file is UTF-8"}}
{"type":"text/html; charset =utf-16le","effectiveCharset":null,"result":[]}
{"type":"text/html; charset= utf-16le","effectiveCharset":" utf-16le","result":{"count":17,"first":"/capabilities/index.html: served with charset \" utf-16le\", and every file is UTF-8"}}
{"type":"text/html; charset=\"utf-16le\"","effectiveCharset":"utf-16le","result":{"count":17,"first":"/capabilities/index.html: served with charset \"utf-16le\", and every file is UTF-8"}}
{"type":"text/html; charset=utf8","effectiveCharset":"utf8","result":{"count":17,"first":"/capabilities/index.html: served with charset \"utf8\", and every file is UTF-8"}}
{"type":"text/html; charset=unicode-1-1-utf-8","effectiveCharset":"unicode-1-1-utf-8","result":{"count":17,"first":"/capabilities/index.html: served with charset \"unicode-1-1-utf-8\", and every file is UTF-8"}}
{"type":"text/html; charset=\"UTF-8\"","effectiveCharset":"UTF-8","result":[]}
{"type":"text/html; charset=","effectiveCharset":null,"result":{"count":17,"first":"/capabilities/index.html: served with charset \"\", and every file is UTF-8"}}
{"type":"text/html; charset=\"utf-8;anything\"; charset=utf-16le","effectiveCharset":"utf-8;anything","result":[]}
aliases [{"label":"utf8","encoding":"utf-8"},{"label":"unicode-1-1-utf-8","encoding":"utf-8"}]
````

## text-sweep.log

````
R2-10 corpus negative | CLAIMS.md:266 | one of these transactions is wrong at that layer. ⚠⚠ ~~AND THE CODEC VERSION IS NOT KNOWABLE FROM ANY PUBLISHED SOURCE:~~ NONE OF THE THREE PAGE-SIDE PACKAGES NAMES THE CODEC VERSION (scoped 2026-10-20, E-346: the search below is npm view on those packages, not every source a vendor publishes): np
R2-10 corpus negative | CLAIMS.md:266 | sation happens inside the closed extension bundle, or in Xaman's backend, and ~~no wallet publishes that version~~ none of the three packages names it (E-346). ⚠ Xaman's docs additionally say it "can add missing fields (signer account, fee, sequence)", which implies it PARSES even on the txb
R2-12 record | CLAIMS.md:404 | /round-one-codex-output.md, R1-5, R1-7, R1-8 and R1-12, read against 6b537e3. ~~Each completion has a test that fails against e45321b~~ Three of the four completions have a test that fails against e45321b, and the custody one had none until E-346 (REVIEW-059 R2-12): the issuance is read zero time
R2-2 impossibility | CLAIMS.md:406 | tside the two ledger pages, with B1-8's own address as a control, and refuses a figure labelled as decrypted or plaintext on any page, label before or after. It decodes numeric entities and reads every srcset candidate before its URL checks. The browser check inspects the second load of the overview,
R2-1 limits | CLAIMS.md:403 | but the first, a missing or extra security header, a scheme-relative address, ~~a ledger value on a page outside the two named ledger pages~~ a marked value, a ciphertext or a demo address on a page outside the two named ledger pages (narrowed by E-346: an address that was not a demo account
R2-1 limits | CLAIMS.md:406 |  public commit or deployed, and a third round is the owner's decision. The gate refuses any address-shaped string or issuance ID outside the two ledger pages, with B1-8's own address as a control, and refuses a figure labelled as decrypted or plaintext on any page, label before or afte
R1-13 wallet updates | CLAIMS.md:266 | erial. A demonstration built on reason 4 would be falsified by a wallet update; one built on reasons 1–3 cannot be. ⚠ This is CLAUDE.md's own P-12 shape — an assertion about what a corpus does not contain, carried as a premise without the search that would settle it | Reason 4 is WITHDRAWN as 
R2-10 custody derive | docs/explainer/WEB-TIER-DEMO-SCRIPT-2026-08-28.md:183 | e says so. ### Screen 6 — Custody. Where it lands commercially. Two findings: a custodied account cannot derive its own viewing key outside the platform, unless the platform runs the derivation inside its own boundary, which needs the derivation published (issue #10, REVIEW-059 R1-12); and a policy engine 
R2-10 custody policy | docs/explainer/WEB-TIER-DEMO-SCRIPT-2026-08-28.md:191 | neralisation is the useful sentence: for an engine that holds only public data, every policy over an identity, a time or a count survives; every policy over a value does not. Then the flow table — which flows survive, which break, computed rather than written. And F-24: retiring a positio
R2-10 custody policy | docs/explainer/WEB-TIER-DEMO-SCRIPT-2026-08-28.md:192 | ds only public data, every policy over an identity, a time or a count survives; every policy over a value does not. Then the flow table — which flows survive, which break, computed rather than written. And F-24: retiring a position in tranches publishes every tranche size, because the
R2-11 header | tools/check-web-hosted.ts:4 |  over the UPLOADED OUTPUT and its routing configuration, never over the source (ADR-0004, "What phase 2 step 4's gate must check"). bun run tools/check-web-readonly.ts --hosted <output root> --commit <sha> <output root> holds .vercel/output/. On a pass it writes .vercel/output/static/gate-
R2-2 impossibility | tools/check-web-hosted.ts:150 | r[1-9A-HJ-NP-Za-km-z]{24,34}\b/; const ISSUANCE_ID = /\b[0-9A-Fa-f]{48}\b/; / A figure labelled as decrypted or plaintext: D-H3 was ruled A, no issuer figure, and no page decrypts anything. ⚠ REVIEW-059c answered R1-2's request for an output regression with a disclaimer; round two ran "Decrypted issu
R2-2 impossibility | tools/check-web-hosted.ts:507 | ked value; a figure written as prose is not.", "9. NO ISSUER FIGURE (D-H3): the build container holds no key, so no figure can be computed. This gate refuses a figure labelled as decrypted or plaintext on any page; an unlabelled number is prose, and code that runs during the build could 
R2-2 impossibility | tools/check-web-hosted.ts:507 | build container holds no key, so no figure can be computed. This gate refuses a figure labelled as decrypted or plaintext on any page; an unlabelled number is prose, and code that runs during the build could write one (item 3).", ]; } // ---------------------------------------------------------------
R2-1 limits | tools/check-web-hosted.ts:506 | uild reported, and the gate requires that list to equal the admitted set.", "8. A ledger value on a page outside /observer and /issuer is found only if it is a ciphertext, an address, an issuance ID or a marked value; a figure written as prose is not.", "9. NO ISSUER FIGURE (D-H3): the build
R2-10 custody derive | docs/research/CUSTODY-2026-08-28.md:30 | er to release seed material. Releasing it would defeat the custody. Therefore a custodied account cannot derive its own viewing key. It cannot read its own confidential balance, which is not a limitation of any integration — it follows from step 2 alone. ⚠ The escape hatch exists and it moves the problem r
R2-10 custody policy | docs/research/CUSTODY-2026-08-28.md:40 | dard, which is issue #10, open, and no code discharges it. --- ## Finding 2 — a policy engine cannot enforce an amount limit on a confidential amount ⚠⚠ This is the capital-markets crux, and it is structural rather than an integration detail. Custodial approval workflows are written over
R2-10 custody policy | docs/research/CUSTODY-2026-08-28.md:60 | if the account is frozen" | evaluable | ledger state is public | ⚠ The pattern: every policy over an IDENTITY, a TIME or a COUNT survives; every policy over a VALUE does not. That is P-4 and P-11 restated as a custody constraint — this system hides amounts and hides nothing else — and it 
R2-10 custody policy | docs/research/CUSTODY-2026-08-28.md:60 | lic | ⚠ The pattern: every policy over an IDENTITY, a TIME or a COUNT survives; every policy over a VALUE does not. That is P-4 and P-11 restated as a custody constraint — this system hides amounts and hides nothing else — and it is the single most useful sentence in this document for
R2-10 corpus negative | docs/decisions/ADR-0003-web-tier-trust-boundary.md:74 | f the three page-side packages names the codec version (scoped 2026-10-20 from "not knowable from any published source", which the search below does not support; REVIEW-059 R2-10): npm view, 2026-08-28, shows @crossmarkio/sdk@0.4.0 depending on events and @crossmarkio/typings only, with @gemwallet
R2-10 custody derive | docs/decisions/ADR-0003-web-tier-trust-boundary.md:264 | rred: 1. ⚠ The two findings are structural and a stub cannot strengthen them. A custodied account cannot derive its own viewing key outside the custody platform, because derivation needs the seed; a policy engine holding only public data cannot read an amount that is a proof (both scoped 2026-10-20, REVIEW
R1-13 wallet updates | docs/decisions/ADR-0003-web-tier-trust-boundary.md:76 | hat an upstream release can close at any time; reasons 1–3 are structural and ~~cannot be closed by any wallet update~~ cannot be closed by a codec release. ⚠ The struck words overclaimed and were corrected on 2026-10-19 (CLAIMS.md E-328): a wallet that held the viewing key and produced the proof
S-6 header | docs/architecture/ARCHITECTURE-2026-08-18.md:5 | ot yet deployed, and round two reviews them. ⚠ The revision 11 line below said "Step 9 is not built" until this line was added, which was true of the ruling and false of the header a reader meets first (REVIEW-059 S-6). - Revision 11 on 2026-10-20: §6 step 9 is RULED. The projec
S-6 header | docs/architecture/ARCHITECTURE-2026-08-18.md:6 | nd a prebuilt CLI deploy. ADR-0004 is Accepted at revision 5 (CLAIMS.md E-331). Step 9 is not built. - Revision 10 on 2026-10-19, amended the same day after REVIEW-058 round one (step 9's shape moved from browser reads to prerendered pages, and its falsifier grew; CLAIMS.md E-32
R2-10 custody policy | web/api/custody-sim.ts:68 | .md P-4, P-11). Every policy over an " + "identity, a time or a count survives; every policy over a value does not.", }, "seed-material": { available: false, because: "Structural in this simulation: a custody platform never releases seed material, so the account " + "cannot derive its
R1-13 wallet updates | tools/check-disclosure-phrases.ts:94 | 28", "~~", "STRUCK", "RETRACTED"], }, { phrase: "reasons 1–3 are structural and cannot be closed by any wallet update", why: "A wallet that held the viewing key and produced the proofs itself would close all three reasons; E-328.", markers: ["E-328", "~~", "STRUCK", "RETRACTED"], }, // ⚠⚠ THE EMP
R1-13 wallet updates | tools/check-disclosure-phrases.ts:413 | caught", !scan({ name: "<injected>", text: "The protocol-mandated issuer mirror cannot be closed by any wallet update or any release.\n", }).some((h) => h.file === "<injected>"), ); // ⚠ R3-4 (E-330): the control above lacked each pattern's full predicate, so // it could not protect a pattern tha
R1-13 wallet updates | tools/check-disclosure-phrases.ts:422 | OTHER subject, is NOT caught", ![ "The two mandatory mirrors are structural and cannot be closed by any wallet update.\n", "The issuer's two powers above cannot be closed by any release.\n", "For a wallet that held the key, no wallet update can close them would be false.\n", ].some((t) => scan({ 
R1-14 balance note | review-input/deployed/.vercel/output/static/issuer/index.html:1 | ="">rHeah37pL6aFPf59nzWGwujPzSFkp4TUL8</code><p class="text-xs opacity-75 mt-1">Its spending balance is not the canonical zero, so its value is hidden; its inbox is publicly known to be exactly zero.</p><p class="text-xs opacity-60 mt-1">read at validated ledger <!-- -->6263910</p></div><div class="text-s
R1-14 balance note | review-input/deployed/.vercel/output/static/issuer/index.html:1 | 5 mt-1">Its spending balance is not the canonical zero, so its value is hidden; its inbox is publicly known to be exactly zero.</p><p class="text-xs opacity-60 mt-1">read at validated ledger <!-- -->6263910</p></div><div class="text-sm space-y-2"><div><span class="opacity-60">IssuerEncryptedBalance</span>
R2-10 custody derive | review-input/deployed/.vercel/output/static/assets/custody-hkJYX5SB.js:1 | ived from the master seed, and a custody platform never releases the seed. So a custodied account cannot derive its own ElGamal key or read its own confidential balance.}),(0,r.jsx)(p,{className:opacity-85 leading-relaxed mt-2,children:A standalone ElGamal key gets around this, but then something outside t
R2-10 corpus negative | review-input/deployed/.vercel/output/static/assets/index-CKAZ0d8y.js:12 | e page-side SDKs carry no codec, so serialisation happens inside the extension, whose version no vendor publishes. This is not why a wallet cannot hold a confidential position: the reasons above are structural, and this one could change with any release.}},custody:{simulation:!0,disclaimer:SI
R2-10 custody derive | review-input/deployed/.vercel/output/static/assets/index-CKAZ0d8y.js:12 |  a standalone ElGamal key, held by something other than the custody platform. A custodied account cannot derive its own key, because that needs the seed, and a custody platform never releases the seed.,citation:REVIEW-012; CLAIMS.md E-117},proveAndSign:{verdict:conditional,detail:The external signer ca
R2-10 custody derive | review-input/deployed/.vercel/output/static/assets/index-CKAZ0d8y.js:12 | erial,because:Structural: a custody platform never releases seed material, so a custodied account cannot derive its own ElGamal key.}],caveats:[]},{id:onboard-standalone,label:Onboard with a standalone ElGamal key,survives:!0,blockedBy:[],caveats:[Only with a standalone ElGamal key, held outside the custod
R1-14 balance note | review-input/deployed/.vercel/output/static/assets/index-CKAZ0d8y.js:12 | ess:rHeah37pL6aFPf59nzWGwujPzSFkp4TUL8,label:Holder A — an active position,note:Its spending balance is not the canonical zero, so its value is hidden; its inbox is publicly known to be exactly zero.,state:present,observer:{account:rHeah37pL6aFPf59nzWGwujPzSFkp4TUL8,issuanceId:004625C9F2DDC3E652071A9FFA07
R1-14 balance note | review-input/deployed/.vercel/output/static/assets/index-CKAZ0d8y.js:12 | on,note:Its spending balance is not the canonical zero, so its value is hidden; its inbox is publicly known to be exactly zero.,state:present,observer:{account:rHeah37pL6aFPf59nzWGwujPzSFkp4TUL8,issuanceId:004625C9F2DDC3E652071A9FFA07507F2151FEE332CB25E8,publicAmount:750,registered:!0,holderEncryptionKey:
R2-10 custody derive | web/app/src/views/CustodyView.tsx:34 | erived from the master seed, and a custody platform never releases the seed. So the account cannot derive its own ElGamal key or read its own confidential balance outside the platform. A platform that ran the derivation inside its own boundary would change that; it would need the derivation published
R2-10 custody derive | review-input/deployed/.vercel/output/static/custody/index.html:1 | ived from the master seed, and a custody platform never releases the seed. So a custodied account cannot derive its own ElGamal key or read its own confidential balance.</p><p class="opacity-85 leading-relaxed mt-2">A standalone ElGamal key gets around this, but then something outside the custody platform 
R2-10 custody derive | review-input/deployed/.vercel/output/static/custody/index.html:1 | city-80 mt-1">Structural: a custody platform never releases seed material, so a custodied account cannot derive its own ElGamal key.</p></div><div class="border-l-2 pl-3 border-[var(--color-public)]"><div class="text-sm font-medium">survives<!-- -->: <!-- -->Onboard with a standalone ElGamal key<span class
R2-10 corpus negative | review-input/deployed/.vercel/output/static/wallet/index.html:1 | e page-side SDKs carry no codec, so serialisation happens inside the extension, whose version no vendor publishes. This is not why a wallet cannot hold a confidential position: the reasons above are structural, and this one could change with any release.</p><p class="text-xs opacity-60 mt-3">
R2-11 header | review-input/deployed/.vercel/output/static/gate-verdict.json:31 | ces it.", "2. The SERVED bytes and headers. It checks the output before upload; step 5 compares the deployed site with gate-verdict.json, and that comparison detects a change at the moment it runs, nothing later.", "3. The BUILD MACHINE. An inventory of the output cannot sho
R1-14 balance note | review-input/deployed/.vercel/output/static/observer/index.html:1 | ="">rHeah37pL6aFPf59nzWGwujPzSFkp4TUL8</code><p class="text-xs opacity-75 mt-1">Its spending balance is not the canonical zero, so its value is hidden; its inbox is publicly known to be exactly zero.</p><p class="text-xs opacity-60 mt-1">read at validated ledger <!-- -->6263910</p></div><section class="bo
R1-14 balance note | review-input/deployed/.vercel/output/static/observer/index.html:1 | 5 mt-1">Its spending balance is not the canonical zero, so its value is hidden; its inbox is publicly known to be exactly zero.</p><p class="text-xs opacity-60 mt-1">read at validated ledger <!-- -->6263910</p></div><section class="border border-black/10 dark:border-white/15 rounded-lg p-5 mb-6"><h2 class
R2-10 custody derive | review-input/rebuilt/.vercel/output/static/assets/custody-CYXzYfpJ.js:1 | erived from the master seed, and a custody platform never releases the seed. So the account cannot derive its own ElGamal key or read its own confidential balance outside the platform. A platform that ran the derivation inside its own boundary would change that; it would need the derivation published
R2-10 custody derive | review-input/rebuilt/.vercel/output/static/assets/index-D0xPT2qF.js:12 | uctural in this simulation: a custody platform never releases seed material, so the account cannot derive its own ElGamal key outside the platform. A platform that ran the derivation inside its own boundary would change this, and that needs the derivation published (issue #10).}],caveats:[]},{id:onbo
R2-11 header | web/app/src/hosted/LedgerReading.tsx:6 |  from the built HTML: the D-H2 wording, the network check and the ledger index (ADR-0004, "What phase 2 step 4's gate must check"). The data- attributes are what the gate reads. / import { Panel } from "../components/Verdict"; import { SNAPSHOT } from "./data"; import { DH2_WORDING } from 
R2-10 custody derive | review-input/deployed/.vercel/output/static/capabilities/index.html:1 |  a standalone ElGamal key, held by something other than the custody platform. A custodied account cannot derive its own key, because that needs the seed, and a custody platform never releases the seed.</div><div class="text-[10px] opacity-45 mt-1">REVIEW-012; CLAIMS.md E-117</div></td><td class="py-3 p
R2-2 impossibility | review-input/rebuilt/.vercel/output/static/gate-verdict.json:38 | ked value; a figure written as prose is not.", "9. NO ISSUER FIGURE (D-H3): the build container holds no key, so no figure can be computed. This gate refuses a figure labelled as decrypted or plaintext on any page; an unlabelled number is prose, and code that runs during the build could 
R2-2 impossibility | review-input/rebuilt/.vercel/output/static/gate-verdict.json:38 | build container holds no key, so no figure can be computed. This gate refuses a figure labelled as decrypted or plaintext on any page; an unlabelled number is prose, and code that runs during the build could write one (item 3)." ] } 
R2-1 limits | review-input/rebuilt/.vercel/output/static/gate-verdict.json:37 | uild reported, and the gate requires that list to equal the admitted set.", "8. A ledger value on a page outside /observer and /issuer is found only if it is a ciphertext, an address, an issuance ID or a marked value; a figure written as prose is not.", "9. NO ISSUER FIGURE (D-H3): the build
R2-10 custody derive | review-input/rebuilt/.vercel/output/static/custody/index.html:1 | erived from the master seed, and a custody platform never releases the seed. So the account cannot derive its own ElGamal key or read its own confidential balance outside the platform. A platform that ran the derivation inside its own boundary would change that; it would need the derivation published
R2-10 custody derive | review-input/rebuilt/.vercel/output/static/custody/index.html:1 | uctural in this simulation: a custody platform never releases seed material, so the account cannot derive its own ElGamal key outside the platform. A platform that ran the derivation inside its own boundary would change this, and that needs the derivation published (issue #10).</p></div><div class="b
463 files opened; 52 hits
````

## changed-files-audit.txt

````
CLAIMS.md	528 lines	653441 chars
docs/CLAIMS-INDEX.md	463 lines	68574 chars
docs/CLAIMS-REVISIONS.md	234 lines	23260 chars
docs/claims/by-topic/README.md	43 lines	3691 chars
docs/claims/by-topic/claims-and-drift.md	113 lines	18542 chars
docs/claims/by-topic/confidentiality-limits.md	55 lines	7212 chars
docs/claims/by-topic/decisions-and-scope.md	111 lines	18298 chars
docs/claims/by-topic/devnet-execution.md	74 lines	10548 chars
docs/claims/by-topic/environment-and-tooling.md	38 lines	4045 chars
docs/claims/by-topic/instruments-and-gates.md	113 lines	18352 chars
docs/claims/by-topic/protocol-and-crypto.md	180 lines	28927 chars
docs/claims/by-topic/review-rounds.md	109 lines	17883 chars
docs/claims/by-topic/secret-handling.md	71 lines	10424 chars
docs/claims/by-topic/upstream-and-filings.md	87 lines	13022 chars
docs/claims/by-topic/web-tier.md	38 lines	4378 chars
docs/decisions/ADR-0003-web-tier-trust-boundary.md	356 lines	40864 chars
docs/explainer/WEB-TIER-DEMO-SCRIPT-2026-08-28.md	229 lines	11925 chars
docs/explainer/WEB-TIER-LIMITATIONS-2026-08-28.md	69 lines	5082 chars
tools/build-claims-topics.ts	502 lines	27395 chars
tools/check-web-hosted.ts	565 lines	40145 chars
web/api/capability.ts	229 lines	11093 chars
web/api/disclosure.test.ts	632 lines	31009 chars
web/app/vite.hosted.config.ts	109 lines	5205 chars
web/hosted/README.md	56 lines	7338 chars
web/hosted/browser-check.ts	316 lines	19920 chars
web/hosted/compare-deployed.ts	94 lines	5625 chars
web/hosted/deploy-preflight.ts	125 lines	8650 chars
web/hosted/deploy.test.ts	181 lines	11418 chars
````

