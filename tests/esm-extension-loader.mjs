import { stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const EXTENSIONS = [".js", ".mjs", ".json"];

export async function resolve(specifier, context, defaultResolve) {
  if ((specifier.startsWith("./") || specifier.startsWith("../")) && !specifier.match(/\.[a-zA-Z0-9]+$/)) {
    const parentURL = context.parentURL || import.meta.url;
    const base = new URL(specifier, parentURL);

    for (const extension of EXTENSIONS) {
      const candidate = new URL(base.href + extension);
      try {
        await stat(fileURLToPath(candidate));
        return defaultResolve(candidate.href, context, defaultResolve);
      } catch {
        // Try the next supported extension.
      }
    }
  }

  return defaultResolve(specifier, context, defaultResolve);
}
