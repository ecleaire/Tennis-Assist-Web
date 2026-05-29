import { readFile, writeFile } from "node:fs/promises";

await writeFile(new URL("../../docs/.nojekyll", import.meta.url), "\n");

for (const file of ["../../docs/data/rules_sections.json", "../../docs/data/news.json"]) {
  const url = new URL(file, import.meta.url);
  const data = JSON.parse(await readFile(url, "utf8"));
  await writeFile(url, JSON.stringify(data));
}
