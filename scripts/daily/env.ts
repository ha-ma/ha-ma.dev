// .env / .env.local を読む（依存なし）。既に設定済みの変数は上書きしない。
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export function loadEnv(root = process.cwd()) {
  for (const name of [".env", ".env.local", ".env.daily"]) {
    const p = resolve(root, name);
    if (!existsSync(p)) continue;
    for (const raw of readFileSync(p, "utf8").split("\n")) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq < 0) continue;
      const key = line.slice(0, eq).trim();
      let val = line.slice(eq + 1).trim();
      const hash = val.search(/\s#/);
      if (hash >= 0 && !/^["']/.test(val)) val = val.slice(0, hash).trim();
      if (/^".*"$/.test(val) || /^'.*'$/.test(val)) val = val.slice(1, -1);
      if (!(key in process.env)) process.env[key] = val;
    }
  }
}
