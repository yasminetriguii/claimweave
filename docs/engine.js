// Pure, dependency-free reference engine. All policies in this demo are fictional.
export const DAY = 86400000;
export const demoDate = '2026-11-08';
export const programs = [
  {id:'housing',name:'Housing bridge',version:'demo-1',purpose:'housing-intake',rules:[
    {field:'monthlyIncome',label:'Monthly income',op:'lte',value:2400,maxAgeDays:30},
    {field:'city',label:'Service area',op:'eq',value:'Ottawa',maxAgeDays:90}]},
  {id:'transit',name:'Community transit',version:'demo-1',purpose:'transit-intake',rules:[
    {field:'monthlyIncome',label:'Monthly income',op:'lte',value:3000,maxAgeDays:60},
    {field:'city',label:'Service area',op:'eq',value:'Ottawa',maxAgeDays:90}]},
  {id:'learning',name:'Learning access',version:'demo-1',purpose:'learning-intake',rules:[
    {field:'enrolled',label:'Current enrollment',op:'eq',value:true,maxAgeDays:120},
    {field:'monthlyIncome',label:'Monthly income',op:'lte',value:2800,maxAgeDays:30}]}
];
export function seed(){return {schemaVersion:1,evidence:[
  {id:'payroll',title:'Synthetic payroll statement',source:'Demo payroll connector',issuedAt:'2026-10-27',fields:{monthlyIncome:2250,employer:'Example Co',accountNumber:'DEMO-DO-NOT-EXPORT'}},
  {id:'utility',title:'Synthetic utility record',source:'Demo utility connector',issuedAt:'2026-10-19',fields:{city:'Ottawa',streetAddress:'Synthetic address, withheld'}},
  {id:'enrollment',title:'Synthetic enrollment record',source:'Demo registrar connector',issuedAt:'2026-09-06',fields:{enrolled:true,studentNumber:'DEMO-DO-NOT-EXPORT'}}
],consents:programs.map(p=>({programId:p.id,purpose:p.purpose,fields:p.rules.map(r=>r.field),expiresAt:'2027-12-31',revoked:false})),events:[]};}
const isDate = s => typeof s==='string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s+'T00:00:00Z')) && new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
export function validateState(s){
  if(!s||s.schemaVersion!==1||!Array.isArray(s.evidence)||!Array.isArray(s.consents)||s.evidence.length>100||s.consents.length>30)throw Error('Expected schemaVersion 1, up to 100 evidence records and 30 consents.');
  const ids=new Set();
  for(const e of s.evidence){
    if(!e||typeof e.id!=='string'||!e.id||ids.has(e.id)||typeof e.title!=='string'||typeof e.source!=='string'||!isDate(e.issuedAt)||!e.fields||Array.isArray(e.fields)||typeof e.fields!=='object')throw Error('Invalid or duplicate evidence record.');
    ids.add(e.id);
    for(const [k,v] of Object.entries(e.fields)){
      if(k==='monthlyIncome'&&(typeof v!=='number'||!Number.isFinite(v)||v<0))throw Error('monthlyIncome must be a non-negative number.');
      if(k==='city'&&typeof v!=='string')throw Error('city must be text.');
      if(k==='enrolled'&&typeof v!=='boolean')throw Error('enrolled must be true or false.');
      if(!['string','number','boolean'].includes(typeof v)||typeof v==='number'&&!Number.isFinite(v))throw Error('Evidence fields must be finite scalar values.');
    }
  }
  const grants=new Set();
  for(const c of s.consents){
    if(!c||!programs.some(p=>p.id===c.programId)||grants.has(c.programId)||typeof c.purpose!=='string'||!Array.isArray(c.fields)||!c.fields.every(f=>typeof f==='string')||!isDate(c.expiresAt)||typeof c.revoked!=='boolean')throw Error('Invalid or duplicate consent.');
    grants.add(c.programId);
  }
  return s;
}
export function evaluate(state,policy,asOf=demoDate){
  validateState(state); if(!isDate(asOf))throw Error('Invalid evaluation date.');
  const now=Date.parse(asOf+'T00:00:00Z');
  const grant=state.consents.find(c=>c.programId===policy.id);
  const results=policy.rules.map(rule=>{
    const base={field:rule.field,label:rule.label,requirement:`${rule.op==='lte'?'At most':'Equals'} ${rule.value}`,maxAgeDays:rule.maxAgeDays};
    if(!grant||grant.revoked||grant.purpose!==policy.purpose||grant.expiresAt<asOf||!grant.fields.includes(rule.field))return {...base,status:'consent_required',evidenceIds:[],reason:'A current, purpose-specific consent is required.'};
    const records=state.evidence.filter(e=>Object.hasOwn(e.fields,rule.field));
    const fresh=records.filter(e=>{const age=(now-Date.parse(e.issuedAt+'T00:00:00Z'))/DAY;return age>=0&&age<=rule.maxAgeDays;});
    if(!records.length)return {...base,status:'missing',evidenceIds:[],reason:'No supporting evidence is present.'};
    if(!fresh.length)return {...base,status:'stale',evidenceIds:records.map(e=>e.id),reason:'Evidence is expired or dated in the future. Refresh this field.'};
    if(new Set(fresh.map(e=>JSON.stringify(e.fields[rule.field]))).size>1)return {...base,status:'conflict',evidenceIds:fresh.map(e=>e.id),reason:'Current records disagree. A person must resolve the conflict.'};
    const selected=[...fresh].sort((a,b)=>b.issuedAt.localeCompare(a.issuedAt)||a.id.localeCompare(b.id))[0];
    const value=selected.fields[rule.field];
    const passed=rule.op==='lte'?value<=rule.value:value===rule.value;
    return {...base,status:passed?'pass':'rule_not_met',value,evidenceIds:[selected.id],reason:passed?'Evidence satisfies this fictional rule.':'Evidence does not satisfy this fictional rule.'};
  });
  const status=results.some(r=>!['pass','rule_not_met'].includes(r.status))?'review':results.some(r=>r.status==='rule_not_met')?'rule_not_met':'ready';
  return {programId:policy.id,program:policy.name,policyVersion:policy.version,purpose:policy.purpose,asOf,status,checks:results};
}
export function compare(state,before,after,asOf=demoDate){
  const a=evaluate(state,before,asOf),b=evaluate(state,after,asOf);
  return {before:a,after:b,changes:b.checks.filter(r=>{const old=a.checks.find(x=>x.field===r.field);return !old||old.status!==r.status||old.requirement!==r.requirement||old.maxAgeDays!==r.maxAgeDays;}).map(r=>({field:r.field,before:a.checks.find(x=>x.field===r.field),after:r}))};
}
export function makePacket(state,policy,asOf=demoDate){
  const result=evaluate(state,policy,asOf);
  if(result.status!=='ready')throw Error('Export blocked: resolve every check and obtain current consent first.');
  // Allowlist-only projection; never serialize the source evidence or whole state.
  return {schemaVersion:1,kind:'claimweave-demo-evidence',synthetic:true,programId:policy.id,purpose:policy.purpose,policyVersion:policy.version,asOf,
    claims:result.checks.map(c=>({field:c.field,value:c.value,evidenceId:c.evidenceIds[0],source:state.evidence.find(e=>e.id===c.evidenceIds[0]).source,issuedAt:state.evidence.find(e=>e.id===c.evidenceIds[0]).issuedAt})),
    notice:'Synthetic demonstration only. Not an eligibility decision or authenticated source verification.'};
}
