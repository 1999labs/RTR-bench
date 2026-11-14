import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {loadDistributionData, digest} from '../src/shared/dataset.ts';

// Offline export only. Publish the resulting folder separately after review.
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out=path.join(root,'huggingface/RTR-bench');
const {windows,split,datasetHash,splitHash}=loadDistributionData();
const source=JSON.parse(fs.readFileSync(path.join(root,'data/windows.json'),'utf8'));
const quadrants={tl:'performed+uniting',tr:'honest+uniting',bl:'performed+dividing',br:'honest+dividing'};
const parts=['reference','development','evaluation'];
const column=q=>q.replace('+','_');
const byDay=new Map(windows.map(w=>[w.day,w]));
const row=(day,partition)=>{
  const w=byDay.get(day), max=Math.max(...Object.values(w.counts));
  return {
    id:`mm-${String(day).padStart(3,'0')}`,day,prompt:w.word,partition,submission_count:w.n,
    ...Object.fromEntries(Object.entries(quadrants).map(([k,q])=>[`count_${column(q)}`,w.counts[k]])),
    ...Object.fromEntries(Object.entries(quadrants).map(([k,q])=>[`share_${column(q)}`,w.counts[k]/w.n])),
    winning_quadrants:Object.entries(quadrants).filter(([k])=>w.counts[k]===max).map(([,q])=>q),
    winning_share:max/w.n,centroid_x:w.centroid.x,centroid_y:w.centroid.y,
    conviction:w.conviction,polarization:w.polarization,
  };
};
assert.equal(windows.length,165);
assert.equal(windows.reduce((sum,w)=>sum+w.n,0),39828);
assert.deepEqual(parts.map(p=>split[p].length),[90,30,45]);
for(const d of ['data','source'])fs.mkdirSync(path.join(out,d),{recursive:true});
for(const p of parts)fs.writeFileSync(path.join(out,`data/${p}.jsonl`),split[p].map(day=>JSON.stringify(row(day,p))).join('\n')+'\n');
fs.copyFileSync(path.join(root,'data/windows.json'),path.join(out,'source/windows.json'));
fs.copyFileSync(path.join(root,'data/splits/v1.json'),path.join(out,'source/split-v1.json'));
const license=fs.readFileSync(path.join(root,'LICENSE'),'utf8');
assert(license.includes('data/windows.json is dedicated to the public domain under CC0 1.0.'));
fs.writeFileSync(path.join(out,'LICENSE-MIT'),license.split('\n---\n')[0].trim()+'\n');
const files=['README.md','LICENSE','LICENSE-CC0','LICENSE-MIT','CITATION.cff',...parts.map(p=>`data/${p}.jsonl`),'source/windows.json','source/split-v1.json'];
const sourceCommit=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
const release={
  packageVersion:'rtr-bench-hf-v1',repository:'noahmclaughlin/RTR-bench',
  sourceRepository:'https://github.com/1999labs/RTR-bench',sourceCommit,
  sourceGeneratedAt:source.generatedAt,datasetSha256:datasetHash,splitSha256:splitHash,
  splitVersion:split.version,rows:windows.length,submissions:windows.reduce((s,w)=>s+w.n,0),
  quadrants,partitions:Object.fromEntries(parts.map(p=>[p,{rows:split[p].length,days:split[p]}])),
  files:Object.fromEntries(files.map(f=>{const raw=fs.readFileSync(path.join(out,f),'utf8');return [f,{bytes:Buffer.byteLength(raw),sha256:digest(raw)}];})),
};
fs.writeFileSync(path.join(out,'release.json'),JSON.stringify(release,null,2)+'\n');
console.log(`Prepared ${windows.length} rows (${parts.map(p=>`${p}: ${split[p].length}`).join(', ')}), ${release.submissions} submissions, in ${out}`);
