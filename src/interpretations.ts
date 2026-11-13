import fs from "node:fs";
import path from "node:path";
import { QUADRANTS } from "./prompt.ts";
import { collapse, readModel, crowdWinners, summarizeConsistency, SCORING_VERSION, type VoteConsistency, type Window } from "./score.ts";

export type Interpretation = {
  choice: string | null;
  status: "chosen" | "tie" | "missing";
  votes: Record<string, number>;
  validResponses: number;
  missingResponses: number;
};

export type InterpretationTable = {
  scoringVersion: string;
  runs: { id: string; model: string; provider: string | null; providers: string[]; consistency: VoteConsistency }[];
  rows: { day: number; word: string; crowd: string[]; readings: Interpretation[] }[];
};

const SHORT: Record<string, string> = {
  "honest+uniting": "HU",
  "honest+dividing": "HD",
  "performed+uniting": "PU",
  "performed+dividing": "PD",
};

// Reuse the scorer's unique modal vote, with ties and missing calls explicit.
export function buildInterpretations(
  windows: Window[],
  runIds: string[],
  rawDir = path.join("results", "raw")
): InterpretationTable {
  const runs: InterpretationTable["runs"] = [];
  const columns: Interpretation[][] = [];
  for (const id of runIds) {
    const dir = path.join(rawDir, id);
    const calls = readModel(dir);
    if (calls.length === 0) continue;

    let identity: { model?: string; providerRequested?: string | null } = {};
    for (const task of ["read", "predict"]) {
      const td = path.join(dir, task);
      const first = fs.existsSync(td) && fs.readdirSync(td).sort().find((f) => f.endsWith(".json"));
      if (first) {
        identity = JSON.parse(fs.readFileSync(path.join(td, first), "utf8"));
        break;
      }
    }

    const own = calls.filter((c) => c.task === "read");
    const ownAnswers = collapse(own, "read", windows);
    const answers = new Map(ownAnswers.map((a) => [a.day, a]));
    const votesByDay = new Map<number, Record<string, number>>();
    for (const c of own) {
      if (!c.parsed) continue;
      if (!votesByDay.has(c.day)) votesByDay.set(c.day, {});
      const votes = votesByDay.get(c.day)!;
      votes[c.parsed.quadrant] = (votes[c.parsed.quadrant] ?? 0) + 1;
    }

    runs.push({
      id,
      model: identity.model ?? id,
      provider: identity.providerRequested ?? null,
      providers: [...new Set(own.flatMap((c) => c.provider ? [c.provider] : []))].sort(),
      consistency: summarizeConsistency(ownAnswers),
    });
    columns.push(windows.map((w) => {
      const a = answers.get(w.day);
      const votes = votesByDay.get(w.day) ?? {};
      const validResponses = Object.values(votes).reduce((sum, n) => sum + n, 0);
      return {
        choice: a && !a.tie ? a.choice : null,
        status: !a || a.missing === 4 ? "missing" : a.tie ? "tie" : "chosen",
        votes,
        validResponses,
        missingResponses: 4 - validResponses,
      };
    }));
  }
  return {
    scoringVersion: SCORING_VERSION,
    runs,
    rows: windows.map((w, i) => ({
      day: w.day,
      word: w.word,
      crowd: crowdWinners(w),
      readings: columns.map((column) => column[i]),
    })),
  };
}

const label = (run: InterpretationTable["runs"][number]) =>
  `${run.model} · ${run.provider ?? "Unpinned"}`;
const markdown = (value: string) => value.replace(/\|/g, "\\|").replace(/[\r\n]+/g, " ");

export function interpretationCell(a: Interpretation): string {
  if (a.status === "missing") return "Missing";
  const incomplete = a.missingResponses > 0 ? "*" : "";
  if (a.status === "tie") return `Tie${incomplete}`;
  return `${SHORT[a.choice!]} (${a.votes[a.choice!]}/${a.validResponses})${incomplete}`;
}

