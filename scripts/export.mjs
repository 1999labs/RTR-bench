// Export the recorded field from Mixed Messages into data/windows.json.
//
// READ-ONLY. SELECT-only against production, view calls against mainnet.
//
// The brief for this repo said to drop rows matching ^w<day>_.._<n>$ and treat
// the rest as organic. That keeps 33,426 seeded rows and loses the crowd.
// The owner has decided the benchmark uses every mark in the field, so this
// exporter does exactly that: no provenance filter in the analysis. A separate
// data/audit.json records the split, for the record only.

import fs from "node:fs";
import postgres from "postgres";
import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";

const MM = "0x0169a0dd0a5Cfe48E80539EB02a4E221B8f77991";
const RPC = "https://eth-mainnet.g.alchemy.com/v2/OBdzjpzwdtJdvUq3tQmIH";
const ENV = "/Users/noahmclaughlin/Code/mixed-messages/frontend/.env.local";
const MIN_MARKS = 25;

const url = fs.readFileSync(ENV, "utf8").match(/DATABASE_URL="?([^"\n]+)"?/)?.[1];
if (!url || url.includes("***")) throw new Error("no usable DATABASE_URL");

const sql = postgres(url, { max: 1 });
const client = createPublicClient({ chain: mainnet, transport: http(RPC) });

const WORD_ABI = [
  {
    name: "getWord",
    type: "function",
    stateMutability: "view",
    inputs: [{ type: "uint256" }],
    outputs: [{ type: "string" }],
  },
  {
    name: "activeDay",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
];

const activeDay = Number(
  await client.readContract({ address: MM, abi: WORD_ABI, functionName: "activeDay" })
);
const lastClosed = activeDay - 1;

const rows = await sql`
  SELECT day_index,
         count(*)::int AS n,
         count(*) FILTER (WHERE x < 5000 AND y < 5000)::int AS tl,
         count(*) FILTER (WHERE x >= 5000 AND y < 5000)::int AS tr,
         count(*) FILTER (WHERE x < 5000 AND y >= 5000)::int AS bl,
         count(*) FILTER (WHERE x >= 5000 AND y >= 5000)::int AS br,
         avg(x)::float AS mx,
         avg(y)::float AS my
  FROM submissions
  WHERE day_index BETWEEN 1 AND ${lastClosed}
  GROUP BY 1
  HAVING count(*) >= ${MIN_MARKS}
  ORDER BY 1
`;

const pts = await sql`
  SELECT day_index, x, y FROM submissions
  WHERE day_index BETWEEN 1 AND ${lastClosed}
`;

const byDay = new Map();
for (const p of pts) {
  if (!byDay.has(p.day_index)) byDay.set(p.day_index, []);
  byDay.get(p.day_index).push({ x: p.x, y: p.y });
}

const Q = ["tl", "tr", "bl", "br"];
const LABEL = {
  tl: "performed+uniting",
  tr: "honest+uniting",
  bl: "performed+dividing",
  br: "honest+dividing",
};

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const rms = (xs) => Math.sqrt(mean(xs.map((v) => v * v)));

const words = new Map();
for (const r of rows) {
  words.set(
    r.day_index,
    await client.readContract({
      address: MM,
      abi: WORD_ABI,
      functionName: "getWord",
      args: [BigInt(r.day_index)],
    })
  );
}

const windows = rows.map((r) => {
  const coords = byDay.get(r.day_index) ?? [];
  const counts = { tl: r.tl, tr: r.tr, bl: r.bl, br: r.br };
  const sorted = [...Q].sort((a, b) => counts[b] - counts[a]);
  const plurality = sorted[0];
  const share = counts[plurality] / r.n;

  const mx = mean(coords.map((p) => p.x));
  const my = mean(coords.map((p) => p.y));
  const conviction =
    (100 * mean(coords.map((p) => Math.hypot(p.x - 5000, p.y - 5000)))) / 7071.07;
  const polarization =
    (100 * rms(coords.map((p) => Math.hypot(p.x - mx, p.y - my)))) / 7071.07;

  return {
    day: r.day_index,
    word: words.get(r.day_index) ?? null,
    n: r.n,
    counts,
    plurality,
    pluralityLabel: LABEL[plurality],
    pluralityShare: +share.toFixed(3),
    centroid: { x: +(mx / 10000).toFixed(4), y: +(my / 10000).toFixed(4) },
    conviction: +conviction.toFixed(1),
    polarization: +polarization.toFixed(1),
  };
});

const marks = windows.reduce((a, w) => a + w.n, 0);
const ns = windows.map((w) => w.n).sort((a, b) => a - b);

const out = {
  generatedAt: new Date().toISOString(),
  contract: MM,
  activeDay,
  rule: `every mark in windows 1..${lastClosed}; windows with >= ${MIN_MARKS} marks`,
  counts: {
    windows: windows.length,
    marks,
    min: ns[0],
    median: ns[Math.floor(ns.length / 2)],
    max: ns[ns.length - 1],
  },
  metricFormulas: {
    conviction: "mean distance from (5000,5000) / 7071 * 100",
    polarization: "RMS distance from centroid / 7071 * 100",
  },
  windows,
};

fs.mkdirSync("data", { recursive: true });
fs.writeFileSync("data/windows.json", JSON.stringify(out, null, 2) + "\n");

// Provenance, kept out of the analysis. Informational only.
const audit = await sql`
  SELECT day_index,
         count(*)::int AS total,
         count(*) FILTER (WHERE ip_hash ~ '^[0-9a-f]{64}$')::int AS hmac
  FROM submissions
  WHERE day_index BETWEEN 1 AND ${lastClosed}
  GROUP BY 1
  ORDER BY 1
`;
fs.writeFileSync(
  "data/audit.json",
  JSON.stringify(
    {
      note: "Provenance only. The benchmark does not read this file.",
      hmacIsOrganic: "ip_hash ~ '^[0-9a-f]{64}$' is the public submit path",
      days: audit.map((d) => ({ day: d.day_index, total: d.total, hmac: d.hmac })),
    },
    null,
    2
  ) + "\n"
);

console.log(JSON.stringify(out.counts, null, 1));
const spread = {};
for (const w of windows) spread[w.plurality] = (spread[w.plurality] ?? 0) + 1;
console.log("plurality spread:", JSON.stringify(spread));
console.log(
  "top windows:",
  windows
    .slice()
    .sort((a, b) => b.n - a.n)
    .slice(0, 5)
    .map((w) => `${w.day}:${w.word}(${w.n})`)
    .join(", ")
);
await sql.end();
