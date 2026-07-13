import { readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const imagePattern = /\.(png|webp|jpg|jpeg|gif)$/i;

async function listImages(relativeDirectory) {
  const absoluteDirectory = path.resolve(relativeDirectory);
  const names = await readdir(absoluteDirectory);
  return names
    .filter((name) => imagePattern.test(name))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

const manifest = {
  ninja: {
    idle: await listImages("assets/ninja/idle"),
    walk: await listImages("assets/ninja/walk"),
    skill: await listImages("assets/ninja/skill")
  },
  shuriken: await listImages("assets/shuriken")
};

await writeFile(
  "assets-manifest.js",
  `window.ASSET_MANIFEST=${JSON.stringify(manifest, null, 2)};\n`,
  "utf8"
);

console.log("Generated assets-manifest.js");
console.log(manifest);
