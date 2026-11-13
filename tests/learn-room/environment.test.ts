import test from 'node:test';
import assert from 'node:assert/strict';
import { createEpisode } from '../../src/tracks/learn-room/environment.ts';
import { uniform, observed } from '../../src/shared/distribution.ts';
import { loadDistributionData } from '../../src/shared/dataset.ts';
import { prepareStrategy, selectRandom } from '../../src/tracks/learn-room/strategies.ts';
import { buildDistributionMessages } from '../../src/tracks/distribution/prompt.ts';
const data=loadDistributionData();
const target=data.windows.find(w=>w.day===100)!;
const refs=data.windows.filter(w=>data.split.reference.includes(w.day));

test('agent observations expose only allowed data, never target labels or scores',()=>{
  const {agent,evaluator}=createEpisode(target,refs);
  assert.deepEqual(Object.keys(agent).sort(),['act','observe']);
  assert.deepEqual(agent.observe().target,{id:100,prompt:'INSTAGRAM'});
  const list=agent.act({type:'list_examples'});
  assert.equal(list.examples.length,90);
  assert.deepEqual(Object.keys(list.examples[0]).sort(),['id','prompt']);
  const denied=agent.act({type:'inspect_example',id:100});
  assert.equal(denied.ok,false); assert.equal(denied.remainingInspections,3);
  const inspected=agent.act({type:'inspect_example',id:refs[0].day});
  assert.deepEqual(inspected.distribution,observed(refs[0]));
  assert.equal(inspected.submissions,refs[0].n);
  const submitted=agent.act({type:'submit_prediction',prediction:uniform()});
  assert.equal(submitted.accepted,true); assert.equal(submitted.ended,true);
  for (const key of ['score','observed','targetDistribution','counts','winnerCredit']) assert.equal(key in submitted,false);
  assert.equal(evaluator.outcome()!.inspections,1);
  assert.equal(evaluator.outcome()!.status,'valid');
});

test('reference validation blocks repeated target entities, aliases, future windows, and duplicate IDs',()=>{
  assert.throws(()=>createEpisode(target,[target],{budget:1}),/Reference pool/);
  assert.throws(()=>createEpisode(target,[{...refs[0],word:' instagram '}],{budget:1}),/Reference pool/);
  assert.throws(()=>createEpisode(target,[{...refs[0],word:'Insta'},...refs.slice(1)],{aliases:{insta:'instagram'}}),/Reference pool/);
  assert.throws(()=>createEpisode(target,[{...refs[0],day:101},...refs.slice(1)]),/Reference pool/);
  assert.throws(()=>createEpisode(target,[...refs,refs[0]]),/Reference pool/);
  assert.throws(()=>createEpisode({...target,n:0},refs),/Invalid episode/);
});

test('duplicate inspections are cached; over-budget, invalid, and repeated actions remain bounded',()=>{
  const {agent,evaluator}=createEpisode(target,refs,{budget:1,maxActions:5});
  const first=agent.act({type:'inspect_example',id:1}); assert.equal(first.remainingInspections,0);
  const cached=agent.act({type:'inspect_example',id:1}); assert.equal(cached.cached,true);assert.equal(cached.remainingInspections,0);
  const denied=agent.act({type:'inspect_example',id:2}); assert.equal(denied.ok,false); assert.equal('distribution' in denied,false);
  agent.act({type:'unknown'});
  const last=agent.act({type:'inspect_example',id:'1'});assert.equal(last.ended,true);
  assert.equal(evaluator.outcome()!.score,0); assert.equal(evaluator.outcome()!.status,'missing');
  assert.equal(evaluator.outcome()!.actions,5);assert.equal(evaluator.outcome()!.inspections,1);
  const trace=evaluator.trace();assert.equal(trace.length,5);
  agent.act({type:'submit_prediction',prediction:observed(target)});
  assert.deepEqual(evaluator.trace(),trace);assert.equal(evaluator.outcome()!.score,0);
});

test('valid early submission, invalid terminal submission, and copies preserve episode isolation',()=>{
  const a=createEpisode(target,refs),b=createEpisode(target,refs);
  const result=a.agent.act({type:'submit_prediction',prediction:uniform()});assert.equal(result.ended,true);
  assert.equal(a.evaluator.outcome()!.inspections,0);
  const copied=a.evaluator.outcome()!;copied.score=-100;assert.notEqual(a.evaluator.outcome()!.score,-100);
  b.agent.act({type:'submit_prediction',prediction:{}});assert.equal(b.evaluator.outcome()!.status,'invalid');assert.equal(b.evaluator.outcome()!.score,0);
  const c=createEpisode(target,refs),observation=c.agent.act({type:'inspect_example',id:1}); observation.distribution['honest+uniting']=999;
  assert.deepEqual(c.agent.act({type:'inspect_example',id:1}).distribution,observed(refs[0]));
  assert.equal(c.evaluator.outcome(),null);
});

test('random selection is deterministic, distinct, order independent, and no-example prompt matches direct distribution',()=>{
  const ids=refs.map(w=>w.day);
  const selection=selectRandom(ids,3,7,100);assert.equal(new Set(selection).size,3);
  assert.deepEqual(selectRandom([...ids].reverse(),3,7,100),selection);
  assert.notDeepEqual(selectRandom(ids,3,8,100),selection);
  const none=createEpisode(target,refs,{budget:0});
  assert.deepEqual(prepareStrategy(none.agent,'none',7),buildDistributionMessages(target.word));
  assert.equal(none.evaluator.trace().length,0);
  const random=createEpisode(target,refs);
  const messages=prepareStrategy(random.agent,'random',7);
  assert.equal(random.evaluator.trace().length,4);
  assert.deepEqual(random.evaluator.trace().slice(1).map(t=>(t.action as any).id),selection);
  assert.ok(messages[1].content.includes('Historical examples'));
  assert.ok(!messages[1].content.includes(JSON.stringify(observed(target))));
});
