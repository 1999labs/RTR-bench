import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {packageRoot} from '../../src/shared/dataset.ts';
import {buildLearnRoomReport} from '../../src/tracks/learn-room/report.ts';

const fixture=path.join(packageRoot(),'tests/fixtures/learn-room-four-strategies.json');
// Block network even if a local .env contains a real API key.
const noNetwork='data:text/javascript,globalThis.fetch=()=>{throw new Error("Network forbidden in CLI fixture tests")};';
function invoke(t:any,command:string,flags:string[]=[],output?:string) {
  output??=fs.mkdtempSync(path.join(os.tmpdir(),'rtr-cli-'));
  const root=output;
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const stdout=execFileSync(process.execPath,['--import',noNetwork,'src/cli.ts',command,'--fixture',fixture,'--limit','5','--output',output,...flags],{cwd:packageRoot(),encoding:'utf8'});
  const reportPath=stdout.match(/report: (.+)\n/)![1];
  const dir=path.dirname(reportPath);
  return {stdout,dir,output,report:buildLearnRoomReport(dir)};
}

test('public commands select only the requested tracks and print paired gain only for combined runs',t=>{
  const combined=invoke(t,'read-the-room'),predict=invoke(t,'predict'),learn=invoke(t,'learn');
  for(const [run,strategies] of [[combined,['none','agent']],[predict,['none']],[learn,['agent']]] as const) {
    assert.deepEqual(run.report.manifest.config.strategies,strategies);
    assert.equal(run.report.manifest.config.settings.maxTokens,4000);
    assert.equal(run.report.complete,true);
    assert.equal(run.report.rows.length,strategies.length*5);
    assert.ok(run.report.summaries.every(s=>s.apiCalls===0));
    assert.match(run.stdout,/SYNTHETIC FIXTURE:/);
  }
  assert.equal(learn.report.manifest.config.agentPolicy,'transfer-check-v1');
  assert.equal(combined.report.manifest.config.agentPolicy,'transfer-check-v1');
  assert.equal(predict.report.manifest.config.agentPolicy,undefined);
  for(const single of [predict,learn]) {
    assert.doesNotMatch(single.stdout,/Learn gain:/);
    for(const row of single.report.rows) {
      const paired=combined.report.rows.find(r=>r.day===row.day&&r.strategy===row.strategy)!;
      assert.deepEqual(row.request,paired.request);
      assert.deepEqual(row.outcome,paired.outcome);
    }
  }
  const gain=combined.report.comparisons.find(c=>c.strategy==='agent'&&c.control==='none')!;
  assert.ok(combined.stdout.includes(`Learn gain: ${gain.scoreGain.toFixed(2)} points`));
  assert.match(combined.stdout,/Predict: .*\/100/);
  assert.match(combined.stdout,/Learn: .*\/100/);
  const before=fs.readFileSync(path.join(combined.dir,'episodes/agent/100.json'),'utf8');
  const resumed=invoke(t,'read-the-room',[],combined.output);
  assert.equal(resumed.dir,combined.dir);
  assert.equal(fs.readFileSync(path.join(resumed.dir,'episodes/agent/100.json'),'utf8'),before);
});

test('controls command resumes the equivalent explicit legacy protocol without changing its identity',t=>{
  const legacy=invoke(t,'learn-room',['--strategy','all','--max-tokens','4000','--agent-policy','transfer-check-v1']);
  const modern=invoke(t,'read-the-room',['--controls'],legacy.output);
  assert.equal(modern.dir,legacy.dir);
  assert.deepEqual(modern.report,legacy.report);
  assert.deepEqual(modern.report.manifest.config.strategies,['none','random','similar','agent']);
  assert.match(modern.stdout,/Random control:/);
  assert.match(modern.stdout,/Similarity control:/);
});

test('legacy defaults remain unchanged and public defaults can be explicitly overridden',t=>{
  const legacy=invoke(t,'learn-room');
  assert.deepEqual(legacy.report.manifest.config.strategies,['none','random']);
  assert.equal(legacy.report.manifest.config.settings.maxTokens,2000);
  assert.equal(legacy.report.manifest.config.agentPolicy,undefined);
  const modern=invoke(t,'learn',['--max-tokens','1234','--agent-policy','default']);
  const explicit=invoke(t,'learn-room',['--strategy','agent','--max-tokens','1234'],modern.output);
  assert.equal(modern.dir,explicit.dir);
  assert.equal(modern.report.manifest.config.settings.maxTokens,1234);
  assert.equal(modern.report.manifest.config.agentPolicy,undefined);
});

test('ambiguous or unsupported public flags fail before running any episodes',t=>{
  for(const [command,flags,message] of [
    ['predict',['--controls'],/Unknown predict flag --controls/],
    ['learn',['--controls'],/Unknown learn flag --controls/],
    ['read-the-room',['--controls','false'],/--controls does not take a value/],
    ['read-the-room',['--strategy','all'],/Unknown read-the-room flag --strategy/],
    ['predict',['--agent-policy','default'],/Unknown predict flag --agent-policy/],
    ['learn',['--max-usd'],/--max-usd requires a value/],
  ] as const) {
    const output=fs.mkdtempSync(path.join(os.tmpdir(),'rtr-cli-invalid-'));
    t.after(()=>fs.rmSync(output,{recursive:true,force:true}));
    assert.throws(()=>invoke(t,command,[...flags],output),(error:any)=>{
      assert.match(error.stderr,message);return true;
    });
    assert.deepEqual(fs.readdirSync(output),[]);
  }
});
