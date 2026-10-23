// Builds the native bridge without modifying the original game mechanics.
const esbuild = require("esbuild");
const testing = process.env.GK_TEST_ADS !== "0";
esbuild.buildSync({
  entryPoints: ["monetization-setup.js"],
  outfile: "www/native-monetization.js",
  bundle: true,
  platform: "browser",
  format: "iife",
  target: ["safari15"],
  define: { __GK_TEST_ADS__: String(testing) },
  logLevel: "info"
});
console.log(testing ? "Google test ad units enabled (TestFlight)." : "Production AdMob units enabled (App Store only).");
