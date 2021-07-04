/* eslint-disable max-lines */
import fs from "fs-extra";
import path from "path";

import type { Migration } from "./Migration";
import type { PagesConfigJson } from "./types";

interface MigrationStep {
    name: string;
    fn: (mig: Migration) => Promise<void>;
    jsx?: boolean;
}

interface VersionMigration {
    version: string;
    nextVersion: string;
    aggresive?: string;
    steps: MigrationStep[];
}

const migrationsConfig: VersionMigration[] = [
    {
        version: "0.0.2-beta.5",
        nextVersion: "3.0.0",
        steps: [
            {
                name: "update eslint config",
                fn: async (mig) => {
                    await mig.upgradeDependency("@dzek69/eslint-config-typescript", "^0.2.3");
                    await mig.yarn();
                },
            },
            {
                name: "fix package.json types definition file path",
                fn: async (mig) => {
                    await mig.setPath("types", "./esm/index.d.ts");
                },
            },
        ],
    },
    {
        version: "3.0.0",
        nextVersion: "3.0.1",
        aggresive: "compile.esm.after.mjs build script will be overwritten",
        steps: [
            {
                name: "update eslint config",
                fn: async (mig) => {
                    await mig.upgradeDependency("@dzek69/eslint-config-typescript", "^0.2.4");
                    await mig.yarn();
                },
            },
            {
                name: "fix compile.esm.after.mjs build script",
                fn: async (mig) => {
                    await mig.copy(
                        "template/build-scripts/compile.esm.after.mjs", "build-scripts/compile.esm.after.mjs",
                    );
                },
            },
        ],
    },
    {
        version: "3.0.1",
        nextVersion: "3.0.2",
        steps: [
            {
                name: "update typescript",
                fn: async (mig) => {
                    await mig.upgradeDependency("typescript", "^4.2.4");
                },
            },
            {
                name: "fix compile.esm.after.mjs build script",
                fn: async (mig) => {
                    await mig.upgradeDependency("typedoc", "^0.20.35");
                },
            },
            {
                name: "install dependencies",
                fn: async (mig) => {
                    await mig.yarn();
                },
            },
        ],
    },
    {
        version: "3.0.2",
        nextVersion: "3.0.3",
        aggresive: "tsconfig files will be overwritten",
        steps: [
            {
                name: "update tsconfig files",
                fn: async (mig) => {
                    await mig.copy("tsconfig.json", "tsconfig.json");
                    await mig.copy("tsconfig.cjs.json", "tsconfig.cjs.json");
                    await mig.copy("tsconfig.lint.json", "tsconfig.lint.json");
                },
            },
            {
                name: "update npmignore",
                fn: async (mig) => {
                    await mig.updateContents(".npmignore", (contents) => {
                        return contents.trim() + "\n/.eslintrc.json\n";
                    });
                },
            },
            {
                name: "update after cjs compile build script",
                fn: async (mig) => {
                    await mig.copy(
                        "template/build-scripts/compile.cjs.after.mjs", "build-scripts/compile.cjs.after.mjs",
                    );
                },
            },
            {
                name: "add babel-plugin-module-extension dev dependency",
                fn: async (mig) => {
                    await mig.addDevDependency("babel-plugin-module-extension", "^0.1.3");
                },
            },
            {
                name: "install dependencies",
                fn: async (mig) => {
                    await mig.yarn();
                },
            },
        ],
    },
    {
        version: "3.0.3",
        nextVersion: "3.1.0",
        steps: [
            {
                name: "add jsx information to libraryTemplate config",
                fn: async (mig) => {
                    await mig.setPath("libraryTemplate.jsx", false);
                },
            },
            {
                name: "add root: true to .eslintrc.json",
                fn: async (mig) => {
                    await mig.updateContentsJSON(".eslintrc.json", (data) => {
                        return {
                            root: true,
                            ...data,
                        };
                    });
                },
            },
            {
                name: "remove `start:dev:compatibility` script",
                fn: async (mig) => {
                    mig.assertScript(
                        "start:dev:compatibility", "TS_NODE_FILES=true yarn start:dev",
                        new Error("Can't delete start:dev:compatibility script because it was modified"),
                    );
                    await mig.deleteScript("start:dev:compatibility");
                },
            },
        ],
    },
    {
        version: "3.1.0",
        nextVersion: "3.1.1",
        steps: [
            {
                name: "bump @dzek69/eslint-config-typescript",
                fn: async (mig) => {
                    mig.assertDevDependency(
                        "@dzek69/eslint-config-typescript", null,
                        new Error("No @dzek69/eslint-config-typescript found, so upgrade is skipped"),
                    );
                    await mig.upgradeDependency("@dzek69/eslint-config-typescript", "^0.3.2");
                },
            },
            {
                name: "restore `start:dev:compatibility` script",
                fn: async (mig) => {
                    mig.assertNoScript(
                        "start:dev:compatibility",
                        new Error("Can't set start:dev:compatibility script because it was modified"),
                    );
                    await mig.setScript("start:dev:compatibility", "TS_NODE_FILES=true yarn start:dev");
                },
            },
        ],
    },
    {
        version: "3.1.1",
        nextVersion: "3.2.0",
        steps: [
            {
                name: "bump @dzek69/eslint-config-typescript",
                fn: async (mig) => {
                    mig.assertDevDependency(
                        "@dzek69/eslint-config-typescript", null,
                        new Error("No @dzek69/eslint-config-typescript found, so upgrade is skipped"),
                    );
                    await mig.upgradeDependency("@dzek69/eslint-config-typescript", "^0.4.0");
                },
            },
            {
                name: "add @types/jest",
                fn: async (mig) => {
                    mig.assertDevDependency(
                        "jest", null,
                        new Error("No jest found, installing types is pointless"),
                    );
                    await mig.addDevDependency("@types/jest", "^26.0.23");
                },
            },
            {
                name: "upgrade jest",
                fn: async (mig) => {
                    mig.assertDevDependency(
                        "jest", null,
                        new Error("No jest found"),
                    );
                    await mig.upgradeDependency("jest", "^27.0.6", "devDependencies");
                },
            },
            {
                name: "upgrade typedoc",
                fn: async (mig) => {
                    mig.assertDevDependency(
                        "typedoc", null,
                        new Error("No typedoc found"),
                    );
                    await mig.upgradeDependency("typedoc", "^0.21.2", "devDependencies");
                },
            },
            {
                name: "add typedoc-plugin-pages-fork-fork",
                fn: async (mig) => {
                    mig.assertDevDependency(
                        "typedoc", null,
                        new Error("No typedoc found"),
                    );
                    await mig.upgradeDependency("typedoc-plugin-pages-fork-fork", "^0.0.2", "devDependencies");
                },
            },
            {
                name: "update `docs` script",
                fn: async (mig) => {
                    const wanted = "typedoc src/index.ts --out docs --listInvalidSymbolLinks --includes tutorials "
                        + "--theme pages-plugin --includeVersion";

                    mig.assertScript(
                        "docs",
                        "typedoc src/index.ts --out docs --listInvalidSymbolLinks --includes tutorials",
                        new Error("`docs` script was updated, skipping update, wanted value: " + wanted),
                    );
                    await mig.setScript("docs", wanted);
                },
            },
            {
                name: "add demo tutorial or configure existing tutorials",
                fn: async (mig) => {
                    const tuts = path.join(mig.targetDir, "tutorials");
                    await fs.ensureDir(tuts);
                    const files = await fs.readdir(tuts);
                    if (!files.length) {
                        await mig.copy("tutorials/Test.md");
                        await mig.copy("pagesconfig.json");
                        return;
                    }

                    const filesWithInfo = await Promise.all(files.map(async (file) => {
                        const stats = await fs.lstat(path.join(tuts, file));
                        return {
                            file,
                            stats,
                        };
                    }));

                    const hasDirs = filesWithInfo.some(f => f.stats.isDirectory());
                    if (hasDirs) {
                        await mig.copy("pagesconfig.json", null, false);
                        throw new Error("Your tutorials directory contains directories, demo pagesconfig.json is"
                            + "prepared for you, please configure manually");
                    }

                    await mig.copy("pagesconfig.json", null);
                    await mig.updateContentsJSON<PagesConfigJson>("pagesconfig.json", (obj) => {
                        // eslint-disable-next-line no-param-reassign
                        obj.groups![0].pages = files.map(name => {
                            if (!name.toLowerCase().endsWith(".md")) {
                                return { title: "", source: "" };
                            }

                            const justName = name.replace(/\.md$/i, "");

                            return {
                                title: justName,
                                source: "./tutorials/" + name,
                            };
                        }).filter(p => Boolean(p.title));

                        return obj;
                    });
                },
            },
            {
                name: "install dependencies",
                fn: async (mig) => {
                    await mig.yarn();
                },
            },
        ],
    },
    {
        version: "3.2.0",
        nextVersion: "3.3.0",
        steps: [
            {
                name: "update broken `docs` script (if broken by 3.2.0 bug)",
                fn: async (mig) => {
                    const wanted = "typedoc src/index.ts --out docs --listInvalidSymbolLinks --includes tutorials "
                        + "--theme pages-plugin --includeVersion";

                    if (mig.pkg.scripts.docs === "wanted") {
                        await mig.setScript("docs", wanted);
                    }
                },
            },
            {
                name: "add yarn audit to prepublishOnly",
                fn: async (mig) => {
                    if (!mig.pkg.scripts.prepublishOnly) {
                        throw new Error("`prepublishOnly` is removed, can't update.");
                    }

                    if ((mig.pkg.scripts.prepublishOnly as string).includes("audit")) {
                        throw new Error("It seems `prepublishOnly` contains audit script already, can't update.");
                    }

                    await mig.updatePath("scripts.prepublishOnly", v => "yarn audit && " + v);
                },
            },
        ],
    },
];

