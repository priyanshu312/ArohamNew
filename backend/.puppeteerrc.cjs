const { join } = require("path");

// Put Puppeteer's Chrome download inside the project directory so it survives
// Render's build -> runtime filesystem handoff (the default ~/.cache/puppeteer
// lives outside /opt/render/project/src and is dropped from the build artifact).
// Both `puppeteer browsers install` (build) and `puppeteer.launch()` (runtime)
// read this file.
module.exports = {
  cacheDirectory: join(__dirname, ".cache", "puppeteer"),
};
