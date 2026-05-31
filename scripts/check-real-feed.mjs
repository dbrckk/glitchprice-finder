import { readFile } from "node:fs/promises";

const FEED_PATH = "public/live-deals.json";
const MIN_RESULTS = 1;
const MIN_DISCOUNT_PERCENT = 35;

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fail(message) {
  console.error(`Real feed check failed: ${message}`);
  process.exit(1);
}

const payload = JSON.parse(await readFile(FEED_PATH, "utf8"));

if (!isRecord(payload)) fail(`${FEED_PATH} is not a JSON object.`);
if (payload.franceDeliveryRequired !== true) fail("France delivery must be required.");
if (typeof payload.scannedAt !== "string" || Number.isNaN(Date.parse(payload.scannedAt))) fail("scannedAt must be a valid ISO date.");
if (!Array.isArray(payload.results) || payload.results.length < MIN_RESULTS) fail(`Expected at least ${MIN_RESULTS} real deal result.`);

const invalidResult = payload.results.find((result) => {
  if (!isRecord(result)) return true;
  return (
    result.franceDelivery !== true ||
    typeof result.title !== "string" ||
    typeof result.url !== "string" ||
    typeof result.price !== "number" ||
    result.price <= 0 ||
    typeof result.discountPercent !== "number" ||
    result.discountPercent < MIN_DISCOUNT_PERCENT
  );
});

if (invalidResult) fail(`Invalid live deal candidate: ${JSON.stringify(invalidResult)}`);

const criticalCount = payload.results.filter((result) => isRecord(result) && result.priority === "critical").length;
console.log(`Real feed valid: ${payload.results.length} France-deliverable deals, ${criticalCount} critical, scanned at ${payload.scannedAt}.`);
