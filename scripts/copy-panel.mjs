import { cpSync, rmSync } from "node:fs";

const target = "custom_components/omarchy_themes/frontend";
rmSync(target, { recursive: true, force: true });
cpSync("out", target, { recursive: true });
rmSync(`${target}/_headers`, { force: true });
console.log(`Copied panel build to ${target}`);
