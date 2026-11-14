import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {packageRoot} from '../../src/shared/dataset.ts';
import {runLearnRoom} from '../../src/tracks/learn-room/run.ts';
import {buildLearnRoomReport} from '../../src/tracks/learn-room/report.ts';

test('replicate IDs isolate runs while preserving requests, evidence, default identity, and resume',async t=>{
  const output=fs.mkdtempSync(path.join(os.tmpdir(),'rtr-replicate-'));
  t.after(()=>fs.rmSync(output,{recursive:true,force:true}));
  const fixture=path.join(packageRoot(),'tests/fixtures/learn-room-four-strategies.json');
  const options={fixture,strategy:'all' as const,limit:1,maxTokens:4000,output};
  const original=await runLearnRoom(options);
  assert.equal(Object.hasOwn(original.report.manifest.config,'replicate'),false);
  const originalBytes=fs.readFileSync(path.join(original.dir,'episodes/agent/100.json'),'utf8');
  execFileSync(process.execPath,['src/cli.ts','learn-room','--fixture',fixture,'--strategy','all','--limit','1','--max-tokens','4000','--output',output,'--replicate','repeat-2'],{cwd:packageRoot(),stdio:'pipe'});
  const secondDir=fs.readdirSync(output).map(n=>path.join(output,n)).find(d=>d!==original.dir)!;
  const second=buildLearnRoomReport(secondDir);
  assert.equal(second.manifest.config.replicate,'repeat-2');
  const third=await runLearnRoom({...options,replicate:'repeat-3'});
  assert.equal(new Set([original.dir,secondDir,third.dir]).size,3);
  for(const r of [second,third.report]){
    const {replicate,...rest}=r.manifest.config;
    assert.deepEqual(rest,original.report.manifest.config);
    for(let i=0;i<r.rows.length;i++){
      assert.deepEqual(r.rows[i].request,original.report.rows[i].request);
      assert.deepEqual(r.rows[i].trace,original.report.rows[i].trace);
      assert.deepEqual(r.rows[i].agentCalls.map(c=>c.request),original.report.rows[i].agentCalls.map(c=>c.request));
    }
  }
  const saved=fs.readFileSync(path.join(secondDir,'episodes/agent/100.json'),'utf8');
  const noNetwork=async()=>{throw new Error('No network allowed');};
  assert.equal((await runLearnRoom({...options,replicate:'repeat-2'},noNetwork)).dir,secondDir);
  assert.equal(fs.readFileSync(path.join(secondDir,'episodes/agent/100.json'),'utf8'),saved);
  assert.equal((await runLearnRoom(options,noNetwork)).dir,original.dir);
  assert.equal(fs.readFileSync(path.join(original.dir,'episodes/agent/100.json'),'utf8'),originalBytes);
  for(const replicate of ['', '../bad','has space','x'.repeat(65),42 as any]){
    await assert.rejects(runLearnRoom({...options,replicate}),/replicate/);
  }
});
