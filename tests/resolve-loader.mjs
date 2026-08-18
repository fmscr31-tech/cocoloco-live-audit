import fs from "node:fs";
import { fileURLToPath } from "node:url";

export async function resolve(specifier, context, defaultResolve) {
  if ((specifier.startsWith("./") || specifier.startsWith("../")) && !specifier.endsWith("/") && !specifier.match(/\.[A-Za-z0-9]+$/)) {
    try {
      const candidate = new URL(`${specifier}.js`, context.parentURL);
      if (fs.existsSync(fileURLToPath(candidate))) {
        return defaultResolve(candidate.href, context, defaultResolve);
      }
    } catch {}
  }
  return defaultResolve(specifier, context, defaultResolve);
}