const jsxMigration: VersionMigration = {
    version: "non-React",
    nextVersion: "React",
    steps: [
        {
            name: "add react",
            fn: async (mig) => {
                await mig.addDependency("react", "^17.0.2");
                await mig.addDependency("react-dom", "^17.0.2");
            },
        },
        {
            name: "add parcel",
            fn: async (mig) => {
                await mig.addDevDependency("parcel-bundler", "^1.12.5");
            },
        },
        {
            name: "add postcss",
            fn: async (mig) => {
                await mig.addDevDependency("postcss", "^8.2.13");
                await mig.addDevDependency("postcss-modules", "^3.2.2");
                await mig.addDevDependency("postcss-nested", "^3.0.0");
                await mig.copy("template/jsx/.postcssrc", ".postcssrc");
            },
        },
        {
            name: "add types",
            fn: async (mig) => {
                await mig.addDevDependency("@types/react", "^17.0.4");
                await mig.addDevDependency("@types/react-dom", "^17.0.3");
                await mig.copy("template/jsx/src/@types/[file].pcss.d.ts", "src/@types/[file].pcss.d.ts");
            },
        },
        {
            name: "add demo files",
            fn: async (mig) => {
                await mig.copy("template/jsx/src/index.pcss", "src/index.pcss");
                await mig.copy("template/jsx/src/index.tsx", "src/index.tsx");
                await mig.copy("template/jsx/src/__test", "src/__test");
            },
        },
        {
            name: "set jsx information in libraryTemplate config",
            fn: async (mig) => {
                await mig.setPath("libraryTemplate.jsx", true);
            },
        },
        {
            name: "set new package.json scripts",
            fn: async (mig) => {
                mig.assertScript(
                    "start:dev", "nodemon", new Error("Can't update start:dev script because it was modified"),
                );
                await mig.setScript("start:dev", "parcel serve src/__test/index.html");
            },
        },
        {
            name: "yarn install",
            fn: async (mig) => {
                await mig.yarn();
            },
        },
    ],
};

export { migrationsConfig, jsxMigration };

export type { VersionMigration };
