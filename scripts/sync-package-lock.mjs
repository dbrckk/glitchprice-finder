import { readFileSync, writeFileSync } from "node:fs";

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const packageLock = JSON.parse(readFileSync("package-lock.json", "utf8"));

packageLock.name = packageJson.name;
packageLock.version = packageJson.version;
packageLock.lockfileVersion = packageLock.lockfileVersion ?? 3;
packageLock.requires = true;
packageLock.packages = packageLock.packages ?? {};
packageLock.packages[""] = {
  ...(packageLock.packages[""] ?? {}),
  name: packageJson.name,
  version: packageJson.version,
  dependencies: packageJson.dependencies ?? {},
  devDependencies: packageJson.devDependencies ?? {},
};

writeFileSync("package-lock.json", `${JSON.stringify(packageLock, null, 2)}\n`);
