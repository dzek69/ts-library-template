import fs from "fs-extra";

(async () => {
    console.info("[ESM compile post-processing started]");
    await fs.copy("./src/dirname/package.json", "./esm/dirname/package.json");
    console.info("Copied ./dirname/package.json");
    console.info("[ESM compile post-processing ended]");
})();