export function interpretationsMarkdown(data: InterpretationTable): string {
  const lines = [
    "# Models' own interpretations",
    "",
    'Responses to "Which reading is yours?" only. These are not predictions of the crowd and do not determine the headline score.',
    "",
    "Open [interpretations.html](interpretations.html) locally for a searchable table with a model selector and vote details.",
    "",
    `${data.rows.length} prompts; ${data.runs.length} runs. Each column is a distinct model/provider run. Runs are listed alphabetically, not ranked.`,
    `Scoring ${data.scoringVersion}. The crowd column shows all co-winning quadrants when submissions tie.`,
    "",
    "HU = Honest × Uniting; HD = Honest × Dividing; PU = Performed × Uniting; PD = Performed × Dividing.",
    "",
    "Final choices use the scorer's modal vote across four option orders. Fractions show support among valid responses. Tie means no unique winning choice; Missing means no valid response. An asterisk (*) marks fewer than four valid responses. The crowd column is included for context only.",
    "",
    "| Column | Model | Requested provider | Observed providers | Own reading 4/4 |",
    "|---|---|---|---|---|",
    ...data.runs.map((run, i) => `| M${i + 1} | ${markdown(run.model)} | ${markdown(run.provider ?? "Unpinned")} | ${markdown(run.providers.join(", ") || "Unknown")} | ${run.consistency.windows ? (100 * run.consistency.unanimousRate).toFixed(1) + "%" : "n/a"} (${run.consistency.unanimous}/${run.consistency.windows}) |`),
    "",
    `| Day | Prompt | Crowd | ${data.runs.map((_, i) => `M${i + 1}`).join(" | ")} |`,
    `|---|---|---|${data.runs.map(() => "---|").join("")}`,
    ...data.rows.map((row) => `| ${row.day} | ${markdown(row.word)} | ${row.crowd.map((q) => SHORT[q]).join(" / ")} | ${row.readings.map(interpretationCell).join(" | ")} |`),
    "",
  ];
  return lines.join("\n");
}

