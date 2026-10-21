# Round two, leg A's review scripts and logs, copied from its workspace after it returned

## browser-cases.ts

````
import {cpSync,readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {runChecks,readOutput,verdictFile} from '../tools/check-web-hosted.ts';
import {preflight} from '../web/hosted/deploy-preflight.ts';
const root=resolve('review-input/rebuilt'),m=JSON.parse(readFileSync(join(root,'build-manifest.json'),'utf8'));
const d=resolve('review-work-r2/browser-second-home');cpSync(root,d,{recursive:true});const p=join(d,'.vercel/output/static/assets',readdirSync(join(d,'.vercel/output/static/assets')).find(x=>/^Verdict-.*\.js$/.test(x))!);
const code=`\nif(location.pathname==='/'){const n=Number(sessionStorage.getItem('r2-home')||0);sessionStorage.setItem('r2-home',String(n+1));if(n===1)console.error('R2_SECOND_HOME');}\n`;
writeFileSync(p,readFileSync(p,'utf8')+code);const files=readOutput(d);writeFileSync(join(d,'.vercel/output/static/gate-verdict.json'),JSON.stringify(verdictFile(files,{commit:m.commit},44)));console.log('second-home',JSON.stringify({gate:runChecks(files,{commit:m.commit}),preflight:preflight(d,()=>true)}));
````

## controls-probes.ts

````
import { cpSync,readFileSync,writeFileSync,rmSync } from 'node:fs';
import { resolve,join } from 'node:path';
import { CONTROLS,readOutput,runChecks } from '../tools/check-web-hosted.ts';
import { shippedNotice } from '../web/hosted/licence-notices.ts';
const root=resolve('review-input/rebuilt');const want={commit:JSON.parse(readFileSync(join(root,'build-manifest.json'),'utf8')).commit};
const d=resolve('review-work-r2/crypto-control');cpSync(root,d,{recursive:true});CONTROLS.find(c=>c[0].startsWith('a cryptography package'))![2](d);
console.log('authentic curves',JSON.stringify(runChecks(readOutput(d),want)));
const path=resolve('tools/.review-r2-gate.ts');const original=readFileSync('tools/check-web-hosted.ts','utf8');
try{writeFileSync(path,original.replace('if (!ADMITTED_PACKAGES.has(name)) add("licences", `the bundle contains ${name}, which is not admitted`);',''));
 const weakened=await import(path);console.log('curves with admission rule deleted',JSON.stringify(weakened.runChecks(readOutput(d),want)));
}finally{rmSync(path);}
const f=readOutput(root),p='static/third-party-licenses.txt';const pkg=resolve('node_modules/@noble/hashes');const version=JSON.parse(readFileSync(join(pkg,'package.json'),'utf8')).version;f.set(p,Buffer.from(f.get(p)!.toString()+'='.repeat(78)+`\n@noble/hashes@${version} (MIT)\n`+'='.repeat(78)+'\n'+shippedNotice(pkg)+'\n'));console.log('next authentic crypto package',JSON.stringify(runChecks(f,want)));
rmSync(d,{recursive:true,force:true});
````

## probes.ts

````
import { cpSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { CONTROLS, readOutput, runChecks, verdictFile } from '../tools/check-web-hosted.ts';
import { preflight } from '../web/hosted/deploy-preflight.ts';
import { outProblems, checkExportedTree, exportSource } from '../web/hosted/build.ts';
import { DEMO_ACCOUNTS } from '../web/api/demo-accounts.ts';
const root=resolve('review-input/rebuilt');
const manifest=JSON.parse(readFileSync(join(root,'build-manifest.json'),'utf8'));
const want={commit:manifest.commit};
const base=readOutput(root);
const log=(label:string, v:any)=>console.log(label,JSON.stringify(v));
log('baseline',runChecks(base,want));
log('preflight baseline (public-main predicate stub only)',preflight(root,()=>true));
let controls=0;
for(const [i,[name,check,mutate,detail]] of CONTROLS.entries()) {
 const d=resolve(`review-work-r2/control-${i}`); cpSync(root,d,{recursive:true});
 try { mutate(d); const f=runChecks(readOutput(d),want); const hit=f.some(x=>x.check===check&&(!detail||x.detail.includes(detail))); log(`control ${i+1} ${name}`,{hit,checks:[...new Set(f.map(x=>x.check))]}); if(hit)controls++; }
 finally {rmSync(d,{recursive:true,force:true});}
}
log('detector controls',`${controls}/${CONTROLS.length}`);
function probe(name:string, change:(f:Map<string,Buffer>)=>void, pre=false) {
 const f=new Map(base); change(f); log(name,runChecks(f,want));
 if(pre) {const d=resolve('review-work-r2/'+name); cpSync(root,d,{recursive:true}); for(const [p,b] of f)writeFileSync(join(d,'.vercel/output',p),b); writeFileSync(join(d,'.vercel/output/static/gate-verdict.json'),JSON.stringify(verdictFile(f,want,44))); log(name+' preflight',preflight(d,()=>true));}
}
function cfg(f:Map<string,Buffer>,fn:(c:any)=>void){const c=JSON.parse(f.get('config.json')!.toString());fn(c);f.set('config.json',Buffer.from(JSON.stringify(c)));}
function append(f:Map<string,Buffer>,p:string,s:string){f.set(p,Buffer.from(f.get(p)!.toString().replace('</body>',s+'</body>')));}
for(const [n,pol] of [['duplicate-original','connect-src *; '],['duplicate-next','CONNECT-SRC https://example.net; ']]) probe(n,f=>cfg(f,c=>c.routes[0].headers['Content-Security-Policy']=pol+c.routes[0].headers['Content-Security-Policy']));
for(const [n,at,src] of [['route-second',1,'/(.*)'],['route-path',1,'/issuer(/.*)?'],['route-last',99,'/(.*)']] as const)probe(n,f=>cfg(f,c=>c.routes.splice(at,0,{src,headers:{'Referrer-Policy':'unsafe-url'},continue:true})));
probe('both-headers-removed',f=>cfg(f,c=>{delete c.routes[0].headers['Permissions-Policy'];delete c.routes[0].headers['Cross-Origin-Opener-Policy'];}));
probe('coop-next',f=>cfg(f,c=>c.routes[0].headers['Cross-Origin-Opener-Policy']='unsafe-none'));
probe('marker-and-wording',f=>{const p='static/observer/index.html';f.set(p,Buffer.from(f.get(p)!.toString().replaceAll('data-ledger-value=""','').replaceAll('Vercel, which hosts this page','This host')));});
probe('b18-original',f=>append(f,'static/wallet/index.html','<p>Demo account rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh holds confidential balance 5000</p>'),true);
probe('b18-next',f=>append(f,'static/index.html','<p>Issuance 004625C9F2DDC3E652071A9FFA07507F2151FEE332CB25E8 has confidential balance 5000</p>'),true);
probe('b18-demo-address',f=>append(f,'static/wallet/index.html',`<p>${DEMO_ACCOUNTS[0].address} holds 5000</p>`));
probe('issuer-figure',f=>append(f,'static/issuer/index.html','<p>Decrypted issuer balance: 42</p>'),true);
probe('issuer-figure-next',f=>append(f,'static/observer/index.html','<p>Issuer plaintext balance: 73</p>'),true);
probe('licence-seroval-delete',f=>{const p='static/third-party-licenses.txt';f.set(p,Buffer.from(f.get(p)!.toString().replace(/={78}\nseroval@[^\n]*\n={78}\n[\s\S]*?(?=={78}\n)/,'')));});
probe('licence-scheduler-delete',f=>{const p='static/third-party-licenses.txt';f.set(p,Buffer.from(f.get(p)!.toString().replace(/={78}\nscheduler@[^\n]*\n={78}\n[\s\S]*?(?=={78}\n)/,'')));});
for(const [n,extra] of [['licence-prepend','https://analytics.example.net /run/wconf/signer.sock WebAssembly\n'],['licence-tail','='.repeat(78)+'\nhttps://analytics.example.net\n']])probe(n,f=>{const p='static/third-party-licenses.txt',s=f.get(p)!.toString();f.set(p,Buffer.from(n.endsWith('prepend')?extra+s:s+extra));});
for(const [n,html] of [['scheme-original','<script src="//analytics.example.net/a.js"></script>'],['scheme-next','<link href="//analytics.example.net/a.css" rel="stylesheet">'],['scheme-entity','<script src="&#47;&#47;analytics.example.net/a.js"></script>'],['scheme-srcset','<img srcset="/assets/a.png 1x, //analytics.example.net/a.png 2x">']])probe(n,f=>append(f,'static/index.html',html));
for(const [name,change] of [['missing-trial',(m:any)=>delete m.trial],['ledger-one',(m:any)=>m.snapshot.ledgerIndex=1],['endpoint',(m:any)=>m.snapshot.endpoint='https://invalid.example'],['readtime',(m:any)=>m.snapshot.readAt='2'],['missing-image',(m:any)=>delete m.image]] as const){const d=resolve('review-work-r2/manifest-'+name);cpSync(root,d,{recursive:true});const m=structuredClone(manifest);change(m);writeFileSync(join(d,'build-manifest.json'),JSON.stringify(m));log('manifest-'+name,preflight(d,()=>true));}
log('out===repo',outProblems(resolve('.'),resolve('.')));
log('out child',outProblems(resolve('review-work-r2/new-output'),resolve('.')));
const exported=resolve('review-work-r2/exported'); exportSource(resolve('.'),exported,false,'HEAD');
const ls=Bun.spawnSync(['git','ls-tree','-r','-z','--name-only','HEAD'],{stdout:'pipe'}).stdout.toString().split('\0').filter(Boolean);
log('clean export',checkExportedTree(exported,ls));
mkdirSync(join(exported,'web/app/public/assets'),{recursive:true});writeFileSync(join(exported,'web/app/public/assets/review059.js'),'export const outsider=1;');
log('extra asset',checkExportedTree(exported,ls));rmSync(join(exported,'web/app/public/assets/review059.js'));
writeFileSync(join(exported,'web/app/src/hosted/Footer.tsx'),'changed after export');log('changed committed bytes',checkExportedTree(exported,ls));
rmSync(exported,{recursive:true,force:true});
````

## reader-probes.ts

````
import { Snapshot, LoopbackLedger } from '../facility/src/loopback.ts';
import { readAccount } from '../web/hosted/snapshot.ts';
import { DEMO_ACCOUNTS } from '../web/api/demo-accounts.ts';
import { cpSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve,join } from 'node:path';
import { runChecks,readOutput,verdictFile } from '../tools/check-web-hosted.ts';
import { preflight } from '../web/hosted/deploy-preflight.ts';
let reads=0;
const snap=new Snapshot({call:async()=>({validated:true,ledger_index:42,ledger_hash:(reads++%2?'BB':'AA').repeat(32),node:{LedgerEntryType:'MPToken',MPTAmount:'750',ConfidentialBalanceVersion:11}})} as any,42);
const one=await snap.mptoken(DEMO_ACCOUNTS[0].address,DEMO_ACCOUNTS[0].issuanceId),two=await snap.mptoken(DEMO_ACCOUNTS[0].address,DEMO_ACCOUNTS[0].issuanceId);
console.log('different hashes at index 42',JSON.stringify({reads,first:one?.publicAmountRaw,second:two?.publicAmountRaw}));
let calls=0;
const iss={issuer:'rIssuer',confidentialOutstandingAmountRaw:'7'};
const f={index:42,accountExists:async()=>true,mptoken:async()=>calls++===0?{publicAmountRaw:'750',confidentialBalanceVersion:11,issuerEncryptedBalance:'AA'.repeat(66)}:null};
const a=await readAccount(f,DEMO_ACCOUNTS[0],iss);console.log('positive then negative',JSON.stringify({calls,state:a.state,amount:a.observer?.publicAmount,total:a.observer?.issuance.confidentialOutstandingAmount,mirror:a.issuerMirror?.present}));
const absent=await readAccount({...f,accountExists:async()=>false},DEMO_ACCOUNTS[0],iss);console.log('absent note',JSON.stringify({state:absent.state,note:absent.note}));
let infos=0;const srv=Bun.serve({hostname:'127.0.0.1',port:0,async fetch(req){await req.json();return Response.json({result:{info:{network_id:infos++===0?2:1,server_state:'full',validated_ledger:{seq:42},build_version:'test'}}});}});
try{const ledger=await LoopbackLedger.open(`http://127.0.0.1:${srv.port}`);try{await ledger.snapshot();console.log('changed network ACCEPTED');}catch(e){console.log('changed network',String(e));}}finally{srv.stop(true);}
const root=resolve('review-input/rebuilt'),m=JSON.parse(readFileSync(join(root,'build-manifest.json'),'utf8'));
for(const [name,css] of [['display-none','[data-dh2-wording]{display:none}'],['opacity-zero','[data-dh2-wording]{opacity:0}']] as const){const d=resolve('review-work-r2/'+name);cpSync(root,d,{recursive:true});const p=join(d,'.vercel/output/static/assets',readdirSync(join(d,'.vercel/output/static/assets')).find(n=>n.endsWith('.css'))!);writeFileSync(p,readFileSync(p,'utf8')+'\n'+css+'\n');const files=readOutput(d);writeFileSync(join(d,'.vercel/output/static/gate-verdict.json'),JSON.stringify(verdictFile(files,{commit:m.commit},44)));console.log(name,JSON.stringify({gate:runChecks(files,{commit:m.commit}),preflight:preflight(d,()=>true)}));}
````

## release-probes.ts

````
import { cpSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { serveOutput } from '../web/hosted/browser-check.ts';
import { compareDeployed } from '../web/hosted/compare-deployed.ts';
import { readOutput, runChecks, verdictFile } from '../tools/check-web-hosted.ts';
import { preflight } from '../web/hosted/deploy-preflight.ts';
const root=resolve('review-input/rebuilt');
const manifest=JSON.parse(readFileSync(join(root,'build-manifest.json'),'utf8'));
const inner=serveOutput(root);
const cases:[string,(p:string,r:Response,b:ArrayBuffer)=>Response|null][]=[
 ['text-plain',(p,r,b)=>p==='/observer/'?new Response(b,{headers:{...Object.fromEntries(r.headers),'content-type':'text/plain'}}):null],
 ['verdict-302',(p,r,b)=>p==='/gate-verdict.json'?new Response(b,{status:302,headers:{...Object.fromEntries(r.headers),location:'/'}}):null],
 ['verdict-header',(p,r,b)=>{if(p!=='/gate-verdict.json')return null;const h=new Headers(r.headers);h.delete('Permissions-Policy');return new Response(b,{headers:h});}],
 ['utf16-pages',(p,r,b)=>(r.headers.get('content-type')??'').startsWith('text/html')?new Response(b,{status:r.status,headers:{...Object.fromEntries(r.headers),'content-type':'text/html; charset=utf-16le'}}):null],
];
try{for(const [name,change] of cases){const outer=Bun.serve({hostname:'127.0.0.1',port:0,async fetch(req){const p=new URL(req.url).pathname;const r=await fetch(`http://127.0.0.1:${inner.port}${p}`,{redirect:'manual'});const b=await r.arrayBuffer();return change(p,r,b)??new Response(b,{status:r.status,headers:r.headers});}});try{console.log(name,JSON.stringify(await compareDeployed(root,`http://127.0.0.1:${outer.port}`)));}finally{outer.stop(true);}}}finally{inner.stop(true);}
const b=readFileSync(join(root,'.vercel/output/static/observer/index.html'));console.log('charset witness',JSON.stringify({utf8:new TextDecoder('utf-8').decode(b).includes('W-CONF'),utf16:new TextDecoder('utf-16le').decode(b).includes('W-CONF')}));
for(const [name,change] of [
 ['readtime-valid-but-wrong',(m:any)=>m.snapshot.readAt='2026-10-20T00:00:00.000Z'],
 ['readtime-malformed',(m:any)=>m.snapshot.readAt='2'],
 ['endpoint-mismatch',(m:any)=>m.snapshot.endpoint='https://s.altnet.rippletest.net:51234'],
] as const){const d=resolve('review-work-r2/'+name);cpSync(root,d,{recursive:true});const m=structuredClone(manifest);change(m);writeFileSync(join(d,'build-manifest.json'),JSON.stringify(m));console.log(name,JSON.stringify(preflight(d,()=>true)));}
const d=resolve('review-work-r2/changed-verdict-csp');cpSync(root,d,{recursive:true});const cfg=join(d,'.vercel/output/config.json'),c=JSON.parse(readFileSync(cfg,'utf8'));c.routes[0].headers['Content-Security-Policy']='connect-src *; '+c.routes[0].headers['Content-Security-Policy'];writeFileSync(cfg,JSON.stringify(c));writeFileSync(join(d,'.vercel/output/static/gate-verdict.json'),JSON.stringify(verdictFile(readOutput(d),{commit:manifest.commit},44)));console.log('changed csp with rewritten verdict',JSON.stringify(preflight(d,()=>true)));
````

## browser-cases.log

````
second-home {"gate":[],"preflight":[]}
````

## browser.log

````
116 |     for (let i = 0; i < 100 && !port; i++) {
117 |       const f = join(profile, "DevToolsActivePort");
118 |       if (existsSync(f)) port = readFileSync(f, "utf8").split("\n")[0];
119 |       else await sleep(100);
120 |     }
121 |     if (!port) throw new Error("Chrome did not open a DevTools port");
                               ^
error: Chrome did not open a DevTools port
      at browserCheck ($USER_TMP/T/r059a2b.wrslOU/repo/web/hosted/browser-check.ts:121:26)

Bun v1.3.14 (macOS arm64)
````

## controls-probes.log

````
authentic curves [{"check":"licences","detail":"the bundle contains @noble/curves, which is not admitted"}]
curves with admission rule deleted []
next authentic crypto package [{"check":"licences","detail":"the bundle contains @noble/hashes, which is not admitted"}]
````

## custody-regression.log

````
bun test v1.3.14 (0d9b296a)

web/api/disclosure.test.ts:
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

 177 pass
 0 fail
 302 expect() calls
Ran 177 tests across 7 files. [590.00ms]
````

## probes.log

````
baseline []
preflight baseline (public-main predicate stub only) []
control 1 a stray file {"hit":true,"checks":["inventory"]}
control 2 a source map {"hit":true,"checks":["inventory","no-source-maps"]}
control 3 a sourceMappingURL comment {"hit":true,"checks":["no-source-maps"]}
control 4 a missing page {"hit":true,"checks":["inventory","no-server-code","csp"]}
control 5 a serverless function {"hit":true,"checks":["inventory","no-server-code"]}
control 6 middleware in config.json {"hit":true,"checks":["no-server-code","csp"]}
control 7 a rewrite to another host {"hit":true,"checks":["no-server-code","urls"]}
control 8 a top-level overrides key {"hit":true,"checks":["no-server-code"]}
control 9 the signer socket path in a script {"hit":true,"checks":["no-socket-secret-or-decryption"]}
control 10 a WebAssembly module {"hit":true,"checks":["no-socket-secret-or-decryption"]}
control 11 a build variable inlined {"hit":true,"checks":["no-socket-secret-or-decryption"]}
control 12 a WebSocket {"hit":true,"checks":["no-other-connection"]}
control 13 a third-party URL {"hit":true,"checks":["urls"]}
control 14 'unsafe-inline' in script-src {"hit":true,"checks":["csp"]}
control 15 a widened connect-src {"hit":true,"checks":["csp"]}
control 16 an inline script the policy does not admit {"hit":true,"checks":["csp"]}
control 17 no policy at all {"hit":true,"checks":["csp"]}
control 18 a script carrying NUL, admitted by its RAW hash {"hit":true,"checks":["csp"]}
control 19 an inline style attribute {"hit":true,"checks":["csp"]}
control 20 an input asking for a seed {"hit":true,"checks":["no-inputs"]}
control 21 the D-H2 wording removed from the observer page {"hit":true,"checks":["ledger-wording"]}
control 22 the network check changed {"hit":true,"checks":["ledger-wording"]}
control 23 an account panel dropped {"hit":true,"checks":["accounts"]}
control 24 another commit on one page {"hit":true,"checks":["commit-and-verdict"]}
control 25 a cryptography package bundled, with its real notice {"hit":true,"checks":["licences"]}
control 26 seroval's whole entry removed {"hit":true,"checks":["licences"]}
control 27 text before the first notice changed {"hit":true,"checks":["licences"]}
control 28 text after the last notice {"hit":true,"checks":["licences"]}
control 29 a duplicate connect-src placed first {"hit":true,"checks":["csp"]}
control 30 a later catch-all route replacing the policy {"hit":true,"checks":["csp"]}
control 31 a path route replacing the policy for /issuer {"hit":true,"checks":["csp"]}
control 32 Permissions-Policy removed {"hit":true,"checks":["csp"]}
control 33 an extra header on the first route {"hit":true,"checks":["csp"]}
control 34 the policy's name repeated in lower case {"hit":true,"checks":["csp"]}
control 35 a scheme-relative script {"hit":true,"checks":["urls"]}
control 36 the ledger marker and the wording removed together {"hit":true,"checks":["ledger-wording"]}
control 37 a ciphertext on a page that is not a ledger page {"hit":true,"checks":["ledger-wording"]}
control 38 a demo address on the overview {"hit":true,"checks":["ledger-wording"]}
control 39 the commit's link text changed {"hit":true,"checks":["commit-and-verdict"]}
control 40 the licence file removed {"hit":true,"checks":["licences"]}
control 41 a licence notice altered {"hit":true,"checks":["licences"]}
control 42 a personal email restored to a notice {"hit":true,"checks":["licences"]}
detector controls "42/42"
duplicate-original [{"check":"csp","detail":"the directive connect-src appears twice; a browser enforces the first"}]
duplicate-next [{"check":"urls","detail":"config.json names https://example.net"},{"check":"csp","detail":"the directive connect-src appears twice; a browser enforces the first"},{"check":"csp","detail":"an unexpected directive CONNECT-SRC"}]
route-second [{"check":"csp","detail":"route 1 sets headers; only the first route may, because it is the only one any check reads"}]
route-path [{"check":"csp","detail":"route 1 sets headers; only the first route may, because it is the only one any check reads"}]
route-last [{"check":"csp","detail":"route 7 sets headers; only the first route may, because it is the only one any check reads"}]
both-headers-removed [{"check":"csp","detail":"Cross-Origin-Opener-Policy is not same-origin"},{"check":"csp","detail":"Permissions-Policy is not camera=(), microphone=(), geolocation=(), interest-cohort=()"}]
coop-next [{"check":"csp","detail":"Cross-Origin-Opener-Policy is not same-origin"}]
marker-and-wording [{"check":"ledger-wording","detail":"static/observer/index.html is a ledger page and marks no ledger value"},{"check":"ledger-wording","detail":"static/observer/index.html renders a ledger value without the D-H2 sentence beginning \"Vercel, which hosts this page, sees your\""}]
b18-original []
b18-original preflight []
b18-next []
b18-next preflight []
b18-demo-address [{"check":"ledger-wording","detail":"static/wallet/index.html names the demo account rHeah37pL6aFPf59nzWGwujPzSFkp4TUL8 and is not one of the named ledger pages"}]
issuer-figure []
issuer-figure preflight []
issuer-figure-next []
issuer-figure-next preflight []
licence-seroval-delete [{"check":"licences","detail":"seroval is admitted and not listed, so a bundled package may be shipped without its notice"}]
licence-scheduler-delete [{"check":"licences","detail":"scheduler is admitted and not listed, so a bundled package may be shipped without its notice"}]
licence-prepend [{"check":"licences","detail":"the text before the first notice is not the build's fixed header"}]
licence-tail [{"check":"licences","detail":"the file has text after its last notice"}]
scheme-original [{"check":"urls","detail":"static/index.html names the scheme-relative //analytics.example.net/a.js"}]
scheme-next [{"check":"urls","detail":"static/index.html names the scheme-relative //analytics.example.net/a.css"}]
scheme-entity []
scheme-srcset []
manifest-missing-trial ["the manifest's trial field is null, not false: this output is not known to be a commit build"]
manifest-ledger-one ["/observer names ledger 6270649, and the manifest records 1","/issuer names ledger 6270649, and the manifest records 1"]
manifest-endpoint []
manifest-readtime []
manifest-missing-image []
out===repo ["--out must be outside the repository, so no build file lands in a tree that can be committed","$USER_TMP/T/r059a2b.wrslOU/repo is not empty; use a new directory for each build, because a reused one can carry files into the output"]
out child ["--out must be outside the repository, so no build file lands in a tree that can be committed"]
clean export []
extra asset ["web/app/public/assets/review059.js is in the build tree and not in the commit"]
changed committed bytes []
````

## reader-probes.log

````
different hashes at index 42 {"reads":2,"first":"750","second":"750"}
positive then negative {"calls":1,"state":"present","amount":"750","total":"7","mirror":true}
absent note {"state":"account-missing","note":"One of the two accounts the observer view was first read against, on 2026-08-28 (CLAIMS.md E-208)."}
changed network LedgerRefusal: REFUSED_NOT_DEVNET: the server that answered for the snapshot reports network_id 1, not 2 (Devnet), although the one that answered open() did
display-none {"gate":[],"preflight":[]}
opacity-zero {"gate":[],"preflight":[]}
````

## release-probes.log

````
text-plain ["/observer/: served as \"text/plain\", not text/html"]
verdict-302 ["/gate-verdict.json: HTTP 302"]
verdict-header ["/gate-verdict.json: Permissions-Policy is null, not what config.json sets"]
utf16-pages []
charset witness {"utf8":true,"utf16":false}
readtime-valid-but-wrong ["static/capabilities/index.html does not show the manifest's read time \"2026-10-20T00:00:00.000Z\"","static/custody/index.html does not show the manifest's read time \"2026-10-20T00:00:00.000Z\"","static/index.html does not show the manifest's read time \"2026-10-20T00:00:00.000Z\"","static/issuer/index.html does not show the manifest's read time \"2026-10-20T00:00:00.000Z\"","static/observer/index.html does not show the manifest's read time \"2026-10-20T00:00:00.000Z\"","static/wallet/index.html does not show the manifest's read time \"2026-10-20T00:00:00.000Z\""]
readtime-malformed []
endpoint-mismatch []
changed csp with rewritten verdict ["the gate's check fails now: csp: the directive connect-src appears twice; a browser enforces the first"]
````

## rg-old-phrases.log

````
./tools/check-web-hosted.ts:4: * configuration, never over the source (`ADR-0004`, "What phase 2 step 4's gate
./web/api/custody-sim.ts:67:      "Destination, issuance and timing are public (CLAIMS.md P-4, P-11). Every policy over an " +
./web/api/custody-sim.ts:68:      "identity, a time or a count survives; every policy over a value does not.",
./web/api/custody-sim.ts:74:      "cannot derive its own ElGamal key outside the platform. A platform that ran the derivation " +
./web/api/capability.ts:69: * serialise the XLS-0096 types is **not determinable from any published
./web/api/capability.ts:196:        "Only with a standalone ElGamal key, held by something other than the custody platform, or if the platform itself ran the derivation inside its own boundary, which would need the derivation published as a standard (issue #10). Outside the platform the account cannot derive its key, because that needs the seed, and a custody platform never releases the seed.",
./web/hosted/browser-check.ts:2: * The hosted demo in a real browser, under its real policy: `ADR-0004` step 4.
./CLAIMS.md:266:| E-206 | ⚠⚠ **D2's FOURTH REASON — *"the extension's codec does not know the XLS-0096 types, so it could not serialise a `ConfidentialMPTSend`"* — IS NOT ESTABLISHED, AND IT IS ALSO NOT NEEDED.** Checked at the wallets' own published sources, **2026-08-28**: (1) **GemWallet's API reference lists raw-transaction methods** — `signTransaction`, `submitTransaction`, `submitBulkTransactions` — documented as taking *"transaction payloads as defined in the XRPL Protocol"*. (2) **Crossmark documents `sign`, `submit`, `signAndSubmit`, `bulkSign`, `bulkSubmit` and the `…AndWait` forms**, over arbitrary transaction objects. (3) **Xaman's payload API accepts `txjson` *and* `txblob`**, a pre-serialised HEX blob. ⚠ **So all three accept an arbitrary `TransactionType` at the API surface, and the premise that a wallet cannot express one of these transactions is wrong at that layer.** ⚠⚠ **AND THE CODEC VERSION IS NOT KNOWABLE FROM ANY PUBLISHED SOURCE:** `npm view` on all three page-side packages, 2026-08-28 — `@crossmarkio/sdk@0.4.0` depends on `events` and `@crossmarkio/typings` **only**; `@gemwallet/api@3.8.0` and `xumm@1.8.0` are likewise bridges — **none carries `ripple-binary-codec` or `xrpl.js` at all.** Serialisation happens **inside the closed extension bundle**, or in Xaman's backend, and no wallet publishes that version. ⚠ **Xaman's docs additionally say it *"can add missing fields (signer account, fee, sequence)"*, which implies it PARSES even on the `txblob` path — so the blob route is not a clean bypass either, and that too is undetermined.** ⚠⚠ **The reason this matters is not that the claim is false — it is that it was the WRONG ARGUMENT TO LEAD WITH.** It is a **version fact an upstream release can close at any time**, whereas D2's reasons 1–3 are **structural**: a confidential operation needs the ElGamal secret AND the account key; the ElGamal secret is derived from the master seed under `REVIEW-012`; and a wallet extension exists in order not to release seed material. **A demonstration built on reason 4 would be falsified by a wallet update; one built on reasons 1–3 cannot be.** ⚠ **This is `CLAUDE.md`'s own P-12 shape** — an assertion about what a corpus does not contain, carried as a premise without the search that would settle it | **Reason 4 is WITHDRAWN as a premise and recorded as a NAMED GAP**, in `web/api/capability.ts` (the browser-wallet row's `publicTransactions` cell is `unverified` and says why), in the wallet route's own copy, and in `ADR-0003` D2. ⚠ **Nothing was backfilled from secondary coverage**: the Crossmark method list came from `docs.crossmark.io` directly, and the one search-summary source was re-fetched at the vendor's own site before use. **The demonstration now rests on reasons 1–3 only**, which is both honest and stronger. **Determining a given wallet build's codec would need testing against a live extension, which this repository cannot do reproducibly** — so it stays a gap rather than becoming an assumption | A, measured |
./web/hosted/compare-deployed.ts:3: * passed? `ADR-0004` D-H4 and step 5.
./web/app/vite.hosted.config.ts:8: * ⚠ **Nothing from the build machine's environment reaches the bundle.**
./docs/decisions/ADR-0003-web-tier-trust-boundary.md:74:**So all three accept an arbitrary `TransactionType` at the API surface.** ⚠ **And the codec version is not knowable from any published source**: `npm view`, 2026-08-28, shows `@crossmarkio/sdk@0.4.0` depending on `events` and `@crossmarkio/typings` only, with `@gemwallet/api@3.8.0` and `xumm@1.8.0` likewise thin bridges — **none carries `ripple-binary-codec` or `xrpl.js` at all.** Serialisation happens inside the closed extension bundle or in Xaman's backend. Xaman's docs further say it *"can add missing fields (signer account, fee, sequence)"*, which implies parsing even on the blob path.
./docs/decisions/ADR-0003-web-tier-trust-boundary.md:264:   custodied account cannot derive its own viewing key because derivation needs
./web/app/src/views/CustodyView.tsx:34:              the seed. So the account cannot derive its own ElGamal key or read its own confidential
./docs/explainer/WEB-TIER-LIMITATIONS-2026-08-28.md:51:| Whether any wallet build's bundled codec can serialise XLS-0096 types — **not determinable from published sources**, and deliberately **not** part of why a wallet cannot hold a position | **E-206** |
./web/app/src/hosted/LedgerReading.tsx:6: * check and the ledger index (`ADR-0004`, "What phase 2 step 4's gate must
./docs/explainer/WEB-TIER-DEMO-SCRIPT-2026-08-28.md:177:accept arbitrary transaction types, and the codec version is not knowable from
./docs/explainer/WEB-TIER-DEMO-SCRIPT-2026-08-28.md:183:Two findings: a custodied account **cannot derive its own viewing key outside the
./docs/explainer/WEB-TIER-DEMO-SCRIPT-2026-08-28.md:188:⚠ **The generalisation is the useful sentence:** every policy over an
./docs/explainer/WEB-TIER-DEMO-SCRIPT-2026-08-28.md:189:**identity**, a **time** or a **count** survives; every policy over a **value**
./docs/explainer/WEB-TIER-DEMO-SCRIPT-2026-08-28.md:213:| **Wallet codec support** | Not determinable from published sources (**E-206**) and deliberately **not** part of the argument |
./docs/research/CUSTODY-2026-08-28.md:30:**Therefore a custodied account cannot derive its own viewing key.** It cannot read its own confidential balance, which is not a limitation of any integration — it follows from step 2 alone.
./docs/research/CUSTODY-2026-08-28.md:60:⚠ **The pattern: every policy over an IDENTITY, a TIME or a COUNT survives; every policy over a VALUE does not.** That is P-4 and P-11 restated as a custody constraint — this system hides amounts and hides nothing else — and it is the single most useful sentence in this document for a capital-markets reader.
````

## root-refusal.log

````
161 |   const a = args(argv);
162 |   const out = resolve(a.out);
163 |   if (!isAbsolute(out)) throw new Error("--out must resolve to an absolute path");
164 |   const repoTop = run(["git", "-C", a.repo, "rev-parse", "--show-toplevel"]).trim();
165 |   const refused = outProblems(out, repoTop);
166 |   if (refused.length) throw new Error(refused.join("; "));
                                      ^
error: --out must be outside the repository, so no build file lands in a tree that can be committed; $USER_TMP/T/r059a2b.wrslOU/repo is not empty; use a new directory for each build, because a reused one can carry files into the output
      at build ($USER_TMP/T/r059a2b.wrslOU/repo/web/hosted/build.ts:166:33)
      at $USER_TMP/T/r059a2b.wrslOU/repo/web/hosted/build.ts:297:9

Bun v1.3.14 (macOS arm64)
````

## secrets.log

````
check-no-secrets over every file under $USER_TMP/T/r059a2b.wrslOU/repo/review-input/rebuilt/.vercel/output, with no git filter
controls: 111/111 passed, run through the same scanRepo() as the real check
known-value: NOT RUN (--no-local-store). An unlabelled ElGamal secret is invisible to this run. This is NOT the phase 1 gate.
scanned: 19 file(s) in the tree, 0 history object(s)
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

## tests.log

````
bun test v1.3.14 (0d9b296a)

web/api/disclosure.test.ts:
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

facility/tests/boundary.test.ts:
103 |     const saved = process.env.WCONF_LEDGER_ENDPOINT;
104 |     process.env.WCONF_LEDGER_ENDPOINT = REMOTE;
105 |     try {
106 |       await expect(
107 |         SignerSession.start(profile, { workDir: "/tmp/wconf-boundary-test", autoConfirm: true }),
108 |       ).rejects.toThrow(/REFUSED_ENDPOINT_OVERRIDE/);
                      ^
error: expect(received).toThrow(expected)

Expected pattern: /REFUSED_ENDPOINT_OVERRIDE/
Received message: "the signer is not built at $USER_TMP/T/r059a2b.wrslOU/repo/signer/target/debug/wconf-signer. Run: tools/rebuild-env.sh && (cd signer && cargo build)"

      at <anonymous> ($USER_TMP/T/r059a2b.wrslOU/repo/facility/tests/boundary.test.ts:108:17)
(fail) the signer's endpoint cannot be overridden out from under the check > refuses when WCONF_LEDGER_ENDPOINT disagrees with the checked endpoint [1.18ms]
124 |       await expect(
125 |         SignerSession.start(
126 |           { ...profile, ledgerEndpoint: REMOTE },
127 |           { workDir: "/tmp/wconf-boundary-test", autoConfirm: true },
128 |         ),
129 |       ).rejects.toThrow(/REFUSED_NOT_LOOPBACK/);
                      ^
error: expect(received).toThrow(expected)

Expected pattern: /REFUSED_NOT_LOOPBACK/
Received message: "the signer is not built at $USER_TMP/T/r059a2b.wrslOU/repo/signer/target/debug/wconf-signer. Run: tools/rebuild-env.sh && (cd signer && cargo build)"

      at <anonymous> ($USER_TMP/T/r059a2b.wrslOU/repo/facility/tests/boundary.test.ts:129:17)
      at withHatch ($USER_TMP/T/r059a2b.wrslOU/repo/facility/tests/with-hatch.ts:37:18)
      at <anonymous> ($USER_TMP/T/r059a2b.wrslOU/repo/facility/tests/boundary.test.ts:123:11)
(fail) the signer's endpoint cannot be overridden out from under the check > refuses a non-loopback endpoint in the profile itself [0.16ms]

facility/tests/secret-file.test.ts:
155 |     const { dir, cleanup } = scratch();
156 |     const workDir = join(dir, "refused");
157 |     const saved = process.env.WCONF_LEDGER_ENDPOINT;
158 |     process.env.WCONF_LEDGER_ENDPOINT = "http://127.0.0.1:5006";
159 |     try {
160 |       await expect(SignerSession.start(profile, { workDir, autoConfirm: true, quiet: true })).rejects.toThrow(
                                                                                                            ^
error: expect(received).toThrow(expected)

Expected pattern: /REFUSED_ENDPOINT_OVERRIDE/
Received message: "the signer is not built at $USER_TMP/T/r059a2b.wrslOU/repo/signer/target/debug/wconf-signer. Run: tools/rebuild-env.sh && (cd signer && cargo build)"

      at <anonymous> ($USER_TMP/T/r059a2b.wrslOU/repo/facility/tests/secret-file.test.ts:160:103)
(fail) the write sites use it > a REFUSED signer start writes no profile at all [0.35ms]
178 |     const saved = process.env.WCONF_LEDGER_ENDPOINT;
179 |     delete process.env.WCONF_LEDGER_ENDPOINT;
180 |     try {
181 |       await expect(
182 |         SignerSession.start({ ...profile, issuanceId: "zz" }, { workDir, autoConfirm: true, quiet: true }),
183 |       ).rejects.toThrow(/never created its socket/);
                      ^
error: expect(received).toThrow(expected)

Expected pattern: /never created its socket/
Received message: "the signer is not built at $USER_TMP/T/r059a2b.wrslOU/repo/signer/target/debug/wconf-signer. Run: tools/rebuild-env.sh && (cd signer && cargo build)"

      at <anonymous> ($USER_TMP/T/r059a2b.wrslOU/repo/facility/tests/secret-file.test.ts:183:17)
(fail) the write sites use it > a signer that dies before binding leaves no profile behind [0.31ms]
100 |   static async start(
101 |     profile: SignerProfile,
102 |     opts: { workDir: string; autoConfirm: boolean; quiet?: boolean },
103 |   ): Promise<SignerSession> {
104 |     if (!existsSync(SIGNER_BINARY)) {
105 |       throw new Error(
                      ^
error: the signer is not built at $USER_TMP/T/r059a2b.wrslOU/repo/signer/target/debug/wconf-signer. Run: tools/rebuild-env.sh && (cd signer && cargo build)
      at start ($USER_TMP/T/r059a2b.wrslOU/repo/facility/src/signer.ts:105:17)
      at underUmaskAsync ($USER_TMP/T/r059a2b.wrslOU/repo/facility/tests/secret-file.test.ts:59:18)
      at <anonymous> ($USER_TMP/T/r059a2b.wrslOU/repo/facility/tests/secret-file.test.ts:198:23)
(fail) the write sites use it > a running signer's profile is gone once its socket exists, and stop leaves none [0.30ms]

 285 pass
 5 fail
 501 expect() calls
Ran 290 tests across 15 files. [699.00ms]
````

## text-sweep.log

````
R1-13 | CLAIMS.md:266 | wise bridges — **none carries `ripple-binary-codec` or `xrpl.js` at all.** Serialisation happens **inside the closed extension bundle**, or in Xaman's backend, and no wallet publishes that version. ⚠ **Xaman's docs additionally say it *"can add missing fields (signer account, fee, sequence)"*, which im
S-6 | docs/architecture/ARCHITECTURE-2026-08-18.md:5 | ings (E-342); the fixes are not yet deployed, and round two reviews them. ⚠ The revision 11 line below said *"Step 9 is not built"* until this line was added, which was true of the ruling and false of the header a reader meets first (`REVIEW-059` S-6).
S-6 | docs/architecture/ARCHITECTURE-2026-08-18.md:6 | ame; no issuer figure; and a prebuilt CLI deploy. `ADR-0004` is `Accepted` at revision 5 (`CLAIMS.md` E-331). Step 9 is not built.
R1-12 key | docs/decisions/ADR-0003-web-tier-trust-boundary.md:264 |    custodied account cannot derive its own viewing key because derivation needs
R1-12 policy | docs/decisions/ADR-0003-web-tier-trust-boundary.md:265 |    the seed; a policy engine cannot read an amount that is a proof. **Neither is
R1-13 | docs/decisions/ADR-0003-web-tier-trust-boundary.md:74 | e thin bridges — **none carries `ripple-binary-codec` or `xrpl.js` at all.** Serialisation happens inside the closed extension bundle or in Xaman's backend. Xaman's docs further say it *"can add missing fields (signer account, fee, sequence)"*, which implies parsing even on the blob path.
R1-12 key | docs/explainer/WEB-TIER-DEMO-SCRIPT-2026-08-28.md:183 | Two findings: a custodied account **cannot derive its own viewing key outside the
R1-12 policy | docs/explainer/WEB-TIER-DEMO-SCRIPT-2026-08-28.md:186 | engine **cannot enforce an amount limit on an amount that is a proof**.
R1-12 policy | docs/explainer/WEB-TIER-DEMO-SCRIPT-2026-08-28.md:189 | **identity**, a **time** or a **count** survives; every policy over a **value**
R1-12 key | docs/research/CUSTODY-2026-08-28.md:30 | **Therefore a custodied account cannot derive its own viewing key.** It cannot read its own confidential balance, which is not a limitation of any integration — it follows from step 2 alone.
R1-12 policy | docs/research/CUSTODY-2026-08-28.md:40 | ## Finding 2 — a policy engine cannot enforce an amount limit on a confidential amount
R1-12 policy | docs/research/CUSTODY-2026-08-28.md:60 | ⚠ **The pattern: every policy over an IDENTITY, a TIME or a COUNT survives; every policy over a VALUE does not.** That is P-4 and P-11 restated as a custody constraint — this system hides amounts and hides nothing else — and it is the single most useful sentence in this 
R1-12 key | review-input/deployed/.vercel/output/static/assets/custody-hkJYX5SB.js:1 | ren:`The ElGamal secret is derived from the master seed, and a custody platform never releases the seed. So a custodied account cannot derive its own ElGamal key or read its own confidential balance.`}),(0,r.jsx)(`p`,{className:`opacity-85 leading-relaxed mt-2`,children:`A standalone ElGamal key gets around th
R1-12 key | review-input/deployed/.vercel/output/static/assets/index-CKAZ0d8y.js:12 | conditional`,detail:`Only with a standalone ElGamal key, held by something other than the custody platform. A custodied account cannot derive its own key, because that needs the seed, and a custody platform never releases the seed.`,citation:`REVIEW-012; CLAIMS.md E-117`},proveAndSign:{verdict:`conditional`,de
R1-12 key | review-input/deployed/.vercel/output/static/assets/index-CKAZ0d8y.js:12 | edBy:[{requirement:`seed-material`,because:`Structural: a custody platform never releases seed material, so a custodied account cannot derive its own ElGamal key.`}],caveats:[]},{id:`onboard-standalone`,label:`Onboard with a standalone ElGamal key`,survives:!0,blockedBy:[],caveats:[`Only with a standalone ElGa
R1-13 | review-input/deployed/.vercel/output/static/assets/index-CKAZ0d8y.js:12 | transactions. The page-side SDKs carry no codec, so serialisation happens inside the extension, whose version no vendor publishes. This is not why a wallet cannot hold a confidential position: the reasons above are structural, and this one could change with any release.`}},custody:{simulation:!0,di
R1-14 | review-input/deployed/.vercel/output/static/assets/index-CKAZ0d8y.js:12 | orKey:!1},accounts:[{address:`rHeah37pL6aFPf59nzWGwujPzSFkp4TUL8`,label:`Holder A — an active position`,note:`Its spending balance is not the canonical zero, so its value is hidden; its inbox is publicly known to be exactly zero.`,state:`present`,observer:{account:`rHeah37pL6aFPf59nzWGwujPzSFkp4TUL8`,issuanceId:`004625C9F2DD
R1-14 | review-input/deployed/.vercel/output/static/assets/index-CKAZ0d8y.js:12 | `Holder A — an active position`,note:`Its spending balance is not the canonical zero, so its value is hidden; its inbox is publicly known to be exactly zero.`,state:`present`,observer:{account:`rHeah37pL6aFPf59nzWGwujPzSFkp4TUL8`,issuanceId:`004625C9F2DDC3E652071A9FFA07507F2151FEE332CB25E8`,publicAmount:`750`,registered:!0,h
R1-12 key | review-input/deployed/.vercel/output/static/capabilities/index.html:1 | ty-75 mt-1 max-w-xs">Only with a standalone ElGamal key, held by something other than the custody platform. A custodied account cannot derive its own key, because that needs the seed, and a custody platform never releases the seed.</div><div class="text-[10px] opacity-45 mt-1">REVIEW-012; CLAIMS.md E-117</div>
R1-12 key | review-input/deployed/.vercel/output/static/custody/index.html:1 | xed">The ElGamal secret is derived from the master seed, and a custody platform never releases the seed. So a custodied account cannot derive its own ElGamal key or read its own confidential balance.</p><p class="opacity-85 leading-relaxed mt-2">A standalone ElGamal key gets around this, but then something out
R1-12 key | review-input/deployed/.vercel/output/static/custody/index.html:1 | key</div><p class="text-xs opacity-80 mt-1">Structural: a custody platform never releases seed material, so a custodied account cannot derive its own ElGamal key.</p></div><div class="border-l-2 pl-3 border-[var(--color-public)]"><div class="text-sm font-medium">survives<!-- -->: <!-- -->Onboard with a standal
S-7 | review-input/deployed/.vercel/output/static/gate-verdict.json:31 |     "2. The SERVED bytes and headers. It checks the output before upload; step 5 compares the deployed site with gate-verdict.json, and that comparison detects a change at the moment it runs, nothing later.",
R1-14 | review-input/deployed/.vercel/output/static/issuer/index.html:1 | 0 break-all" data-ledger-value="">rHeah37pL6aFPf59nzWGwujPzSFkp4TUL8</code><p class="text-xs opacity-75 mt-1">Its spending balance is not the canonical zero, so its value is hidden; its inbox is publicly known to be exactly zero.</p><p class="text-xs opacity-60 mt-1">read at validated ledger <!-- -->6263910</p></div><div cla
R1-14 | review-input/deployed/.vercel/output/static/issuer/index.html:1 | de><p class="text-xs opacity-75 mt-1">Its spending balance is not the canonical zero, so its value is hidden; its inbox is publicly known to be exactly zero.</p><p class="text-xs opacity-60 mt-1">read at validated ledger <!-- -->6263910</p></div><div class="text-sm space-y-2"><div><span class="opacity-60">IssuerEncryptedBala
R1-14 | review-input/deployed/.vercel/output/static/observer/index.html:1 | 0 break-all" data-ledger-value="">rHeah37pL6aFPf59nzWGwujPzSFkp4TUL8</code><p class="text-xs opacity-75 mt-1">Its spending balance is not the canonical zero, so its value is hidden; its inbox is publicly known to be exactly zero.</p><p class="text-xs opacity-60 mt-1">read at validated ledger <!-- -->6263910</p></div><section
R1-14 | review-input/deployed/.vercel/output/static/observer/index.html:1 | de><p class="text-xs opacity-75 mt-1">Its spending balance is not the canonical zero, so its value is hidden; its inbox is publicly known to be exactly zero.</p><p class="text-xs opacity-60 mt-1">read at validated ledger <!-- -->6263910</p></div><section class="border border-black/10 dark:border-white/15 rounded-lg p-5 mb-6"
R1-13 | review-input/deployed/.vercel/output/static/wallet/index.html:1 | transactions. The page-side SDKs carry no codec, so serialisation happens inside the extension, whose version no vendor publishes. This is not why a wallet cannot hold a confidential position: the reasons above are structural, and this one could change with any release.</p><p class="text-xs opacity
R1-12 key | review-input/rebuilt/.vercel/output/static/assets/custody-BfENjUkT.js:1 | lGamal secret is derived from the master seed, and a custody platform never releases the seed. So the account cannot derive its own ElGamal key or read its own confidential balance outside the platform. A platform that ran the derivation inside its own boundary would change that; it would need the derivation pub
R1-12 key | review-input/rebuilt/.vercel/output/static/assets/index-Dnrjg5yz.js:12 | rial`,because:`Structural in this simulation: a custody platform never releases seed material, so the account cannot derive its own ElGamal key outside the platform. A platform that ran the derivation inside its own boundary would change this, and that needs the derivation published (issue #10).`}],caveats:[]},{
R1-12 key | review-input/rebuilt/.vercel/output/static/custody/index.html:1 | lGamal secret is derived from the master seed, and a custody platform never releases the seed. So the account cannot derive its own ElGamal key or read its own confidential balance outside the platform. A platform that ran the derivation inside its own boundary would change that; it would need the derivation pub
R1-12 key | review-input/rebuilt/.vercel/output/static/custody/index.html:1 | acity-80 mt-1">Structural in this simulation: a custody platform never releases seed material, so the account cannot derive its own ElGamal key outside the platform. A platform that ran the derivation inside its own boundary would change this, and that needs the derivation published (issue #10).</p></div><div cl
R1-13 | web/api/capability.ts:69 |  * serialise the XLS-0096 types is **not determinable from any published
R1-12 key | web/api/custody-sim.ts:74 |       "cannot derive its own ElGamal key outside the platform. A platform that ran the derivation " +
R1-12 policy | web/api/custody-sim.ts:68 |       "identity, a time or a count survives; every policy over a value does not.",
R1-12 key | web/app/src/views/CustodyView.tsx:34 |               the seed. So the account cannot derive its own ElGamal key or read its own confidential
R1-11 | web/app/vite.hosted.config.ts:8 |  * ⚠ **Nothing from the build machine's environment reaches the bundle.**
R1-11 | web/app/vite.hosted.config.ts:11 |  * nothing sets, and `web/hosted/build.ts` sets canary variables under both  * prefixes and fails if either value appears in the output.
S-7 | web/hosted/browser-check.ts:2 |  * The hosted demo in a real browser, under its real policy: `ADR-0004` step 4.
S-7 | web/hosted/compare-deployed.ts:3 |  * passed? `ADR-0004` D-H4 and step 5.
````

## browser-diff.txt

````
diff --git a/web/hosted/browser-check.ts b/web/hosted/browser-check.ts
index c95e03c..4f90b7a 100644
--- a/web/hosted/browser-check.ts
+++ b/web/hosted/browser-check.ts
@@ -11,8 +11,12 @@
  *   - any Content Security Policy violation, which is how a hash the gate
  *     computed and a script the browser runs would disagree;
  *   - any request to anything but the page's own origin;
- *   - any uncaught exception or console error other than the expected 404
- *     for a missing verdict file;
+ *   - any uncaught exception, or any console error other than the expected
+ *     404 for a missing verdict file, whether the browser logged it or the
+ *     page's own script did (`console.error`), on every page AND after the
+ *     final client-side navigation (`REVIEW-059` R1-5: both were missed);
+ *   - a ledger page whose rendered text, which a stylesheet that hides an
+ *     element removes, does not carry the D-H2 wording (`REVIEW-059` R1-2);
  *   - a page whose script never ran, read from the footer's verdict slot,
  *     which only the page's own script changes;
  *   - a client-side navigation that loads a new document or does not render.
@@ -23,10 +27,12 @@
  * list, items 1 and 2).
  */
 
-import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
+import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
 import { tmpdir } from "node:os";
 import { join } from "node:path";
 import { HOSTED_PAGES } from "./pages.ts";
+import { LEDGER_PAGES } from "../../tools/check-web-hosted.ts";
+import { DH2_WORDING } from "../app/src/hosted/wording.ts";
 
 const CHROME = process.env.WCONF_CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
 
@@ -39,6 +45,15 @@ const TYPES: Record<string, string> = {
 export function serveOutput(root: string) {
   const base = join(root, ".vercel", "output");
   const config = JSON.parse(readFileSync(join(base, "config.json"), "utf8"));
+  // ⚠ This server models one shape: headers on the first route only, file
+  // rewrites, and the filesystem. A configuration outside it would be served
+  // as if it were that shape, so it is refused instead (`REVIEW-059` R1-5).
+  for (const [i, r] of (config.routes ?? []).entries()) {
+    const keys = Object.keys(r).filter((k) => !["src", "dest", "headers", "continue", "handle"].includes(k));
+    if (keys.length || (i > 0 && r.headers !== undefined) || (r.handle !== undefined && r.handle !== "filesystem")) {
+      throw new Error(`browser-check cannot model route ${i} (${JSON.stringify(r).slice(0, 120)}); the gate refuses it too`);
+    }
+  }
   const headers: Record<string, string> = config.routes[0].headers;
   const rewrites: [RegExp, string][] = config.routes.filter((r: any) => r.dest).map((r: any) => [new RegExp(r.src), r.dest]);
   return Bun.serve({
@@ -116,25 +131,39 @@ export async function browserCheck(root: string): Promise<{ problems: string[];
     });
     const evalJs = async (expr: string) => (await s("Runtime.evaluate", { expression: expr, returnByValue: true })).result.value;
 
-    for (const page of HOSTED_PAGES) {
-      const before = cdp.events.length;
-      await s("Page.navigate", { url: `${origin}/${page}` });
-      for (let i = 0; i < 50; i++) { if (cdp.events.slice(before).some((e) => e.method === "Page.loadEventFired")) break; await sleep(100); }
-      await sleep(1200);
-      const ev = cdp.events.slice(before);
+    /** Every check over one interval of events, the same for a page load and for the client navigation. */
+    const inspect = async (label: string, ev: typeof cdp.events) => {
       for (const e of ev.filter((e) => e.method === "Network.requestWillBeSent")) {
         requests++;
         const u = e.params.request.url as string;
-        if (!u.startsWith(origin + "/")) problems.push(`/${page}: a request to ${u}`);
+        if (!u.startsWith(origin + "/")) problems.push(`${label}: a request to ${u}`);
       }
-      const violations = await evalJs("window.__violations");
-      for (const v of violations ?? []) problems.push(`/${page}: CSP violation ${v}`);
-      for (const e of ev.filter((e) => e.method === "Runtime.exceptionThrown")) problems.push(`/${page}: exception ${e.params.exceptionDetails?.exception?.description ?? e.params.exceptionDetails?.text}`);
+      const violations = await evalJs("window.__violations.splice(0)");
+      for (const v of violations ?? []) problems.push(`${label}: CSP violation ${v}`);
+      for (const e of ev.filter((e) => e.method === "Runtime.exceptionThrown")) problems.push(`${label}: exception ${e.params.exceptionDetails?.exception?.description ?? e.params.exceptionDetails?.text}`);
       for (const e of ev.filter((e) => e.method === "Log.entryAdded" && e.params.entry.level === "error")) {
         const t: string = e.params.entry.text ?? "";
         // Two same-origin 404s are expected: the verdict file before the gate
         // has written it, and the favicon a browser asks for unprompted.
-        if (!(/404/.test(t) && /\/(gate-verdict\.json|favicon\.ico)$/.test(e.params.entry.url ?? ""))) problems.push(`/${page}: console error ${t} (${e.params.entry.url ?? "no url"})`);
+        if (!(/404/.test(t) && /\/(gate-verdict\.json|favicon\.ico)$/.test(e.params.entry.url ?? ""))) problems.push(`${label}: console error ${t} (${e.params.entry.url ?? "no url"})`);
+      }
+      // ⚠ `Log.entryAdded` carries what the BROWSER logs; a page's own
+      // `console.error` arrives only as `Runtime.consoleAPICalled`.
+      for (const e of ev.filter((e) => e.method === "Runtime.consoleAPICalled" && ["error", "assert"].includes(e.params.type))) {
+        problems.push(`${label}: console.${e.params.type} ${(e.params.args ?? []).map((a: any) => a.value ?? a.description ?? "").join(" ")}`);
+      }
+    };
+    const squash = (t: string) => t.replace(/\s+/g, " ").trim();
+
+    for (const page of HOSTED_PAGES) {
+      const before = cdp.events.length;
+      await s("Page.navigate", { url: `${origin}/${page}` });
+      for (let i = 0; i < 50; i++) { if (cdp.events.slice(before).some((e) => e.method === "Page.loadEventFired")) break; await sleep(100); }
+      await sleep(1200);
+      await inspect(`/${page}`, cdp.events.slice(before));
+      if ((LEDGER_PAGES as readonly string[]).includes(page)) {
+        const shown = squash(await evalJs("document.body.innerText"));
+        for (const para of DH2_WORDING) if (!shown.includes(squash(para))) problems.push(`/${page}: the D-H2 sentence beginning ${JSON.stringify(para.slice(0, 40))} is not in the rendered text`);
       }
       const slot = await evalJs("document.querySelector('[data-gate-verdict]')?.textContent ?? null");
       if (page === "") footer = slot;
@@ -144,12 +173,16 @@ export async function browserCheck(root: string): Promise<{ problems: string[];
       else if (/^not loaded/.test(slot)) problems.push(`/${page}: the page's script never ran (the verdict slot still reads ${JSON.stringify(slot)})`);
     }
 
-    // Client-side navigation: one link, no new document, the target renders.
+    // Client-side navigation: one link, no new document, the target renders,
+    // and the interval after the click passes every check a page load does.
     await s("Page.navigate", { url: `${origin}/` });
     await sleep(1500);
+    await evalJs("window.__violations.splice(0)");
     const docsBefore = cdp.events.filter((e) => e.method === "Network.requestWillBeSent" && e.params.type === "Document").length;
+    const clickedAt = cdp.events.length;
     await evalJs("document.querySelector('a[href=\"/observer\"]').click()");
     await sleep(1200);
+    await inspect("client navigation to /observer", cdp.events.slice(clickedAt));
     const docsAfter = cdp.events.filter((e) => e.method === "Network.requestWillBeSent" && e.params.type === "Document").length;
     const path = await evalJs("location.pathname");
     const rendered = await evalJs("document.body.innerText.includes('Observer view: ')");
@@ -189,6 +222,23 @@ export async function selfTest(root: string): Promise<string[]> {
     writeFileSync(idx, readFileSync(idx, "utf8").replace("</body>", `<img src="http://127.0.0.1:${elsewhere.port}/pixel.png"></body>`));
     if (!(await browserCheck(other)).problems.some((p) => p.includes(`a request to http://127.0.0.1:${elsewhere.port}/`))) failed.push("a request to another origin was not reported");
 
+    // ⚠ The three cases `REVIEW-059` found passing: a page's own console
+    // error, an exception after the client navigation, and the D-H2 wording
+    // present in the HTML but hidden by the stylesheet.
+    const asset = (d: string, re: RegExp) => join(d, ".vercel/output/static/assets", readdirSync(join(d, ".vercel/output/static/assets")).find((n) => re.test(n))!);
+    const logs = copy(); dirs.push(logs);
+    const v1 = asset(logs, /^Verdict-.*\.js$/);
+    writeFileSync(v1, readFileSync(v1, "utf8") + '\nconsole.error("BROWSER_CHECK_CONTROL");\n');
+    if (!(await browserCheck(logs)).problems.some((p) => p.includes("console.error BROWSER_CHECK_CONTROL"))) failed.push("a page's own console.error was not reported");
+    const nav = copy(); dirs.push(nav);
+    const v2 = asset(nav, /^Verdict-.*\.js$/);
+    writeFileSync(v2, readFileSync(v2, "utf8") + "\ndocument.addEventListener('click',e=>{if(e.target.closest('a[href=\"/observer\"]'))setTimeout(()=>{throw Error('BROWSER_CHECK_NAV')},0)});\n");
+    if (!(await browserCheck(nav)).problems.some((p) => p.startsWith("client navigation to /observer: exception") && p.includes("BROWSER_CHECK_NAV"))) failed.push("an exception after the client navigation was not reported");
+    const hidden = copy(); dirs.push(hidden);
+    const css = asset(hidden, /\.css$/);
+    writeFileSync(css, readFileSync(css, "utf8") + "\n[data-dh2-wording]{display:none}\n");
+    if (!(await browserCheck(hidden)).problems.some((p) => p.startsWith("/observer: the D-H2 sentence"))) failed.push("D-H2 wording hidden by the stylesheet was not reported");
+
     const dead = copy(); dirs.push(dead);
     const wal = join(dead, ".vercel/output/static/wallet/index.html");
     writeFileSync(wal, readFileSync(wal, "utf8").replace(/<script type="module"[^>]*><\/script>/, ""));
````

## build-diff.txt

````
diff --git a/web/hosted/build.ts b/web/hosted/build.ts
index d555b46..7b7d75e 100644
--- a/web/hosted/build.ts
+++ b/web/hosted/build.ts
@@ -16,22 +16,40 @@
  * deployment token exists anywhere in it: D-H4's token comes in for the upload
  * only, after this script and the gate have finished.
  *
+ * ⚠ **What it is isolated FROM is files, and the network only in part.**
+ * Measured 2026-10-20 (`REVIEW-059` S-2): an OrbStack container with network
+ * reaches a service bound to the build machine's `127.0.0.1` through
+ * `host.docker.internal`. So the work runs in TWO containers. The first
+ * installs and takes the snapshot, which need the network; the second runs
+ * Vite and the assembler with `--network none`, so the third-party code in the
+ * build proper reaches nothing. ⚠ Code that runs during install or the snapshot
+ * still has the network and can reach the build machine's loopback services.
+ *
  * ⚠ **The environment is an allowlist.** The container receives only the
  * variables named below, plus two CANARIES: random values under the `VITE_` and
  * `WCONF_` prefixes. `REVIEW-058` M11 saw a `VITE_` variable inlined into the
- * bundle; if either canary's value appears anywhere in the output, the build
- * fails.
+ * bundle; if either canary's value appears VERBATIM anywhere in the output, the
+ * build fails. ⚠ That is all it proves: an encoded copy, or a variable sent
+ * over the network during install, is not seen (`REVIEW-059` R1-11).
  *
  * ⚠ **It builds a COMMIT, never a working tree.** What the footer names is what
  * was built. `--worktree` exists for local trials only: it copies the working
  * tree, names `HEAD` in the footer, and marks the manifest `trial`, which
- * `deploy.ts` refuses.
+ * `deploy-preflight.ts` refuses.
+ *
+ * ⚠ **And the tree it builds is checked against the commit, file for file.**
+ * `REVIEW-059` R1-10, measured with a real build: a file left in a reused
+ * `--out` survived the extraction and reached the output of a build whose
+ * footer named a commit that does not contain it. So `--out` must be new or
+ * empty, the workspace is removed even when a build fails, and the exported
+ * tree must list exactly the commit's files before any container runs. ⚠ It
+ * does not see dependency code changing `/src` DURING the build.
  */
 
 import { createHash, randomBytes } from "node:crypto";
-import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
+import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from "node:fs";
 import { tmpdir } from "node:os";
-import { isAbsolute, join, resolve } from "node:path";
+import { dirname, isAbsolute, join, resolve } from "node:path";
 import { RISK_ACCEPTANCE_PHRASE } from "../../facility/src/loopback.ts";
 
 /**
@@ -56,7 +74,7 @@ function args(argv: string[]) {
 }
 
 /** The source tree, exported into `dest`: a commit's archive, or a trial's working tree. */
-function exportSource(repo: string, dest: string, worktree: boolean, commit?: string): string {
+export function exportSource(repo: string, dest: string, worktree: boolean, commit?: string): string {
   mkdirSync(dest, { recursive: true });
   if (worktree) {
     const files = run(["git", "-C", repo, "ls-files", "-z", "--cached", "--others", "--exclude-standard"]).split("\0").filter(Boolean);
@@ -70,20 +88,66 @@ function exportSource(repo: string, dest: string, worktree: boolean, commit?: st
   return full;
 }
 
-/** Inside the container. `set -eu`, and the store checks come before anything third-party runs. */
+/** Every file and link under `dir`, relative to it, in `git ls-tree` form. */
+export function listTree(dir: string): string[] {
+  const out: string[] = [];
+  const walk = (rel: string) => {
+    for (const name of readdirSync(join(dir, rel))) {
+      const r = rel ? `${rel}/${name}` : name;
+      const st = lstatSync(join(dir, r));
+      if (st.isDirectory() && !st.isSymbolicLink()) walk(r);
+      else out.push(r);
+    }
+  };
+  walk("");
+  return out.sort();
+}
+
+/**
+ * The exported tree, against the commit's own file list. Any extra or missing
+ * path is refused before a container runs (`REVIEW-059` R1-10).
+ */
+export function checkExportedTree(src: string, committed: string[]): string[] {
+  const have = new Set(listTree(src)), want = new Set(committed);
+  const extra = [...have].filter((p) => !want.has(p)), missing = [...want].filter((p) => !have.has(p));
+  return [...extra.map((p) => `${p} is in the build tree and not in the commit`), ...missing.map((p) => `${p} is in the commit and not in the build tree`)];
+}
+
+/**
+ * Where a build may write: a new or empty directory outside the repository it
+ * builds. ⚠ It refused only an existing `.vercel` before, so a failed build's
+ * workspace could be reused, and `out === repoTop` passed the prefix test.
+ */
+export function outProblems(out: string, repoTop: string): string[] {
+  const real = (p: string) => { let q = p; while (!existsSync(q)) q = dirname(q); return join(realpathSync(q), p.slice(q.length)); };
+  const o = real(out), top = realpathSync(repoTop);
+  const problems: string[] = [];
+  if (o === top || o.startsWith(top + "/")) problems.push("--out must be outside the repository, so no build file lands in a tree that can be committed");
+  if (existsSync(out) && readdirSync(out).length) problems.push(`${out} is not empty; use a new directory for each build, because a reused one can carry files into the output`);
+  return problems;
+}
+
+/** Inside the containers. `set -eu`, and the store checks come before anything third-party runs. */
 // ⚠ One command per line: `set -e` does not stop on a failure inside an `&&`
 // list, and the first version ran the next step after Vite had failed.
+const STORE_CHECK = 'for p in /tmp/wconf "$HOME/.wconf"; do if [ -e "$p" ]; then echo "REFUSED: $p exists inside the build container" >&2; exit 3; fi; done';
 const CONTAINER_SCRIPT = [
   "set -eu",
-  'for p in /tmp/wconf "$HOME/.wconf"; do if [ -e "$p" ]; then echo "REFUSED: $p exists inside the build container" >&2; exit 3; fi; done',
+  STORE_CHECK,
   "bun install --frozen-lockfile",
   "mkdir -p web/hosted/.build",
   "bun run web/hosted/snapshot.ts web/hosted/.build/snapshot.json",
+].join("\n");
+/** The second container: no network at all. */
+const OFFLINE_SCRIPT = [
+  "set -eu",
+  STORE_CHECK,
   "cd web/app",
   "bunx vite build --config vite.hosted.config.ts",
   "cd /src",
   "bun run web/hosted/vercel-output.ts web/app/dist/client web/hosted/.build",
 ].join("\n");
+export const OFFLINE_ARGS = ["--network", "none"];
 
 /** Build (or reuse) the image named by the Dockerfile's hash. */
 function image(): string {
@@ -97,13 +161,26 @@ export async function build(argv: string[]) {
   const a = args(argv);
   const out = resolve(a.out);
   if (!isAbsolute(out)) throw new Error("--out must resolve to an absolute path");
-  if (existsSync(join(out, ".vercel"))) throw new Error(`${out}/.vercel exists; use a fresh --out for each build`);
   const repoTop = run(["git", "-C", a.repo, "rev-parse", "--show-toplevel"]).trim();
-  if (out.startsWith(repoTop + "/")) throw new Error("--out must be outside the repository, so no build file lands in a tree that can be committed");
+  const refused = outProblems(out, repoTop);
+  if (refused.length) throw new Error(refused.join("; "));
 
   const work = join(out, "work");
+  try {
+    await buildInto(a, out, work, repoTop);
+  } finally {
+    rmSync(work, { recursive: true, force: true });
+  }
+}
+
+async function buildInto(a: ReturnType<typeof args>, out: string, work: string, repoTop: string) {
   const src = join(work, "src");
   const commit = exportSource(repoTop, src, a.worktree, a.commit);
+  if (!a.worktree) {
+    const committed = run(["git", "-C", repoTop, "ls-tree", "-r", "-z", "--name-only", commit]).split("\0").filter(Boolean);
+    const drift = checkExportedTree(src, committed);
+    if (drift.length) throw new Error(`the build tree is not the commit's: ${drift.slice(0, 5).join("; ")}${drift.length > 5 ? ` (and ${drift.length - 5} more)` : ""}`);
+  }
   const canaries = { VITE_WCONF_CANARY: randomBytes(12).toString("hex"), WCONF_CANARY: randomBytes(12).toString("hex") };
   const env: Record<string, string> = {
     WCONF_ACCEPT_REMOTE_LEDGER_RISK: RISK_ACCEPTANCE_PHRASE,
@@ -112,21 +189,25 @@ export async function build(argv: string[]) {
     ...canaries,
   };
   const IMAGE = image();
-  const docker = [
-    "docker", "--context", DOCKER_CONTEXT, "run", "--rm",
+  const docker = (extra: string[], script: string) => [
+    "docker", "--context", DOCKER_CONTEXT, "run", "--rm", ...extra,
     "-v", `${src}:/src`, "-w", "/src",
     ...Object.entries(env).flatMap(([k, v]) => ["-e", `${k}=${v}`]),
-    IMAGE, "sh", "-c", CONTAINER_SCRIPT,
+    IMAGE, "sh", "-c", script,
   ];
   console.log(`building ${commit}${a.worktree ? " (TRIAL: working tree)" : ""} in ${IMAGE}`);
-  const r = Bun.spawnSync(docker, { stdout: "pipe", stderr: "pipe" });
-  writeFileSync(join(out, "container.log"), r.stdout.toString() + "\n--- stderr ---\n" + r.stderr.toString());
-  if (r.exitCode !== 0) throw new Error(`the container build failed (${r.exitCode}); see ${join(out, "container.log")}`);
+  let log = "";
+  for (const [label, extra, script] of [["install and snapshot, with network", [], CONTAINER_SCRIPT], ["build and assemble, --network none", OFFLINE_ARGS, OFFLINE_SCRIPT]] as const) {
+    const r = Bun.spawnSync(docker([...extra], script), { stdout: "pipe", stderr: "pipe" });
+    log += `=== ${label}\n${r.stdout.toString()}\n--- stderr ---\n${r.stderr.toString()}\n`;
+    writeFileSync(join(out, "container.log"), log);
+    if (r.exitCode !== 0) throw new Error(`the container step "${label}" failed (${r.exitCode}); see ${join(out, "container.log")}`);
+  }
 
   cpSync(join(src, "web/hosted/.build/.vercel"), join(out, ".vercel"), { recursive: true });
   const snapshot = JSON.parse(readFileSync(join(src, "web/hosted/.build/snapshot.json"), "utf8"));
 
-  // The canaries: neither value may appear anywhere in what is uploaded.
+  // The canaries: neither value may appear verbatim anywhere in what is uploaded.
   const leaked = leakedCanaries(join(out, ".vercel"), Object.values(canaries));
   if (leaked.length) throw new Error(`a build variable reached the output (REVIEW-058 M11): ${leaked.join(", ")}`);
 
@@ -139,13 +220,13 @@ export async function build(argv: string[]) {
     builtAt: new Date().toISOString(),
     snapshot: { ledgerIndex: snapshot.source.ledgerIndex, readAt: snapshot.readAt, endpoint: snapshot.source.endpoint, canonicalUrl: snapshot.canonicalUrl },
     environment: Object.keys(env).sort(),
-    canaries: "two random values, under VITE_ and WCONF_; neither appears in the output",
+    canaries: "two random values, under VITE_ and WCONF_; neither appears verbatim in the output",
     isolation:
-      `the container mounted only ${a.worktree ? "a copy of the working tree (TRIAL)" : "a git archive of the commit"}; ` +
-      "it checked /tmp/wconf and ~/.wconf absent before installing; no deployment token was present",
+      `the containers mounted only ${a.worktree ? "a copy of the working tree (TRIAL)" : "a git archive of the commit, checked file for file against the commit before they ran"}; ` +
+      "each checked /tmp/wconf and ~/.wconf absent before running anything else; install and the snapshot had network, " +
+      "and could reach the build machine's loopback; the Vite build and the assembler ran with --network none; no deployment token was present",
   };
   writeFileSync(join(out, "build-manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
-  rmSync(work, { recursive: true, force: true });
   console.log(`built ${join(out, ".vercel/output")} from ${commit} at ledger ${snapshot.source.ledgerIndex}; manifest at ${join(out, "build-manifest.json")}`);
   console.log(`next: bun run tools/check-web-readonly.ts --hosted ${out} --commit ${commit}`);
 }
@@ -161,7 +242,7 @@ export function leakedCanaries(dir: string, values: string[]): string[] {
  * The build's own controls, through the same container script and the same
  * leak check the build runs. Needs Docker; reads no ledger.
  */
-export function selfTest(): string[] {
+export async function selfTest(): Promise<string[]> {
   const failed: string[] = [];
   const tag = image();
   // The image's own home directory, asked rather than assumed: its user is set
@@ -169,9 +250,29 @@ export function selfTest(): string[] {
   const home = run(["docker", "--context", DOCKER_CONTEXT, "run", "--rm", tag, "sh", "-c", 'printf %s "$HOME"']).trim();
   if (!home.startsWith("/")) failed.push(`the image reported no home directory (${JSON.stringify(home)})`);
   for (const store of ["/tmp/wconf", `${home}/.wconf`]) {
-    const r = Bun.spawnSync(["docker", "--context", DOCKER_CONTEXT, "run", "--rm", "--tmpfs", store, tag, "sh", "-c", CONTAINER_SCRIPT], { stdout: "pipe", stderr: "pipe" });
-    const err = r.stderr.toString();
-    if (r.exitCode !== 3 || !err.includes(`REFUSED: ${store} exists`)) failed.push(`a decoy ${store} was not refused before install (exit ${r.exitCode}: ${err.trim().slice(0, 200)})`);
+    for (const [label, extra, script] of [["install", [], CONTAINER_SCRIPT], ["offline build", OFFLINE_ARGS, OFFLINE_SCRIPT]] as const) {
+      const r = Bun.spawnSync(["docker", "--context", DOCKER_CONTEXT, "run", "--rm", ...extra, "--tmpfs", store, tag, "sh", "-c", script], { stdout: "pipe", stderr: "pipe" });
+      const err = r.stderr.toString();
+      if (r.exitCode !== 3 || !err.includes(`REFUSED: ${store} exists`)) failed.push(`a decoy ${store} was not refused before the ${label} step (exit ${r.exitCode}: ${err.trim().slice(0, 200)})`);
+    }
+  }
+  // The offline step's network, through the same arguments the build passes:
+  // a fetch to the ledger and one to a listener on the build machine's
+  // loopback must both fail. ⚠ The loopback half first aimed at a port where
+  // nothing listened, so it was unreachable WITH network too and tested
+  // nothing; found by running this with the offline arguments removed. ⚠ And
+  // the container is spawned ASYNCHRONOUSLY: a synchronous spawn blocks this
+  // process, so its own listener could not answer and every probe timed out.
+  const listener = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch: () => new Response("listening") });
+  try {
+    for (const url of ["https://s.devnet.rippletest.net:51234/", `http://host.docker.internal:${listener.port}/`]) {
+      const proc = Bun.spawn(["docker", "--context", DOCKER_CONTEXT, "run", "--rm", ...OFFLINE_ARGS, tag, "bun", "-e",
+        `try { await fetch(${JSON.stringify(url)}, { signal: AbortSignal.timeout(5000) }); console.log("REACHED") } catch { console.log("UNREACHABLE") }`], { stdout: "pipe", stderr: "pipe" });
+      const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited]);
+      if (!stdout.includes("UNREACHABLE")) failed.push(`the offline step reached ${url} (${stdout.trim()} ${stderr.trim().slice(0, 120)})`);
+    }
+  } finally {
+    listener.stop(true);
   }
   const d = mkdtempSync(join(tmpdir(), "wconf-build-self-test-"));
   try {
@@ -188,7 +289,7 @@ export function selfTest(): string[] {
 
 if (import.meta.main) {
   if (process.argv.includes("--self-test")) {
-    const failed = selfTest();
+    const failed = await selfTest();
     for (const f of failed) console.log(`  CONTROL FAILED: ${f}`);
     console.log(`build self-test: verdict=${failed.length ? "CONTROL-FAILED" : "PASS"} exit=${failed.length ? 2 : 0}`);
     process.exit(failed.length ? 2 : 0);
````

## capabilities-visible.txt

````
W-CONF: confidential MPT on the XRPL DevnetDevnet snapshot · signs nothing, holds no keys · not secure, not audited, not production-ready (P-5)
W-CONF
What confidential MPT on the XRP Ledger hides, and what it does not. A research project, shown on one snapshot of the Devnet.OverviewCapability matrixObserver viewIssuer viewWalletCustody
Capability matrix
What each key source can and cannot do. The ElGamal key encrypts and decrypts confidential balances; the XRPL account key signs. The rows follow the signer’s ownKeySource type, which has two variants, and rows that are not built say so.key sourcedecrypt own balanceprove + sign confidentialpublic transactionsexists todayGenerated demo seed, faucet-fundedderived-from-master-seedyesThe ElGamal secret is derived from the master seed, so the signer rebuilds it from the seed alone.docs/reviews/REVIEW-012-RULING-keygen-2026-08-18.md; signer/src/keygen.rsyesOne seed gives both the ElGamal secret and the XRPL account key.signer/src/keygen.rs; signer/src/onboarding.rsyesAn ordinary XRPL account. Public transactions are unaffected.signer/src/xrpl.rsbuiltsigner/src/onboarding.rsExisting Devnet seed, pastedderived-from-master-seedyesSame as a generated seed: the derivation does not depend on where the seed came from.signer/src/keygen.rsconditionalOnly if the master key controls the account. With a regular key or a signer list, spending authority may sit elsewhere, so the signer warns; with lsfDisableMaster it refuses.signer/src/session.rs (REFUSED_MASTER_KEY_DISABLED); issue #11; REVIEW-012 condition 2yesAn ordinary XRPL account.signer/src/xrpl.rsbuiltsigner/src/onboarding.rsStandalone ElGamal keystandaloneyesA separate ElGamal secret kept in the profile: two secrets to keep instead of one.signer/src/onboarding.rs:279; signer/src/holder.rs:48conditionalThe ElGamal key decrypts and proves but does not sign; the account key is a separate secret. A custody platform ends up here, and who then holds the ElGamal key is an open question (E-117).CLAIMS.md E-117; signer/src/holder.rsyesUnaffected: the ElGamal key plays no part in public transactions.signer/src/xrpl.rsbuiltsigner/src/holder.rs — KeySource::StandaloneBrowser wallet extensionnoDecrypting needs the ElGamal secret, which is derived from the master seed, and a wallet exists to keep the seed in. None of the three wallets examined on 2026-08-28 (Xaman, GemWallet, Crossmark) decrypts for a page or gives it a key. A wallet that derived the key and decrypted internally could; none examined does (E-329).REVIEW-012 (derivation from master seed); ADR-0003 D2noA confidential transaction needs the ElGamal secret and the account key. These wallets supply only the account key, so a page cannot assemble the transaction through them. A wallet that held the ElGamal key and built the proofs itself could; none examined does (E-329).ADR-0003 D2; signer/src/keygen.rsyesOrdinary transactions are what a wallet is for. Per each vendor's docs on 2026-08-28, the GemWallet, Crossmark and Xaman APIs accept any transaction type to sign and submit.gemwallet.app API reference; docs.crossmark.io; docs.xaman.dev (all read 2026-08-28)not builtnot built, for the reasons in this rowCustody platform (simulated)standaloneconditionalOnly with a standalone ElGamal key, held by something other than the custody platform, or if the platform itself ran the derivation inside its own boundary, which would need the derivation published as a standard (issue #10). Outside the platform the account cannot derive its key, because that needs the seed, and a custody platform never releases the seed.REVIEW-012; CLAIMS.md E-117conditionalThe external signer can sign. Holding only public data, it cannot apply a policy to the amount, because the transaction carries a proof, not a value: a rule like 'two approvers above $1M' has nothing to read.docs/research/CUSTODY-2026-08-28.md; CLAIMS.md P-4yesPublic transactions carry plain amounts, so approval policies work as usual.docs/research/CUSTODY-2026-08-28.mdnot builtSimulation: an external-signer stub. No MPC, no HSM, no integration.
Shown before the seed is asked for
The master seed becomes a permanent decryption credential. Anyone who ever holds it can decrypt every confidential balance this account has held, past and future. XLS-96 has no key rotation and no key recovery (P-10), so this cannot be undone.
The derivation is specified only in this repository and is not a published standard. A holder with their seed but without this repository cannot reconstruct their key. Issue #10 tracks this.
Required by the key-derivation ruling, REVIEW-012 condition 2.
What no key source changes
P-4No key source hides identities. The sender and receiver of every confidential transaction are public.
P-9A holder is never private from the issuer. The issuer can always decrypt.
P-10No key source supports rotation or recovery. XLS-96 supports neither.
P-11No key source hides who transacts, when, or how often. Only amounts are hidden.
F-1A newly created confidential balance is publicly identifiable as exactly zero.
F-24Retiring a position in tranches publishes each tranche size.
P-5None of this is secure, audited, non-custodial or production-ready, and the custody mode is a simulation.
Built from commit c08db2befb17 of the public repository. Ledger values were read at validated ledger 6270649 on 2026-10-20T11:45:28.415Z.
This page is published at https://xrpl-confidential-positions.vercel.app. A copy hosted anywhere else is not this build.
Gate verdict: not loaded (it is read from /gate-verdict.json once the page's script runs) (gate-verdict.json). This is the gate's record, published with the build; your browser shows it and does not check it against the files it loaded.
Third-party licences for the code in these pages: third-party-licenses.txt````

## changed-files-audit.txt

````
CLAIMS.md	655228 bytes	525 lines	sha256 2f31b48de80e111f107e9ac6928e4119365a202dcfa1ddb6e5054df9401fa4fd
CLAUDE.md	69343 bytes	300 lines	sha256 bd7cc3c9228c54ba96c23492852ddfec10522dca29263aed412ef6d4db464a9b
GETTING-STARTED-CLAUDE-CODE.md	26751 bytes	406 lines	sha256 8ac0b4b518b63e83c80d5eb959ced1c2b4d3acda949b2fe9f765e3f8e3bb8ed9
README.md	22075 bytes	214 lines	sha256 06793fd07797ce51bee8b4c3138b7a72ab57a73390105acf719acc52b883256f
docs/CLAIMS-INDEX.md	69475 bytes	461 lines	sha256 b8b8a028ca60dd83faf9766c314fc9e067681f96b1f9835c6939f34365adefa6
docs/CLAIMS-REVISIONS.md	23284 bytes	232 lines	sha256 0585fdea3464fa49621a50b627e2be8c9bfbc85f379c83c4324eb360a5110aee
docs/NEXT-SESSION-PROMPT.md	27153 bytes	182 lines	sha256 3fee1c9baafaeadf9b7731cdea0b69374cc951bf95ef7e057cde1d19bf4e73da
docs/architecture/ARCHITECTURE-2026-08-18.md	78443 bytes	299 lines	sha256 a894bdaff85e15b1ea48d9098f3711d68c6041f8381277031cc837158a1e77d8
docs/claims/by-topic/README.md	3716 bytes	43 lines	sha256 a2b2c4feb3aeb36d1e73649c51b1318aa190cd1c68fcb33c45d7c6881c8769c9
docs/claims/by-topic/claims-and-drift.md	18688 bytes	113 lines	sha256 5312553030a45c72712685408fc3ee88b0a9dc9ec8286e0613d224d8452e00b9
docs/claims/by-topic/confidentiality-limits.md	7069 bytes	54 lines	sha256 8b8a6f94d6a7e4c0a5b45550825ef1d8a63cc7e11ecdcf803f4650fc042e2870
docs/claims/by-topic/decisions-and-scope.md	18053 bytes	109 lines	sha256 92cf7881f86be2c21d5e0fa99823c323f3120c098d77453feba9040334c8072d
docs/claims/by-topic/devnet-execution.md	10681 bytes	74 lines	sha256 53d1618791ec11e8724f3407f47b109930ca0bb5e3f617ce93d665c2f993af2e
docs/claims/by-topic/environment-and-tooling.md	4087 bytes	38 lines	sha256 cf34b89282292cb536f50991a58b647d389d255cfac1a4be84df276e631b9c2d
docs/claims/by-topic/instruments-and-gates.md	18035 bytes	111 lines	sha256 8ac1fd43caffe92bff584ac93ae4ab045d74ae4f2bb21970b05cf781b9a255e9
docs/claims/by-topic/protocol-and-crypto.md	29266 bytes	180 lines	sha256 347b5ee90cdf6efd6ee1cd09a017728fef6af5b8d83b4acb4ff3463e43956b0b
docs/claims/by-topic/review-rounds.md	17594 bytes	107 lines	sha256 aa60db84a860c12b2d0c0ca2f84356b1709194fe6d51f1297fdccd73d451ed89
docs/claims/by-topic/secret-handling.md	10537 bytes	71 lines	sha256 a19093e6de50cb0aa2a92149a51c2ca502cc75e98cc01b3f68c3d57b147756ac
docs/claims/by-topic/upstream-and-filings.md	13162 bytes	87 lines	sha256 c9d44c45dba66289f53fcc5e8c09cc9b0deeabd6454f76f35be6a3b3c60669ea
docs/claims/by-topic/web-tier.md	3990 bytes	36 lines	sha256 7d5246885d6bcaa58c197dc90b9ea077b087608a18633a5178a7e8582a82b3a6
docs/decisions/ADR-0004-hosted-demo-trust-boundary.md	36593 bytes	458 lines	sha256 d9349299922ddd0b50e2eb7c9e05c72dea29acdf144e2b4e50738495582fea1b
docs/explainer/WEB-TIER-DEMO-SCRIPT-2026-08-28.md	11754 bytes	227 lines	sha256 4319ff24977403bb1bd3b4b24d4d447bbaacc3d01644cc99a44c65dcbb8d030c
facility/src/loopback.ts	29701 bytes	641 lines	sha256 6a0597ad79a31d1f843cd2405d4130a6ff2117bceba642720cdbf64df8a908b6
facility/tests/loopback.test.ts	17180 bytes	401 lines	sha256 da142ede57fc3d94f8d2d8c97d637e00e2269cce18115fde6706cfc3b05e7719
tools/build-claims-topics.ts	27287 bytes	497 lines	sha256 bbdf727ccf2f5d7bbd8a782d53591aa0da55f116bccb4fb41dd37a20a5e449e2
tools/check-web-hosted.ts	35653 bytes	505 lines	sha256 7cd3463c07566b1d5eb27ef4dc92b9011c9f4104578a0345460bc45232b019be
web/api/capability.ts	11127 bytes	229 lines	sha256 3b054289a56650f45c388f06b5d7549d6f4281db47b94a0bb0ddc5a91dec6693
web/api/custody-sim.ts	6357 bytes	129 lines	sha256 920a632e388398ced01a66bf63472c15ac0ef5bf424056b1fce1e5802b11c116
web/api/demo-accounts.ts	3055 bytes	74 lines	sha256 63610c0c962f9adb672ad394e1e1eaebf7964cd845426ac669ac8cce02df3c21
web/api/disclosure.test.ts	29622 bytes	604 lines	sha256 b441ae5c67b5a81760e6cb0386560956fc7353124ba87b991ec381d6e6f70e86
web/api/observer.ts	6495 bytes	155 lines	sha256 ec8d273f9d5ef3c790ce13bbc006dbce3f43ec145ee8d708c0ee6b3148ea64b5
web/app/src/hosted/Footer.tsx	2410 bytes	53 lines	sha256 621b0a98151ffc8053b20f41b391296f03813c58a53e109bd4c8b09e0bd464ed
web/app/src/views/CustodyView.tsx	4679 bytes	91 lines	sha256 a05a6b65821444768e9ae49215594b5431df1d2657080358b6804461bba6043b
web/app/vite.hosted.config.ts	4966 bytes	106 lines	sha256 e018765aba269b243ff3d35cc428c619cd6baf24fc8c92406f2d187327633e2c
web/hosted/README.md	7113 bytes	56 lines	sha256 e20186cbfd3fca38dc625f212261671f8d0fad850635900acfd7bee931b336a4
web/hosted/browser-check.ts	16260 bytes	268 lines	sha256 acdd27c5c446ce022245f79db7ea9cd8e24b30e31bc2aaa4f86a7212b110e5a1
web/hosted/build.test.ts	3330 bytes	67 lines	sha256 211ce39272d08013a814bb4ed316fe53db8880bb3ffcb2584d78e900bf60e725
web/hosted/build.ts	17181 bytes	298 lines	sha256 c6e482a45a6851bff143abbac825d7056a2a02d112ef1730aae0cfcadbf6771b
web/hosted/compare-deployed.ts	5127 bytes	90 lines	sha256 bd230d25650f86623e909de99ccd83e6bd5b323c167009ace1f493daf0baccd2
web/hosted/deploy-preflight.ts	6598 bytes	98 lines	sha256 100e9185690c8640b3fa3b17b723cdf86d8ba7e8157bea96881d5319784633a7
web/hosted/deploy.test.ts	9752 bytes	159 lines	sha256 84a43f6da3f28ac718e73d660b9fc23c6f4c8e2ed3287731fb5f09897884d39f
web/hosted/licence-notices.ts	2173 bytes	46 lines	sha256 94af13abedaf846430845c57c09f3f04bc095eba281812d00311966196e8c037
web/hosted/snapshot.test.ts	4465 bytes	89 lines	sha256 9ebb1ccbe4e4c8cc697ca16b8b41d6709a0edacbf67563e4376b7bdca240b04a
web/hosted/snapshot.ts	6405 bytes	134 lines	sha256 f673da8d375b8cb38ddca72805ed6ad731eaf9e5b47c84195eaf7511d05fc821
````

## custody-visible.txt

````
W-CONF: confidential MPT on the XRPL DevnetDevnet snapshot · signs nothing, holds no keys · not secure, not audited, not production-ready (P-5)
W-CONF
What confidential MPT on the XRP Ledger hides, and what it does not. A research project, shown on one snapshot of the Devnet.OverviewCapability matrixObserver viewIssuer viewWalletCustody
This is a simulation
No custody platform is integrated behind this page: no MPC, no HSM, no Harmonize. It models a key-source shape, a standalone ElGamal key plus an external signer, to show which flows survive and which break.
Two findings
1. The derived key does not work with custodial key management
The ElGamal secret is derived from the master seed, and a custody platform never releases the seed. So the account cannot derive its own ElGamal key or read its own confidential balance outside the platform. A platform that ran the derivation inside its own boundary would change that; it would need the derivation published as a standard, and it is not (issue #10).
A standalone ElGamal key gets around this, but then something outside the custody platform holds a permanent decryption key. Who that should be is an open question in this project (CLAIMS.md E-117).
2. Approval policies cannot read a confidential amount
An approval workflow that holds only public data sees a proof, not a value, so a rule like “two approvers above $1M” has nothing to check. This is structural, not an integration detail: confidentiality and amount-based approval policies pull against each other. The ways out each cost something: give the policy engine the ElGamal secret, and it becomes another party that reads every balance; accept the holder’s statement of the amount, and the policy rests on the holder’s honesty; or prove the bound in zero knowledge, which this project has neither built nor costed.
Which flows survive, and which break
Each flow lists what it needs, and the verdict is computed from what a custody-shaped key source has.
Note 1: Only with a standalone ElGamal key, held outside the custody platform (E-117).survives: Send a public XRPL paymentbreaks: Onboard with the ruled derived key
Structural in this simulation: a custody platform never releases seed material, so the account cannot derive its own ElGamal key outside the platform. A platform that ran the derivation inside its own boundary would change this, and that needs the derivation published (issue #10).survives: Onboard with a standalone ElGamal key (note 1)survives: Read own confidential balance (note 1)survives: Send a confidential amount (note 1)breaks: Send confidentially, under an amount-capped approval policy (note 1)
Structural: the transaction carries a proof, not a value, so a rule like 'two approvers above $1M' has no amount to read. It is hidden from this simulation's policy engine too, which holds only public data.survives: Send confidentially, under a destination-allowlist policy (note 1)survives: Retire a position in tranches (note 1)
Each tranche size and its timing is public: the amount is plaintext on every ConvertBack (CLAIMS.md F-24).
Built from commit c08db2befb17 of the public repository. Ledger values were read at validated ledger 6270649 on 2026-10-20T11:45:28.415Z.
This page is published at https://xrpl-confidential-positions.vercel.app. A copy hosted anywhere else is not this build.
Gate verdict: not loaded (it is read from /gate-verdict.json once the page's script runs) (gate-verdict.json). This is the gate's record, published with the build; your browser shows it and does not check it against the files it loaded.
Third-party licences for the code in these pages: third-party-licenses.txt````

## issuer-visible.txt

````
W-CONF: confidential MPT on the XRPL DevnetDevnet snapshot · signs nothing, holds no keys · not secure, not audited, not production-ready (P-5)
W-CONF
What confidential MPT on the XRP Ledger hides, and what it does not. A research project, shown on one snapshot of the Devnet.OverviewCapability matrixObserver viewIssuer viewWalletCustody
A holder is never private from the issuer
The protocol keeps a second copy of every confidential balance, the IssuerEncryptedBalance, encrypted to the issuer’s key. The issuer can always decrypt it, and no setting turns this off (CLAIMS.md P-9).
This page shows that each copy is on the ledger. It does not show the decrypted figures: a visitor could not check them, so this project does not publish them (ADR-0004 D-H3).
Where these values come fromread from https://s.devnet.rippletest.net:51234validated ledger 6270649 at 2026-10-20T11:45:28.415Znetwork_id 2 (Devnet) rippled 3.4.1
This page shows the XRPL Devnet, a test network. Its tokens have no value, and it is reset from time to time. Each value was read from Ripple's public Devnet endpoint, at the ledger and date shown, and a lying or lagging server behind it would have made it wrong. The page does not update: it shows Devnet as it was at that ledger, not as it is now. Nothing on this page signs or submits. Do not use a value shown here to build a transaction.
Vercel, which hosts this page, sees your IP address and the pages you open.
The issuanceMPTokenIssuanceID 004625C9F2DDC3E652071A9FFA07507F2151FEE332CB25E8issuer rP9wBAcBUXNDSiUNPgLRv2WWjMn1L8xzRaIssuerEncryptionKey 029DDE4953B75D741FC54DB86B44DF7E486E5B1BDFBCECD5F671B68E7E1CFD6CB9
Issuer's copy: Holder A — an active positionrHeah37pL6aFPf59nzWGwujPzSFkp4TUL8
One of the two accounts the observer view was first read against, on 2026-08-28 (CLAIMS.md E-208).
read at validated ledger 6270649IssuerEncryptedBalance 0227B2F019BB9F3887355B85C959B2011DBEF7AC80439E42514390BBB236CF43A80237189EBACB6E36B5C7AE7B8F251B8E97D55D37C3AC01B281F93C84C7395A75D3
Present, encrypted to the IssuerEncryptionKey above. It is a different ciphertext from the holder’s own balance.
Issuer's copy: Holder B — a derived-key accountrDYMkRMh7o7QfkNaoGvtd7TgFzmt12FEM8
Onboarded with the derived key, so its ElGamal key comes from its master seed.
read at validated ledger 6270649IssuerEncryptedBalance 034958E9C943B437E117E9021E017799168DF9EE45270FE310212BF8F5BA957C10035E00F894315900DBBE99B2BC859F4FB45ECDA17381C0768E4F5C2D435412302D
Present, encrypted to the IssuerEncryptionKey above. It is a different ciphertext from the holder’s own balance.
Issuer's copy: Holder C — the ed25519 signing accountrsc9Z29Qz6w99TnpECxbeU6vBs2L3E3CbY
The account the hedged ed25519 signing ran on. Its ledger view is ordinary: an observer cannot see the signing change.
read at validated ledger 6270649IssuerEncryptedBalance 022E7F2111A54AA7B0CA18EE831CB0BFCFF32FB4A4DBF2E10AAEB9ED5698657F9802EDC9E003481C3DB14F60A83767C9B88C53525104C1A408DA61677EFAE4887CD0
Present, encrypted to the IssuerEncryptionKey above. It is a different ciphertext from the holder’s own balance.
Issuer's copy: Holder D — an early spike accountrEVXh6wpmhKvuot95mNMb4DmkJsZqkdsWH
An early test account, kept as a second position to compare against.
read at validated ledger 6270649IssuerEncryptedBalance 03578671D93AB129EA4196A34214E45B4EA639DB43758C63D2516A457F7735CF5702C2587A7AAD3AFFD05A691C26390E5623C44DAE1E4FCFF5DC3952D5342563C93D
Present, encrypted to the IssuerEncryptionKey above. It is a different ciphertext from the holder’s own balance.
Built from commit c08db2befb17 of the public repository. Ledger values were read at validated ledger 6270649 on 2026-10-20T11:45:28.415Z.
This page is published at https://xrpl-confidential-positions.vercel.app. A copy hosted anywhere else is not this build.
Gate verdict: not loaded (it is read from /gate-verdict.json once the page's script runs) (gate-verdict.json). This is the gate's record, published with the build; your browser shows it and does not check it against the files it loaded.
Third-party licences for the code in these pages: third-party-licenses.txt````

## observer-visible.txt

````
W-CONF: confidential MPT on the XRPL DevnetDevnet snapshot · signs nothing, holds no keys · not secure, not audited, not production-ready (P-5)
W-CONF
What confidential MPT on the XRP Ledger hides, and what it does not. A research project, shown on one snapshot of the Devnet.OverviewCapability matrixObserver viewIssuer viewWalletCustody
Where these values come fromread from https://s.devnet.rippletest.net:51234validated ledger 6270649 at 2026-10-20T11:45:28.415Znetwork_id 2 (Devnet) rippled 3.4.1
This page shows the XRPL Devnet, a test network. Its tokens have no value, and it is reset from time to time. Each value was read from Ripple's public Devnet endpoint, at the ledger and date shown, and a lying or lagging server behind it would have made it wrong. The page does not update: it shows Devnet as it was at that ledger, not as it is now. Nothing on this page signs or submits. Do not use a value shown here to build a transaction.
Vercel, which hosts this page, sees your IP address and the pages you open.
Public
The account's address, and every account it has transacted with (P-4).
When each transaction happened, and how often (P-11).
The public MPT balance.
The issuance's ConfidentialOutstandingAmount: the total of all confidential balances.
The holder's encryption key, once registered.
The ConfidentialBalanceVersion, which counts changes to the balance.
Whether a confidential balance is exactly zero, when it holds the canonical encryption of zero. New, merged and clawed-back balances do; a balance spent down to zero does not (F-1, E-211).
Each tranche size, when a position is retired in tranches: the amount is plaintext on every ConvertBack (F-24).
Hidden
The value of a confidential balance that is not the canonical encryption of zero, even when that value is zero (E-211).
The amount of each ConfidentialMPTSend.
Both are hidden from observers, not from the issuer (P-9). Nothing else here is hidden.
Observer view: Holder A — an active positionrHeah37pL6aFPf59nzWGwujPzSFkp4TUL8
One of the two accounts the observer view was first read against, on 2026-08-28 (CLAIMS.md E-208).
read at validated ledger 6270649
What a full-ledger observer seespublic MPT balance 750registered trueConfidentialBalanceVersion 11ConfidentialOutstandingAmount 1364 (public: the total of all confidential balances)spending021D3288E7E5BF982641DF0ADCDB067DCFDBA95E312F0159A85E2A81B5496999B4029652CF4E578E5E03E539CBBBF04D57F5244A56D7FC1FDF4E8672E76418FDF947
Not the canonical encryption of zero, so an observer cannot tell the value. That is not the same as saying it is non-zero: a balance that reached zero by spending looks exactly like this. The issuer can still decrypt it (P-9).inbox03B67732AAE2EDB348088A27B147EE3D01387631CDDD357B12C24659F6EB26A04F02EE0D0A18BEED84DA931C481F57A712C8CC0731F822B5013ADE72739A0C3217C4
Publicly known to be exactly zero. This is the canonical encryption of zero, which anyone can recompute from the holder's public key, the account and the issuance, with no secret (CLAIMS.md F-1).
Observer view: Holder B — a derived-key accountrDYMkRMh7o7QfkNaoGvtd7TgFzmt12FEM8
Onboarded with the derived key, so its ElGamal key comes from its master seed.
read at validated ledger 6270649
What a full-ledger observer seespublic MPT balance 586registered trueConfidentialBalanceVersion 5ConfidentialOutstandingAmount 1364 (public: the total of all confidential balances)spending02C8F5B45590A1CF7F9006F974DAA91FFD7C64FAA85FC2964F18F6495E23577313028556C7AA02F610759762A7449B7AF4A4A4EDFA73F8BF96BF93A09DFB09B87EBC
Not the canonical encryption of zero, so an observer cannot tell the value. That is not the same as saying it is non-zero: a balance that reached zero by spending looks exactly like this. The issuer can still decrypt it (P-9).inbox03C9FC4098EDC4B287A3873E21ABCA828FFE9CF50150DEE079221267F21AD8535D0289A21820DDA63C5FB4BC107A710898DBB7F10E5EEE4B8DBA205D7D8967CD8214
Publicly known to be exactly zero. This is the canonical encryption of zero, which anyone can recompute from the holder's public key, the account and the issuance, with no secret (CLAIMS.md F-1).
Observer view: Holder C — the ed25519 signing accountrsc9Z29Qz6w99TnpECxbeU6vBs2L3E3CbY
The account the hedged ed25519 signing ran on. Its ledger view is ordinary: an observer cannot see the signing change.
read at validated ledger 6270649
What a full-ledger observer seespublic MPT balance 30registered trueConfidentialBalanceVersion 0ConfidentialOutstandingAmount 1364 (public: the total of all confidential balances)spending031AE5A70B242D81691C1FC43D684FCD908BC7DCCC07CE3ED7DD1096A9575F5D1C03CE6F696A2AACEBEB02E4728249B72E362D2DD76754F084B819A289628691F31C
Publicly known to be exactly zero. This is the canonical encryption of zero, which anyone can recompute from the holder's public key, the account and the issuance, with no secret (CLAIMS.md F-1).inbox022E7F2111A54AA7B0CA18EE831CB0BFCFF32FB4A4DBF2E10AAEB9ED5698657F980348759FC36C71AE3F6FE16A6904C23312D36DEFAAE95A9A2C9EE7DA7E6F84D9F2
Not the canonical encryption of zero, so an observer cannot tell the value. That is not the same as saying it is non-zero: a balance that reached zero by spending looks exactly like this. The issuer can still decrypt it (P-9).
Observer view: Holder D — an early spike accountrEVXh6wpmhKvuot95mNMb4DmkJsZqkdsWH
An early test account, kept as a second position to compare against.
read at validated ledger 6270649
What a full-ledger observer seespublic MPT balance 0registered trueConfidentialBalanceVersion 4ConfidentialOutstandingAmount 1364 (public: the total of all confidential balances)spending0382CD36EC99297C61FE6D878C8ED59CFE0C38EEB36A316EB0FE0AC8379FC66A9603A2AA18361F6ACFBE85FDC97EEAC7F6822C5767CB74256564FDA95009C6E11A17
Not the canonical encryption of zero, so an observer cannot tell the value. That is not the same as saying it is non-zero: a balance that reached zero by spending looks exactly like this. The issuer can still decrypt it (P-9).inbox0266912F17A098DC7E54BFEC56277DEA0422888A0212874D411A841E385A1D1D4D0240B6B9DB0AF95113717F95B056815D5B3A1C69FE596518ACB564F0A5E92FECE5
Publicly known to be exactly zero. This is the canonical encryption of zero, which anyone can recompute from the holder's public key, the account and the issuance, with no secret (CLAIMS.md F-1).
Built from commit c08db2befb17 of the public repository. Ledger values were read at validated ledger 6270649 on 2026-10-20T11:45:28.415Z.
This page is published at https://xrpl-confidential-positions.vercel.app. A copy hosted anywhere else is not this build.
Gate verdict: not loaded (it is read from /gate-verdict.json once the page's script runs) (gate-verdict.json). This is the gate's record, published with the build; your browser shows it and does not check it against the files it loaded.
Third-party licences for the code in these pages: third-party-licenses.txt````

## opened-files.txt

````
Inspection and sweep inputs, including removed output copies. Ordinary runtime module loading and test-created fixtures are excluded.

.claude/agents/build-lead.md
.claude/agents/crypto-reviewer.md
.claude/agents/protocol-researcher.md
.claude/commands/claims-check.md
.claude/commands/feedback-capture.md
.claude/commands/issue-review.md
.claude/commands/task-zero.md
.claude/commands/upstream-issue.md
.github/ISSUE_TEMPLATE/bug.md
.github/ISSUE_TEMPLATE/claim-is-wrong.md
.github/ISSUE_TEMPLATE/config.yml
.github/pull_request_template.md
.github/workflows/ci.yml
.gitignore
CLAIMS.md
CLAUDE.md
CODE_OF_CONDUCT.md
CONTRIBUTING.md
GETTING-STARTED-CLAUDE-CODE.md
LICENSE
LICENSES/XRPL-Standards-MIT.txt
LICENSES/clio-ISC.md
LICENSES/ed25519-dalek-BSD-3-Clause.txt
LICENSES/emscripten-MIT-NCSA.txt
LICENSES/noble-curves-MIT.txt
LICENSES/ripple-binary-codec-ISC.txt
LICENSES/rippled-ISC.md
LICENSES/serde_json-MIT.txt
LICENSES/xrpl-dev-portal-MIT.txt
LICENSES/xrplf-mpt-crypto-ISC.txt
Makefile
NOTICE
PREFLIGHT.md
README.md
SECURITY.md
UPSTREAM-FEEDBACK.md
bun.lock
docs/CLAIMS-INDEX.md
docs/CLAIMS-REVISIONS.md
docs/EMPHASIS-DISCIPLINE.md
docs/NEXT-SESSION-PROMPT.md
docs/PLAN-PUBLIC-LAUNCH-2026-09-22.md
docs/UPSTREAM-FILING-PROTOCOL.md
docs/VOCABULARY.md
docs/architecture/ARCHITECTURE-2026-08-18.md
docs/claims/by-topic/README.md
docs/claims/by-topic/claims-and-drift.md
docs/claims/by-topic/confidentiality-limits.md
docs/claims/by-topic/counts-and-numbers.md
docs/claims/by-topic/decisions-and-scope.md
docs/claims/by-topic/devnet-execution.md
docs/claims/by-topic/environment-and-tooling.md
docs/claims/by-topic/instruments-and-gates.md
docs/claims/by-topic/protocol-and-crypto.md
docs/claims/by-topic/review-rounds.md
docs/claims/by-topic/secret-handling.md
docs/claims/by-topic/upstream-and-filings.md
docs/claims/by-topic/web-tier.md
docs/decisions/ADR-0001-key-custody-and-proof-location.md
docs/decisions/ADR-0002-facility-as-application-logic.md
docs/decisions/ADR-0003-web-tier-trust-boundary.md
docs/decisions/ADR-0004-hosted-demo-trust-boundary.md
docs/decisions/B-22-EVIDENCE-derivation-residue-2026-08-27.md
docs/decisions/DECISION-REQUEST-b15-step7-ledger-source-2026-08-24.md
docs/decisions/DECISION-REQUEST-b22-derivation-residue-2026-08-27.md
docs/decisions/DECISION-REQUEST-e117-custody-of-the-float-2026-09-11.md
docs/decisions/DECISION-REQUEST-issue-10-publish-keygen-derivation-2026-08-26.md
docs/decisions/DECISION-REQUEST-phase-1-publication-2026-10-18.md
docs/decisions/DECISION-REQUEST-public-or-private-2026-09-13.md
docs/decisions/DECISION-b19-ed25519-zeroize-2026-08-27.md
docs/evidence/f12-emsdk-2026-10-18/README.md
docs/evidence/f12-emsdk-2026-10-18/logs/00-clone.log
docs/evidence/f12-emsdk-2026-10-18/logs/01-source.log
docs/evidence/f12-emsdk-2026-10-18/logs/02-environment.log
docs/evidence/f12-emsdk-2026-10-18/logs/02b-environment-vars.log
docs/evidence/f12-emsdk-2026-10-18/logs/03-emsdk-tags.log
docs/evidence/f12-emsdk-2026-10-18/logs/04-worktrees.log
docs/evidence/f12-emsdk-2026-10-18/logs/05-cause-changelog.log
docs/evidence/f12-emsdk-2026-10-18/logs/05b-cause-changelog-6.0.12-context.log
docs/evidence/f12-emsdk-2026-10-18/logs/06-runner-scripts.log
docs/evidence/f12-emsdk-2026-10-18/logs/07-byte-identity.log
docs/evidence/f12-emsdk-2026-10-18/logs/08-gen-tables-and-symbol-sets.log
docs/evidence/f12-emsdk-2026-10-18/logs/emsdk-install-6.0.10.log
docs/evidence/f12-emsdk-2026-10-18/logs/emsdk-install-6.0.12.log
docs/evidence/f12-emsdk-2026-10-18/logs/emsdk-install-6.0.2.log
docs/evidence/f12-emsdk-2026-10-18/logs/emsdk-install-6.0.3.log
docs/evidence/f12-emsdk-2026-10-18/logs/emsdk-install-6.0.4.log
docs/evidence/f12-emsdk-2026-10-18/logs/emsdk-install-6.0.5.log
docs/evidence/f12-emsdk-2026-10-18/logs/emsdk-install-6.0.6.log
docs/evidence/f12-emsdk-2026-10-18/logs/group-6.0.10.log
docs/evidence/f12-emsdk-2026-10-18/logs/group-6.0.12.log
docs/evidence/f12-emsdk-2026-10-18/logs/group-6.0.2.log
docs/evidence/f12-emsdk-2026-10-18/logs/group-6.0.3.log
docs/evidence/f12-emsdk-2026-10-18/logs/group-6.0.4.log
docs/evidence/f12-emsdk-2026-10-18/logs/group-6.0.5.log
docs/evidence/f12-emsdk-2026-10-18/logs/group-6.0.6.log
docs/evidence/f12-emsdk-2026-10-18/logs/v6.0.10-dcxx-test.log
docs/evidence/f12-emsdk-2026-10-18/logs/v6.0.10-dcxx.log
docs/evidence/f12-emsdk-2026-10-18/logs/v6.0.10-empp-test.log
docs/evidence/f12-emsdk-2026-10-18/logs/v6.0.10-empp.log
docs/evidence/f12-emsdk-2026-10-18/logs/v6.0.10-unpatched-xtrace.log
docs/evidence/f12-emsdk-2026-10-18/logs/v6.0.10-unpatched.log
docs/evidence/f12-emsdk-2026-10-18/logs/v6.0.12-dcxx-test.log
docs/evidence/f12-emsdk-2026-10-18/logs/v6.0.12-dcxx.log
docs/evidence/f12-emsdk-2026-10-18/logs/v6.0.12-empp-test.log
docs/evidence/f12-emsdk-2026-10-18/logs/v6.0.12-empp.log
docs/evidence/f12-emsdk-2026-10-18/logs/v6.0.12-unpatched-xtrace.log
docs/evidence/f12-emsdk-2026-10-18/logs/v6.0.12-unpatched.log
docs/evidence/f12-emsdk-2026-10-18/logs/v6.0.2-dcxx-test.log
docs/evidence/f12-emsdk-2026-10-18/logs/v6.0.2-dcxx.log
docs/evidence/f12-emsdk-2026-10-18/logs/v6.0.2-empp-test.log
docs/evidence/f12-emsdk-2026-10-18/logs/v6.0.2-empp.log
docs/evidence/f12-emsdk-2026-10-18/logs/v6.0.2-unpatched-test.log
docs/evidence/f12-emsdk-2026-10-18/logs/v6.0.2-unpatched.log
docs/evidence/f12-emsdk-2026-10-18/logs/v6.0.3-unpatched-test.log
docs/evidence/f12-emsdk-2026-10-18/logs/v6.0.3-unpatched.log
docs/evidence/f12-emsdk-2026-10-18/logs/v6.0.4-unpatched-test.log
docs/evidence/f12-emsdk-2026-10-18/logs/v6.0.4-unpatched.log
docs/evidence/f12-emsdk-2026-10-18/logs/v6.0.5-unpatched-test.log
docs/evidence/f12-emsdk-2026-10-18/logs/v6.0.5-unpatched.log
docs/evidence/f12-emsdk-2026-10-18/logs/v6.0.6-dcxx-test.log
docs/evidence/f12-emsdk-2026-10-18/logs/v6.0.6-dcxx.log
docs/evidence/f12-emsdk-2026-10-18/logs/v6.0.6-empp-test.log
docs/evidence/f12-emsdk-2026-10-18/logs/v6.0.6-empp.log
docs/evidence/f12-emsdk-2026-10-18/logs/v6.0.6-partial-xtrace.log
docs/evidence/f12-emsdk-2026-10-18/logs/v6.0.6-partial.log
docs/evidence/f12-emsdk-2026-10-18/logs/v6.0.6-unpatched-xtrace.log
docs/evidence/f12-emsdk-2026-10-18/logs/v6.0.6-unpatched.log
docs/evidence/secret-sweep-2026-10-18/README.md
docs/evidence/secret-sweep-2026-10-18/emsdk-logs-scrubbed.sha256
docs/evidence/secret-sweep-2026-10-18/emsdk-logs-unscrubbed.sha256
docs/evidence/secret-sweep-2026-10-18/scrub-emsdk-logs.md
docs/evidence/secret-sweep-2026-10-18/scrub-tracked-files.md
docs/evidence/upstream-survey-2026-10-18/README.md
docs/evidence/upstream-survey-2026-10-20/README.md
docs/explainer/FACILITY-WALKTHROUGH-2026-08-20.md
docs/explainer/PROTOCOL-FINDINGS-2026-09-02.md
docs/explainer/WEB-TIER-DEMO-SCRIPT-2026-08-28.md
docs/explainer/WEB-TIER-LIMITATIONS-2026-08-28.md
docs/explainer/WEB-TIER-STACK-AND-PHILOSOPHY-2026-08-28.md
docs/explainer/WEB-TIER-WALKTHROUGH-2026-08-28.md
docs/explainer/WHAT-CONFIDENTIAL-MEANS-2026-09-02.md
docs/personas/README.md
docs/personas/build-lead.md
docs/personas/crypto-reviewer.md
docs/personas/protocol-researcher.md
docs/references/README.md
docs/research/CUSTODY-2026-08-28.md
docs/reviews/REVIEW-059-packets/round-one-codex-output.md
docs/reviews/REVIEW-059-packets/round-one-gemini-output.md
docs/reviews/REVIEW-059-packets/round-one-self-notes.md
docs/reviews/REVIEW-059c-adjudication-round-one-2026-10-20.md
docs/runs/b16-hedged-ed25519-devnet-2026-08-27.json
docs/runs/b21-zeroized-default-path-devnet-2026-08-27.json
docs/runs/b23-seed-residue-devnet-2026-08-27.json
docs/runs/b24-decoder-return-type-devnet-2026-08-28.json
docs/runs/b25-scalar-zeroize-devnet-2026-08-28.json
docs/runs/b26-scalar-diff-wipe-devnet-2026-08-28.json
docs/task-zero/ADDENDUM-2026-08-16.md
docs/task-zero/DEVNET-CONVERT-2026-08-17.md
docs/task-zero/GAP-3-compact-sigma-2026-08-16.md
docs/task-zero/SOURCES-2026-08-18.md
docs/task-zero/TASK-ZERO-2026-08-13.md
docs/task-zero/XLS-66-INVESTIGATION-2026-08-16.md
docs/task-zero/amendments-2026-08-16.json
docs/task-zero/amendments-2026-08-16.md
docs/task-zero/amendments-2026-08-26.json
docs/task-zero/amendments-2026-09-01.json
docs/task-zero/amendments-2026-10-18.json
docs/task-zero/benchmarks-2026-08-16.md
docs/third-party/INVENTORY.md
docs/upstream-filings/2026-08-26/01-devportal-enczero.md
docs/upstream-filings/2026-08-26/02-standards-errata.md
docs/upstream-filings/2026-08-26/03-standards-tecbadproof.md
docs/upstream-filings/2026-08-26/04-standards-deletion.md
docs/upstream-filings/2026-08-26/05-rippled-positives.md
docs/upstream-filings/2026-08-26/06-standards-composability.md
docs/upstream-filings/2026-08-26/07-mptcrypto-enczero-export.md
docs/upstream-filings/2026-08-26/README.md
docs/upstream-filings/2026-08-26/correction-3879.md
docs/upstream-filings/2026-08-26/correction-608.md
docs/upstream-filings/2026-08-26/correction-609.md
docs/upstream-filings/2026-08-26/correction-8118.md
docs/upstream-filings/2026-09-28/01-mptcrypto-conan-remote.md
docs/upstream-filings/2026-09-28/README.md
docs/upstream-filings/2026-10-18/01-mptcrypto-remark-6-1.md
docs/upstream-filings/2026-10-18/02-mptcrypto-wasm-link.md
docs/upstream-filings/2026-10-18/03-mptcrypto-shared-c1-size.md
docs/upstream-filings/2026-10-18/README.md
docs/upstream-filings/2026-10-18/comment-pr152.md
docs/upstream-filings/TEMPLATE.md
facility/README.md
facility/run-facility.ts
facility/src/book.ts
facility/src/custody.ts
facility/src/devnet-accounts.ts
facility/src/facility.ts
facility/src/loopback.ts
facility/src/mptool.ts
facility/src/secret-file.ts
facility/src/signer.ts
facility/src/submit.ts
facility/tests/book.test.ts
facility/tests/boundary.test.ts
facility/tests/custody-disclosure.test.ts
facility/tests/facility.test.ts
facility/tests/hostile-endpoints.ts
facility/tests/loopback.test.ts
facility/tests/risk-acceptance.test.ts
facility/tests/secret-file.test.ts
facility/tests/submit.test.ts
facility/tests/with-hatch.ts
node_modules/@noble/curves/LICENSE
node_modules/@noble/curves/package.json
node_modules/@noble/hashes/LICENSE
node_modules/@noble/hashes/package.json
node_modules/@tanstack/history/LICENSE
node_modules/@tanstack/history/package.json
node_modules/@tanstack/react-router/LICENSE
node_modules/@tanstack/react-router/package.json
node_modules/@tanstack/react-start-client/LICENSE
node_modules/@tanstack/react-start-client/package.json
node_modules/@tanstack/react-start/LICENSE
node_modules/@tanstack/react-start/package.json
node_modules/@tanstack/react-store/LICENSE
node_modules/@tanstack/react-store/package.json
node_modules/@tanstack/router-core/LICENSE
node_modules/@tanstack/router-core/package.json
node_modules/@tanstack/start-client-core/LICENSE
node_modules/@tanstack/start-client-core/package.json
node_modules/@tanstack/store/LICENSE
node_modules/@tanstack/store/package.json
node_modules/react-dom/LICENSE
node_modules/react-dom/package.json
node_modules/react/LICENSE
node_modules/react/package.json
node_modules/scheduler/LICENSE
node_modules/scheduler/package.json
node_modules/seroval-plugins/LICENSE
node_modules/seroval-plugins/package.json
node_modules/seroval/LICENSE
node_modules/seroval/package.json
node_modules/tailwindcss/LICENSE
node_modules/tailwindcss/package.json
node_modules/use-sync-external-store/LICENSE
node_modules/use-sync-external-store/package.json
package.json
review-input/deployed/.vercel/output/config.json
review-input/deployed/.vercel/output/static/assets/LedgerReading-DqqbK6gq.js
review-input/deployed/.vercel/output/static/assets/Verdict-CNiIxuke.js
review-input/deployed/.vercel/output/static/assets/capabilities-CyBiSyzZ.js
review-input/deployed/.vercel/output/static/assets/custody-hkJYX5SB.js
review-input/deployed/.vercel/output/static/assets/index-CKAZ0d8y.js
review-input/deployed/.vercel/output/static/assets/issuer-B7oYAUmM.js
review-input/deployed/.vercel/output/static/assets/observer-DQA-_pWg.js
review-input/deployed/.vercel/output/static/assets/routes-D9R1YHa2.js
review-input/deployed/.vercel/output/static/assets/styles-DJVXuOe6.css
review-input/deployed/.vercel/output/static/assets/wallet-yjF0ml3-.js
review-input/deployed/.vercel/output/static/capabilities/index.html
review-input/deployed/.vercel/output/static/custody/index.html
review-input/deployed/.vercel/output/static/gate-verdict.json
review-input/deployed/.vercel/output/static/index.html
review-input/deployed/.vercel/output/static/issuer/index.html
review-input/deployed/.vercel/output/static/observer/index.html
review-input/deployed/.vercel/output/static/third-party-licenses.txt
review-input/deployed/.vercel/output/static/wallet/index.html
review-input/deployed/build-manifest.json
review-input/deployed/container.log
review-input/rebuilt/.vercel/output/config.json
review-input/rebuilt/.vercel/output/static/assets/LedgerReading-B79PUj4e.js
review-input/rebuilt/.vercel/output/static/assets/Verdict-CovB9dBW.js
review-input/rebuilt/.vercel/output/static/assets/capabilities-C_fOF4FT.js
review-input/rebuilt/.vercel/output/static/assets/custody-BfENjUkT.js
review-input/rebuilt/.vercel/output/static/assets/index-Dnrjg5yz.js
review-input/rebuilt/.vercel/output/static/assets/issuer-C7s7pq65.js
review-input/rebuilt/.vercel/output/static/assets/observer-vpLUdZwo.js
review-input/rebuilt/.vercel/output/static/assets/routes-CaZ_TphG.js
review-input/rebuilt/.vercel/output/static/assets/styles-DJVXuOe6.css
review-input/rebuilt/.vercel/output/static/assets/wallet-Co55StKP.js
review-input/rebuilt/.vercel/output/static/capabilities/index.html
review-input/rebuilt/.vercel/output/static/custody/index.html
review-input/rebuilt/.vercel/output/static/gate-verdict.json
review-input/rebuilt/.vercel/output/static/index.html
review-input/rebuilt/.vercel/output/static/issuer/index.html
review-input/rebuilt/.vercel/output/static/observer/index.html
review-input/rebuilt/.vercel/output/static/third-party-licenses.txt
review-input/rebuilt/.vercel/output/static/wallet/index.html
review-input/rebuilt/build-manifest.json
review-input/rebuilt/container.log
review-work-r2/b18-next/.vercel/output/config.json
review-work-r2/b18-next/.vercel/output/static/assets/LedgerReading-B79PUj4e.js
review-work-r2/b18-next/.vercel/output/static/assets/Verdict-CovB9dBW.js
review-work-r2/b18-next/.vercel/output/static/assets/capabilities-C_fOF4FT.js
review-work-r2/b18-next/.vercel/output/static/assets/custody-BfENjUkT.js
review-work-r2/b18-next/.vercel/output/static/assets/index-Dnrjg5yz.js
review-work-r2/b18-next/.vercel/output/static/assets/issuer-C7s7pq65.js
review-work-r2/b18-next/.vercel/output/static/assets/observer-vpLUdZwo.js
review-work-r2/b18-next/.vercel/output/static/assets/routes-CaZ_TphG.js
review-work-r2/b18-next/.vercel/output/static/assets/styles-DJVXuOe6.css
review-work-r2/b18-next/.vercel/output/static/assets/wallet-Co55StKP.js
review-work-r2/b18-next/.vercel/output/static/capabilities/index.html
review-work-r2/b18-next/.vercel/output/static/custody/index.html
review-work-r2/b18-next/.vercel/output/static/gate-verdict.json
review-work-r2/b18-next/.vercel/output/static/index.html
review-work-r2/b18-next/.vercel/output/static/issuer/index.html
review-work-r2/b18-next/.vercel/output/static/observer/index.html
review-work-r2/b18-next/.vercel/output/static/third-party-licenses.txt
review-work-r2/b18-next/.vercel/output/static/wallet/index.html
review-work-r2/b18-next/build-manifest.json
review-work-r2/b18-original/.vercel/output/config.json
review-work-r2/b18-original/.vercel/output/static/assets/LedgerReading-B79PUj4e.js
review-work-r2/b18-original/.vercel/output/static/assets/Verdict-CovB9dBW.js
review-work-r2/b18-original/.vercel/output/static/assets/capabilities-C_fOF4FT.js
review-work-r2/b18-original/.vercel/output/static/assets/custody-BfENjUkT.js
review-work-r2/b18-original/.vercel/output/static/assets/index-Dnrjg5yz.js
review-work-r2/b18-original/.vercel/output/static/assets/issuer-C7s7pq65.js
review-work-r2/b18-original/.vercel/output/static/assets/observer-vpLUdZwo.js
review-work-r2/b18-original/.vercel/output/static/assets/routes-CaZ_TphG.js
review-work-r2/b18-original/.vercel/output/static/assets/styles-DJVXuOe6.css
review-work-r2/b18-original/.vercel/output/static/assets/wallet-Co55StKP.js
review-work-r2/b18-original/.vercel/output/static/capabilities/index.html
review-work-r2/b18-original/.vercel/output/static/custody/index.html
review-work-r2/b18-original/.vercel/output/static/gate-verdict.json
review-work-r2/b18-original/.vercel/output/static/index.html
review-work-r2/b18-original/.vercel/output/static/issuer/index.html
review-work-r2/b18-original/.vercel/output/static/observer/index.html
review-work-r2/b18-original/.vercel/output/static/third-party-licenses.txt
review-work-r2/b18-original/.vercel/output/static/wallet/index.html
review-work-r2/b18-original/build-manifest.json
review-work-r2/browser-cases.log
review-work-r2/browser-cases.ts
review-work-r2/browser-diff.txt
review-work-r2/browser-second-home/.vercel/output/config.json
review-work-r2/browser-second-home/.vercel/output/static/assets/LedgerReading-B79PUj4e.js
review-work-r2/browser-second-home/.vercel/output/static/assets/Verdict-CovB9dBW.js
review-work-r2/browser-second-home/.vercel/output/static/assets/capabilities-C_fOF4FT.js
review-work-r2/browser-second-home/.vercel/output/static/assets/custody-BfENjUkT.js
review-work-r2/browser-second-home/.vercel/output/static/assets/index-Dnrjg5yz.js
review-work-r2/browser-second-home/.vercel/output/static/assets/issuer-C7s7pq65.js
review-work-r2/browser-second-home/.vercel/output/static/assets/observer-vpLUdZwo.js
review-work-r2/browser-second-home/.vercel/output/static/assets/routes-CaZ_TphG.js
review-work-r2/browser-second-home/.vercel/output/static/assets/styles-DJVXuOe6.css
review-work-r2/browser-second-home/.vercel/output/static/assets/wallet-Co55StKP.js
review-work-r2/browser-second-home/.vercel/output/static/capabilities/index.html
review-work-r2/browser-second-home/.vercel/output/static/custody/index.html
review-work-r2/browser-second-home/.vercel/output/static/gate-verdict.json
review-work-r2/browser-second-home/.vercel/output/static/index.html
review-work-r2/browser-second-home/.vercel/output/static/issuer/index.html
review-work-r2/browser-second-home/.vercel/output/static/observer/index.html
review-work-r2/browser-second-home/.vercel/output/static/third-party-licenses.txt
review-work-r2/browser-second-home/.vercel/output/static/wallet/index.html
review-work-r2/browser-second-home/build-manifest.json
review-work-r2/browser.log
review-work-r2/build-diff.txt
review-work-r2/canary/app.js
review-work-r2/capabilities-visible.txt
review-work-r2/changed-files-audit.txt
review-work-r2/changed-verdict-csp/.vercel/output/config.json
review-work-r2/changed-verdict-csp/.vercel/output/static/assets/LedgerReading-B79PUj4e.js
review-work-r2/changed-verdict-csp/.vercel/output/static/assets/Verdict-CovB9dBW.js
review-work-r2/changed-verdict-csp/.vercel/output/static/assets/capabilities-C_fOF4FT.js
review-work-r2/changed-verdict-csp/.vercel/output/static/assets/custody-BfENjUkT.js
review-work-r2/changed-verdict-csp/.vercel/output/static/assets/index-Dnrjg5yz.js
review-work-r2/changed-verdict-csp/.vercel/output/static/assets/issuer-C7s7pq65.js
review-work-r2/changed-verdict-csp/.vercel/output/static/assets/observer-vpLUdZwo.js
review-work-r2/changed-verdict-csp/.vercel/output/static/assets/routes-CaZ_TphG.js
review-work-r2/changed-verdict-csp/.vercel/output/static/assets/styles-DJVXuOe6.css
review-work-r2/changed-verdict-csp/.vercel/output/static/assets/wallet-Co55StKP.js
review-work-r2/changed-verdict-csp/.vercel/output/static/capabilities/index.html
review-work-r2/changed-verdict-csp/.vercel/output/static/custody/index.html
review-work-r2/changed-verdict-csp/.vercel/output/static/gate-verdict.json
review-work-r2/changed-verdict-csp/.vercel/output/static/index.html
review-work-r2/changed-verdict-csp/.vercel/output/static/issuer/index.html
review-work-r2/changed-verdict-csp/.vercel/output/static/observer/index.html
review-work-r2/changed-verdict-csp/.vercel/output/static/third-party-licenses.txt
review-work-r2/changed-verdict-csp/.vercel/output/static/wallet/index.html
review-work-r2/changed-verdict-csp/build-manifest.json
review-work-r2/control-0/.vercel/output/config.json
review-work-r2/control-0/.vercel/output/static/assets/LedgerReading-B79PUj4e.js
review-work-r2/control-0/.vercel/output/static/assets/Verdict-CovB9dBW.js
review-work-r2/control-0/.vercel/output/static/assets/capabilities-C_fOF4FT.js
review-work-r2/control-0/.vercel/output/static/assets/custody-BfENjUkT.js
review-work-r2/control-0/.vercel/output/static/assets/index-Dnrjg5yz.js
review-work-r2/control-0/.vercel/output/static/assets/issuer-C7s7pq65.js
review-work-r2/control-0/.vercel/output/static/assets/observer-vpLUdZwo.js
review-work-r2/control-0/.vercel/output/static/assets/routes-CaZ_TphG.js
review-work-r2/control-0/.vercel/output/static/assets/styles-DJVXuOe6.css
review-work-r2/control-0/.vercel/output/static/assets/wallet-Co55StKP.js
review-work-r2/control-0/.vercel/output/static/capabilities/index.html
review-work-r2/control-0/.vercel/output/static/custody/index.html
review-work-r2/control-0/.vercel/output/static/gate-verdict.json
review-work-r2/control-0/.vercel/output/static/index.html
review-work-r2/control-0/.vercel/output/static/issuer/index.html
review-work-r2/control-0/.vercel/output/static/notes.txt
review-work-r2/control-0/.vercel/output/static/observer/index.html
review-work-r2/control-0/.vercel/output/static/third-party-licenses.txt
review-work-r2/control-0/.vercel/output/static/wallet/index.html
review-work-r2/control-1/.vercel/output/config.json
review-work-r2/control-1/.vercel/output/static/assets/LedgerReading-B79PUj4e.js
review-work-r2/control-1/.vercel/output/static/assets/Verdict-CovB9dBW.js
review-work-r2/control-1/.vercel/output/static/assets/app.js.map
review-work-r2/control-1/.vercel/output/static/assets/capabilities-C_fOF4FT.js
review-work-r2/control-1/.vercel/output/static/assets/custody-BfENjUkT.js
review-work-r2/control-1/.vercel/output/static/assets/index-Dnrjg5yz.js
review-work-r2/control-1/.vercel/output/static/assets/issuer-C7s7pq65.js
review-work-r2/control-1/.vercel/output/static/assets/observer-vpLUdZwo.js
review-work-r2/control-1/.vercel/output/static/assets/routes-CaZ_TphG.js
review-work-r2/control-1/.vercel/output/static/assets/styles-DJVXuOe6.css
review-work-r2/control-1/.vercel/output/static/assets/wallet-Co55StKP.js
review-work-r2/control-1/.vercel/output/static/capabilities/index.html
review-work-r2/control-1/.vercel/output/static/custody/index.html
review-work-r2/control-1/.vercel/output/static/gate-verdict.json
review-work-r2/control-1/.vercel/output/static/index.html
review-work-r2/control-1/.vercel/output/static/issuer/index.html
review-work-r2/control-1/.vercel/output/static/observer/index.html
review-work-r2/control-1/.vercel/output/static/third-party-licenses.txt
review-work-r2/control-1/.vercel/output/static/wallet/index.html
review-work-r2/control-10/.vercel/output/config.json
review-work-r2/control-10/.vercel/output/static/assets/LedgerReading-B79PUj4e.js
review-work-r2/control-10/.vercel/output/static/assets/Verdict-CovB9dBW.js
review-work-r2/control-10/.vercel/output/static/assets/capabilities-C_fOF4FT.js
review-work-r2/control-10/.vercel/output/static/assets/custody-BfENjUkT.js
review-work-r2/control-10/.vercel/output/static/assets/index-Dnrjg5yz.js
review-work-r2/control-10/.vercel/output/static/assets/issuer-C7s7pq65.js
review-work-r2/control-10/.vercel/output/static/assets/observer-vpLUdZwo.js
review-work-r2/control-10/.vercel/output/static/assets/routes-CaZ_TphG.js
review-work-r2/control-10/.vercel/output/static/assets/styles-DJVXuOe6.css
review-work-r2/control-10/.vercel/output/static/assets/wallet-Co55StKP.js
review-work-r2/control-10/.vercel/output/static/capabilities/index.html
review-work-r2/control-10/.vercel/output/static/custody/index.html
review-work-r2/control-10/.vercel/output/static/gate-verdict.json
review-work-r2/control-10/.vercel/output/static/index.html
review-work-r2/control-10/.vercel/output/static/issuer/index.html
review-work-r2/control-10/.vercel/output/static/observer/index.html
review-work-r2/control-10/.vercel/output/static/third-party-licenses.txt
review-work-r2/control-10/.vercel/output/static/wallet/index.html
review-work-r2/control-11/.vercel/output/config.json
review-work-r2/control-11/.vercel/output/static/assets/LedgerReading-B79PUj4e.js
review-work-r2/control-11/.vercel/output/static/assets/Verdict-CovB9dBW.js
review-work-r2/control-11/.vercel/output/static/assets/capabilities-C_fOF4FT.js
review-work-r2/control-11/.vercel/output/static/assets/custody-BfENjUkT.js
review-work-r2/control-11/.vercel/output/static/assets/index-Dnrjg5yz.js
review-work-r2/control-11/.vercel/output/static/assets/issuer-C7s7pq65.js
review-work-r2/control-11/.vercel/output/static/assets/observer-vpLUdZwo.js
review-work-r2/control-11/.vercel/output/static/assets/routes-CaZ_TphG.js
review-work-r2/control-11/.vercel/output/static/assets/styles-DJVXuOe6.css
review-work-r2/control-11/.vercel/output/static/assets/wallet-Co55StKP.js
review-work-r2/control-11/.vercel/output/static/capabilities/index.html
review-work-r2/control-11/.vercel/output/static/custody/index.html
review-work-r2/control-11/.vercel/output/static/gate-verdict.json
review-work-r2/control-11/.vercel/output/static/index.html
review-work-r2/control-11/.vercel/output/static/issuer/index.html
review-work-r2/control-11/.vercel/output/static/observer/index.html
review-work-r2/control-11/.vercel/output/static/third-party-licenses.txt
review-work-r2/control-11/.vercel/output/static/wallet/index.html
review-work-r2/control-12/.vercel/output/config.json
review-work-r2/control-12/.vercel/output/static/assets/LedgerReading-B79PUj4e.js
review-work-r2/control-12/.vercel/output/static/assets/Verdict-CovB9dBW.js
review-work-r2/control-12/.vercel/output/static/assets/capabilities-C_fOF4FT.js
review-work-r2/control-12/.vercel/output/static/assets/custody-BfENjUkT.js
review-work-r2/control-12/.vercel/output/static/assets/index-Dnrjg5yz.js
review-work-r2/control-12/.vercel/output/static/assets/issuer-C7s7pq65.js
review-work-r2/control-12/.vercel/output/static/assets/observer-vpLUdZwo.js
review-work-r2/control-12/.vercel/output/static/assets/routes-CaZ_TphG.js
review-work-r2/control-12/.vercel/output/static/assets/styles-DJVXuOe6.css
review-work-r2/control-12/.vercel/output/static/assets/wallet-Co55StKP.js
review-work-r2/control-12/.vercel/output/static/capabilities/index.html
review-work-r2/control-12/.vercel/output/static/custody/index.html
review-work-r2/control-12/.vercel/output/static/gate-verdict.json
review-work-r2/control-12/.vercel/output/static/index.html
review-work-r2/control-12/.vercel/output/static/issuer/index.html
review-work-r2/control-12/.vercel/output/static/observer/index.html
review-work-r2/control-12/.vercel/output/static/third-party-licenses.txt
review-work-r2/control-12/.vercel/output/static/wallet/index.html
review-work-r2/control-13/.vercel/output/config.json
review-work-r2/control-13/.vercel/output/static/assets/LedgerReading-B79PUj4e.js
review-work-r2/control-13/.vercel/output/static/assets/Verdict-CovB9dBW.js
review-work-r2/control-13/.vercel/output/static/assets/capabilities-C_fOF4FT.js
review-work-r2/control-13/.vercel/output/static/assets/custody-BfENjUkT.js
review-work-r2/control-13/.vercel/output/static/assets/index-Dnrjg5yz.js
review-work-r2/control-13/.vercel/output/static/assets/issuer-C7s7pq65.js
review-work-r2/control-13/.vercel/output/static/assets/observer-vpLUdZwo.js
review-work-r2/control-13/.vercel/output/static/assets/routes-CaZ_TphG.js
review-work-r2/control-13/.vercel/output/static/assets/styles-DJVXuOe6.css
review-work-r2/control-13/.vercel/output/static/assets/wallet-Co55StKP.js
review-work-r2/control-13/.vercel/output/static/capabilities/index.html
review-work-r2/control-13/.vercel/output/static/custody/index.html
review-work-r2/control-13/.vercel/output/static/gate-verdict.json
review-work-r2/control-13/.vercel/output/static/index.html
review-work-r2/control-13/.vercel/output/static/issuer/index.html
review-work-r2/control-13/.vercel/output/static/observer/index.html
review-work-r2/control-13/.vercel/output/static/third-party-licenses.txt
review-work-r2/control-13/.vercel/output/static/wallet/index.html
review-work-r2/control-14/.vercel/output/config.json
review-work-r2/control-14/.vercel/output/static/assets/LedgerReading-B79PUj4e.js
review-work-r2/control-14/.vercel/output/static/assets/Verdict-CovB9dBW.js
review-work-r2/control-14/.vercel/output/static/assets/capabilities-C_fOF4FT.js
review-work-r2/control-14/.vercel/output/static/assets/custody-BfENjUkT.js
review-work-r2/control-14/.vercel/output/static/assets/index-Dnrjg5yz.js
review-work-r2/control-14/.vercel/output/static/assets/issuer-C7s7pq65.js
review-work-r2/control-14/.vercel/output/static/assets/observer-vpLUdZwo.js
review-work-r2/control-14/.vercel/output/static/assets/routes-CaZ_TphG.js
review-work-r2/control-14/.vercel/output/static/assets/styles-DJVXuOe6.css
review-work-r2/control-14/.vercel/output/static/assets/wallet-Co55StKP.js
review-work-r2/control-14/.vercel/output/static/capabilities/index.html
review-work-r2/control-14/.vercel/output/static/custody/index.html
review-work-r2/control-14/.vercel/output/static/gate-verdict.json
review-work-r2/control-14/.vercel/output/static/index.html
review-work-r2/control-14/.vercel/output/static/issuer/index.html
review-work-r2/control-14/.vercel/output/static/observer/index.html
review-work-r2/control-14/.vercel/output/static/third-party-licenses.txt
review-work-r2/control-14/.vercel/output/static/wallet/index.html
review-work-r2/control-15/.vercel/output/config.json
review-work-r2/control-15/.vercel/output/static/assets/LedgerReading-B79PUj4e.js
review-work-r2/control-15/.vercel/output/static/assets/Verdict-CovB9dBW.js
review-work-r2/control-15/.vercel/output/static/assets/capabilities-C_fOF4FT.js
review-work-r2/control-15/.vercel/output/static/assets/custody-BfENjUkT.js
review-work-r2/control-15/.vercel/output/static/assets/index-Dnrjg5yz.js
review-work-r2/control-15/.vercel/output/static/assets/issuer-C7s7pq65.js
review-work-r2/control-15/.vercel/output/static/assets/observer-vpLUdZwo.js
review-work-r2/control-15/.vercel/output/static/assets/routes-CaZ_TphG.js
review-work-r2/control-15/.vercel/output/static/assets/styles-DJVXuOe6.css
review-work-r2/control-15/.vercel/output/static/assets/wallet-Co55StKP.js
review-work-r2/control-15/.vercel/output/static/capabilities/index.html
review-work-r2/control-15/.vercel/output/static/custody/index.html
review-work-r2/control-15/.vercel/output/static/gate-verdict.json
review-work-r2/control-15/.vercel/output/static/index.html
review-work-r2/control-15/.vercel/output/static/issuer/index.html
review-work-r2/control-15/.vercel/output/static/observer/index.html
review-work-r2/control-15/.vercel/output/static/third-party-licenses.txt
review-work-r2/control-15/.vercel/output/static/wallet/index.html
review-work-r2/control-16/.vercel/output/config.json
review-work-r2/control-16/.vercel/output/static/assets/LedgerReading-B79PUj4e.js
review-work-r2/control-16/.vercel/output/static/assets/Verdict-CovB9dBW.js
review-work-r2/control-16/.vercel/output/static/assets/capabilities-C_fOF4FT.js
review-work-r2/control-16/.vercel/output/static/assets/custody-BfENjUkT.js
review-work-r2/control-16/.vercel/output/static/assets/index-Dnrjg5yz.js
review-work-r2/control-16/.vercel/output/static/assets/issuer-C7s7pq65.js
review-work-r2/control-16/.vercel/output/static/assets/observer-vpLUdZwo.js
review-work-r2/control-16/.vercel/output/static/assets/routes-CaZ_TphG.js
review-work-r2/control-16/.vercel/output/static/assets/styles-DJVXuOe6.css
review-work-r2/control-16/.vercel/output/static/assets/wallet-Co55StKP.js
review-work-r2/control-16/.vercel/output/static/capabilities/index.html
review-work-r2/control-16/.vercel/output/static/custody/index.html
review-work-r2/control-16/.vercel/output/static/gate-verdict.json
review-work-r2/control-16/.vercel/output/static/index.html
review-work-r2/control-16/.vercel/output/static/issuer/index.html
review-work-r2/control-16/.vercel/output/static/observer/index.html
review-work-r2/control-16/.vercel/output/static/third-party-licenses.txt
review-work-r2/control-16/.vercel/output/static/wallet/index.html
review-work-r2/control-17/.vercel/output/config.json
review-work-r2/control-17/.vercel/output/static/assets/LedgerReading-B79PUj4e.js
review-work-r2/control-17/.vercel/output/static/assets/Verdict-CovB9dBW.js
review-work-r2/control-17/.vercel/output/static/assets/capabilities-C_fOF4FT.js
review-work-r2/control-17/.vercel/output/static/assets/custody-BfENjUkT.js
review-work-r2/control-17/.vercel/output/static/assets/index-Dnrjg5yz.js
review-work-r2/control-17/.vercel/output/static/assets/issuer-C7s7pq65.js
review-work-r2/control-17/.vercel/output/static/assets/observer-vpLUdZwo.js
review-work-r2/control-17/.vercel/output/static/assets/routes-CaZ_TphG.js
review-work-r2/control-17/.vercel/output/static/assets/styles-DJVXuOe6.css
review-work-r2/control-17/.vercel/output/static/assets/wallet-Co55StKP.js
review-work-r2/control-17/.vercel/output/static/capabilities/index.html
review-work-r2/control-17/.vercel/output/static/custody/index.html
review-work-r2/control-17/.vercel/output/static/gate-verdict.json
review-work-r2/control-17/.vercel/output/static/index.html
review-work-r2/control-17/.vercel/output/static/issuer/index.html
review-work-r2/control-17/.vercel/output/static/observer/index.html
review-work-r2/control-17/.vercel/output/static/third-party-licenses.txt
review-work-r2/control-17/.vercel/output/static/wallet/index.html
review-work-r2/control-18/.vercel/output/config.json
review-work-r2/control-18/.vercel/output/static/assets/LedgerReading-B79PUj4e.js
review-work-r2/control-18/.vercel/output/static/assets/Verdict-CovB9dBW.js
review-work-r2/control-18/.vercel/output/static/assets/capabilities-C_fOF4FT.js
review-work-r2/control-18/.vercel/output/static/assets/custody-BfENjUkT.js
review-work-r2/control-18/.vercel/output/static/assets/index-Dnrjg5yz.js
review-work-r2/control-18/.vercel/output/static/assets/issuer-C7s7pq65.js
review-work-r2/control-18/.vercel/output/static/assets/observer-vpLUdZwo.js
review-work-r2/control-18/.vercel/output/static/assets/routes-CaZ_TphG.js
review-work-r2/control-18/.vercel/output/static/assets/styles-DJVXuOe6.css
review-work-r2/control-18/.vercel/output/static/assets/wallet-Co55StKP.js
review-work-r2/control-18/.vercel/output/static/capabilities/index.html
review-work-r2/control-18/.vercel/output/static/custody/index.html
review-work-r2/control-18/.vercel/output/static/gate-verdict.json
review-work-r2/control-18/.vercel/output/static/index.html
review-work-r2/control-18/.vercel/output/static/issuer/index.html
review-work-r2/control-18/.vercel/output/static/observer/index.html
review-work-r2/control-18/.vercel/output/static/third-party-licenses.txt
review-work-r2/control-18/.vercel/output/static/wallet/index.html
review-work-r2/control-19/.vercel/output/config.json
review-work-r2/control-19/.vercel/output/static/assets/LedgerReading-B79PUj4e.js
review-work-r2/control-19/.vercel/output/static/assets/Verdict-CovB9dBW.js
review-work-r2/control-19/.vercel/output/static/assets/capabilities-C_fOF4FT.js
review-work-r2/control-19/.vercel/output/static/assets/custody-BfENjUkT.js
review-work-r2/control-19/.vercel/output/static/assets/index-Dnrjg5yz.js
review-work-r2/control-19/.vercel/output/static/assets/issuer-C7s7pq65.js
review-work-r2/control-19/.vercel/output/static/assets/observer-vpLUdZwo.js
review-work-r2/control-19/.vercel/output/static/assets/routes-CaZ_TphG.js
review-work-r2/control-19/.vercel/output/static/assets/styles-DJVXuOe6.css
review-work-r2/control-19/.vercel/output/static/assets/wallet-Co55StKP.js
review-work-r2/control-19/.vercel/output/static/capabilities/index.html
review-work-r2/control-19/.vercel/output/static/custody/index.html
review-work-r2/control-19/.vercel/output/static/gate-verdict.json
review-work-r2/control-19/.vercel/output/static/index.html
review-work-r2/control-19/.vercel/output/static/issuer/index.html
review-work-r2/control-19/.vercel/output/static/observer/index.html
review-work-r2/control-19/.vercel/output/static/third-party-licenses.txt
review-work-r2/control-19/.vercel/output/static/wallet/index.html
review-work-r2/control-2/.vercel/output/config.json
review-work-r2/control-2/.vercel/output/static/assets/LedgerReading-B79PUj4e.js
review-work-r2/control-2/.vercel/output/static/assets/Verdict-CovB9dBW.js
review-work-r2/control-2/.vercel/output/static/assets/capabilities-C_fOF4FT.js
review-work-r2/control-2/.vercel/output/static/assets/custody-BfENjUkT.js
review-work-r2/control-2/.vercel/output/static/assets/index-Dnrjg5yz.js
review-work-r2/control-2/.vercel/output/static/assets/issuer-C7s7pq65.js
review-work-r2/control-2/.vercel/output/static/assets/observer-vpLUdZwo.js
review-work-r2/control-2/.vercel/output/static/assets/routes-CaZ_TphG.js
review-work-r2/control-2/.vercel/output/static/assets/styles-DJVXuOe6.css
review-work-r2/control-2/.vercel/output/static/assets/wallet-Co55StKP.js
review-work-r2/control-2/.vercel/output/static/capabilities/index.html
review-work-r2/control-2/.vercel/output/static/custody/index.html
review-work-r2/control-2/.vercel/output/static/gate-verdict.json
review-work-r2/control-2/.vercel/output/static/index.html
review-work-r2/control-2/.vercel/output/static/issuer/index.html
review-work-r2/control-2/.vercel/output/static/observer/index.html
review-work-r2/control-2/.vercel/output/static/third-party-licenses.txt
review-work-r2/control-2/.vercel/output/static/wallet/index.html
review-work-r2/control-20/.vercel/output/config.json
review-work-r2/control-20/.vercel/output/static/assets/LedgerReading-B79PUj4e.js
review-work-r2/control-20/.vercel/output/static/assets/Verdict-CovB9dBW.js
review-work-r2/control-20/.vercel/output/static/assets/capabilities-C_fOF4FT.js
review-work-r2/control-20/.vercel/output/static/assets/custody-BfENjUkT.js
review-work-r2/control-20/.vercel/output/static/assets/index-Dnrjg5yz.js
review-work-r2/control-20/.vercel/output/static/assets/issuer-C7s7pq65.js
review-work-r2/control-20/.vercel/output/static/assets/observer-vpLUdZwo.js
review-work-r2/control-20/.vercel/output/static/assets/routes-CaZ_TphG.js
review-work-r2/control-20/.vercel/output/static/assets/styles-DJVXuOe6.css
review-work-r2/control-20/.vercel/output/static/assets/wallet-Co55StKP.js
review-work-r2/control-20/.vercel/output/static/capabilities/index.html
review-work-r2/control-20/.vercel/output/static/custody/index.html
review-work-r2/control-20/.vercel/output/static/gate-verdict.json
review-work-r2/control-20/.vercel/output/static/index.html
review-work-r2/control-20/.vercel/output/static/issuer/index.html
review-work-r2/control-20/.vercel/output/static/observer/index.html
review-work-r2/control-20/.vercel/output/static/third-party-licenses.txt
review-work-r2/control-20/.vercel/output/static/wallet/index.html
review-work-r2/control-21/.vercel/output/config.json
review-work-r2/control-21/.vercel/output/static/assets/LedgerReading-B79PUj4e.js
review-work-r2/control-21/.vercel/output/static/assets/Verdict-CovB9dBW.js
review-work-r2/control-21/.vercel/output/static/assets/capabilities-C_fOF4FT.js
review-work-r2/control-21/.vercel/output/static/assets/custody-BfENjUkT.js
review-work-r2/control-21/.vercel/output/static/assets/index-Dnrjg5yz.js
review-work-r2/control-21/.vercel/output/static/assets/issuer-C7s7pq65.js
review-work-r2/control-21/.vercel/output/static/assets/observer-vpLUdZwo.js
review-work-r2/control-21/.vercel/output/static/assets/routes-CaZ_TphG.js
review-work-r2/control-21/.vercel/output/static/assets/styles-DJVXuOe6.css
review-work-r2/control-21/.vercel/output/static/assets/wallet-Co55StKP.js
review-work-r2/control-21/.vercel/output/static/capabilities/index.html
review-work-r2/control-21/.vercel/output/static/custody/index.html
review-work-r2/control-21/.vercel/output/static/gate-verdict.json
review-work-r2/control-21/.vercel/output/static/index.html
review-work-r2/control-21/.vercel/output/static/issuer/index.html
review-work-r2/control-21/.vercel/output/static/observer/index.html
review-work-r2/control-21/.vercel/output/static/third-party-licenses.txt
review-work-r2/control-21/.vercel/output/static/wallet/index.html
review-work-r2/control-22/.vercel/output/config.json
review-work-r2/control-22/.vercel/output/static/assets/LedgerReading-B79PUj4e.js
review-work-r2/control-22/.vercel/output/static/assets/Verdict-CovB9dBW.js
review-work-r2/control-22/.vercel/output/static/assets/capabilities-C_fOF4FT.js
review-work-r2/control-22/.vercel/output/static/assets/custody-BfENjUkT.js
review-work-r2/control-22/.vercel/output/static/assets/index-Dnrjg5yz.js
review-work-r2/control-22/.vercel/output/static/assets/issuer-C7s7pq65.js
review-work-r2/control-22/.vercel/output/static/assets/observer-vpLUdZwo.js
review-work-r2/control-22/.vercel/output/static/assets/routes-CaZ_TphG.js
review-work-r2/control-22/.vercel/output/static/assets/styles-DJVXuOe6.css
review-work-r2/control-22/.vercel/output/static/assets/wallet-Co55StKP.js
review-work-r2/control-22/.vercel/output/static/capabilities/index.html
review-work-r2/control-22/.vercel/output/static/custody/index.html
review-work-r2/control-22/.vercel/output/static/gate-verdict.json
review-work-r2/control-22/.vercel/output/static/index.html
review-work-r2/control-22/.vercel/output/static/issuer/index.html
review-work-r2/control-22/.vercel/output/static/observer/index.html
review-work-r2/control-22/.vercel/output/static/third-party-licenses.txt
review-work-r2/control-22/.vercel/output/static/wallet/index.html
review-work-r2/control-23/.vercel/output/config.json
review-work-r2/control-23/.vercel/output/static/assets/LedgerReading-B79PUj4e.js
review-work-r2/control-23/.vercel/output/static/assets/Verdict-CovB9dBW.js
review-work-r2/control-23/.vercel/output/static/assets/capabilities-C_fOF4FT.js
review-work-r2/control-23/.vercel/output/static/assets/custody-BfENjUkT.js
review-work-r2/control-23/.vercel/output/static/assets/index-Dnrjg5yz.js
review-work-r2/control-23/.vercel/output/static/assets/issuer-C7s7pq65.js
review-work-r2/control-23/.vercel/output/static/assets/observer-vpLUdZwo.js
review-work-r2/control-23/.vercel/output/static/assets/routes-CaZ_TphG.js
review-work-r2/control-23/.vercel/output/static/assets/styles-DJVXuOe6.css
review-work-r2/control-23/.vercel/output/static/assets/wallet-Co55StKP.js
review-work-r2/control-23/.vercel/output/static/capabilities/index.html
review-work-r2/control-23/.vercel/output/static/custody/index.html
review-work-r2/control-23/.vercel/output/static/gate-verdict.json
review-work-r2/control-23/.vercel/output/static/index.html
review-work-r2/control-23/.vercel/output/static/issuer/index.html
review-work-r2/control-23/.vercel/output/static/observer/index.html
review-work-r2/control-23/.vercel/output/static/third-party-licenses.txt
review-work-r2/control-23/.vercel/output/static/wallet/index.html
review-work-r2/control-24/.vercel/output/config.json
review-work-r2/control-24/.vercel/output/static/assets/LedgerReading-B79PUj4e.js
review-work-r2/control-24/.vercel/output/static/assets/Verdict-CovB9dBW.js
review-work-r2/control-24/.vercel/output/static/assets/capabilities-C_fOF4FT.js
review-work-r2/control-24/.vercel/output/static/assets/custody-BfENjUkT.js
review-work-r2/control-24/.vercel/output/static/assets/index-Dnrjg5yz.js
review-work-r2/control-24/.vercel/output/static/assets/issuer-C7s7pq65.js
review-work-r2/control-24/.vercel/output/static/assets/observer-vpLUdZwo.js
review-work-r2/control-24/.vercel/output/static/assets/routes-CaZ_TphG.js
review-work-r2/control-24/.vercel/output/static/assets/styles-DJVXuOe6.css
review-work-r2/control-24/.vercel/output/static/assets/wallet-Co55StKP.js
review-work-r2/control-24/.vercel/output/static/capabilities/index.html
review-work-r2/control-24/.vercel/output/static/custody/index.html
review-work-r2/control-24/.vercel/output/static/gate-verdict.json
review-work-r2/control-24/.vercel/output/static/index.html
review-work-r2/control-24/.vercel/output/static/issuer/index.html
review-work-r2/control-24/.vercel/output/static/observer/index.html
review-work-r2/control-24/.vercel/output/static/third-party-licenses.txt
review-work-r2/control-24/.vercel/output/static/wallet/index.html
review-work-r2/control-25/.vercel/output/config.json
review-work-r2/control-25/.vercel/output/static/assets/LedgerReading-B79PUj4e.js
review-work-r2/control-25/.vercel/output/static/assets/Verdict-CovB9dBW.js
review-work-r2/control-25/.vercel/output/static/assets/capabilities-C_fOF4FT.js
review-work-r2/control-25/.vercel/output/static/assets/custody-BfENjUkT.js
review-work-r2/control-25/.vercel/output/static/assets/index-Dnrjg5yz.js
review-work-r2/control-25/.vercel/output/static/assets/issuer-C7s7pq65.js
review-work-r2/control-25/.vercel/output/static/assets/observer-vpLUdZwo.js
review-work-r2/control-25/.vercel/output/static/assets/routes-CaZ_TphG.js
review-work-r2/control-25/.vercel/output/static/assets/styles-DJVXuOe6.css
review-work-r2/control-25/.vercel/output/static/assets/wallet-Co55StKP.js
review-work-r2/control-25/.vercel/output/static/capabilities/index.html
review-work-r2/control-25/.vercel/output/static/custody/index.html
review-work-r2/control-25/.vercel/output/static/gate-verdict.json
review-work-r2/control-25/.vercel/output/static/index.html
review-work-r2/control-25/.vercel/output/static/issuer/index.html
review-work-r2/control-25/.vercel/output/static/observer/index.html
review-work-r2/control-25/.vercel/output/static/third-party-licenses.txt
review-work-r2/control-25/.vercel/output/static/wallet/index.html
review-work-r2/control-26/.vercel/output/config.json
review-work-r2/control-26/.vercel/output/static/assets/LedgerReading-B79PUj4e.js
review-work-r2/control-26/.vercel/output/static/assets/Verdict-CovB9dBW.js
review-work-r2/control-26/.vercel/output/static/assets/capabilities-C_fOF4FT.js
review-work-r2/control-26/.vercel/output/static/assets/custody-BfENjUkT.js
review-work-r2/control-26/.vercel/output/static/assets/index-Dnrjg5yz.js
review-work-r2/control-26/.vercel/output/static/assets/issuer-C7s7pq65.js
review-work-r2/control-26/.vercel/output/static/assets/observer-vpLUdZwo.js
review-work-r2/control-26/.vercel/output/static/assets/routes-CaZ_TphG.js
review-work-r2/control-26/.vercel/output/static/assets/styles-DJVXuOe6.css
review-work-r2/control-26/.vercel/output/static/assets/wallet-Co55StKP.js
review-work-r2/control-26/.vercel/output/static/capabilities/index.html
review-work-r2/control-26/.vercel/output/static/custody/index.html
review-work-r2/control-26/.vercel/output/static/gate-verdict.json
review-work-r2/control-26/.vercel/output/static/index.html
review-work-r2/control-26/.vercel/output/static/issuer/index.html
review-work-r2/control-26/.vercel/output/static/observer/index.html
review-work-r2/control-26/.vercel/output/static/third-party-licenses.txt
review-work-r2/control-26/.vercel/output/static/wallet/index.html
review-work-r2/control-27/.vercel/output/config.json
review-work-r2/control-27/.vercel/output/static/assets/LedgerReading-B79PUj4e.js
review-work-r2/control-27/.vercel/output/static/assets/Verdict-CovB9dBW.js
review-work-r2/control-27/.vercel/output/static/assets/capabilities-C_fOF4FT.js
review-work-r2/control-27/.vercel/output/static/assets/custody-BfENjUkT.js
review-work-r2/control-27/.vercel/output/static/assets/index-Dnrjg5yz.js
review-work-r2/control-27/.vercel/output/static/assets/issuer-C7s7pq65.js
review-work-r2/control-27/.vercel/output/static/assets/observer-vpLUdZwo.js
review-work-r2/control-27/.vercel/output/static/assets/routes-CaZ_TphG.js
review-work-r2/control-27/.vercel/output/static/assets/styles-DJVXuOe6.css
review-work-r2/control-27/.vercel/output/static/assets/wallet-Co55StKP.js
review-work-r2/control-27/.vercel/output/static/capabilities/index.html
review-work-r2/control-27/.vercel/output/static/custody/index.html
review-work-r2/control-27/.vercel/output/static/gate-verdict.json
review-work-r2/control-27/.vercel/output/static/index.html
review-work-r2/control-27/.vercel/output/static/issuer/index.html
review-work-r2/control-27/.vercel/output/static/observer/index.html
review-work-r2/control-27/.vercel/output/static/third-party-licenses.txt
review-work-r2/control-27/.vercel/output/static/wallet/index.html
review-work-r2/control-28/.vercel/output/config.json
review-work-r2/control-28/.vercel/output/static/assets/LedgerReading-B79PUj4e.js
review-work-r2/control-28/.vercel/output/static/assets/Verdict-CovB9dBW.js
review-work-r2/control-28/.vercel/output/static/assets/capabilities-C_fOF4FT.js
review-work-r2/control-28/.vercel/output/static/assets/custody-BfENjUkT.js
review-work-r2/control-28/.vercel/output/static/assets/index-Dnrjg5yz.js
review-work-r2/control-28/.vercel/output/static/assets/issuer-C7s7pq65.js
review-work-r2/control-28/.vercel/output/static/assets/observer-vpLUdZwo.js
review-work-r2/control-28/.vercel/output/static/assets/routes-CaZ_TphG.js
review-work-r2/control-28/.vercel/output/static/assets/styles-DJVXuOe6.css
review-work-r2/control-28/.vercel/output/static/assets/wallet-Co55StKP.js
review-work-r2/control-28/.vercel/output/static/capabilities/index.html
review-work-r2/control-28/.vercel/output/static/custody/index.html
review-work-r2/control-28/.vercel/output/static/gate-verdict.json
review-work-r2/control-28/.vercel/output/static/index.html
review-work-r2/control-28/.vercel/output/static/issuer/index.html
review-work-r2/control-28/.vercel/output/static/observer/index.html
review-work-r2/control-28/.vercel/output/static/third-party-licenses.txt
review-work-r2/control-28/.vercel/output/static/wallet/index.html
review-work-r2/control-29/.vercel/output/config.json
review-work-r2/control-29/.vercel/output/static/assets/LedgerReading-B79PUj4e.js
review-work-r2/control-29/.vercel/output/static/assets/Verdict-CovB9dBW.js
review-work-r2/control-29/.vercel/output/static/assets/capabilities-C_fOF4FT.js
review-work-r2/control-29/.vercel/output/static/assets/custody-BfENjUkT.js
review-work-r2/control-29/.vercel/output/static/assets/index-Dnrjg5yz.js
review-work-r2/control-29/.vercel/output/static/assets/issuer-C7s7pq65.js
review-work-r2/control-29/.vercel/output/static/assets/observer-vpLUdZwo.js
review-work-r2/control-29/.vercel/output/static/assets/routes-CaZ_TphG.js
review-work-r2/control-29/.vercel/output/static/assets/styles-DJVXuOe6.css
review-work-r2/control-29/.vercel/output/static/assets/wallet-Co55StKP.js
review-work-r2/control-29/.vercel/output/static/capabilities/index.html
review-work-r2/control-29/.vercel/output/static/custody/index.html
review-work-r2/control-29/.vercel/output/static/gate-verdict.json
review-work-r2/control-29/.vercel/output/static/index.html
review-work-r2/control-29/.vercel/output/static/issuer/index.html
review-work-r2/control-29/.vercel/output/static/observer/index.html
review-work-r2/control-29/.vercel/output/static/third-party-licenses.txt
review-work-r2/control-29/.vercel/output/static/wallet/index.html
review-work-r2/control-3/.vercel/output/config.json
review-work-r2/control-3/.vercel/output/static/assets/LedgerReading-B79PUj4e.js
review-work-r2/control-3/.vercel/output/static/assets/Verdict-CovB9dBW.js
review-work-r2/control-3/.vercel/output/static/assets/capabilities-C_fOF4FT.js
review-work-r2/control-3/.vercel/output/static/assets/custody-BfENjUkT.js
review-work-r2/control-3/.vercel/output/static/assets/index-Dnrjg5yz.js
review-work-r2/control-3/.vercel/output/static/assets/issuer-C7s7pq65.js
review-work-r2/control-3/.vercel/output/static/assets/observer-vpLUdZwo.js
review-work-r2/control-3/.vercel/output/static/assets/routes-CaZ_TphG.js
review-work-r2/control-3/.vercel/output/static/assets/styles-DJVXuOe6.css
review-work-r2/control-3/.vercel/output/static/assets/wallet-Co55StKP.js
review-work-r2/control-3/.vercel/output/static/capabilities/index.html
review-work-r2/control-3/.vercel/output/static/custody/index.html
review-work-r2/control-3/.vercel/output/static/gate-verdict.json
review-work-r2/control-3/.vercel/output/static/index.html
review-work-r2/control-3/.vercel/output/static/observer/index.html
review-work-r2/control-3/.vercel/output/static/third-party-licenses.txt
review-work-r2/control-3/.vercel/output/static/wallet/index.html
review-work-r2/control-30/.vercel/output/config.json
review-work-r2/control-30/.vercel/output/static/assets/LedgerReading-B79PUj4e.js
review-work-r2/control-30/.vercel/output/static/assets/Verdict-CovB9dBW.js
review-work-r2/control-30/.vercel/output/static/assets/capabilities-C_fOF4FT.js
review-work-r2/control-30/.vercel/output/static/assets/custody-BfENjUkT.js
review-work-r2/control-30/.vercel/output/static/assets/index-Dnrjg5yz.js
review-work-r2/control-30/.vercel/output/static/assets/issuer-C7s7pq65.js
review-work-r2/control-30/.vercel/output/static/assets/observer-vpLUdZwo.js
review-work-r2/control-30/.vercel/output/static/assets/routes-CaZ_TphG.js
review-work-r2/control-30/.vercel/output/static/assets/styles-DJVXuOe6.css
review-work-r2/control-30/.vercel/output/static/assets/wallet-Co55StKP.js
review-work-r2/control-30/.vercel/output/static/capabilities/index.html
review-work-r2/control-30/.vercel/output/static/custody/index.html
review-work-r2/control-30/.vercel/output/static/gate-verdict.json
review-work-r2/control-30/.vercel/output/static/index.html
review-work-r2/control-30/.vercel/output/static/issuer/index.html
review-work-r2/control-30/.vercel/output/static/observer/index.html
review-work-r2/control-30/.vercel/output/static/third-party-licenses.txt
review-work-r2/control-30/.vercel/output/static/wallet/index.html
review-work-r2/control-31/.vercel/output/config.json
review-work-r2/control-31/.vercel/output/static/assets/LedgerReading-B79PUj4e.js
review-work-r2/control-31/.vercel/output/static/assets/Verdict-CovB9dBW.js
review-work-r2/control-31/.vercel/output/static/assets/capabilities-C_fOF4FT.js
review-work-r2/control-31/.vercel/output/static/assets/custody-BfENjUkT.js
review-work-r2/control-31/.vercel/output/static/assets/index-Dnrjg5yz.js
review-work-r2/control-31/.vercel/output/static/assets/issuer-C7s7pq65.js
review-work-r2/control-31/.vercel/output/static/assets/observer-vpLUdZwo.js
review-work-r2/control-31/.vercel/output/static/assets/routes-CaZ_TphG.js
review-work-r2/control-31/.vercel/output/static/assets/styles-DJVXuOe6.css
review-work-r2/control-31/.vercel/output/static/assets/wallet-Co55StKP.js
review-work-r2/control-31/.vercel/output/static/capabilities/index.html
review-work-r2/control-31/.vercel/output/static/custody/index.html
review-work-r2/control-31/.vercel/output/static/gate-verdict.json
review-work-r2/control-31/.vercel/output/static/index.html
review-work-r2/control-31/.vercel/output/static/issuer/index.html
review-work-r2/control-31/.vercel/output/static/observer/index.html
review-work-r2/control-31/.vercel/output/static/third-party-licenses.txt
review-work-r2/control-31/.vercel/output/static/wallet/index.html
review-work-r2/control-32/.vercel/output/config.json
review-work-r2/control-32/.vercel/output/static/assets/LedgerReading-B79PUj4e.js
review-work-r2/control-32/.vercel/output/static/assets/Verdict-CovB9dBW.js
review-work-r2/control-32/.vercel/output/static/assets/capabilities-C_fOF4FT.js
review-work-r2/control-32/.vercel/output/static/assets/custody-BfENjUkT.js
review-work-r2/control-32/.vercel/output/static/assets/index-Dnrjg5yz.js
review-work-r2/control-32/.vercel/output/static/assets/issuer-C7s7pq65.js
review-work-r2/control-32/.vercel/output/static/assets/observer-vpLUdZwo.js
review-work-r2/control-32/.vercel/output/static/assets/routes-CaZ_TphG.js
review-work-r2/control-32/.vercel/output/static/assets/styles-DJVXuOe6.css
review-work-r2/control-32/.vercel/output/static/assets/wallet-Co55StKP.js
review-work-r2/control-32/.vercel/output/static/capabilities/index.html
review-work-r2/control-32/.vercel/output/static/custody/index.html
review-work-r2/control-32/.vercel/output/static/gate-verdict.json
review-work-r2/control-32/.vercel/output/static/index.html
review-work-r2/control-32/.vercel/output/static/issuer/index.html
review-work-r2/control-32/.vercel/output/static/observer/index.html
review-work-r2/control-32/.vercel/output/static/third-party-licenses.txt
review-work-r2/control-32/.vercel/output/static/wallet/index.html
review-work-r2/control-33/.vercel/output/config.json
review-work-r2/control-33/.vercel/output/static/assets/LedgerReading-B79PUj4e.js
review-work-r2/control-33/.vercel/output/static/assets/Verdict-CovB9dBW.js
review-work-r2/control-33/.vercel/output/static/assets/capabilities-C_fOF4FT.js
review-work-r2/control-33/.vercel/output/static/assets/custody-BfENjUkT.js
review-work-r2/control-33/.vercel/output/static/assets/index-Dnrjg5yz.js
review-work-r2/control-33/.vercel/output/static/assets/issuer-C7s7pq65.js
review-work-r2/control-33/.vercel/output/static/assets/observer-vpLUdZwo.js
review-work-r2/control-33/.vercel/output/static/assets/routes-CaZ_TphG.js
review-work-r2/control-33/.vercel/output/static/assets/styles-DJVXuOe6.css
review-work-r2/control-33/.vercel/output/static/assets/wallet-Co55StKP.js
review-work-r2/control-33/.vercel/output/static/capabilities/index.html
review-work-r2/control-33/.vercel/output/static/custody/index.html
review-work-r2/control-33/.vercel/output/static/gate-verdict.json
review-work-r2/control-33/.vercel/output/static/index.html
review-work-r2/control-33/.vercel/output/static/issuer/index.html
review-work-r2/control-33/.vercel/output/static/observer/index.html
review-work-r2/control-33/.vercel/output/static/third-party-licenses.txt
review-work-r2/control-33/.vercel/output/static/wallet/index.html
review-work-r2/control-34/.vercel/output/config.json
review-work-r2/control-34/.vercel/output/static/assets/LedgerReading-B79PUj4e.js
review-work-r2/control-34/.vercel/output/static/assets/Verdict-CovB9dBW.js
review-work-r2/control-34/.vercel/output/static/assets/capabilities-C_fOF4FT.js
review-work-r2/control-34/.vercel/output/static/assets/custody-BfENjUkT.js
review-work-r2/control-34/.vercel/output/static/assets/index-Dnrjg5yz.js
review-work-r2/control-34/.vercel/output/static/assets/issuer-C7s7pq65.js
review-work-r2/control-34/.vercel/output/static/assets/observer-vpLUdZwo.js
review-work-r2/control-34/.vercel/output/static/assets/routes-CaZ_TphG.js
review-work-r2/control-34/.vercel/output/static/assets/styles-DJVXuOe6.css
review-work-r2/control-34/.vercel/output/static/assets/wallet-Co55StKP.js
review-work-r2/control-34/.vercel/output/static/capabilities/index.html
review-work-r2/control-34/.vercel/output/static/custody/index.html
review-work-r2/control-34/.vercel/output/static/gate-verdict.json
review-work-r2/control-34/.vercel/output/static/index.html
review-work-r2/control-34/.vercel/output/static/issuer/index.html
review-work-r2/control-34/.vercel/output/static/observer/index.html
review-work-r2/control-34/.vercel/output/static/third-party-licenses.txt
review-work-r2/control-34/.vercel/output/static/wallet/index.html
review-work-r2/control-35/.vercel/output/config.json
review-work-r2/control-35/.vercel/output/static/assets/LedgerReading-B79PUj4e.js
review-work-r2/control-35/.vercel/output/static/assets/Verdict-CovB9dBW.js
review-work-r2/control-35/.vercel/output/static/assets/capabilities-C_fOF4FT.js
review-work-r2/control-35/.vercel/output/static/assets/custody-BfENjUkT.js
review-work-r2/control-35/.vercel/output/static/assets/index-Dnrjg5yz.js
review-work-r2/control-35/.vercel/output/static/assets/issuer-C7s7pq65.js
review-work-r2/control-35/.vercel/output/static/assets/observer-vpLUdZwo.js
review-work-r2/control-35/.vercel/output/static/assets/routes-CaZ_TphG.js
review-work-r2/control-35/.vercel/output/static/assets/styles-DJVXuOe6.css
review-work-r2/control-35/.vercel/output/static/assets/wallet-Co55StKP.js
review-work-r2/control-35/.vercel/output/static/capabilities/index.html
review-work-r2/control-35/.vercel/output/static/custody/index.html
review-work-r2/control-35/.vercel/output/static/gate-verdict.json
review-work-r2/control-35/.vercel/output/static/index.html
review-work-r2/control-35/.vercel/output/static/issuer/index.html
review-work-r2/control-35/.vercel/output/static/observer/index.html
review-work-r2/control-35/.vercel/output/static/third-party-licenses.txt
review-work-r2/control-35/.vercel/output/static/wallet/index.html
review-work-r2/control-36/.vercel/output/config.json
review-work-r2/control-36/.vercel/output/static/assets/LedgerReading-B79PUj4e.js
review-work-r2/control-36/.vercel/output/static/assets/Verdict-CovB9dBW.js
review-work-r2/control-36/.vercel/output/static/assets/capabilities-C_fOF4FT.js
review-work-r2/control-36/.vercel/output/static/assets/custody-BfENjUkT.js
review-work-r2/control-36/.vercel/output/static/assets/index-Dnrjg5yz.js
review-work-r2/control-36/.vercel/output/static/assets/issuer-C7s7pq65.js
review-work-r2/control-36/.vercel/output/static/assets/observer-vpLUdZwo.js
review-work-r2/control-36/.vercel/output/static/assets/routes-CaZ_TphG.js
review-work-r2/control-36/.vercel/output/static/assets/styles-DJVXuOe6.css
review-work-r2/control-36/.vercel/output/static/assets/wallet-Co55StKP.js
review-work-r2/control-36/.vercel/output/static/capabilities/index.html
review-work-r2/control-36/.vercel/output/static/custody/index.html
review-work-r2/control-36/.vercel/output/static/gate-verdict.json
review-work-r2/control-36/.vercel/output/static/index.html
review-work-r2/control-36/.vercel/output/static/issuer/index.html
review-work-r2/control-36/.vercel/output/static/observer/index.html
review-work-r2/control-36/.vercel/output/static/third-party-licenses.txt
review-work-r2/control-36/.vercel/output/static/wallet/index.html
review-work-r2/control-37/.vercel/output/config.json
review-work-r2/control-37/.vercel/output/static/assets/LedgerReading-B79PUj4e.js
review-work-r2/control-37/.vercel/output/static/assets/Verdict-CovB9dBW.js
review-work-r2/control-37/.vercel/output/static/assets/capabilities-C_fOF4FT.js
review-work-r2/control-37/.vercel/output/static/assets/custody-BfENjUkT.js
review-work-r2/control-37/.vercel/output/static/assets/index-Dnrjg5yz.js
review-work-r2/control-37/.vercel/output/static/assets/issuer-C7s7pq65.js
review-work-r2/control-37/.vercel/output/static/assets/observer-vpLUdZwo.js
review-work-r2/control-37/.vercel/output/static/assets/routes-CaZ_TphG.js
review-work-r2/control-37/.vercel/output/static/assets/styles-DJVXuOe6.css
review-work-r2/control-37/.vercel/output/static/assets/wallet-Co55StKP.js
review-work-r2/control-37/.vercel/output/static/capabilities/index.html
review-work-r2/control-37/.vercel/output/static/custody/index.html
review-work-r2/control-37/.vercel/output/static/gate-verdict.json
review-work-r2/control-37/.vercel/output/static/index.html
review-work-r2/control-37/.vercel/output/static/issuer/index.html
review-work-r2/control-37/.vercel/output/static/observer/index.html
review-work-r2/control-37/.vercel/output/static/third-party-licenses.txt
review-work-r2/control-37/.vercel/output/static/wallet/index.html
review-work-r2/control-38/.vercel/output/config.json
review-work-r2/control-38/.vercel/output/static/assets/LedgerReading-B79PUj4e.js
review-work-r2/control-38/.vercel/output/static/assets/Verdict-CovB9dBW.js
review-work-r2/control-38/.vercel/output/static/assets/capabilities-C_fOF4FT.js
review-work-r2/control-38/.vercel/output/static/assets/custody-BfENjUkT.js
review-work-r2/control-38/.vercel/output/static/assets/index-Dnrjg5yz.js
review-work-r2/control-38/.vercel/output/static/assets/issuer-C7s7pq65.js
review-work-r2/control-38/.vercel/output/static/assets/observer-vpLUdZwo.js
review-work-r2/control-38/.vercel/output/static/assets/routes-CaZ_TphG.js
review-work-r2/control-38/.vercel/output/static/assets/styles-DJVXuOe6.css
review-work-r2/control-38/.vercel/output/static/assets/wallet-Co55StKP.js
review-work-r2/control-38/.vercel/output/static/capabilities/index.html
review-work-r2/control-38/.vercel/output/static/custody/index.html
review-work-r2/control-38/.vercel/output/static/gate-verdict.json
review-work-r2/control-38/.vercel/output/static/index.html
review-work-r2/control-38/.vercel/output/static/issuer/index.html
review-work-r2/control-38/.vercel/output/static/observer/index.html
review-work-r2/control-38/.vercel/output/static/third-party-licenses.txt
review-work-r2/control-38/.vercel/output/static/wallet/index.html
review-work-r2/control-39/.vercel/output/config.json
review-work-r2/control-39/.vercel/output/static/assets/LedgerReading-B79PUj4e.js
review-work-r2/control-39/.vercel/output/static/assets/Verdict-CovB9dBW.js
review-work-r2/control-39/.vercel/output/static/assets/capabilities-C_fOF4FT.js
review-work-r2/control-39/.vercel/output/static/assets/custody-BfENjUkT.js
review-work-r2/control-39/.vercel/output/static/assets/index-Dnrjg5yz.js
review-work-r2/control-39/.vercel/output/static/assets/issuer-C7s7pq65.js
review-work-r2/control-39/.vercel/output/static/assets/observer-vpLUdZwo.js
review-work-r2/control-39/.vercel/output/static/assets/routes-CaZ_TphG.js
review-work-r2/control-39/.vercel/output/static/assets/styles-DJVXuOe6.css
review-work-r2/control-39/.vercel/output/static/assets/wallet-Co55StKP.js
review-work-r2/control-39/.vercel/output/static/capabilities/index.html
review-work-r2/control-39/.vercel/output/static/custody/index.html
review-work-r2/control-39/.vercel/output/static/gate-verdict.json
review-work-r2/control-39/.vercel/output/static/index.html
review-work-r2/control-39/.vercel/output/static/issuer/index.html
review-work-r2/control-39/.vercel/output/static/observer/index.html
review-work-r2/control-39/.vercel/output/static/wallet/index.html
review-work-r2/control-4/.vercel/output/config.json
review-work-r2/control-4/.vercel/output/functions/api.func/.vc-config.json
review-work-r2/control-4/.vercel/output/static/assets/LedgerReading-B79PUj4e.js
review-work-r2/control-4/.vercel/output/static/assets/Verdict-CovB9dBW.js
review-work-r2/control-4/.vercel/output/static/assets/capabilities-C_fOF4FT.js
review-work-r2/control-4/.vercel/output/static/assets/custody-BfENjUkT.js
review-work-r2/control-4/.vercel/output/static/assets/index-Dnrjg5yz.js
review-work-r2/control-4/.vercel/output/static/assets/issuer-C7s7pq65.js
review-work-r2/control-4/.vercel/output/static/assets/observer-vpLUdZwo.js
review-work-r2/control-4/.vercel/output/static/assets/routes-CaZ_TphG.js
review-work-r2/control-4/.vercel/output/static/assets/styles-DJVXuOe6.css
review-work-r2/control-4/.vercel/output/static/assets/wallet-Co55StKP.js
review-work-r2/control-4/.vercel/output/static/capabilities/index.html
review-work-r2/control-4/.vercel/output/static/custody/index.html
review-work-r2/control-4/.vercel/output/static/gate-verdict.json
review-work-r2/control-4/.vercel/output/static/index.html
review-work-r2/control-4/.vercel/output/static/issuer/index.html
review-work-r2/control-4/.vercel/output/static/observer/index.html
review-work-r2/control-4/.vercel/output/static/third-party-licenses.txt
review-work-r2/control-4/.vercel/output/static/wallet/index.html
review-work-r2/control-40/.vercel/output/config.json
review-work-r2/control-40/.vercel/output/static/assets/LedgerReading-B79PUj4e.js
review-work-r2/control-40/.vercel/output/static/assets/Verdict-CovB9dBW.js
review-work-r2/control-40/.vercel/output/static/assets/capabilities-C_fOF4FT.js
review-work-r2/control-40/.vercel/output/static/assets/custody-BfENjUkT.js
review-work-r2/control-40/.vercel/output/static/assets/index-Dnrjg5yz.js
review-work-r2/control-40/.vercel/output/static/assets/issuer-C7s7pq65.js
review-work-r2/control-40/.vercel/output/static/assets/observer-vpLUdZwo.js
review-work-r2/control-40/.vercel/output/static/assets/routes-CaZ_TphG.js
review-work-r2/control-40/.vercel/output/static/assets/styles-DJVXuOe6.css
review-work-r2/control-40/.vercel/output/static/assets/wallet-Co55StKP.js
review-work-r2/control-40/.vercel/output/static/capabilities/index.html
review-work-r2/control-40/.vercel/output/static/custody/index.html
review-work-r2/control-40/.vercel/output/static/gate-verdict.json
review-work-r2/control-40/.vercel/output/static/index.html
review-work-r2/control-40/.vercel/output/static/issuer/index.html
review-work-r2/control-40/.vercel/output/static/observer/index.html
review-work-r2/control-40/.vercel/output/static/third-party-licenses.txt
review-work-r2/control-40/.vercel/output/static/wallet/index.html
review-work-r2/control-41/.vercel/output/config.json
review-work-r2/control-41/.vercel/output/static/assets/LedgerReading-B79PUj4e.js
review-work-r2/control-41/.vercel/output/static/assets/Verdict-CovB9dBW.js
review-work-r2/control-41/.vercel/output/static/assets/capabilities-C_fOF4FT.js
review-work-r2/control-41/.vercel/output/static/assets/custody-BfENjUkT.js
review-work-r2/control-41/.vercel/output/static/assets/index-Dnrjg5yz.js
review-work-r2/control-41/.vercel/output/static/assets/issuer-C7s7pq65.js
review-work-r2/control-41/.vercel/output/static/assets/observer-vpLUdZwo.js
review-work-r2/control-41/.vercel/output/static/assets/routes-CaZ_TphG.js
review-work-r2/control-41/.vercel/output/static/assets/styles-DJVXuOe6.css
review-work-r2/control-41/.vercel/output/static/assets/wallet-Co55StKP.js
review-work-r2/control-41/.vercel/output/static/capabilities/index.html
review-work-r2/control-41/.vercel/output/static/custody/index.html
review-work-r2/control-41/.vercel/output/static/gate-verdict.json
review-work-r2/control-41/.vercel/output/static/index.html
review-work-r2/control-41/.vercel/output/static/issuer/index.html
review-work-r2/control-41/.vercel/output/static/observer/index.html
review-work-r2/control-41/.vercel/output/static/third-party-licenses.txt
review-work-r2/control-41/.vercel/output/static/wallet/index.html
review-work-r2/control-5/.vercel/output/config.json
review-work-r2/control-5/.vercel/output/static/assets/LedgerReading-B79PUj4e.js
review-work-r2/control-5/.vercel/output/static/assets/Verdict-CovB9dBW.js
review-work-r2/control-5/.vercel/output/static/assets/capabilities-C_fOF4FT.js
review-work-r2/control-5/.vercel/output/static/assets/custody-BfENjUkT.js
review-work-r2/control-5/.vercel/output/static/assets/index-Dnrjg5yz.js
review-work-r2/control-5/.vercel/output/static/assets/issuer-C7s7pq65.js
review-work-r2/control-5/.vercel/output/static/assets/observer-vpLUdZwo.js
review-work-r2/control-5/.vercel/output/static/assets/routes-CaZ_TphG.js
review-work-r2/control-5/.vercel/output/static/assets/styles-DJVXuOe6.css
review-work-r2/control-5/.vercel/output/static/assets/wallet-Co55StKP.js
review-work-r2/control-5/.vercel/output/static/capabilities/index.html
review-work-r2/control-5/.vercel/output/static/custody/index.html
review-work-r2/control-5/.vercel/output/static/gate-verdict.json
review-work-r2/control-5/.vercel/output/static/index.html
review-work-r2/control-5/.vercel/output/static/issuer/index.html
review-work-r2/control-5/.vercel/output/static/observer/index.html
review-work-r2/control-5/.vercel/output/static/third-party-licenses.txt
review-work-r2/control-5/.vercel/output/static/wallet/index.html
review-work-r2/control-6/.vercel/output/config.json
review-work-r2/control-6/.vercel/output/static/assets/LedgerReading-B79PUj4e.js
review-work-r2/control-6/.vercel/output/static/assets/Verdict-CovB9dBW.js
review-work-r2/control-6/.vercel/output/static/assets/capabilities-C_fOF4FT.js
review-work-r2/control-6/.vercel/output/static/assets/custody-BfENjUkT.js
review-work-r2/control-6/.vercel/output/static/assets/index-Dnrjg5yz.js
review-work-r2/control-6/.vercel/output/static/assets/issuer-C7s7pq65.js
review-work-r2/control-6/.vercel/output/static/assets/observer-vpLUdZwo.js
review-work-r2/control-6/.vercel/output/static/assets/routes-CaZ_TphG.js
review-work-r2/control-6/.vercel/output/static/assets/styles-DJVXuOe6.css
review-work-r2/control-6/.vercel/output/static/assets/wallet-Co55StKP.js
review-work-r2/control-6/.vercel/output/static/capabilities/index.html
review-work-r2/control-6/.vercel/output/static/custody/index.html
review-work-r2/control-6/.vercel/output/static/gate-verdict.json
review-work-r2/control-6/.vercel/output/static/index.html
review-work-r2/control-6/.vercel/output/static/issuer/index.html
review-work-r2/control-6/.vercel/output/static/observer/index.html
review-work-r2/control-6/.vercel/output/static/third-party-licenses.txt
review-work-r2/control-6/.vercel/output/static/wallet/index.html
review-work-r2/control-7/.vercel/output/config.json
review-work-r2/control-7/.vercel/output/static/assets/LedgerReading-B79PUj4e.js
review-work-r2/control-7/.vercel/output/static/assets/Verdict-CovB9dBW.js
review-work-r2/control-7/.vercel/output/static/assets/capabilities-C_fOF4FT.js
review-work-r2/control-7/.vercel/output/static/assets/custody-BfENjUkT.js
review-work-r2/control-7/.vercel/output/static/assets/index-Dnrjg5yz.js
review-work-r2/control-7/.vercel/output/static/assets/issuer-C7s7pq65.js
review-work-r2/control-7/.vercel/output/static/assets/observer-vpLUdZwo.js
review-work-r2/control-7/.vercel/output/static/assets/routes-CaZ_TphG.js
review-work-r2/control-7/.vercel/output/static/assets/styles-DJVXuOe6.css
review-work-r2/control-7/.vercel/output/static/assets/wallet-Co55StKP.js
review-work-r2/control-7/.vercel/output/static/capabilities/index.html
review-work-r2/control-7/.vercel/output/static/custody/index.html
review-work-r2/control-7/.vercel/output/static/gate-verdict.json
review-work-r2/control-7/.vercel/output/static/index.html
review-work-r2/control-7/.vercel/output/static/issuer/index.html
review-work-r2/control-7/.vercel/output/static/observer/index.html
review-work-r2/control-7/.vercel/output/static/third-party-licenses.txt
review-work-r2/control-7/.vercel/output/static/wallet/index.html
review-work-r2/control-8/.vercel/output/config.json
review-work-r2/control-8/.vercel/output/static/assets/LedgerReading-B79PUj4e.js
review-work-r2/control-8/.vercel/output/static/assets/Verdict-CovB9dBW.js
review-work-r2/control-8/.vercel/output/static/assets/capabilities-C_fOF4FT.js
review-work-r2/control-8/.vercel/output/static/assets/custody-BfENjUkT.js
review-work-r2/control-8/.vercel/output/static/assets/index-Dnrjg5yz.js
review-work-r2/control-8/.vercel/output/static/assets/issuer-C7s7pq65.js
review-work-r2/control-8/.vercel/output/static/assets/observer-vpLUdZwo.js
review-work-r2/control-8/.vercel/output/static/assets/routes-CaZ_TphG.js
review-work-r2/control-8/.vercel/output/static/assets/styles-DJVXuOe6.css
review-work-r2/control-8/.vercel/output/static/assets/wallet-Co55StKP.js
review-work-r2/control-8/.vercel/output/static/capabilities/index.html
review-work-r2/control-8/.vercel/output/static/custody/index.html
review-work-r2/control-8/.vercel/output/static/gate-verdict.json
review-work-r2/control-8/.vercel/output/static/index.html
review-work-r2/control-8/.vercel/output/static/issuer/index.html
review-work-r2/control-8/.vercel/output/static/observer/index.html
review-work-r2/control-8/.vercel/output/static/third-party-licenses.txt
review-work-r2/control-8/.vercel/output/static/wallet/index.html
review-work-r2/control-9/.vercel/output/config.json
review-work-r2/control-9/.vercel/output/static/assets/LedgerReading-B79PUj4e.js
review-work-r2/control-9/.vercel/output/static/assets/Verdict-CovB9dBW.js
review-work-r2/control-9/.vercel/output/static/assets/capabilities-C_fOF4FT.js
review-work-r2/control-9/.vercel/output/static/assets/custody-BfENjUkT.js
review-work-r2/control-9/.vercel/output/static/assets/index-Dnrjg5yz.js
review-work-r2/control-9/.vercel/output/static/assets/issuer-C7s7pq65.js
review-work-r2/control-9/.vercel/output/static/assets/observer-vpLUdZwo.js
review-work-r2/control-9/.vercel/output/static/assets/routes-CaZ_TphG.js
review-work-r2/control-9/.vercel/output/static/assets/styles-DJVXuOe6.css
review-work-r2/control-9/.vercel/output/static/assets/wallet-Co55StKP.js
review-work-r2/control-9/.vercel/output/static/capabilities/index.html
review-work-r2/control-9/.vercel/output/static/custody/index.html
review-work-r2/control-9/.vercel/output/static/gate-verdict.json
review-work-r2/control-9/.vercel/output/static/index.html
review-work-r2/control-9/.vercel/output/static/issuer/index.html
review-work-r2/control-9/.vercel/output/static/observer/index.html
review-work-r2/control-9/.vercel/output/static/third-party-licenses.txt
review-work-r2/control-9/.vercel/output/static/wallet/index.html
review-work-r2/controls-probes.log
review-work-r2/controls-probes.ts
review-work-r2/crypto-control/.vercel/output/config.json
review-work-r2/crypto-control/.vercel/output/static/assets/LedgerReading-B79PUj4e.js
review-work-r2/crypto-control/.vercel/output/static/assets/Verdict-CovB9dBW.js
review-work-r2/crypto-control/.vercel/output/static/assets/capabilities-C_fOF4FT.js
review-work-r2/crypto-control/.vercel/output/static/assets/custody-BfENjUkT.js
review-work-r2/crypto-control/.vercel/output/static/assets/index-Dnrjg5yz.js
review-work-r2/crypto-control/.vercel/output/static/assets/issuer-C7s7pq65.js
review-work-r2/crypto-control/.vercel/output/static/assets/observer-vpLUdZwo.js
review-work-r2/crypto-control/.vercel/output/static/assets/routes-CaZ_TphG.js
review-work-r2/crypto-control/.vercel/output/static/assets/styles-DJVXuOe6.css
review-work-r2/crypto-control/.vercel/output/static/assets/wallet-Co55StKP.js
review-work-r2/crypto-control/.vercel/output/static/capabilities/index.html
review-work-r2/crypto-control/.vercel/output/static/custody/index.html
review-work-r2/crypto-control/.vercel/output/static/gate-verdict.json
review-work-r2/crypto-control/.vercel/output/static/index.html
review-work-r2/crypto-control/.vercel/output/static/issuer/index.html
review-work-r2/crypto-control/.vercel/output/static/observer/index.html
review-work-r2/crypto-control/.vercel/output/static/third-party-licenses.txt
review-work-r2/crypto-control/.vercel/output/static/wallet/index.html
review-work-r2/custody-regression.log
review-work-r2/custody-visible.txt
review-work-r2/display-none/.vercel/output/config.json
review-work-r2/display-none/.vercel/output/static/assets/LedgerReading-B79PUj4e.js
review-work-r2/display-none/.vercel/output/static/assets/Verdict-CovB9dBW.js
review-work-r2/display-none/.vercel/output/static/assets/capabilities-C_fOF4FT.js
review-work-r2/display-none/.vercel/output/static/assets/custody-BfENjUkT.js
review-work-r2/display-none/.vercel/output/static/assets/index-Dnrjg5yz.js
review-work-r2/display-none/.vercel/output/static/assets/issuer-C7s7pq65.js
review-work-r2/display-none/.vercel/output/static/assets/observer-vpLUdZwo.js
review-work-r2/display-none/.vercel/output/static/assets/routes-CaZ_TphG.js
review-work-r2/display-none/.vercel/output/static/assets/styles-DJVXuOe6.css
review-work-r2/display-none/.vercel/output/static/assets/wallet-Co55StKP.js
review-work-r2/display-none/.vercel/output/static/capabilities/index.html
review-work-r2/display-none/.vercel/output/static/custody/index.html
review-work-r2/display-none/.vercel/output/static/gate-verdict.json
review-work-r2/display-none/.vercel/output/static/index.html
review-work-r2/display-none/.vercel/output/static/issuer/index.html
review-work-r2/display-none/.vercel/output/static/observer/index.html
review-work-r2/display-none/.vercel/output/static/third-party-licenses.txt
review-work-r2/display-none/.vercel/output/static/wallet/index.html
review-work-r2/display-none/build-manifest.json
review-work-r2/endpoint-mismatch/.vercel/output/config.json
review-work-r2/endpoint-mismatch/.vercel/output/static/assets/LedgerReading-B79PUj4e.js
review-work-r2/endpoint-mismatch/.vercel/output/static/assets/Verdict-CovB9dBW.js
review-work-r2/endpoint-mismatch/.vercel/output/static/assets/capabilities-C_fOF4FT.js
review-work-r2/endpoint-mismatch/.vercel/output/static/assets/custody-BfENjUkT.js
review-work-r2/endpoint-mismatch/.vercel/output/static/assets/index-Dnrjg5yz.js
review-work-r2/endpoint-mismatch/.vercel/output/static/assets/issuer-C7s7pq65.js
review-work-r2/endpoint-mismatch/.vercel/output/static/assets/observer-vpLUdZwo.js
review-work-r2/endpoint-mismatch/.vercel/output/static/assets/routes-CaZ_TphG.js
review-work-r2/endpoint-mismatch/.vercel/output/static/assets/styles-DJVXuOe6.css
review-work-r2/endpoint-mismatch/.vercel/output/static/assets/wallet-Co55StKP.js
review-work-r2/endpoint-mismatch/.vercel/output/static/capabilities/index.html
review-work-r2/endpoint-mismatch/.vercel/output/static/custody/index.html
review-work-r2/endpoint-mismatch/.vercel/output/static/gate-verdict.json
review-work-r2/endpoint-mismatch/.vercel/output/static/index.html
review-work-r2/endpoint-mismatch/.vercel/output/static/issuer/index.html
review-work-r2/endpoint-mismatch/.vercel/output/static/observer/index.html
review-work-r2/endpoint-mismatch/.vercel/output/static/third-party-licenses.txt
review-work-r2/endpoint-mismatch/.vercel/output/static/wallet/index.html
review-work-r2/endpoint-mismatch/build-manifest.json
review-work-r2/issuer-figure-next/.vercel/output/config.json
review-work-r2/issuer-figure-next/.vercel/output/static/assets/LedgerReading-B79PUj4e.js
review-work-r2/issuer-figure-next/.vercel/output/static/assets/Verdict-CovB9dBW.js
review-work-r2/issuer-figure-next/.vercel/output/static/assets/capabilities-C_fOF4FT.js
review-work-r2/issuer-figure-next/.vercel/output/static/assets/custody-BfENjUkT.js
review-work-r2/issuer-figure-next/.vercel/output/static/assets/index-Dnrjg5yz.js
review-work-r2/issuer-figure-next/.vercel/output/static/assets/issuer-C7s7pq65.js
review-work-r2/issuer-figure-next/.vercel/output/static/assets/observer-vpLUdZwo.js
review-work-r2/issuer-figure-next/.vercel/output/static/assets/routes-CaZ_TphG.js
review-work-r2/issuer-figure-next/.vercel/output/static/assets/styles-DJVXuOe6.css
review-work-r2/issuer-figure-next/.vercel/output/static/assets/wallet-Co55StKP.js
review-work-r2/issuer-figure-next/.vercel/output/static/capabilities/index.html
review-work-r2/issuer-figure-next/.vercel/output/static/custody/index.html
review-work-r2/issuer-figure-next/.vercel/output/static/gate-verdict.json
review-work-r2/issuer-figure-next/.vercel/output/static/index.html
review-work-r2/issuer-figure-next/.vercel/output/static/issuer/index.html
review-work-r2/issuer-figure-next/.vercel/output/static/observer/index.html
review-work-r2/issuer-figure-next/.vercel/output/static/third-party-licenses.txt
review-work-r2/issuer-figure-next/.vercel/output/static/wallet/index.html
review-work-r2/issuer-figure-next/build-manifest.json
review-work-r2/issuer-figure/.vercel/output/config.json
review-work-r2/issuer-figure/.vercel/output/static/assets/LedgerReading-B79PUj4e.js
review-work-r2/issuer-figure/.vercel/output/static/assets/Verdict-CovB9dBW.js
review-work-r2/issuer-figure/.vercel/output/static/assets/capabilities-C_fOF4FT.js
review-work-r2/issuer-figure/.vercel/output/static/assets/custody-BfENjUkT.js
review-work-r2/issuer-figure/.vercel/output/static/assets/index-Dnrjg5yz.js
review-work-r2/issuer-figure/.vercel/output/static/assets/issuer-C7s7pq65.js
review-work-r2/issuer-figure/.vercel/output/static/assets/observer-vpLUdZwo.js
review-work-r2/issuer-figure/.vercel/output/static/assets/routes-CaZ_TphG.js
review-work-r2/issuer-figure/.vercel/output/static/assets/styles-DJVXuOe6.css
review-work-r2/issuer-figure/.vercel/output/static/assets/wallet-Co55StKP.js
review-work-r2/issuer-figure/.vercel/output/static/capabilities/index.html
review-work-r2/issuer-figure/.vercel/output/static/custody/index.html
review-work-r2/issuer-figure/.vercel/output/static/gate-verdict.json
review-work-r2/issuer-figure/.vercel/output/static/index.html
review-work-r2/issuer-figure/.vercel/output/static/issuer/index.html
review-work-r2/issuer-figure/.vercel/output/static/observer/index.html
review-work-r2/issuer-figure/.vercel/output/static/third-party-licenses.txt
review-work-r2/issuer-figure/.vercel/output/static/wallet/index.html
review-work-r2/issuer-figure/build-manifest.json
review-work-r2/issuer-visible.txt
review-work-r2/manifest-endpoint/.vercel/output/config.json
review-work-r2/manifest-endpoint/.vercel/output/static/assets/LedgerReading-B79PUj4e.js
review-work-r2/manifest-endpoint/.vercel/output/static/assets/Verdict-CovB9dBW.js
review-work-r2/manifest-endpoint/.vercel/output/static/assets/capabilities-C_fOF4FT.js
review-work-r2/manifest-endpoint/.vercel/output/static/assets/custody-BfENjUkT.js
review-work-r2/manifest-endpoint/.vercel/output/static/assets/index-Dnrjg5yz.js
review-work-r2/manifest-endpoint/.vercel/output/static/assets/issuer-C7s7pq65.js
review-work-r2/manifest-endpoint/.vercel/output/static/assets/observer-vpLUdZwo.js
review-work-r2/manifest-endpoint/.vercel/output/static/assets/routes-CaZ_TphG.js
review-work-r2/manifest-endpoint/.vercel/output/static/assets/styles-DJVXuOe6.css
review-work-r2/manifest-endpoint/.vercel/output/static/assets/wallet-Co55StKP.js
review-work-r2/manifest-endpoint/.vercel/output/static/capabilities/index.html
review-work-r2/manifest-endpoint/.vercel/output/static/custody/index.html
review-work-r2/manifest-endpoint/.vercel/output/static/gate-verdict.json
review-work-r2/manifest-endpoint/.vercel/output/static/index.html
review-work-r2/manifest-endpoint/.vercel/output/static/issuer/index.html
review-work-r2/manifest-endpoint/.vercel/output/static/observer/index.html
review-work-r2/manifest-endpoint/.vercel/output/static/third-party-licenses.txt
review-work-r2/manifest-endpoint/.vercel/output/static/wallet/index.html
review-work-r2/manifest-endpoint/build-manifest.json
review-work-r2/manifest-ledger-one/.vercel/output/config.json
review-work-r2/manifest-ledger-one/.vercel/output/static/assets/LedgerReading-B79PUj4e.js
review-work-r2/manifest-ledger-one/.vercel/output/static/assets/Verdict-CovB9dBW.js
review-work-r2/manifest-ledger-one/.vercel/output/static/assets/capabilities-C_fOF4FT.js
review-work-r2/manifest-ledger-one/.vercel/output/static/assets/custody-BfENjUkT.js
review-work-r2/manifest-ledger-one/.vercel/output/static/assets/index-Dnrjg5yz.js
review-work-r2/manifest-ledger-one/.vercel/output/static/assets/issuer-C7s7pq65.js
review-work-r2/manifest-ledger-one/.vercel/output/static/assets/observer-vpLUdZwo.js
review-work-r2/manifest-ledger-one/.vercel/output/static/assets/routes-CaZ_TphG.js
review-work-r2/manifest-ledger-one/.vercel/output/static/assets/styles-DJVXuOe6.css
review-work-r2/manifest-ledger-one/.vercel/output/static/assets/wallet-Co55StKP.js
review-work-r2/manifest-ledger-one/.vercel/output/static/capabilities/index.html
review-work-r2/manifest-ledger-one/.vercel/output/static/custody/index.html
review-work-r2/manifest-ledger-one/.vercel/output/static/gate-verdict.json
review-work-r2/manifest-ledger-one/.vercel/output/static/index.html
review-work-r2/manifest-ledger-one/.vercel/output/static/issuer/index.html
review-work-r2/manifest-ledger-one/.vercel/output/static/observer/index.html
review-work-r2/manifest-ledger-one/.vercel/output/static/third-party-licenses.txt
review-work-r2/manifest-ledger-one/.vercel/output/static/wallet/index.html
review-work-r2/manifest-ledger-one/build-manifest.json
review-work-r2/manifest-missing-image/.vercel/output/config.json
review-work-r2/manifest-missing-image/.vercel/output/static/assets/LedgerReading-B79PUj4e.js
review-work-r2/manifest-missing-image/.vercel/output/static/assets/Verdict-CovB9dBW.js
review-work-r2/manifest-missing-image/.vercel/output/static/assets/capabilities-C_fOF4FT.js
review-work-r2/manifest-missing-image/.vercel/output/static/assets/custody-BfENjUkT.js
review-work-r2/manifest-missing-image/.vercel/output/static/assets/index-Dnrjg5yz.js
review-work-r2/manifest-missing-image/.vercel/output/static/assets/issuer-C7s7pq65.js
review-work-r2/manifest-missing-image/.vercel/output/static/assets/observer-vpLUdZwo.js
review-work-r2/manifest-missing-image/.vercel/output/static/assets/routes-CaZ_TphG.js
review-work-r2/manifest-missing-image/.vercel/output/static/assets/styles-DJVXuOe6.css
review-work-r2/manifest-missing-image/.vercel/output/static/assets/wallet-Co55StKP.js
review-work-r2/manifest-missing-image/.vercel/output/static/capabilities/index.html
review-work-r2/manifest-missing-image/.vercel/output/static/custody/index.html
review-work-r2/manifest-missing-image/.vercel/output/static/gate-verdict.json
review-work-r2/manifest-missing-image/.vercel/output/static/index.html
review-work-r2/manifest-missing-image/.vercel/output/static/issuer/index.html
review-work-r2/manifest-missing-image/.vercel/output/static/observer/index.html
review-work-r2/manifest-missing-image/.vercel/output/static/third-party-licenses.txt
review-work-r2/manifest-missing-image/.vercel/output/static/wallet/index.html
review-work-r2/manifest-missing-image/build-manifest.json
review-work-r2/manifest-missing-trial/.vercel/output/config.json
review-work-r2/manifest-missing-trial/.vercel/output/static/assets/LedgerReading-B79PUj4e.js
review-work-r2/manifest-missing-trial/.vercel/output/static/assets/Verdict-CovB9dBW.js
review-work-r2/manifest-missing-trial/.vercel/output/static/assets/capabilities-C_fOF4FT.js
review-work-r2/manifest-missing-trial/.vercel/output/static/assets/custody-BfENjUkT.js
review-work-r2/manifest-missing-trial/.vercel/output/static/assets/index-Dnrjg5yz.js
review-work-r2/manifest-missing-trial/.vercel/output/static/assets/issuer-C7s7pq65.js
review-work-r2/manifest-missing-trial/.vercel/output/static/assets/observer-vpLUdZwo.js
review-work-r2/manifest-missing-trial/.vercel/output/static/assets/routes-CaZ_TphG.js
review-work-r2/manifest-missing-trial/.vercel/output/static/assets/styles-DJVXuOe6.css
review-work-r2/manifest-missing-trial/.vercel/output/static/assets/wallet-Co55StKP.js
review-work-r2/manifest-missing-trial/.vercel/output/static/capabilities/index.html
review-work-r2/manifest-missing-trial/.vercel/output/static/custody/index.html
review-work-r2/manifest-missing-trial/.vercel/output/static/gate-verdict.json
review-work-r2/manifest-missing-trial/.vercel/output/static/index.html
review-work-r2/manifest-missing-trial/.vercel/output/static/issuer/index.html
review-work-r2/manifest-missing-trial/.vercel/output/static/observer/index.html
review-work-r2/manifest-missing-trial/.vercel/output/static/third-party-licenses.txt
review-work-r2/manifest-missing-trial/.vercel/output/static/wallet/index.html
review-work-r2/manifest-missing-trial/build-manifest.json
review-work-r2/manifest-readtime/.vercel/output/config.json
review-work-r2/manifest-readtime/.vercel/output/static/assets/LedgerReading-B79PUj4e.js
review-work-r2/manifest-readtime/.vercel/output/static/assets/Verdict-CovB9dBW.js
review-work-r2/manifest-readtime/.vercel/output/static/assets/capabilities-C_fOF4FT.js
review-work-r2/manifest-readtime/.vercel/output/static/assets/custody-BfENjUkT.js
review-work-r2/manifest-readtime/.vercel/output/static/assets/index-Dnrjg5yz.js
review-work-r2/manifest-readtime/.vercel/output/static/assets/issuer-C7s7pq65.js
review-work-r2/manifest-readtime/.vercel/output/static/assets/observer-vpLUdZwo.js
review-work-r2/manifest-readtime/.vercel/output/static/assets/routes-CaZ_TphG.js
review-work-r2/manifest-readtime/.vercel/output/static/assets/styles-DJVXuOe6.css
review-work-r2/manifest-readtime/.vercel/output/static/assets/wallet-Co55StKP.js
review-work-r2/manifest-readtime/.vercel/output/static/capabilities/index.html
review-work-r2/manifest-readtime/.vercel/output/static/custody/index.html
review-work-r2/manifest-readtime/.vercel/output/static/gate-verdict.json
review-work-r2/manifest-readtime/.vercel/output/static/index.html
review-work-r2/manifest-readtime/.vercel/output/static/issuer/index.html
review-work-r2/manifest-readtime/.vercel/output/static/observer/index.html
review-work-r2/manifest-readtime/.vercel/output/static/third-party-licenses.txt
review-work-r2/manifest-readtime/.vercel/output/static/wallet/index.html
review-work-r2/manifest-readtime/build-manifest.json
review-work-r2/observer-visible.txt
review-work-r2/opacity-zero/.vercel/output/config.json
review-work-r2/opacity-zero/.vercel/output/static/assets/LedgerReading-B79PUj4e.js
review-work-r2/opacity-zero/.vercel/output/static/assets/Verdict-CovB9dBW.js
review-work-r2/opacity-zero/.vercel/output/static/assets/capabilities-C_fOF4FT.js
review-work-r2/opacity-zero/.vercel/output/static/assets/custody-BfENjUkT.js
review-work-r2/opacity-zero/.vercel/output/static/assets/index-Dnrjg5yz.js
review-work-r2/opacity-zero/.vercel/output/static/assets/issuer-C7s7pq65.js
review-work-r2/opacity-zero/.vercel/output/static/assets/observer-vpLUdZwo.js
review-work-r2/opacity-zero/.vercel/output/static/assets/routes-CaZ_TphG.js
review-work-r2/opacity-zero/.vercel/output/static/assets/styles-DJVXuOe6.css
review-work-r2/opacity-zero/.vercel/output/static/assets/wallet-Co55StKP.js
review-work-r2/opacity-zero/.vercel/output/static/capabilities/index.html
review-work-r2/opacity-zero/.vercel/output/static/custody/index.html
review-work-r2/opacity-zero/.vercel/output/static/gate-verdict.json
review-work-r2/opacity-zero/.vercel/output/static/index.html
review-work-r2/opacity-zero/.vercel/output/static/issuer/index.html
review-work-r2/opacity-zero/.vercel/output/static/observer/index.html
review-work-r2/opacity-zero/.vercel/output/static/third-party-licenses.txt
review-work-r2/opacity-zero/.vercel/output/static/wallet/index.html
review-work-r2/opacity-zero/build-manifest.json
review-work-r2/probes.log
review-work-r2/probes.ts
review-work-r2/reader-probes.log
review-work-r2/reader-probes.ts
review-work-r2/readtime-malformed/.vercel/output/config.json
review-work-r2/readtime-malformed/.vercel/output/static/assets/LedgerReading-B79PUj4e.js
review-work-r2/readtime-malformed/.vercel/output/static/assets/Verdict-CovB9dBW.js
review-work-r2/readtime-malformed/.vercel/output/static/assets/capabilities-C_fOF4FT.js
review-work-r2/readtime-malformed/.vercel/output/static/assets/custody-BfENjUkT.js
review-work-r2/readtime-malformed/.vercel/output/static/assets/index-Dnrjg5yz.js
review-work-r2/readtime-malformed/.vercel/output/static/assets/issuer-C7s7pq65.js
review-work-r2/readtime-malformed/.vercel/output/static/assets/observer-vpLUdZwo.js
review-work-r2/readtime-malformed/.vercel/output/static/assets/routes-CaZ_TphG.js
review-work-r2/readtime-malformed/.vercel/output/static/assets/styles-DJVXuOe6.css
review-work-r2/readtime-malformed/.vercel/output/static/assets/wallet-Co55StKP.js
review-work-r2/readtime-malformed/.vercel/output/static/capabilities/index.html
review-work-r2/readtime-malformed/.vercel/output/static/custody/index.html
review-work-r2/readtime-malformed/.vercel/output/static/gate-verdict.json
review-work-r2/readtime-malformed/.vercel/output/static/index.html
review-work-r2/readtime-malformed/.vercel/output/static/issuer/index.html
review-work-r2/readtime-malformed/.vercel/output/static/observer/index.html
review-work-r2/readtime-malformed/.vercel/output/static/third-party-licenses.txt
review-work-r2/readtime-malformed/.vercel/output/static/wallet/index.html
review-work-r2/readtime-malformed/build-manifest.json
review-work-r2/readtime-valid-but-wrong/.vercel/output/config.json
review-work-r2/readtime-valid-but-wrong/.vercel/output/static/assets/LedgerReading-B79PUj4e.js
review-work-r2/readtime-valid-but-wrong/.vercel/output/static/assets/Verdict-CovB9dBW.js
review-work-r2/readtime-valid-but-wrong/.vercel/output/static/assets/capabilities-C_fOF4FT.js
review-work-r2/readtime-valid-but-wrong/.vercel/output/static/assets/custody-BfENjUkT.js
review-work-r2/readtime-valid-but-wrong/.vercel/output/static/assets/index-Dnrjg5yz.js
review-work-r2/readtime-valid-but-wrong/.vercel/output/static/assets/issuer-C7s7pq65.js
review-work-r2/readtime-valid-but-wrong/.vercel/output/static/assets/observer-vpLUdZwo.js
review-work-r2/readtime-valid-but-wrong/.vercel/output/static/assets/routes-CaZ_TphG.js
review-work-r2/readtime-valid-but-wrong/.vercel/output/static/assets/styles-DJVXuOe6.css
review-work-r2/readtime-valid-but-wrong/.vercel/output/static/assets/wallet-Co55StKP.js
review-work-r2/readtime-valid-but-wrong/.vercel/output/static/capabilities/index.html
review-work-r2/readtime-valid-but-wrong/.vercel/output/static/custody/index.html
review-work-r2/readtime-valid-but-wrong/.vercel/output/static/gate-verdict.json
review-work-r2/readtime-valid-but-wrong/.vercel/output/static/index.html
review-work-r2/readtime-valid-but-wrong/.vercel/output/static/issuer/index.html
review-work-r2/readtime-valid-but-wrong/.vercel/output/static/observer/index.html
review-work-r2/readtime-valid-but-wrong/.vercel/output/static/third-party-licenses.txt
review-work-r2/readtime-valid-but-wrong/.vercel/output/static/wallet/index.html
review-work-r2/readtime-valid-but-wrong/build-manifest.json
review-work-r2/release-probes.log
review-work-r2/release-probes.ts
review-work-r2/rg-old-phrases.log
review-work-r2/root-refusal.log
review-work-r2/search-opened-files.txt
review-work-r2/secrets.log
review-work-r2/static-visible.txt
review-work-r2/test-diff.txt
review-work-r2/tests.log
review-work-r2/text-sweep.json
review-work-r2/text-sweep.log
review-work-r2/text-sweep.py
review-work-r2/wallet-visible.txt
signer/Cargo.lock
signer/Cargo.toml
signer/README.md
signer/build.rs
signer/src/bin/ledger-read.rs
signer/src/bin/onboard.rs
signer/src/bin/store-check.rs
signer/src/confirm.rs
signer/src/grant.rs
signer/src/holder.rs
signer/src/ipc.rs
signer/src/keygen.rs
signer/src/ledger.rs
signer/src/lib.rs
signer/src/main.rs
signer/src/mpt.rs
signer/src/onboarding.rs
signer/src/protocol.rs
signer/src/prover.rs
signer/src/randomness.rs
signer/src/scalar.rs
signer/src/session.rs
signer/src/store.rs
signer/src/txn.rs
signer/src/xrpl.rs
signer/tests/convert_back.rs
signer/tests/falsifier.rs
signer/tests/hedged_signing.rs
signer/tests/keygen_interop.rs
signer/tests/keygen_kat.rs
signer/tests/ledger_devnet.rs
signer/tests/ledger_read.rs
signer/tests/onboarding.rs
signer/tests/profile_parse_b23.rs
signer/tests/prover_ffi.rs
signer/tests/prover_pristine.rs
signer/tests/r_and_rho_kat.rs
signer/tests/signing_path.rs
signer/tests/store_a4_a9.rs
signer/tests/support/mod.rs
signer/tests/xrpl_vectors.rs
tools/.review-r2-gate.ts (temporary instrumented copy; removed)
tools/break-emphasis-gate.sh
tools/break-no-secrets-gate.ts
tools/break-secret-file-modes.py
tools/break-zeroize-lock.sh
tools/build-claims-index.ts
tools/build-claims-revisions.ts
tools/build-claims-topics.ts
tools/check-amendments.ts
tools/check-blinding-sources.ts
tools/check-disclosure-phrases.ts
tools/check-emphasis.ts
tools/check-filing.ts
tools/check-loopback.ts
tools/check-negative-claims.ts
tools/check-no-secrets.ts
tools/check-personas.ts
tools/check-push-guard.sh
tools/check-table-integrity.ts
tools/check-test-support-gate.ts
tools/check-vocabulary.ts
tools/check-web-hosted.ts
tools/check-web-readonly.ts
tools/check-zeroize-bounds.py
tools/ci.sh
tools/devnet-submit.ts
tools/git-hooks/pre-push
tools/install-push-guard.sh
tools/inventory-third-party.ts
tools/issuer-decrypt-balance.ts
tools/issuer-view-snapshot.ts
tools/loopback-node/node.sh
tools/loopback-node/rippled.cfg
tools/loopback-node/validators.txt
tools/mpt-crypto-bench/README.md
tools/mpt-crypto-bench/wconf_bench.c
tools/mpt-crypto-bench/wconf_dlp.c
tools/mpt-crypto-bench/wconf_window.c
tools/observer-harness.ts
tools/rebuild-env.sh
tools/redact-review-fixtures.ts
tools/scrub-personal-data.ts
tools/spike-2026-08-17/README.md
tools/spike-2026-08-17/adj-c1-shared-blinding.ts
tools/spike-2026-08-17/adj-c1-verify.ts
tools/spike-2026-08-17/adj-e22-controlled.ts
tools/spike-2026-08-17/adj-fee-ladder-nonzero.ts
tools/spike-2026-08-17/adj-metadata-and-fee.ts
tools/spike-2026-08-17/audit-evidence.ts
tools/spike-2026-08-17/auditor-n4.ts
tools/spike-2026-08-17/build-native.sh
tools/spike-2026-08-17/convert.ts
tools/spike-2026-08-17/defs-check.ts
tools/spike-2026-08-17/gap8-final-state.ts
tools/spike-2026-08-17/gap8-lending-lifecycle.ts
tools/spike-2026-08-17/gap8-loan-ops.ts
tools/spike-2026-08-17/gap8-reachability.ts
tools/spike-2026-08-17/gap8-teardown.ts
tools/spike-2026-08-17/inspect.ts
tools/spike-2026-08-17/mptool.c
tools/spike-2026-08-17/npm-decrypt-window.ts
tools/spike-2026-08-17/npm-e2e-convert.ts
tools/spike-2026-08-17/npm-package-test.ts
tools/spike-2026-08-17/post-vault-send.ts
tools/spike-2026-08-17/send.ts
tools/spike-2026-08-17/vault.ts
tools/spike-2026-08-17/verify.ts
tools/spike-2026-08-17/wasm-test.ts
tools/spike-2026-08-18/README.md
tools/spike-2026-08-18/WCONF-PATCH.md
tools/spike-2026-08-18/build-t9.sh
tools/spike-2026-08-18/build.sh
tools/spike-2026-08-18/devnet-send-our-nonces.ts
tools/spike-2026-08-18/nonce-crosscheck.ts
tools/spike-2026-08-18/t-nbound.c
tools/spike-2026-08-18/t1-vectors.json
tools/spike-2026-08-18/t1-vectors.ts
tools/spike-2026-08-18/t9-entropy.c
tools/spike-2026-08-18/vendor-verify.sh
tools/spike-2026-08-18/wconf-kat.c
tools/spike-2026-08-18/wconf-nonces.patch
tools/spike-b16-2026-08-27/b16-hedged-ed25519-devnet.ts
tools/spike-b16-2026-08-27/ed25519-hedge-vectors.json
tools/spike-b16-2026-08-27/revert-sweep.py
tools/spike-b16-2026-08-27/t-ed25519-hedge-construction.ts
tools/spike-keygen-2026-08-18/t-keygen-construction.ts
tools/spike-randomness-2026-08-18/FINDINGS.md
tools/spike-randomness-2026-08-18/reuse-r-attack.ts
tools/spike-randomness-2026-08-18/reuse-r-setup.ts
tools/spike-randomness-2026-08-18/t-r-and-rho-construction.ts
tools/spike-step2-2026-08-19/README.md
tools/spike-step2-2026-08-19/b14-hedged-secp256k1-devnet.ts
tools/spike-step2-2026-08-19/f23-substituted-key.ts
tools/spike-step3-2026-08-18/README.md
tools/spike-step3-2026-08-18/devnet-clean-account.ts
tools/spike-step3-2026-08-18/devnet-signer-send.ts
tools/spike-step3-2026-08-18/xrpl-vectors.json
tools/spike-step3-2026-08-18/xrpl-vectors.ts
tools/spike-step6-2026-08-20/README.md
tools/spike-step6-2026-08-20/devnet-derived-key.ts
tools/spike-step7-2026-08-24/README.md
tools/spike-step7-2026-08-24/devnet-convert-back.ts
tools/spike-step7-2026-08-24/devnet-ruled-randomness-harness.ts
tools/wconf-keygen.test.ts
tools/wconf-keygen.ts
tools/wconf-randomness.ts
tools/web-readonly-needles.ts
tsconfig.json
web/README.md
web/api/capability.test.ts
web/api/capability.ts
web/api/custody-sim.ts
web/api/demo-accounts.ts
web/api/disclosure.test.ts
web/api/issuer.ts
web/api/ledger-view.ts
web/api/observer.ts
web/api/server.ts
web/api/signer-status.ts
web/app/src/api.ts
web/app/src/components/AccountPicker.tsx
web/app/src/components/Verdict.tsx
web/app/src/hosted/Footer.tsx
web/app/src/hosted/LedgerReading.tsx
web/app/src/hosted/data.ts
web/app/src/hosted/routeTree.gen.ts
web/app/src/hosted/router.tsx
web/app/src/hosted/routes/__root.tsx
web/app/src/hosted/routes/capabilities.tsx
web/app/src/hosted/routes/custody.tsx
web/app/src/hosted/routes/index.tsx
web/app/src/hosted/routes/issuer.tsx
web/app/src/hosted/routes/observer.tsx
web/app/src/hosted/routes/wallet.tsx
web/app/src/hosted/virtual.d.ts
web/app/src/hosted/wording.ts
web/app/src/routeTree.gen.ts
web/app/src/router.tsx
web/app/src/routes/__root.tsx
web/app/src/routes/api-doc.tsx
web/app/src/routes/capabilities.tsx
web/app/src/routes/custody.tsx
web/app/src/routes/index.tsx
web/app/src/routes/issuer.tsx
web/app/src/routes/observer.tsx
web/app/src/routes/wallet.tsx
web/app/src/styles.css
web/app/src/views/CapabilitiesView.tsx
web/app/src/views/CustodyView.tsx
web/app/src/views/ObserverReading.tsx
web/app/src/views/WalletView.tsx
web/app/tsconfig.hosted.json
web/app/tsconfig.json
web/app/vite.config.ts
web/app/vite.hosted.config.ts
web/hosted/Dockerfile
web/hosted/README.md
web/hosted/browser-check.ts
web/hosted/build.test.ts
web/hosted/build.ts
web/hosted/compare-deployed.ts
web/hosted/csp.test.ts
web/hosted/csp.ts
web/hosted/deploy-preflight.ts
web/hosted/deploy.test.ts
web/hosted/licence-notices.ts
web/hosted/pages.ts
web/hosted/snapshot-types.ts
web/hosted/snapshot.test.ts
web/hosted/snapshot.ts
web/hosted/vercel-output.ts
web/hosted/wording.test.ts
````

## search-opened-files.txt

````
.claude/agents/build-lead.md
.claude/agents/crypto-reviewer.md
.claude/agents/protocol-researcher.md
.claude/commands/claims-check.md
.claude/commands/feedback-capture.md
.claude/commands/issue-review.md
.claude/commands/task-zero.md
.claude/commands/upstream-issue.md
.github/ISSUE_TEMPLATE/bug.md
.github/ISSUE_TEMPLATE/claim-is-wrong.md
.github/ISSUE_TEMPLATE/config.yml
.github/pull_request_template.md
.github/workflows/ci.yml
.gitignore
CLAIMS.md
CLAUDE.md
CODE_OF_CONDUCT.md
CONTRIBUTING.md
GETTING-STARTED-CLAUDE-CODE.md
LICENSE
LICENSES/XRPL-Standards-MIT.txt
LICENSES/clio-ISC.md
LICENSES/ed25519-dalek-BSD-3-Clause.txt
LICENSES/emscripten-MIT-NCSA.txt
LICENSES/noble-curves-MIT.txt
LICENSES/ripple-binary-codec-ISC.txt
LICENSES/rippled-ISC.md
LICENSES/serde_json-MIT.txt
LICENSES/xrpl-dev-portal-MIT.txt
LICENSES/xrplf-mpt-crypto-ISC.txt
Makefile
NOTICE
PREFLIGHT.md
README.md
SECURITY.md
UPSTREAM-FEEDBACK.md
bun.lock
docs/CLAIMS-INDEX.md
docs/CLAIMS-REVISIONS.md
docs/EMPHASIS-DISCIPLINE.md
docs/NEXT-SESSION-PROMPT.md
docs/PLAN-PUBLIC-LAUNCH-2026-09-22.md
docs/UPSTREAM-FILING-PROTOCOL.md
docs/VOCABULARY.md
docs/architecture/ARCHITECTURE-2026-08-18.md
docs/claims/by-topic/README.md
docs/claims/by-topic/claims-and-drift.md
docs/claims/by-topic/confidentiality-limits.md
docs/claims/by-topic/counts-and-numbers.md
docs/claims/by-topic/decisions-and-scope.md
docs/claims/by-topic/devnet-execution.md
docs/claims/by-topic/environment-and-tooling.md
docs/claims/by-topic/instruments-and-gates.md
docs/claims/by-topic/protocol-and-crypto.md
docs/claims/by-topic/review-rounds.md
docs/claims/by-topic/secret-handling.md
docs/claims/by-topic/upstream-and-filings.md
docs/claims/by-topic/web-tier.md
docs/decisions/ADR-0001-key-custody-and-proof-location.md
docs/decisions/ADR-0002-facility-as-application-logic.md
docs/decisions/ADR-0003-web-tier-trust-boundary.md
docs/decisions/ADR-0004-hosted-demo-trust-boundary.md
docs/decisions/B-22-EVIDENCE-derivation-residue-2026-08-27.md
docs/decisions/DECISION-REQUEST-b15-step7-ledger-source-2026-08-24.md
docs/decisions/DECISION-REQUEST-b22-derivation-residue-2026-08-27.md
docs/decisions/DECISION-REQUEST-e117-custody-of-the-float-2026-09-11.md
docs/decisions/DECISION-REQUEST-issue-10-publish-keygen-derivation-2026-08-26.md
docs/decisions/DECISION-REQUEST-phase-1-publication-2026-10-18.md
docs/decisions/DECISION-REQUEST-public-or-private-2026-09-13.md
docs/decisions/DECISION-b19-ed25519-zeroize-2026-08-27.md
docs/evidence/f12-emsdk-2026-10-18/README.md
docs/evidence/f12-emsdk-2026-10-18/logs/00-clone.log
docs/evidence/f12-emsdk-2026-10-18/logs/01-source.log
docs/evidence/f12-emsdk-2026-10-18/logs/02-environment.log
docs/evidence/f12-emsdk-2026-10-18/logs/02b-environment-vars.log
docs/evidence/f12-emsdk-2026-10-18/logs/03-emsdk-tags.log
docs/evidence/f12-emsdk-2026-10-18/logs/04-worktrees.log
docs/evidence/f12-emsdk-2026-10-18/logs/05-cause-changelog.log
docs/evidence/f12-emsdk-2026-10-18/logs/05b-cause-changelog-6.0.12-context.log
docs/evidence/f12-emsdk-2026-10-18/logs/06-runner-scripts.log
docs/evidence/f12-emsdk-2026-10-18/logs/07-byte-identity.log
docs/evidence/f12-emsdk-2026-10-18/logs/08-gen-tables-and-symbol-sets.log
docs/evidence/f12-emsdk-2026-10-18/logs/emsdk-install-6.0.10.log
docs/evidence/f12-emsdk-2026-10-18/logs/emsdk-install-6.0.12.log
docs/evidence/f12-emsdk-2026-10-18/logs/emsdk-install-6.0.2.log
docs/evidence/f12-emsdk-2026-10-18/logs/emsdk-install-6.0.3.log
docs/evidence/f12-emsdk-2026-10-18/logs/emsdk-install-6.0.4.log
docs/evidence/f12-emsdk-2026-10-18/logs/emsdk-install-6.0.5.log
docs/evidence/f12-emsdk-2026-10-18/logs/emsdk-install-6.0.6.log
docs/evidence/f12-emsdk-2026-10-18/logs/group-6.0.10.log
docs/evidence/f12-emsdk-2026-10-18/logs/group-6.0.12.log
docs/evidence/f12-emsdk-2026-10-18/logs/group-6.0.2.log
docs/evidence/f12-emsdk-2026-10-18/logs/group-6.0.3.log
docs/evidence/f12-emsdk-2026-10-18/logs/group-6.0.4.log
docs/evidence/f12-emsdk-2026-10-18/logs/group-6.0.5.log
docs/evidence/f12-emsdk-2026-10-18/logs/group-6.0.6.log
docs/evidence/f12-emsdk-2026-10-18/logs/v6.0.10-dcxx-test.log
docs/evidence/f12-emsdk-2026-10-18/logs/v6.0.10-dcxx.log
docs/evidence/f12-emsdk-2026-10-18/logs/v6.0.10-empp-test.log
docs/evidence/f12-emsdk-2026-10-18/logs/v6.0.10-empp.log
docs/evidence/f12-emsdk-2026-10-18/logs/v6.0.10-unpatched-xtrace.log
docs/evidence/f12-emsdk-2026-10-18/logs/v6.0.10-unpatched.log
docs/evidence/f12-emsdk-2026-10-18/logs/v6.0.12-dcxx-test.log
docs/evidence/f12-emsdk-2026-10-18/logs/v6.0.12-dcxx.log
docs/evidence/f12-emsdk-2026-10-18/logs/v6.0.12-empp-test.log
docs/evidence/f12-emsdk-2026-10-18/logs/v6.0.12-empp.log
docs/evidence/f12-emsdk-2026-10-18/logs/v6.0.12-unpatched-xtrace.log
docs/evidence/f12-emsdk-2026-10-18/logs/v6.0.12-unpatched.log
docs/evidence/f12-emsdk-2026-10-18/logs/v6.0.2-dcxx-test.log
docs/evidence/f12-emsdk-2026-10-18/logs/v6.0.2-dcxx.log
docs/evidence/f12-emsdk-2026-10-18/logs/v6.0.2-empp-test.log
docs/evidence/f12-emsdk-2026-10-18/logs/v6.0.2-empp.log
docs/evidence/f12-emsdk-2026-10-18/logs/v6.0.2-unpatched-test.log
docs/evidence/f12-emsdk-2026-10-18/logs/v6.0.2-unpatched.log
docs/evidence/f12-emsdk-2026-10-18/logs/v6.0.3-unpatched-test.log
docs/evidence/f12-emsdk-2026-10-18/logs/v6.0.3-unpatched.log
docs/evidence/f12-emsdk-2026-10-18/logs/v6.0.4-unpatched-test.log
docs/evidence/f12-emsdk-2026-10-18/logs/v6.0.4-unpatched.log
docs/evidence/f12-emsdk-2026-10-18/logs/v6.0.5-unpatched-test.log
docs/evidence/f12-emsdk-2026-10-18/logs/v6.0.5-unpatched.log
docs/evidence/f12-emsdk-2026-10-18/logs/v6.0.6-dcxx-test.log
docs/evidence/f12-emsdk-2026-10-18/logs/v6.0.6-dcxx.log
docs/evidence/f12-emsdk-2026-10-18/logs/v6.0.6-empp-test.log
docs/evidence/f12-emsdk-2026-10-18/logs/v6.0.6-empp.log
docs/evidence/f12-emsdk-2026-10-18/logs/v6.0.6-partial-xtrace.log
docs/evidence/f12-emsdk-2026-10-18/logs/v6.0.6-partial.log
docs/evidence/f12-emsdk-2026-10-18/logs/v6.0.6-unpatched-xtrace.log
docs/evidence/f12-emsdk-2026-10-18/logs/v6.0.6-unpatched.log
docs/evidence/secret-sweep-2026-10-18/README.md
docs/evidence/secret-sweep-2026-10-18/emsdk-logs-scrubbed.sha256
docs/evidence/secret-sweep-2026-10-18/emsdk-logs-unscrubbed.sha256
docs/evidence/secret-sweep-2026-10-18/scrub-emsdk-logs.md
docs/evidence/secret-sweep-2026-10-18/scrub-tracked-files.md
docs/evidence/upstream-survey-2026-10-18/README.md
docs/evidence/upstream-survey-2026-10-20/README.md
docs/explainer/FACILITY-WALKTHROUGH-2026-08-20.md
docs/explainer/PROTOCOL-FINDINGS-2026-09-02.md
docs/explainer/WEB-TIER-DEMO-SCRIPT-2026-08-28.md
docs/explainer/WEB-TIER-LIMITATIONS-2026-08-28.md
docs/explainer/WEB-TIER-STACK-AND-PHILOSOPHY-2026-08-28.md
docs/explainer/WEB-TIER-WALKTHROUGH-2026-08-28.md
docs/explainer/WHAT-CONFIDENTIAL-MEANS-2026-09-02.md
docs/personas/README.md
docs/personas/build-lead.md
docs/personas/crypto-reviewer.md
docs/personas/protocol-researcher.md
docs/references/README.md
docs/research/CUSTODY-2026-08-28.md
docs/runs/b16-hedged-ed25519-devnet-2026-08-27.json
docs/runs/b21-zeroized-default-path-devnet-2026-08-27.json
docs/runs/b23-seed-residue-devnet-2026-08-27.json
docs/runs/b24-decoder-return-type-devnet-2026-08-28.json
docs/runs/b25-scalar-zeroize-devnet-2026-08-28.json
docs/runs/b26-scalar-diff-wipe-devnet-2026-08-28.json
docs/task-zero/ADDENDUM-2026-08-16.md
docs/task-zero/DEVNET-CONVERT-2026-08-17.md
docs/task-zero/GAP-3-compact-sigma-2026-08-16.md
docs/task-zero/SOURCES-2026-08-18.md
docs/task-zero/TASK-ZERO-2026-08-13.md
docs/task-zero/XLS-66-INVESTIGATION-2026-08-16.md
docs/task-zero/amendments-2026-08-16.json
docs/task-zero/amendments-2026-08-16.md
docs/task-zero/amendments-2026-08-26.json
docs/task-zero/amendments-2026-09-01.json
docs/task-zero/amendments-2026-10-18.json
docs/task-zero/benchmarks-2026-08-16.md
docs/third-party/INVENTORY.md
docs/upstream-filings/2026-08-26/01-devportal-enczero.md
docs/upstream-filings/2026-08-26/02-standards-errata.md
docs/upstream-filings/2026-08-26/03-standards-tecbadproof.md
docs/upstream-filings/2026-08-26/04-standards-deletion.md
docs/upstream-filings/2026-08-26/05-rippled-positives.md
docs/upstream-filings/2026-08-26/06-standards-composability.md
docs/upstream-filings/2026-08-26/07-mptcrypto-enczero-export.md
docs/upstream-filings/2026-08-26/README.md
docs/upstream-filings/2026-08-26/correction-3879.md
docs/upstream-filings/2026-08-26/correction-608.md
docs/upstream-filings/2026-08-26/correction-609.md
docs/upstream-filings/2026-08-26/correction-8118.md
docs/upstream-filings/2026-09-28/01-mptcrypto-conan-remote.md
docs/upstream-filings/2026-09-28/README.md
docs/upstream-filings/2026-10-18/01-mptcrypto-remark-6-1.md
docs/upstream-filings/2026-10-18/02-mptcrypto-wasm-link.md
docs/upstream-filings/2026-10-18/03-mptcrypto-shared-c1-size.md
docs/upstream-filings/2026-10-18/README.md
docs/upstream-filings/2026-10-18/comment-pr152.md
docs/upstream-filings/TEMPLATE.md
facility/README.md
facility/run-facility.ts
facility/src/book.ts
facility/src/custody.ts
facility/src/devnet-accounts.ts
facility/src/facility.ts
facility/src/loopback.ts
facility/src/mptool.ts
facility/src/secret-file.ts
facility/src/signer.ts
facility/src/submit.ts
facility/tests/book.test.ts
facility/tests/boundary.test.ts
facility/tests/custody-disclosure.test.ts
facility/tests/facility.test.ts
facility/tests/hostile-endpoints.ts
facility/tests/loopback.test.ts
facility/tests/risk-acceptance.test.ts
facility/tests/secret-file.test.ts
facility/tests/submit.test.ts
facility/tests/with-hatch.ts
package.json
review-input/deployed/.vercel/output/config.json
review-input/deployed/.vercel/output/static/assets/LedgerReading-DqqbK6gq.js
review-input/deployed/.vercel/output/static/assets/Verdict-CNiIxuke.js
review-input/deployed/.vercel/output/static/assets/capabilities-CyBiSyzZ.js
review-input/deployed/.vercel/output/static/assets/custody-hkJYX5SB.js
review-input/deployed/.vercel/output/static/assets/index-CKAZ0d8y.js
review-input/deployed/.vercel/output/static/assets/issuer-B7oYAUmM.js
review-input/deployed/.vercel/output/static/assets/observer-DQA-_pWg.js
review-input/deployed/.vercel/output/static/assets/routes-D9R1YHa2.js
review-input/deployed/.vercel/output/static/assets/styles-DJVXuOe6.css
review-input/deployed/.vercel/output/static/assets/wallet-yjF0ml3-.js
review-input/deployed/.vercel/output/static/capabilities/index.html
review-input/deployed/.vercel/output/static/custody/index.html
review-input/deployed/.vercel/output/static/gate-verdict.json
review-input/deployed/.vercel/output/static/index.html
review-input/deployed/.vercel/output/static/issuer/index.html
review-input/deployed/.vercel/output/static/observer/index.html
review-input/deployed/.vercel/output/static/third-party-licenses.txt
review-input/deployed/.vercel/output/static/wallet/index.html
review-input/deployed/build-manifest.json
review-input/deployed/container.log
review-input/rebuilt/.vercel/output/config.json
review-input/rebuilt/.vercel/output/static/assets/LedgerReading-B79PUj4e.js
review-input/rebuilt/.vercel/output/static/assets/Verdict-CovB9dBW.js
review-input/rebuilt/.vercel/output/static/assets/capabilities-C_fOF4FT.js
review-input/rebuilt/.vercel/output/static/assets/custody-BfENjUkT.js
review-input/rebuilt/.vercel/output/static/assets/index-Dnrjg5yz.js
review-input/rebuilt/.vercel/output/static/assets/issuer-C7s7pq65.js
review-input/rebuilt/.vercel/output/static/assets/observer-vpLUdZwo.js
review-input/rebuilt/.vercel/output/static/assets/routes-CaZ_TphG.js
review-input/rebuilt/.vercel/output/static/assets/styles-DJVXuOe6.css
review-input/rebuilt/.vercel/output/static/assets/wallet-Co55StKP.js
review-input/rebuilt/.vercel/output/static/capabilities/index.html
review-input/rebuilt/.vercel/output/static/custody/index.html
review-input/rebuilt/.vercel/output/static/gate-verdict.json
review-input/rebuilt/.vercel/output/static/index.html
review-input/rebuilt/.vercel/output/static/issuer/index.html
review-input/rebuilt/.vercel/output/static/observer/index.html
review-input/rebuilt/.vercel/output/static/third-party-licenses.txt
review-input/rebuilt/.vercel/output/static/wallet/index.html
review-input/rebuilt/build-manifest.json
review-input/rebuilt/container.log
signer/Cargo.lock
signer/Cargo.toml
signer/README.md
signer/build.rs
signer/src/bin/ledger-read.rs
signer/src/bin/onboard.rs
signer/src/bin/store-check.rs
signer/src/confirm.rs
signer/src/grant.rs
signer/src/holder.rs
signer/src/ipc.rs
signer/src/keygen.rs
signer/src/ledger.rs
signer/src/lib.rs
signer/src/main.rs
signer/src/mpt.rs
signer/src/onboarding.rs
signer/src/protocol.rs
signer/src/prover.rs
signer/src/randomness.rs
signer/src/scalar.rs
signer/src/session.rs
signer/src/store.rs
signer/src/txn.rs
signer/src/xrpl.rs
signer/tests/convert_back.rs
signer/tests/falsifier.rs
signer/tests/hedged_signing.rs
signer/tests/keygen_interop.rs
signer/tests/keygen_kat.rs
signer/tests/ledger_devnet.rs
signer/tests/ledger_read.rs
signer/tests/onboarding.rs
signer/tests/profile_parse_b23.rs
signer/tests/prover_ffi.rs
signer/tests/prover_pristine.rs
signer/tests/r_and_rho_kat.rs
signer/tests/signing_path.rs
signer/tests/store_a4_a9.rs
signer/tests/support/mod.rs
signer/tests/xrpl_vectors.rs
tools/break-emphasis-gate.sh
tools/break-no-secrets-gate.ts
tools/break-secret-file-modes.py
tools/break-zeroize-lock.sh
tools/build-claims-index.ts
tools/build-claims-revisions.ts
tools/build-claims-topics.ts
tools/check-amendments.ts
tools/check-blinding-sources.ts
tools/check-disclosure-phrases.ts
tools/check-emphasis.ts
tools/check-filing.ts
tools/check-loopback.ts
tools/check-negative-claims.ts
tools/check-no-secrets.ts
tools/check-personas.ts
tools/check-push-guard.sh
tools/check-table-integrity.ts
tools/check-test-support-gate.ts
tools/check-vocabulary.ts
tools/check-web-hosted.ts
tools/check-web-readonly.ts
tools/check-zeroize-bounds.py
tools/ci.sh
tools/devnet-submit.ts
tools/git-hooks/pre-push
tools/install-push-guard.sh
tools/inventory-third-party.ts
tools/issuer-decrypt-balance.ts
tools/issuer-view-snapshot.ts
tools/loopback-node/node.sh
tools/loopback-node/rippled.cfg
tools/loopback-node/validators.txt
tools/mpt-crypto-bench/README.md
tools/mpt-crypto-bench/wconf_bench.c
tools/mpt-crypto-bench/wconf_dlp.c
tools/mpt-crypto-bench/wconf_window.c
tools/observer-harness.ts
tools/rebuild-env.sh
tools/redact-review-fixtures.ts
tools/scrub-personal-data.ts
tools/spike-2026-08-17/README.md
tools/spike-2026-08-17/adj-c1-shared-blinding.ts
tools/spike-2026-08-17/adj-c1-verify.ts
tools/spike-2026-08-17/adj-e22-controlled.ts
tools/spike-2026-08-17/adj-fee-ladder-nonzero.ts
tools/spike-2026-08-17/adj-metadata-and-fee.ts
tools/spike-2026-08-17/audit-evidence.ts
tools/spike-2026-08-17/auditor-n4.ts
tools/spike-2026-08-17/build-native.sh
tools/spike-2026-08-17/convert.ts
tools/spike-2026-08-17/defs-check.ts
tools/spike-2026-08-17/gap8-final-state.ts
tools/spike-2026-08-17/gap8-lending-lifecycle.ts
tools/spike-2026-08-17/gap8-loan-ops.ts
tools/spike-2026-08-17/gap8-reachability.ts
tools/spike-2026-08-17/gap8-teardown.ts
tools/spike-2026-08-17/inspect.ts
tools/spike-2026-08-17/mptool.c
tools/spike-2026-08-17/npm-decrypt-window.ts
tools/spike-2026-08-17/npm-e2e-convert.ts
tools/spike-2026-08-17/npm-package-test.ts
tools/spike-2026-08-17/post-vault-send.ts
tools/spike-2026-08-17/send.ts
tools/spike-2026-08-17/vault.ts
tools/spike-2026-08-17/verify.ts
tools/spike-2026-08-17/wasm-test.ts
tools/spike-2026-08-18/README.md
tools/spike-2026-08-18/WCONF-PATCH.md
tools/spike-2026-08-18/build-t9.sh
tools/spike-2026-08-18/build.sh
tools/spike-2026-08-18/devnet-send-our-nonces.ts
tools/spike-2026-08-18/nonce-crosscheck.ts
tools/spike-2026-08-18/t-nbound.c
tools/spike-2026-08-18/t1-vectors.json
tools/spike-2026-08-18/t1-vectors.ts
tools/spike-2026-08-18/t9-entropy.c
tools/spike-2026-08-18/vendor-verify.sh
tools/spike-2026-08-18/wconf-kat.c
tools/spike-2026-08-18/wconf-nonces.patch
tools/spike-b16-2026-08-27/b16-hedged-ed25519-devnet.ts
tools/spike-b16-2026-08-27/ed25519-hedge-vectors.json
tools/spike-b16-2026-08-27/revert-sweep.py
tools/spike-b16-2026-08-27/t-ed25519-hedge-construction.ts
tools/spike-keygen-2026-08-18/t-keygen-construction.ts
tools/spike-randomness-2026-08-18/FINDINGS.md
tools/spike-randomness-2026-08-18/reuse-r-attack.ts
tools/spike-randomness-2026-08-18/reuse-r-setup.ts
tools/spike-randomness-2026-08-18/t-r-and-rho-construction.ts
tools/spike-step2-2026-08-19/README.md
tools/spike-step2-2026-08-19/b14-hedged-secp256k1-devnet.ts
tools/spike-step2-2026-08-19/f23-substituted-key.ts
tools/spike-step3-2026-08-18/README.md
tools/spike-step3-2026-08-18/devnet-clean-account.ts
tools/spike-step3-2026-08-18/devnet-signer-send.ts
tools/spike-step3-2026-08-18/xrpl-vectors.json
tools/spike-step3-2026-08-18/xrpl-vectors.ts
tools/spike-step6-2026-08-20/README.md
tools/spike-step6-2026-08-20/devnet-derived-key.ts
tools/spike-step7-2026-08-24/README.md
tools/spike-step7-2026-08-24/devnet-convert-back.ts
tools/spike-step7-2026-08-24/devnet-ruled-randomness-harness.ts
tools/wconf-keygen.test.ts
tools/wconf-keygen.ts
tools/wconf-randomness.ts
tools/web-readonly-needles.ts
tsconfig.json
web/README.md
web/api/capability.test.ts
web/api/capability.ts
web/api/custody-sim.ts
web/api/demo-accounts.ts
web/api/disclosure.test.ts
web/api/issuer.ts
web/api/ledger-view.ts
web/api/observer.ts
web/api/server.ts
web/api/signer-status.ts
web/app/src/api.ts
web/app/src/components/AccountPicker.tsx
web/app/src/components/Verdict.tsx
web/app/src/hosted/Footer.tsx
web/app/src/hosted/LedgerReading.tsx
web/app/src/hosted/data.ts
web/app/src/hosted/routeTree.gen.ts
web/app/src/hosted/router.tsx
web/app/src/hosted/routes/__root.tsx
web/app/src/hosted/routes/capabilities.tsx
web/app/src/hosted/routes/custody.tsx
web/app/src/hosted/routes/index.tsx
web/app/src/hosted/routes/issuer.tsx
web/app/src/hosted/routes/observer.tsx
web/app/src/hosted/routes/wallet.tsx
web/app/src/hosted/virtual.d.ts
web/app/src/hosted/wording.ts
web/app/src/routeTree.gen.ts
web/app/src/router.tsx
web/app/src/routes/__root.tsx
web/app/src/routes/api-doc.tsx
web/app/src/routes/capabilities.tsx
web/app/src/routes/custody.tsx
web/app/src/routes/index.tsx
web/app/src/routes/issuer.tsx
web/app/src/routes/observer.tsx
web/app/src/routes/wallet.tsx
web/app/src/styles.css
web/app/src/views/CapabilitiesView.tsx
web/app/src/views/CustodyView.tsx
web/app/src/views/ObserverReading.tsx
web/app/src/views/WalletView.tsx
web/app/tsconfig.hosted.json
web/app/tsconfig.json
web/app/vite.config.ts
web/app/vite.hosted.config.ts
web/hosted/Dockerfile
web/hosted/README.md
web/hosted/browser-check.ts
web/hosted/build.test.ts
web/hosted/build.ts
web/hosted/compare-deployed.ts
web/hosted/csp.test.ts
web/hosted/csp.ts
web/hosted/deploy-preflight.ts
web/hosted/deploy.test.ts
web/hosted/licence-notices.ts
web/hosted/pages.ts
web/hosted/snapshot-types.ts
web/hosted/snapshot.test.ts
web/hosted/snapshot.ts
web/hosted/vercel-output.ts
web/hosted/wording.test.ts
````

## static-visible.txt

````
W-CONF: confidential MPT on the XRPL DevnetDevnet snapshot · signs nothing, holds no keys · not secure, not audited, not production-ready (P-5)
W-CONF
What confidential MPT on the XRP Ledger hides, and what it does not. A research project, shown on one snapshot of the Devnet.OverviewCapability matrixObserver viewIssuer viewWalletCustody
What this is
A read-only look at confidential MPT positions on the XRPL Devnet. Every value comes from one snapshot of the ledger, taken when this site was built. The site signs nothing and holds no keys. No code of this project runs on a server when you load it, and your browser requests only this site’s own files.
Start here
Capability matrix: what each kind of key can and cannot do.
Observer view: what anyone can read on the ledger, including which balances are visibly zero.
Issuer view: the issuer’s copy of each balance, without the figure.
Wallet: why the browser wallets examined cannot hold a confidential position.
Custody: where confidentiality and custody approval policies conflict.
To transact, run it yourself
Signing happens only in wconf-signer, a separate program on the holder’s own machine, never in a web page. The README explains how to build it and run the local version of this site. It does not yet explain how to create a holder profile and funded Devnet accounts, which a transaction needs.
README, “Run it”
What it never claims
P-4No key source hides identities. The sender and receiver of every confidential transaction are public.
P-9A holder is never private from the issuer. The issuer can always decrypt.
P-10No key source supports rotation or recovery. XLS-96 supports neither.
P-11No key source hides who transacts, when, or how often. Only amounts are hidden.
F-1A newly created confidential balance is publicly identifiable as exactly zero.
F-24Retiring a position in tranches publishes each tranche size.
P-5None of this is secure, audited, non-custodial or production-ready, and the custody mode is a simulation.
Each label is a row in the repository’s CLAIMS.md.
Built from commit c08db2befb17 of the public repository. Ledger values were read at validated ledger 6270649 on 2026-10-20T11:45:28.415Z.
This page is published at https://xrpl-confidential-positions.vercel.app. A copy hosted anywhere else is not this build.
Gate verdict: not loaded (it is read from /gate-verdict.json once the page's script runs) (gate-verdict.json). This is the gate's record, published with the build; your browser shows it and does not check it against the files it loaded.
Third-party licences for the code in these pages: third-party-licenses.txt````

## test-diff.txt

````
diff --git a/web/hosted/build.test.ts b/web/hosted/build.test.ts
new file mode 100644
index 0000000..5e9e34e
--- /dev/null
+++ b/web/hosted/build.test.ts
@@ -0,0 +1,67 @@
+/**
+ * The build's two refusals that need no container: where it may write, and
+ * whether the tree it is about to build is the commit's (`REVIEW-059` R1-10).
+ */
+import { afterEach, describe, expect, test } from "bun:test";
+import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
+import { tmpdir } from "node:os";
+import { join } from "node:path";
+import { checkExportedTree, exportSource, listTree, outProblems } from "./build.ts";
+
+const dirs: string[] = [];
+afterEach(() => { for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true }); });
+const temp = () => { const d = mkdtempSync(join(tmpdir(), "wconf-build-test-")); dirs.push(d); return d; };
+const git = (cwd: string, ...a: string[]) => {
+  const r = Bun.spawnSync(["git", "-c", "user.name=t", "-c", "user.email=t@example.invalid", "-c", "commit.gpgsign=false", ...a], { cwd, stdout: "pipe", stderr: "pipe" });
+  if (r.exitCode !== 0) throw new Error(r.stderr.toString());
+  return r.stdout.toString().trim();
+};
+
+/** A two-file repository with one commit. */
+function repo(): { dir: string; commit: string } {
+  const dir = temp();
+  git(dir, "init", "-q");
+  mkdirSync(join(dir, "web/app"), { recursive: true });
+  writeFileSync(join(dir, "README.md"), "x\n");
+  writeFileSync(join(dir, "web/app/page.ts"), "export const a = 1;\n");
+  git(dir, "add", "-A");
+  git(dir, "commit", "-q", "-m", "one");
+  return { dir, commit: git(dir, "rev-parse", "HEAD") };
+}
+
+describe("where a build may write", () => {
+  test("refuses the repository itself and anything inside it", () => {
+    const { dir } = repo();
+    expect(outProblems(dir, dir).join()).toMatch(/outside the repository/);
+    expect(outProblems(join(dir, "out"), dir).join()).toMatch(/outside the repository/);
+  });
+  test("refuses a directory that is not empty, and takes a new or empty one", () => {
+    const { dir } = repo();
+    const used = temp();
+    mkdirSync(join(used, "work/src"), { recursive: true });
+    expect(outProblems(used, dir).join()).toMatch(/is not empty/);
+    expect(outProblems(temp(), dir)).toEqual([]);
+    expect(outProblems(join(temp(), "new"), dir)).toEqual([]);
+  });
+});
+
+describe("the tree a build is about to build", () => {
+  test("a clean export lists exactly the commit's files", () => {
+    const { dir, commit } = repo();
+    const src = join(temp(), "src");
+    exportSource(dir, src, false, commit);
+    expect(checkExportedTree(src, ["README.md", "web/app/page.ts"])).toEqual([]);
+  });
+  test("a file left in the directory before the export is refused (REVIEW-059 R1-10, as measured)", () => {
+    const { dir, commit } = repo();
+    const src = join(temp(), "src");
+    mkdirSync(join(src, "web/app/public/assets"), { recursive: true });
+    writeFileSync(join(src, "web/app/public/assets/review059.js"), "export const outsider = 1;\n");
+    exportSource(dir, src, false, commit);
+    expect(listTree(src)).toContain("web/app/public/assets/review059.js");
+    expect(checkExportedTree(src, ["README.md", "web/app/page.ts"]).join()).toMatch(/web\/app\/public\/assets\/review059\.js is in the build tree and not in the commit/);
+  });
+  test("a committed file the export lost is refused", () => {
+    expect(checkExportedTree(temp(), ["README.md"]).join()).toMatch(/README\.md is in the commit and not in the build tree/);
+  });
+});
diff --git a/web/hosted/deploy.test.ts b/web/hosted/deploy.test.ts
index b703c47..cf17ad0 100644
--- a/web/hosted/deploy.test.ts
+++ b/web/hosted/deploy.test.ts
@@ -3,10 +3,10 @@
  * not pass, and the comparison sees what the host changed.
  */
 import { afterEach, describe, expect, test } from "bun:test";
-import { appendFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
+import { appendFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
 import { tmpdir } from "node:os";
 import { join } from "node:path";
-import { readOutput, verdictFile } from "../../tools/check-web-hosted.ts";
+import { LEDGER_PAGES, readOutput, verdictFile } from "../../tools/check-web-hosted.ts";
 import { onPublicMain, preflight } from "./deploy-preflight.ts";
 import { compareDeployed } from "./compare-deployed.ts";
 import { serveOutput } from "./browser-check.ts";
@@ -17,39 +17,60 @@ const dirs: string[] = [];
 afterEach(() => { for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true }); });
 
 /** A minimal output the gate has passed, with its manifest beside it. */
-function fixture(o: { trial?: boolean; verdict?: boolean } = {}): string {
+const READ_AT = "2026-10-20T05:22:05.191Z";
+function fixture(o: { trial?: boolean | null; verdict?: boolean; ledgerIndex?: number; readAt?: string } = {}): string {
   const root = mkdtempSync(join(tmpdir(), "wconf-deploy-test-"));
   dirs.push(root);
   const base = join(root, ".vercel", "output");
   for (const p of HOSTED_PAGES) {
     mkdirSync(join(base, "static", p), { recursive: true });
-    writeFileSync(join(base, "static", p, "index.html"), `<html><body>${p || "home"}</body></html>`);
+    const ledger = (LEDGER_PAGES as readonly string[]).includes(p) ? `<div data-ledger-index="${o.ledgerIndex ?? 1}"></div>` : "";
+    const footer = `<footer>read on ${READ_AT}; published at <code>https://x.vercel.app</code></footer>`;
+    writeFileSync(join(base, "static", p, "index.html"), `<html><body>${p || "home"}${ledger}${footer}</body></html>`);
   }
   const headers = { "Content-Security-Policy": "default-src 'self'", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", "Cross-Origin-Opener-Policy": "same-origin", "Permissions-Policy": "camera=()" };
   writeFileSync(join(base, "config.json"), JSON.stringify({ version: 3, routes: [{ src: "/(.*)", headers, continue: true }, ...HOSTED_PAGES.filter(Boolean).map((p) => ({ src: `^/${p}/?$`, dest: `/${p}/index.html` })), { handle: "filesystem" }] }));
-  writeFileSync(join(root, "build-manifest.json"), JSON.stringify({ trial: o.trial ?? false, commit: COMMIT, snapshot: { ledgerIndex: 1, canonicalUrl: "https://x.vercel.app" } }));
+  const manifest: any = { trial: o.trial === undefined ? false : o.trial, commit: COMMIT, snapshot: { ledgerIndex: 1, readAt: o.readAt ?? READ_AT, canonicalUrl: "https://x.vercel.app" } };
+  if (o.trial === null) delete manifest.trial;
+  writeFileSync(join(root, "build-manifest.json"), JSON.stringify(manifest));
   if (o.verdict ?? true) writeFileSync(join(base, "static/gate-verdict.json"), JSON.stringify(verdictFile(readOutput(root), { commit: COMMIT }, 0)));
   return root;
 }
 const onMain = () => true;
+// The fixture is not a real output, so the gate's checks are stubbed except
+// where a test is about them.
+const clean = () => [];
 
 describe("deploy-preflight", () => {
   test("passes the output the gate passed", () => {
-    expect(preflight(fixture(), onMain)).toEqual([]);
+    expect(preflight(fixture(), onMain, clean)).toEqual([]);
   });
   test("refuses a trial build", () => {
-    expect(preflight(fixture({ trial: true }), onMain).join()).toMatch(/TRIAL/);
+    expect(preflight(fixture({ trial: true }), onMain, clean).join()).toMatch(/trial field is true/);
+  });
+  test("refuses a manifest with no trial field (REVIEW-059 R1-7)", () => {
+    expect(preflight(fixture({ trial: null }), onMain, clean).join()).toMatch(/trial field is null, not false/);
   });
   test("refuses a commit that is not on the public main", () => {
-    expect(preflight(fixture(), () => false).join()).toMatch(/not on the public repository's main/);
+    expect(preflight(fixture(), () => false, clean).join()).toMatch(/not on the public repository's main/);
   });
   test("refuses an output with no verdict", () => {
-    expect(preflight(fixture({ verdict: false }), onMain).join()).toMatch(/gate has not passed/);
+    expect(preflight(fixture({ verdict: false }), onMain, clean).join()).toMatch(/gate has not passed/);
   });
   test("refuses a file changed after the gate passed", () => {
     const root = fixture();
     appendFileSync(join(root, ".vercel/output/static/observer/index.html"), "<!-- later -->");
-    expect(preflight(root, onMain).join()).toMatch(/static\/observer\/index\.html changed/);
+    expect(preflight(root, onMain, clean).join()).toMatch(/static\/observer\/index\.html changed/);
+  });
+  test("refuses an output whose gate check fails now, verdict and all (REVIEW-059 S-5)", () => {
+    const failing = () => [{ check: "csp", detail: "planted" }];
+    expect(preflight(fixture(), onMain, failing).join()).toMatch(/the gate's check fails now: csp: planted/);
+  });
+  test("refuses a manifest whose read time no page shows (REVIEW-059 R1-7)", () => {
+    expect(preflight(fixture({ readAt: "2026-01-01T00:00:00.000Z" }), onMain, clean).join()).toMatch(/does not show the manifest's read time/);
+  });
+  test("refuses a ledger page that names another ledger than the manifest (REVIEW-059 R1-7)", () => {
+    expect(preflight(fixture({ ledgerIndex: 2 }), onMain, clean).join()).toMatch(/\/observer names ledger 2, and the manifest records 1/);
   });
   test("asks GitHub for a comparison, and only 'identical' or 'ahead' is on main", () => {
     expect(onPublicMain("x", () => "ahead")).toBe(true);
@@ -58,6 +79,17 @@ describe("deploy-preflight", () => {
   });
 });
 
+describe("browser-check's server", () => {
+  test("refuses a configuration it cannot model (REVIEW-059 R1-5)", () => {
+    const root = fixture();
+    const cfg = join(root, ".vercel/output/config.json");
+    const c = JSON.parse(readFileSync(cfg, "utf8"));
+    c.routes.splice(1, 0, { src: "/(.*)", headers: { "Content-Security-Policy": "default-src *" }, continue: true });
+    writeFileSync(cfg, JSON.stringify(c));
+    expect(() => serveOutput(root)).toThrow(/cannot model route 1/);
+  });
+});
+
 describe("compare-deployed", () => {
   test("finds nothing when the host serves what the gate passed", async () => {
     const root = fixture();
@@ -74,6 +106,43 @@ describe("compare-deployed", () => {
       expect(d).toMatch(/\/issuer: the page served at its route differs/);
     } finally { s.stop(true); }
   });
+  /** A host that serves the output, with one misbehaviour applied to each response. */
+  function misbehaving(root: string, change: (path: string, r: Response, body: ArrayBuffer) => Response | null) {
+    const inner = serveOutput(root);
+    const outer = Bun.serve({
+      hostname: "127.0.0.1", port: 0,
+      async fetch(req) {
+        const path = new URL(req.url).pathname;
+        const r = await fetch(`http://127.0.0.1:${inner.port}${path}`, { redirect: "manual" });
+        const body = await r.arrayBuffer();
+        return change(path, r, body) ?? new Response(body, { status: r.status, headers: r.headers });
+      },
+    });
+    return { port: outer.port, stop: () => { outer.stop(true); inner.stop(true); } };
+  }
+  const withHeaders = (r: Response, h: Record<string, string | null>) => { const out = new Headers(r.headers); for (const [k, v] of Object.entries(h)) v === null ? out.delete(k) : out.set(k, v); return out; };
+
+  test("sees a page served as text (REVIEW-059 R1-6)", async () => {
+    const root = fixture();
+    const s = misbehaving(root, (p, r, b) => (p.endsWith(".html") || !p.includes(".") ? new Response(b, { status: r.status, headers: withHeaders(r, { "content-type": "text/plain" }) }) : null));
+    try { expect((await compareDeployed(root, `http://127.0.0.1:${s.port}`)).join("\n")).toMatch(/\/issuer: served as "text\/plain", not text\/html/); } finally { s.stop(); }
+  });
+  test("sees a page that differs only at its trailing-slash route (REVIEW-059 R1-6)", async () => {
+    const root = fixture();
+    const s = misbehaving(root, (p, r) => (p === "/issuer/" ? new Response("<html>The holder is private from the issuer.</html>", { status: 200, headers: r.headers }) : null));
+    try { expect((await compareDeployed(root, `http://127.0.0.1:${s.port}`)).join("\n")).toMatch(/\/issuer\/: the page served at its route differs/); } finally { s.stop(); }
+  });
+  test("sees the verdict served with an error status (REVIEW-059 R1-6)", async () => {
+    const root = fixture();
+    const s = misbehaving(root, (p, r, b) => (p === "/gate-verdict.json" ? new Response(b, { status: 500, headers: r.headers }) : null));
+    try { expect((await compareDeployed(root, `http://127.0.0.1:${s.port}`)).join("\n")).toMatch(/\/gate-verdict\.json: HTTP 500/); } finally { s.stop(); }
+  });
+  test("sees an unknown path answered without the policy (REVIEW-059 R1-6)", async () => {
+    const root = fixture();
+    const s = misbehaving(root, (_p, r, b) => (r.status === 404 ? new Response(b, { status: 404, headers: withHeaders(r, { "Content-Security-Policy": null }) }) : null));
+    try { expect((await compareDeployed(root, `http://127.0.0.1:${s.port}`)).join("\n")).toMatch(/an unknown path: Content-Security-Policy is null/); } finally { s.stop(); }
+  });
+
   test("sees a header the host changed, a cookie, and a catch-all", async () => {
     const root = fixture();
     const s = Bun.serve({
diff --git a/web/hosted/snapshot.test.ts b/web/hosted/snapshot.test.ts
index 1c191f2..22b25ff 100644
--- a/web/hosted/snapshot.test.ts
+++ b/web/hosted/snapshot.test.ts
@@ -8,6 +8,7 @@ import type { HostedSnapshot } from "./snapshot-types.ts";
 
 const ACCOUNT = { address: "rHeah37pL6aFPf59nzWGwujPzSFkp4TUL8", issuanceId: "00".repeat(24), label: "Holder A", note: "n" };
 const KEY = "02" + "11".repeat(32);
+const ISS = { issuer: "rIssuer", confidentialOutstandingAmountRaw: "7", issuerEncryptionKey: KEY };
 
 function fake(o: { exists?: boolean; mpt?: any; issuance?: any }) {
   return {
@@ -20,36 +21,49 @@ function fake(o: { exists?: boolean; mpt?: any; issuance?: any }) {
 
 describe("readAccount", () => {
   test("an account the pinned ledger does not hold is 'account-missing', with no view", async () => {
-    const a = await readAccount(fake({ exists: false }), ACCOUNT, true);
+    const a = await readAccount(fake({ exists: false }), ACCOUNT, ISS);
     expect(a.state).toBe("account-missing");
     expect(a.observer).toBeNull();
     expect(a.issuerMirror).toBeNull();
   });
 
   test("a missing issuance is 'issuance-missing', checked after the account", async () => {
-    expect((await readAccount(fake({}), ACCOUNT, false)).state).toBe("issuance-missing");
-    expect((await readAccount(fake({ exists: false }), ACCOUNT, false)).state).toBe("account-missing");
+    expect((await readAccount(fake({}), ACCOUNT, null)).state).toBe("issuance-missing");
+    expect((await readAccount(fake({ exists: false }), ACCOUNT, null)).state).toBe("account-missing");
   });
 
   test("an account with no MPToken is 'no-position', not a zero balance", async () => {
-    const a = await readAccount(fake({ mpt: null }), ACCOUNT, true);
+    const a = await readAccount(fake({ mpt: null }), ACCOUNT, ISS);
     expect(a.state).toBe("no-position");
     expect(a.observer).toBeNull();
   });
 
   test("a position records whether the issuer's mirror is on the ledger, and no figure", async () => {
     const mpt = { publicAmountRaw: "0", confidentialBalanceVersion: 1, issuerEncryptedBalance: "AB".repeat(66) };
-    const a = await readAccount(fake({ mpt }), ACCOUNT, true);
+    const a = await readAccount(fake({ mpt }), ACCOUNT, ISS);
     expect(a.state).toBe("present");
     expect(a.issuerMirror).toEqual({ present: true, ciphertext: "AB".repeat(66) });
     expect(JSON.stringify(a)).not.toMatch(/decrypt(ed)?(Balance|Amount)|"figure"/);
-    const b = await readAccount(fake({ mpt: { ...mpt, issuerEncryptedBalance: undefined } }), ACCOUNT, true);
+    const b = await readAccount(fake({ mpt: { ...mpt, issuerEncryptedBalance: undefined } }), ACCOUNT, ISS);
     expect(b.issuerMirror).toEqual({ present: false });
   });
 
+  test("the position is read once, so a contradicting second answer cannot empty it (REVIEW-059 R1-8)", async () => {
+    const mpt = { publicAmountRaw: "750", confidentialBalanceVersion: 11 };
+    let reads = 0, issuanceReads = 0;
+    const flaky = { ...fake({}), mptoken: async () => (reads++ === 0 ? mpt : null), issuance: async () => { issuanceReads++; return null; } };
+    const a = await readAccount(flaky, ACCOUNT, ISS);
+    expect(reads).toBe(1);
+    expect(issuanceReads).toBe(0);
+    expect(a.observer?.issuance.confidentialOutstandingAmount).toBe("7");
+    expect(a.state).toBe("present");
+    expect(a.observer?.publicAmount).toBe("750");
+    expect(a.observer?.confidentialBalanceVersion).toBe(11);
+  });
+
   test("a read that fails is not swallowed into a state", async () => {
     const broken = { ...fake({}), accountExists: async () => { throw new Error("REFUSED_LEDGER_TORN"); } };
-    await expect(readAccount(broken, ACCOUNT, true)).rejects.toThrow(/REFUSED_LEDGER_TORN/);
+    await expect(readAccount(broken, ACCOUNT, ISS)).rejects.toThrow(/REFUSED_LEDGER_TORN/);
   });
 });
 
````

## wallet-visible.txt

````
W-CONF: confidential MPT on the XRPL DevnetDevnet snapshot · signs nothing, holds no keys · not secure, not audited, not production-ready (P-5)
W-CONF
What confidential MPT on the XRP Ledger hides, and what it does not. A research project, shown on one snapshot of the Devnet.OverviewCapability matrixObserver viewIssuer viewWalletCustody
A browser wallet cannot hold a confidential position
The three wallets examined (Xaman, GemWallet and Crossmark, on 2026-08-28) cannot, and the reasons are structural, not missing features. A wallet that kept the ElGamal key inside the extension and offered a prove-and-sign operation could; none of those examined does.
A confidential transaction needs two secrets: the ElGamal secret, to decrypt the balance and build the proof, and the XRPL account key, to sign. A wallet supplies only the second.
Under the ruled key generation, the ElGamal secret is derived from the master seed. A derived-key account has no other way to get it.
A wallet extension exists in order not to release seed material. That is the product, not a gap in its API.
So a page cannot assemble the transaction through these wallets. They are not refusing a permission; they hold nothing they are built to give a page.
What a wallet can doyesOrdinary XRPL transactions
Ordinary transactions are what a wallet is for. Per each vendor's docs on 2026-08-28, the GemWallet, Crossmark and Xaman APIs accept any transaction type to sign and submit.
gemwallet.app API reference; docs.crossmark.io; docs.xaman.dev (all read 2026-08-28)yesProve control of an account
Enough to show that account’s observer view, which anyone with the address can read anyway.
What this page does not claim
Not determined: whether a given wallet build can serialise XLS-0096 transactions. The page-side SDKs examined on 2026-08-28 carry no codec, so serialisation happens inside the extension, or for Xaman in its backend, and none of them names the codec version (CLAIMS.md E-206). This is not why a wallet cannot hold a confidential position: the reasons above are structural, and this one could change with any release.
CLAIMS.md E-206.
Built from commit c08db2befb17 of the public repository. Ledger values were read at validated ledger 6270649 on 2026-10-20T11:45:28.415Z.
This page is published at https://xrpl-confidential-positions.vercel.app. A copy hosted anywhere else is not this build.
Gate verdict: not loaded (it is read from /gate-verdict.json once the page's script runs) (gate-verdict.json). This is the gate's record, published with the build; your browser shows it and does not check it against the files it loaded.
Third-party licences for the code in these pages: third-party-licenses.txt````

