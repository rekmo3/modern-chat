import { exportJWK, exportPKCS8, generateKeyPair } from "jose";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const convexBin = join(dirname(require.resolve("convex/package.json")), "bin", "main.js");

function setEnv(name, value) {
  const r = spawnSync(process.execPath, [convexBin, "env", "set", name, "--", value], {
    stdio: "inherit",
  });
  if (r.status !== 0) {
    console.error(`Не вдалося встановити ${name}`);
    process.exit(r.status ?? 1);
  }
}

const keys = await generateKeyPair("RS256", { extractable: true });
const privateKey = (await exportPKCS8(keys.privateKey)).trimEnd().replace(/\n/g, " ");
const publicKey = await exportJWK(keys.publicKey);
const jwks = JSON.stringify({ keys: [{ use: "sig", ...publicKey }] });

setEnv("JWT_PRIVATE_KEY", privateKey);
setEnv("JWKS", jwks);
console.log("✅ JWT_PRIVATE_KEY і JWKS встановлено в Convex.");
