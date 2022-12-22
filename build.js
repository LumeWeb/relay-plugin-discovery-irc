import esbuild from "esbuild";

esbuild.buildSync({
  entryPoints: ["src/index.ts"],
  outfile: "dist/discovery-irc.js",
  format: "cjs",
  bundle: true,
  platform: "node",
});
