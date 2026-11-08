import {seed,programs,evaluate,demoDate,validateState} from './engine.js';

// A small, explicit catalog for the synthetic collection-step experiment.
export const catalog=[
  {id:'payroll',name:'Fresh payroll statement',fields:['monthlyIncome']},
  {id:'utility',name:'Fresh utility record',fields:['city']},
  {id:'registrar',name:'Fresh enrollment record',fields:['enrolled']},
  {id:'campus',name:'Synthetic campus support statement',fields:['monthlyIncome','enrolled']}
];

export function planRepairs(state,policies=programs,asOf=demoDate,candidates=catalog){
  validateState(state);
  if(candidates.length>12||candidates.some(c=>!c.id||!Array.isArray(c.fields)))throw Error('Use a catalog of at most 12 collection options.');
  const checks=policies.flatMap(p=>evaluate(state,p,asOf).checks.map(c=>({...c,programId:p.id,program:p.name})));
  const targets=checks.filter(c=>['missing','stale'].includes(c.status));
  const fields=[...new Set(targets.map(c=>c.field))].sort();
  let best=null;
  // Exact enumeration, not a heuristic: minimum cardinality within this catalog.
  for(let mask=0;mask<2**candidates.length;mask++){
    const selected=candidates.filter((_,i)=>mask&(1<<i));
    if(fields.every(f=>selected.some(c=>c.fields.includes(f)))&&(!best||selected.length<best.length))best=selected;
  }
  const consent=[...new Set(checks.filter(c=>c.status==='consent_required').map(c=>c.programId))].map(id=>({programId:id,program:policies.find(p=>p.id===id).name,action:'Ask the applicant for current purpose-specific consent. Do not collect evidence before that choice.'}));
  const manual=checks.filter(c=>['conflict','rule_not_met'].includes(c.status)).map(c=>({program:c.program,field:c.field,status:c.status,reason:c.reason}));
  return {asOf,requestCount:targets.length,distinctFields:fields.length,minimumSteps:best?.length??null,covered:best!==null,steps:(best||[]).map(c=>({...c,fields:c.fields.filter(f=>fields.includes(f)),supports:targets.filter(t=>c.fields.includes(t.field)).map(t=>({program:t.program,field:t.field,maxAgeDays:t.maxAgeDays}))})),consent,manual,uncoveredFields:fields.filter(f=>!candidates.some(c=>c.fields.includes(f))),
    assumptions:['Only missing or stale checks with current consent are planned.','Every collection option is assumed newly issued and accepted for its listed fields in this fictional experiment.','The campus option is a fabricated multi-field record, not a real registrar integration.','A refresh cannot guarantee a rule will pass. Conflicts and unmet rules remain for human review.']};
}

export function cohortFixtures(){
  return [1500,1950,2000,2100,2250,2400,2500,2750,3000,3100,0,2600].map((income,i)=>{
    const state=seed();state.evidence[0].fields.monthlyIncome=income;
    let note='Complete synthetic records';
    if(i===9){state.evidence=state.evidence.filter(e=>e.id!=='payroll');note='Income evidence missing';}
    if(i===10){state.evidence[0].issuedAt='2025-01-01';note='Income evidence expired';}
    if(i===11){state.consents[0].revoked=true;note='Housing consent withdrawn';}
    return {id:'case-'+String(i+1).padStart(2,'0'),note,state};
  });
}
export function runCohort(cap=2000,asOf=demoDate){
  if(!Number.isFinite(cap)||cap<0||cap>10000)throw Error('Enter a demo income cap between 0 and 10,000.');
  const modified=structuredClone(programs);modified[0].version='demo-2-cap-'+cap;modified[0].rules[0].value=cap;
  const rows=cohortFixtures().map(c=>({id:c.id,note:c.note,input:c.state,before:programs.map(p=>evaluate(c.state,p,asOf)),after:modified.map(p=>evaluate(c.state,p,asOf))}));
  const changes=rows.flatMap(row=>row.after.filter((a,i)=>a.status!==row.before[i].status).map(a=>({caseId:row.id,program:a.program,before:row.before.find(b=>b.programId===a.programId).status,after:a.status})));
  return {schemaVersion:1,synthetic:true,kind:'claimweave-policy-regression',asOf,policies:{before:structuredClone(programs),after:modified},cases:rows,summary:{caseCount:rows.length,programComparisons:rows.length*programs.length,statusChanges:changes.length,unchanged:rows.length*programs.length-changes.length,readyBefore:rows.reduce((n,r)=>n+r.before.filter(x=>x.status==='ready').length,0),readyAfter:rows.reduce((n,r)=>n+r.after.filter(x=>x.status==='ready').length,0)},changes,notice:'Author-built synthetic regression fixtures. Counts describe this fixture set only, not real applicants, accuracy, fairness, or eligibility.'};
}

