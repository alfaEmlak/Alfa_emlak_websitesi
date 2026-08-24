/** .env dosyasını harici bağımlılık olmadan okur (scripts/* için). */
import fs from "node:fs";
import path from "node:path";

export function loadEnv(file = ".env") {
  const out = { ...process.env };
  const p = path.resolve(file);
  if (!fs.existsSync(p)) return out;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    if (!line || line.trimStart().startsWith("#")) continue;
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    // process.env öncelikli: CLI'dan verilen değer .env'i ezer.
    if (out[m[1]] === undefined) out[m[1]] = v;
  }
  return out;
}
