import { DEFAULT_SOURCES, parseScanArgs, scanSources, writeScanArtifacts } from "./live-scan-core.mjs";

const options = parseScanArgs(process.argv.slice(2));
const payload = await scanSources(DEFAULT_SOURCES, options);
await writeScanArtifacts(payload, options);
console.log(JSON.stringify(payload, null, 2));

if (!payload.results.length) {
  process.exitCode = 1;
}