export function interpretationsHtml(data: InterpretationTable): string {
  const payload = JSON.stringify({ ...data, labels: data.runs.map(label), quadrants: QUADRANTS })
    .replace(/</g, "\\u003c");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>RTR-bench — Models' own interpretations</title>
<style>
:root{font-family:system-ui,sans-serif;color:#18232c;background:#f7f8fa}body{margin:0;padding:28px}h1{font-size:26px;margin:0 0 10px}p{max-width:1000px;line-height:1.55}.controls{display:flex;gap:16px;flex-wrap:wrap;margin:20px 0}label{display:flex;flex-direction:column;gap:6px;font-size:14px}input,select{font:inherit;padding:10px;border:1px solid #b9c1cb;border-radius:6px;background:white}input{min-width:240px}select{max-width:90vw}.legend{display:flex;gap:12px;flex-wrap:wrap;margin:16px 0}.legend span{padding:6px 10px;border-radius:5px}.wrap{max-height:70vh;overflow:auto;border:1px solid #cbd1d8;background:white}table{border-collapse:separate;border-spacing:0;font-size:13px;width:100%}th,td{padding:12px;border-bottom:1px solid #e4e7eb;border-right:1px solid #e4e7eb;text-align:left;white-space:nowrap}thead th{position:sticky;top:0;z-index:2;background:#eaf0f5;min-width:160px;white-space:normal}th:first-child{position:sticky;left:0;z-index:1;background:#fff;min-width:200px}thead th:first-child{z-index:3;background:#eaf0f5}.day{display:block;color:#667481;font-weight:400;font-size:11px;margin-top:4px}.hu{background:#e0f2e5}.hd{background:#eee3fa}.pu{background:#dcf4f6}.pd{background:#fce6e6}.tie,.missing{background:#f0f1f3;color:#5b6470}.incomplete{outline:2px dashed #8a6b22;outline-offset:-4px}.votes{display:block;font-size:11px;color:#53606d;margin-top:4px}caption{text-align:left;padding:8px 12px}.note{font-size:13px;color:#53606d}details{margin:16px 0}li{margin:6px 0}#count{font-size:14px}
</style></head><body>
<h1>Models' own interpretations</h1>
<p>Answers to <strong>“Which reading is yours?”</strong> across four option orders. Each cell shows the model's final own interpretation. These responses do not determine the headline score. The crowd is shown for context.</p>
<div class="controls"><label>Find a prompt<input id="search" type="search" placeholder="Prompt or day number"></label><label>Model / provider run<select id="model"><option value="all">All runs</option></select></label></div>
<div class="legend"><span class="hu">HU · Honest × Uniting</span><span class="hd">HD · Honest × Dividing</span><span class="pu">PU · Performed × Uniting</span><span class="pd">PD · Performed × Dividing</span></div>
<p class="note">Fractions show votes for the final choice among valid responses. Ties have no final choice. A dashed border marks fewer than four valid responses. Hover over a cell for the full vote breakdown. Every run remains separate.</p>
<details><summary>Run details and observed providers</summary><ul id="runs"></ul></details>
<p id="count" aria-live="polite"></p>
<p id="consistency" class="note" aria-live="polite"></p>
<div class="wrap" tabindex="0" role="region" aria-label="Own interpretations by prompt and model"><table><caption class="note">Runs are alphabetical, not ranked. Scroll horizontally to compare models.</caption><thead id="head"></thead><tbody id="body"></tbody></table></div>
<script id="data" type="application/json">${payload}</script>
<script>
const data=JSON.parse(document.getElementById('data').textContent);
const short={'honest+uniting':'HU','honest+dividing':'HD','performed+uniting':'PU','performed+dividing':'PD'};
const search=document.getElementById('search'), model=document.getElementById('model');
function cell(tag,text){const el=document.createElement(tag);el.textContent=text;return el;}
data.runs.forEach((run,i)=>{const option=cell('option',data.labels[i]);option.value=String(i);model.append(option);document.getElementById('runs').append(cell('li',data.labels[i]+' — observed: '+(run.providers.join(', ')||'Unknown')));});
function render(){
 const indices=data.runs.map((_,i)=>i).filter(i=>model.value==='all'||String(i)===model.value);
 const term=search.value.trim().toLocaleLowerCase();
 const rows=data.rows.filter(row=>row.word.toLocaleLowerCase().includes(term)||String(row.day)===term);
 const header=document.createElement('tr');header.append(cell('th','Prompt'),cell('th','Crowd (context)'));indices.forEach(i=>header.append(cell('th',data.labels[i])));document.getElementById('head').replaceChildren(header);
 const fragment=document.createDocumentFragment();
 rows.forEach(row=>{const tr=document.createElement('tr'),prompt=cell('th',row.word);prompt.scope='row';const day=cell('span','Day '+row.day);day.className='day';prompt.append(day);tr.append(prompt);const crowd=cell('td',row.crowd.map(q=>short[q]).join(' / '));crowd.className=row.crowd.length===1?short[row.crowd[0]].toLowerCase():'tie';crowd.title=row.crowd.join('; ');tr.append(crowd);
  indices.forEach(i=>{const a=row.readings[i],td=cell('td',a.status==='chosen'?short[a.choice]:a.status==='tie'?'Tie':'Missing');td.className=a.status==='chosen'?short[a.choice].toLowerCase():a.status;
   if(a.missingResponses>0)td.classList.add('incomplete');
   const detail=a.status==='chosen'?a.votes[a.choice]+'/'+a.validResponses+' votes':a.validResponses+'/4 valid responses';const votes=cell('span',detail);votes.className='votes';td.append(votes);
   td.title=data.quadrants.map(q=>q+': '+(a.votes[q]||0)).join('\u005cn')+'\u005cnMissing or invalid: '+a.missingResponses;tr.append(td);
  });fragment.append(tr);
 });document.getElementById('body').replaceChildren(fragment);document.getElementById('count').textContent=rows.length+' of '+data.rows.length+' prompts · '+indices.length+' of '+data.runs.length+' runs · scoring '+data.scoringVersion;
 const summaries=indices.map(i=>data.runs[i].consistency),attempted=summaries.reduce((n,c)=>n+c.windows,0),unanimous=summaries.reduce((n,c)=>n+c.unanimous,0),incomplete=summaries.reduce((n,c)=>n+c.patterns.incomplete+c.patterns.missing,0);
 document.getElementById('consistency').textContent='Across all prompts for the selected runs: 4/4 own-reading consistency '+unanimous+'/'+attempted+(attempted?' ('+(100*unanimous/attempted).toFixed(1)+'%)':'')+'; '+incomplete+' cases with incomplete or missing responses. Consistency is separate from agreement with the crowd.';
}
search.addEventListener('input',render);model.addEventListener('change',render);render();
</script></body></html>\n`;
}

export function writeInterpretations(
  windows: Window[],
  runIds: string[],
  outputDir = "results",
  rawDir = path.join("results", "raw")
) {
  const data = buildInterpretations(windows, runIds, rawDir);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, "interpretations.md"), interpretationsMarkdown(data));
  fs.writeFileSync(path.join(outputDir, "interpretations.html"), interpretationsHtml(data));
  console.log(`wrote interpretations.md and interpretations.html (${data.rows.length} prompts, ${data.runs.length} runs)`);
  return data;
}
