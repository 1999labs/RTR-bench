import fs from "node:fs";
import path from "node:path";

export function writeJson(file: string, data: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(data, null, 2) + "\n");
  fs.renameSync(temp, file);
}
export function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}
