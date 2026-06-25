import { readFileSync, writeFileSync, chmodSync } from "node:fs";

const out = "dist/dietoken.cjs";
const content = readFileSync(out, "utf8");
const stripped = content.replace(/^#!.*\n/, "");
writeFileSync(out, "#!/usr/bin/env node\n" + stripped);
chmodSync(out, 0o755);
