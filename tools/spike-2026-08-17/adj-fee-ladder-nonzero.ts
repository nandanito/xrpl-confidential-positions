import { connect, rpc, close, state, tool, submit, sequenceOf, accountIdHex } from "./convert.ts";
import { deriveRandomness } from "../wconf-randomness.ts";
await connect();
const { holder, holderB } = state;
const mptOf = async (a: string) => ((await rpc({ command:"account_objects", account:a, ledger_index:"validated", type:"mptoken" })).result.account_objects ?? []).find((x:any)=>x.MPTokenIssuanceID===state.issuanceId);
const PK_A=state.holderElGamal.pk, SK_A=state.holderElGamal.sk, PK_B=state.holderBElGamal.pk, PK_I=state.issuerElGamal.pk;
async function freshSeq(a:string){for(let i=0;i<20;i++){const v=await rpc({command:"account_info",account:a,ledger_index:"validated"});const c=await rpc({command:"account_info",account:a,ledger_index:"current"});if(v.result.account_data.Sequence===c.result.account_data.Sequence)return v.result.account_data.Sequence;await Bun.sleep(2000);}return sequenceOf(a);}
async function trySend(amount:number, fee:string){
  const cur=await mptOf(holder.address);
  const balance=Number((await tool("decrypt",cur.ConfidentialBalanceSpending,SK_A,"0","3000"))[0]);
  const seq=await freshSeq(holder.address);
  // ⚠ **The RULED derivation, not `mptool blinding`** — `CLAIMS.md` E-76. The
  // context hash is computed FIRST because the derivation binds to it.
  const [ctxh]=await tool("send-ctx",accountIdHex(holder.address),state.issuanceId,String(seq),accountIdHex(holderB.address),String(cur.ConfidentialBalanceVersion??0));
  const {r:r32,rho}=deriveRandomness({txKind:"ConfidentialMPTSend",accountIdHex:accountIdHex(holder.address),issuanceIdHex:state.issuanceId,contextHashHex:ctxh});
  const [ctA]=await tool("encrypt",String(amount),PK_A,r32);const [ctB]=await tool("encrypt",String(amount),PK_B,r32);const [ctI]=await tool("encrypt",String(amount),PK_I,r32);
  const [pcM]=await tool("pedersen",String(amount),r32);const [pcB]=await tool("pedersen",String(balance),rho);
  const [proof]=await tool("send-proof",SK_A,PK_A,String(amount),r32,ctxh,pcM,pcB,String(balance),cur.ConfidentialBalanceSpending,rho,"3",PK_A,ctA,PK_B,ctB,PK_I,ctI);
  const r=await submit({TransactionType:"ConfidentialMPTSend",Destination:holderB.address,MPTokenIssuanceID:state.issuanceId,
    SenderEncryptedAmount:ctA,DestinationEncryptedAmount:ctB,IssuerEncryptedAmount:ctI,AmountCommitment:pcM,BalanceCommitment:pcB,
    ZKProof:proof,Sequence:seq,Fee:fee},holder.seed,{quiet:true});
  return r.engine;
}
console.log("completing the fee ladder for the NON-ZERO arm:");
for (const fee of ["1","9","10"]) console.log(`  NON-ZERO (10 units) @ ${fee.padStart(2)} drops -> ${await trySend(10, fee)}`);
close();