export function mount(getWorkspace,log=()=>{}){
  const $=id=>document.getElementById(id),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const style=document.createElement('style');style.textContent='.lab-tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px}.lab-top{background:#eaf2ee;border:1px solid #cbded4;padding:22px;border-radius:8px;margin-bottom:20px}.lab-top strong{font:32px Georgia}.lab-task{border:1px solid #e0e6e8;border-radius:7px;margin:12px 0;padding:18px}.lab-task h3{margin:0 0 7px}.lab-task p{margin:5px 0;font-size:12px;color:#697982}.lab-caption{font-size:11px;color:#697982}.lab-counts{display:flex;gap:25px;flex-wrap:wrap;margin:16px 0}.lab-counts b{font:30px Georgia;display:block}.lab-scroll{overflow:auto}.lab-reason{min-width:180px}.lab-toolbar{display:flex;gap:10px;align-items:end;flex-wrap:wrap;margin:18px 0}.lab-toolbar label{margin:0}.lab-toolbar input{max-width:170px}.lab-status{font-size:11px}.lab-tour{background:#fff5e8;border-left:3px solid #c4854c;padding:15px 18px;font-size:12px;margin-bottom:20px}.lab-links{display:flex;gap:12px;margin-top:18px;flex-wrap:wrap}.lab-helper{max-width:850px}';document.head.append(style);
  const nav=document.querySelector('nav[aria-label="Main navigation"]');
  const b=document.createElement('button');b.className='nav';b.textContent='↳  Repair & regression';nav.insertBefore(b,nav.children[2]);
  const section=document.createElement('section');section.id='lab';section.className='view';section.hidden=true;section.innerHTML='<div class="lab-tour"><strong>Try the useful part.</strong> Advance the date by 120 days, then see which fresh records could serve several checks. Or compare a policy change across 12 reproducible cases.</div><div class="lab-tabs"><button id="lab-plan-tab" class="primary">Repair planner</button><button id="lab-cohort-tab" class="secondary">Policy regression bench</button></div><div id="lab-plan"></div><div id="lab-cohort" hidden><div class="panel"><p class="eyebrow">CONTROLLED SYNTHETIC FIXTURES</p><h2>Test the change before the rollout.</h2><p>12 fictional cases, including missing, expired, and withdrawn evidence. The same inputs run against both policy versions.</p><div class="lab-toolbar"><div><label for="lab-cap">Proposed housing income cap</label><input id="lab-cap" type="number" min="0" max="10000" step="50" value="2000"></div><button id="lab-run" class="primary">Run 36 comparisons ↗</button><button id="lab-export" class="secondary" disabled>Download reproducible report ↓</button></div><div id="lab-results" aria-live="polite">Run the comparison to inspect every synthetic case.</div></div></div>';
  document.querySelector('footer').before(section);
  const names={ready:'Checks satisfied',review:'Needs review',rule_not_met:'Demo rule not met'};
  function open(){document.querySelectorAll('.view').forEach(v=>v.hidden=v!==section);document.querySelectorAll('nav .nav').forEach(n=>n.classList.toggle('active',n===b));$('page-title').innerHTML='Fewer requests.<br>Clearer consequences.';$('page-description').textContent='Plan a refresh once. Re-run every dependent check. Test a policy change against reproducible cases.';renderPlan();}
  b.onclick=open;
  $('lab-plan-tab').onclick=()=>{$('lab-plan').hidden=false;$('lab-cohort').hidden=true;renderPlan();};
  $('lab-cohort-tab').onclick=()=>{$('lab-plan').hidden=true;$('lab-cohort').hidden=false;};
  $('asof').addEventListener('change',()=>{if(!section.hidden){renderPlan();$('lab-results').textContent='Evaluation date changed. Run the comparison again.';$('lab-export').disabled=true;}});
  $('reset').addEventListener('click',()=>{if(!section.hidden)renderPlan();$('lab-results').textContent='Demo reset. Run the comparison again.';$('lab-export').disabled=true;});
  function renderPlan(){const {state,asOf}=getWorkspace(),plan=planRepairs(state,programs,asOf);$('lab-plan').innerHTML='<div class="panel lab-helper"><p class="eyebrow">EXACT SEARCH / EXPLICIT ASSUMPTIONS</p><h2>Collect once, support several checks.</h2><p>Computed from the current workspace and evaluation date. Only fresh evidence planning is automated; consent and conflicting facts stay separate.</p><div class="lab-top"><strong>'+plan.requestCount+' → '+(plan.covered?plan.minimumSteps:'uncovered')+'</strong><div>check-level refresh requests → minimum synthetic collection steps</div><span class="lab-caption">Minimum within the four-option catalog shown below. This is a toy optimization, not measured savings in a real agency.</span></div>'+(plan.steps.length?plan.steps.map((s,i)=>'<div class="lab-task"><h3>0'+(i+1)+' / '+esc(s.name)+'</h3><p>Collect these fields: '+s.fields.map(esc).join(', ')+'</p><p>Supports '+s.supports.length+' checks: '+s.supports.map(t=>esc(t.program)+' ('+esc(t.field)+', ≤'+t.maxAgeDays+' days)').join('; ')+'.</p></div>').join(''):'<p>No missing or stale evidence currently needs collection. Try the 120-day time shift below. Unmet rules or missing consent may still need review.</p>')+(plan.consent.length?'<h3>Applicant decisions first</h3>'+plan.consent.map(c=>'<div class="lab-task"><strong>'+esc(c.program)+'</strong><p>'+esc(c.action)+'</p></div>').join(''):'')+(plan.manual.length?'<h3>Keep these with a human reviewer</h3>'+plan.manual.map(c=>'<p>'+esc(c.program)+' / '+esc(c.field)+': '+esc(c.reason)+'</p>').join(''):'')+'<div class="lab-links"><button id="lab-age" class="primary">Try 120-day time shift</button><button id="lab-plan-download" class="secondary">Download collection plan ↓</button></div><h3>Catalog & assumptions</h3><p class="lab-caption">'+catalog.map(c=>esc(c.name)+' ['+c.fields.map(esc).join(', ')+']').join(' · ')+'</p><ul>'+plan.assumptions.map(a=>'<li class="lab-caption">'+esc(a)+'</li>').join('')+'</ul></div>';
    $('lab-age').onclick=()=>{const date=new Date(asOf+'T00:00:00Z');date.setUTCDate(date.getUTCDate()+120);$('asof').value=date.toISOString().slice(0,10);$('asof').dispatchEvent(new Event('change',{bubbles:true}));log('Applied a 120-day synthetic time shift to inspect refresh dependencies.');};
    $('lab-plan-download').onclick=()=>download({schemaVersion:1,synthetic:true,kind:'claimweave-collection-plan',...plan},'claimweave-collection-plan.json');
  }
  let report=null;
  $('lab-run').onclick=()=>{try{report=runCohort(Number($('lab-cap').value),getWorkspace().asOf);const s=report.summary;$('lab-results').innerHTML='<div class="lab-counts"><div><b>'+s.caseCount+'</b>synthetic cases</div><div><b>'+s.programComparisons+'</b>program comparisons</div><div><b>'+s.statusChanges+'</b>status changes</div><div><b>'+s.unchanged+'</b>unchanged</div></div><p class="lab-caption">Income cap $2,400 → $'+esc($('lab-cap').value)+'. These are author-built regression examples, not held-out accuracy or population estimates.</p><div class="lab-scroll"><table><thead><tr><th>CASE</th><th>INPUT CONDITION</th><th>HOUSING BEFORE</th><th>HOUSING AFTER</th><th>TRACE</th></tr></thead><tbody>'+report.cases.map(c=>'<tr><td>'+c.id+'</td><td>'+esc(c.note)+'</td><td class="lab-status">'+names[c.before[0].status]+'</td><td class="lab-status">'+names[c.after[0].status]+'</td><td class="lab-reason">'+esc(c.after[0].checks[0].reason)+'</td></tr>').join('')+'</tbody></table></div><p class="lab-caption">Transit and learning are also re-evaluated for every case; their full check traces and inputs are included in the report. The displayed table focuses on the changed housing policy.</p>';$('lab-export').disabled=false;log('Ran '+s.programComparisons+' program comparisons across '+s.caseCount+' synthetic cases.');}catch(e){report=null;$('lab-results').textContent=e.message;$('lab-export').disabled=true;}};
  $('lab-cap').oninput=()=>{report=null;$('lab-export').disabled=true;$('lab-results').textContent='Policy input changed. Run the comparison again.';};
  $('lab-export').onclick=()=>{if(report)download(report,'claimweave-policy-regression.json');};
  function download(value,name){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);log('Downloaded '+name+' locally; no agency submission.');}
}
