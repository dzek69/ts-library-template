/* eslint-disable max-lines */
import path from "path";

import { ensureArray, removeCommonProperties } from "@ezez/utils";
import fs from "fs-extra";

import type { Migration } from "./Migration";
import type { PagesConfigJson, EslintRc, TSConfigJson, NewPagesConfigJson, JestConfig } from "./types";

import { parse, stringify } from "./module-exports-parser.js";

interface MigrationStep {
    name: string;
    fn: (mig: Migration) => Promise<void>;
    jsx?: boolean;
}

interface JSXMigrationStep extends MigrationStep {
    jsx?: never;
}

interface VersionMigration {
    version: string;
    nextVersion: string;
    aggressive?: string;
    steps: MigrationStep[];
}

interface JSXVersionMigration extends VersionMigration {
    steps: JSXMigrationStep[];
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
        aggressive: "compile.esm.after.mjs build script will be overwritten",
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
        aggressive: "tsconfig files will be overwritten",
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
                        if (!obj.groups) {
                            throw new Error("pagesconfig.json doesn't have `groups` field");
                        }
                        if (!obj.groups[0]) {
                            throw new Error("pagesconfig.json doesn't have any groups");
                        }

                        // eslint-disable-next-line no-param-reassign
                        obj.groups[0].pages = files.map(nname => {
                            if (!nname.toLowerCase().endsWith(".md")) {
                                return { title: "", source: "" };
                            }

                            const justName = nname.replace(/\.md$/ui, "");

                            return {
                                title: justName,
                                source: "./tutorials/" + nname,
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

                    if ((mig.pkg.scripts.prepublishOnly).includes("audit")) {
                        throw new Error("It seems `prepublishOnly` contains audit script already, can't update.");
                    }

                    await mig.updatePath("scripts.prepublishOnly", v => "yarn audit && " + v);
                },
            },
        ],
    },
    {
        version: "3.3.0",
        nextVersion: "3.3.1",
        steps: [
            {
                name: "bump typedoc-plugin-pages-fork-fork",
                fn: async (mig) => {
                    mig.assertDevDependency(
                        "typedoc-plugin-pages-fork-fork", null,
                        new Error("No typedoc-plugin-pages-fork-fork found, skipping update"),
                    );
                    await mig.upgradeDependency("typedoc-plugin-pages-fork-fork", "^0.0.3", "devDependencies");
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
        version: "3.3.1",
        nextVersion: "3.3.2",
        steps: [
            {
                name: "bump eslint",
                fn: async (mig) => {
                    mig.assertDevDependency(
                        "eslint", null,
                        new Error("No eslint found, skipping update"),
                    );
                    await mig.upgradeDependency("eslint", "^7.32.0", "devDependencies");
                },
            },
            {
                name: "bump eslint config",
                fn: async (mig) => {
                    mig.assertDevDependency(
                        "@dzek69/eslint-config-base", null,
                        new Error("No @dzek69/eslint-config-base found, skipping update"),
                    );
                    await mig.upgradeDependency("@dzek69/eslint-config-base", "^2.1.0", "devDependencies");
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
        version: "3.3.2",
        nextVersion: "3.4.0",
        steps: [
            {
                name: "make copy of tsconfig for esm building",
                fn: async (mig) => {
                    await mig.copy("tsconfig.json", "tsconfig.esm.json");
                    mig.assertScript(
                        "compile:esm", "rm -rf esm && tsc && node ./build-scripts/compile.esm.after.mjs",
                        new Error("Can't update compile:esm script because it was modified"),
                    );
                    await mig.setScript(
                        "compile:esm",
                        "rm -rf esm && tsc --project tsconfig.esm.json && node ./build-scripts/compile.esm.after.mjs",
                    );
                },
            },
            {
                name: "replace parcel with next",
                jsx: true,
                fn: async (mig) => {
                    await mig.removeDependency("parcel-bundler");
                    await mig.addDevDependency("next", "^11.1.0");
                },
            },
            {
                name: "replace postcss with sass",
                jsx: true,
                fn: async (mig) => {
                    await mig.removeDependency("postcss");
                    await mig.removeDependency("postcss-modules");
                    await mig.removeDependency("postcss-nested");
                    await mig.remove(".postcssrc");
                    await mig.remove("src/@types/[file].pcss.d.ts");

                    await mig.addDevDependency("sass", "^1.35.2");
                },
            },
            {
                name: "move demo files",
                jsx: true,
                fn: async (mig) => {
                    await mig.rename("src/__test", "src/pages");
                },
            },
            {
                name: "setup babel",
                jsx: true,
                fn: async (mig) => {
                    await mig.remove("babel.config.cjs");

                    await mig.addDevDependency("babel-plugin-module-resolver", "^4.1.0");
                    await mig.copy("template/jsx/babel.config.js", "babel.config.js");

                    await mig.deletePath("type");
                },
            },
            {
                name: "update scripts",
                jsx: true,
                fn: async (mig) => {
                    mig.assertScript(
                        "start:dev", "parcel serve src/__test/index.html",
                        new Error("Can't update start:dev script because it was modified"),
                    );
                    await mig.setScript("start:dev", "next dev");
                },
            },
            {
                name: "add eslint config for react",
                jsx: true,
                fn: async (mig) => {
                    await mig.addDevDependency("eslint-plugin-react", "^7.24.0");
                    await mig.addDevDependency("@dzek69/eslint-config-react", "^1.2.2");

                    await mig.updateContentsJSON<EslintRc>(".eslintrc.json", (data, set) => {
                        if (!data.extends) {
                            throw new TypeError("Invalid eslint configuration file");
                        }

                        if (data.extends) {
                            if (data.extends === "string") {
                                // eslint-disable-next-line no-param-reassign
                                data.extends = ensureArray(data.extends);
                            }
                            if (Array.isArray(data.extends)) { // check just for TS, always true
                                data.extends.push("@dzek69/eslint-config-react");
                            }
                        }

                        set(["rules", "react/prop-types"], "off");
                        // eslint-disable-next-line no-param-reassign
                        data.settings = {
                            ...data.settings,
                            react: {
                                createClass: "createReactClass",
                                pragma: "React",
                                version: "detect",
                                flowVersion: "detect",
                            },
                            propWrapperFunctions: [],
                        };

                        return data;
                    });
                },
            },
            {
                name: "yarn install",
                fn: async (mig) => {
                    await mig.yarn();
                },
            },
        ],
    },
    {
        version: "3.4.0",
        nextVersion: "3.4.1",
        steps: [
            {
                name: "bump husky",
                fn: async (mig) => {
                    mig.assertDevDependency(
                        "husky", null,
                        new Error("No husky found, skipping update"),
                    );
                    await mig.upgradeDependency("husky", "^7.0.4", "devDependencies");
                },
            },
            {
                name: "bump nodemon",
                fn: async (mig) => {
                    mig.assertDevDependency(
                        "nodemon", null,
                        new Error("No nodemon found, skipping update"),
                    );
                    await mig.upgradeDependency("nodemon", "^2.0.15", "devDependencies");
                },
            },
            {
                name: "bump jest",
                fn: async (mig) => {
                    mig.assertDevDependency(
                        "jest", null,
                        new Error("No jest found, skipping update"),
                    );
                    await mig.upgradeDependency("jest", "^27.5.1", "devDependencies");
                },
            },
            {
                name: "bump typedoc",
                fn: async (mig) => {
                    mig.assertDevDependency(
                        "typedoc", null,
                        new Error("No typedoc found, skipping update"),
                    );
                    await mig.upgradeDependency("typedoc", "^0.21.10", "devDependencies");
                },
            },
            {
                name: "yarn install",
                fn: async (mig) => {
                    await mig.yarn();
                },
            },
        ],
    },
    {
        version: "3.4.1",
        nextVersion: "3.5.0",
        steps: [
            {
                name: "add next-env to tsconfig",
                jsx: true,
                fn: async (mig) => {
                    await mig.updateContentsJSON<TSConfigJson>("tsconfig.json", tsconfig => {
                        return {
                            ...tsconfig,
                            include: [...(tsconfig.include ?? []), "next-env.d.ts"],
                        };
                    });
                    await mig.updateContentsJSON<TSConfigJson>("tsconfig.cjs.json", tsconfig => {
                        return {
                            ...tsconfig,
                            include: [...(tsconfig.include ?? []), "next-env.d.ts"],
                        };
                    });
                },
            },
            {
                name: "add pagesconfig to npm ignore",
                fn: async (mig) => {
                    await mig.pushLine(".npmignore", "/pagesconfig.json");
                },
            },
            {
                name: "add pages & demo folders in dist/esm to npm ignore",
                jsx: true,
                fn: async (mig) => {
                    await mig.pushLine(".npmignore", "/esm/pages");
                    await mig.pushLine(".npmignore", "/esm/demo");
                },
            },
            {
                name: "add .next folder to ignore files",
                jsx: true,
                fn: async (mig) => {
                    await mig.pushLine(".npmignore", "/.next");
                    await mig.pushLine(".gitignore", "/.next");
                },
            },
            {
                name: "fix babel config name incorrect in npm ignore",
                fn: async (mig) => {
                    await mig.replaceLine(".npmignore", "/babel.config.cjs", "/babel.config.js");
                },
            },
            {
                name: "add next-env to npm ignore",
                jsx: true,
                fn: async (mig) => {
                    await mig.pushLine(".npmignore", "/next-env.d.ts");
                },
            },
            {
                name: "update nodemon",
                fn: async (mig) => {
                    await mig.upgradeDependency("nodemon", "^2.0.19");
                },
            },
            {
                name: "update eslint",
                fn: async (mig) => {
                    await mig.upgradeDependency("@dzek69/eslint-config-base", "^2.2.0");
                    await mig.upgradeDependency("@dzek69/eslint-config-typescript", "^1.0.1");
                    await mig.upgradeDependency("@typescript-eslint/eslint-plugin", "^5.30.3");
                    await mig.upgradeDependency("@typescript-eslint/parser", "^5.30.3");
                    await mig.upgradeDependency("eslint", "^8.18.0");
                },
            },
            {
                name: "add eslint import plugin",
                fn: async (mig) => {
                    await mig.addDevDependency("eslint-plugin-import", "^2.26.0");
                    await mig.addDevDependency("@dzek69/eslint-config-import", "^1.0.0");
                    await mig.addDevDependency("@dzek69/eslint-config-import-typescript", "^1.0.0");

                    await mig.updateContentsJSON<EslintRc>(".eslintrc.json", (data, set) => {
                        if (!data.extends) {
                            throw new TypeError("Invalid eslint configuration file");
                        }

                        if (data.extends) {
                            if (data.extends === "string") {
                                // eslint-disable-next-line no-param-reassign
                                data.extends = ensureArray(data.extends);
                            }
                            if (Array.isArray(data.extends)) { // check just for TS, always true
                                data.extends.push(
                                    "@dzek69/eslint-config-import",
                                    "@dzek69/eslint-config-import-typescript",
                                );
                            }
                        }

                        return data;
                    });
                },
            },
            {
                name: "upgrade typedoc",
                fn: async (mig) => {
                    await mig.upgradeDependency("typedoc", "^0.23.8");
                    await mig.removeAnyDependency("typedoc-plugin-pages-fork-fork");
                    await mig.addDevDependency("@knodes/typedoc-plugin-pages", "^0.23.1");
                    await mig.updateContentsJSON<PagesConfigJson, NewPagesConfigJson>("pagesconfig.json", (pgs) => {
                        return {
                            pages: pgs.groups?.map(group => group.pages).flat(1) ?? [],
                            source: "tutorials",
                        };
                    });

                    mig.assertScript(
                        "docs",
                        "typedoc src/index.ts --out docs --listInvalidSymbolLinks --includes tutorials"
                        + " --theme pages-plugin --includeVersion",
                        new Error("Can't update docs script because it was modified"),
                    );
                    await mig.setScript(
                        "docs", "typedoc src/index.ts --out docs --includeVersion --pluginPages ./pagesconfig.json",
                    );
                },
            },
            {
                name: "upgrade typescript",
                fn: async (mig) => {
                    await mig.upgradeDependency("typescript", "^4.7.4");
                    const tsConfigFiles = ["tsconfig.json", "tsconfig.cjs.json", "tsconfig.lint.json"];
                    await Promise.all(tsConfigFiles.map(file => {
                        return mig.updateContentsJSON<TSConfigJson>(file, (obj) => {
                            return {
                                ...obj,
                                compilerOptions: {
                                    ...obj.compilerOptions,
                                    noImplicitOverride: true,
                                    useUnknownInCatchVariables: true,
                                    exactOptionalPropertyTypes: true,
                                    preserveValueImports: false,
                                    moduleSuffixes: [""],
                                    noImplicitReturns: true,
                                    moduleDetection: "auto",
                                },
                            };
                        });
                    }));
                },
            },
            {
                name: "yarn install",
                fn: async (mig) => {
                    await mig.yarn();
                },
            },
        ],
    },
    {
        version: "3.5.0",
        nextVersion: "3.5.1",
        steps: [],
    },
    {
        version: "3.5.1",
        nextVersion: "3.5.2",
        steps: [
            {
                name: "fix potentially outdated docs script",
                fn: async (mig) => {
                    // if created from 3.5.0 or 3.5.1 the docs script will be outdated
                    const pkg = mig.pkg;
                    const good = "typedoc src/index.ts --out docs --includeVersion --pluginPages ./pagesconfig.json";
                    const bugged = "typedoc src/index.ts --out docs --listInvalidSymbolLinks --includes tutorials"
                        + " --theme pages-plugin --includeVersion";

                    if (pkg.scripts.docs === good) {
                        // all good
                        return;
                    }
                    if (pkg.scripts.docs === bugged) {
                        await mig.setScript("docs", good);
                        return;
                    }

                    throw new Error("Cannot update docs scripts, because it was modified");
                },
            },
        ],
    },
    {
        version: "3.5.2",
        nextVersion: "3.5.3",
        steps: [
            {
                name: "update ts-node",
                fn: async (mig) => {
                    mig.assertDevDependency("ts-node", null, new Error("ts-node not installed, won't upgrade"));
                    await mig.upgradeDependency("ts-node", "^10.9.1");
                },
            },
            {
                name: "update husky",
                fn: async (mig) => {
                    mig.assertDevDependency("husky", null, new Error("Husky not installed, won't upgrade"));
                    await mig.upgradeDependency("husky", "^8.0.1");
                },
            },
            {
                name: "add husky install script",
                fn: async (mig) => {
                    mig.assertDevDependency("husky", null, new Error("Husky not installed, won't set install script"));
                    mig.assertNoScript("prepare",
                        new Error("Prepare script already exist, cannot update it with husky install"),
                    );
                    await mig.setScript("prepare", "husky install");
                },
            },
            {
                name: "yarn install",
                fn: async (mig) => {
                    await mig.yarn();
                },
            },
        ],
    },
    {
        version: "3.5.3",
        nextVersion: "3.6.0",
        steps: [
            {
                name: "set `updates` scripts",
                fn: async (mig) => {
                    mig.assertNoScript("updates", new Error("`updates` script is already defined"));
                    mig.assertNoScript("updates:dev", new Error("`updates:dev` script is already defined"));
                    mig.assertNoScript("updates:all", new Error("`updates:all` script is already defined"));
                    await mig.setScript("updates", "npx --yes npm-check-updates --dep prod");
                    await mig.setScript("updates:dev", "npx --yes npm-check-updates --dep dev");
                    await mig.setScript("updates:all", "npx --yes npm-check-updates");
                },
            },
            {
                name: "update `docs` script",
                fn: async (mig) => {
                    mig.assertScript(
                        "docs", "typedoc src/index.ts --out docs --includeVersion --pluginPages ./pagesconfig.json",
                        new Error("`docs` scripts was updated manually, can't update"),
                    );
                    await mig.setScript(
                        "docs",
                        "typedoc src/index.ts --skipErrorChecking "
                        + "--out docs --includeVersion --pluginPages ./pagesconfig.json",
                    );
                },
            },
            {
                name: "update @babel/core",
                fn: async (mig) => {
                    await mig.safelyUpgradeDependency("@babel/core", "^7.19.3");
                },
            },
            {
                name: "update @babel/preset-env",
                fn: async (mig) => {
                    await mig.safelyUpgradeDependency("@babel/preset-env", "^7.19.3");
                },
            },
            {
                name: "update @babel/preset-typescript",
                fn: async (mig) => {
                    await mig.safelyUpgradeDependency("@babel/preset-typescript", "^7.18.6");
                },
            },
            {
                name: "update @dzek69/eslint-config-base",
                fn: async (mig) => {
                    await mig.safelyUpgradeDependency("@dzek69/eslint-config-base", "^2.3.0");
                },
            },
            {
                name: "update @dzek69/eslint-config-typescript",
                fn: async (mig) => {
                    await mig.safelyUpgradeDependency("@dzek69/eslint-config-typescript", "^1.0.2");
                },
            },
            {
                name: "update @types/jest",
                fn: async (mig) => {
                    await mig.safelyUpgradeDependency("@types/jest", "^29.0.3");
                },
            },
            {
                name: "update @typescript-eslint/eslint-plugin",
                fn: async (mig) => {
                    await mig.safelyUpgradeDependency("@typescript-eslint/eslint-plugin", "^5.38.1");
                },
            },
            {
                name: "update @typescript-eslint/parser",
                fn: async (mig) => {
                    await mig.safelyUpgradeDependency("@typescript-eslint/parser", "^5.38.1");
                },
            },
            {
                name: "update eslint",
                fn: async (mig) => {
                    await mig.safelyUpgradeDependency("eslint", "^8.24.0");
                },
            },
            {
                name: "update fs-extra",
                fn: async (mig) => {
                    await mig.safelyUpgradeDependency("fs-extra", "^10.1.0");
                },
            },
            {
                name: "update jest",
                fn: async (mig) => {
                    await mig.safelyUpgradeDependency("jest", "^29.1.1");
                },
            },
            {
                name: "update nodemon",
                fn: async (mig) => {
                    await mig.safelyUpgradeDependency("nodemon", "^2.0.20");
                },
            },
            {
                name: "update typedoc",
                fn: async (mig) => {
                    await mig.safelyUpgradeDependency("typedoc", "^0.23.15");
                },
            },
            {
                name: "yarn install",
                fn: async (mig) => {
                    await mig.yarn();
                },
            },
        ],
    },
    {
        version: "3.6.0",
        nextVersion: "3.7.0",
        steps: [
            {
                name: "update potentially outdated docs script",
                fn: async (mig) => {
                    const docs = mig.pkg.scripts.docs;
                    const targetScript = "typedoc src/index.ts --skipErrorChecking "
                        + "--out docs --includeVersion --pluginPages ./pagesconfig.json";

                    if (docs === targetScript) {
                        // already updated
                        return;
                    }
                    mig.assertScript(
                        "docs", "typedoc src/index.ts --out docs --includeVersion --pluginPages ./pagesconfig.json",
                        new Error("`docs` scripts was updated manually, can't update"),
                    );
                    await mig.setScript("docs", targetScript);
                },
            },
            {
                name: "update typescript",
                fn: async (mig) => {
                    await mig.safelyUpgradeDependency("typescript", "^4.9.5");
                },
            },
            {
                name: "add updates:* scripts",
                fn: async mig => {
                    const updates = mig.pkg.scripts.updates;
                    if (updates) {
                        // looks good
                        return;
                    }
                    await mig.setScript("updates", "npx --yes npm-check-updates --dep prod");
                    await mig.setScript("updates:dev", "npx --yes npm-check-updates --dep dev");
                    await mig.setScript("updates:all", "npx --yes npm-check-updates");
                },
            },
            {
                name: "set `types` to exports",
                fn: async mig => {
                    await mig.setPath(["exports", ".", "types"], "./esm/index.d.ts");
                },
            },
            {
                name: "add prettier",
                fn: async (mig) => {
                    await mig.addDevDependency("prettier", "^2.8.3");
                    await mig.copy("template/.prettierignore");
                    await mig.copy("template/.prettierrc.json");
                },
            },
            {
                name: "yarn install",
                fn: async (mig) => {
                    await mig.yarn();
                },
            },
        ],
    },
    {
        version: "3.7.0",
        nextVersion: "3.7.1",
        steps: [
            {
                name: "fix exports field in package.json",
                fn: async (mig) => {
                    await mig.updatePkg(pkg => {
                        if (!pkg.exports) {
                            return;
                        }
                        if (!pkg.exports["."]) {
                            return;
                        }
                        const def = pkg.exports["."].default;
                        if (!def) {
                            return;
                        }
                        // eslint-disable-next-line no-param-reassign
                        delete pkg.exports["."].default;
                        // eslint-disable-next-line no-param-reassign
                        pkg.exports["."].default = def;
                    });
                },
            },
        ],
    },
    {
        version: "3.7.1",
        nextVersion: "3.8.0",
        steps: [
            {
                name: "init git repo",
                fn: async (mig) => {
                    const repo = mig.pkg.repository;
                    if (!repo) {
                        return;
                    }
                    const initAlreadyDone = await mig.run("git", ["status"]).then(() => true, () => false);
                    if (initAlreadyDone) {
                        return;
                    }
                    await mig.run("git", ["init"]);
                    await mig.run("git", ["remote", "add", "origin", repo]);
                },
            },
            {
                name: "remove husky if no repo",
                fn: async (mig) => {
                    if (mig.pkg.repository) {
                        return;
                    }
                    await mig.removeDevDependency("husky");
                    await mig.updatePath("husky", () => undefined);

                    mig.assertScript(
                        "prepare", "husky install", new Error("Prepare script modified, can't remove husky"),
                    );
                    await mig.setScript("prepare", undefined);
                },
            },
            {
                name: "fix prettier files copied into template folder while upgrading to 3.7.0",
                fn: async (mig) => {
                    await mig.moveWithinLibrary("template/.prettierignore", ".prettierignore", false);
                    await mig.moveWithinLibrary("template/.prettierrc.json", ".prettierrc.json", false);
                    const isEmpty = await mig.isDirEmpty("template");
                    if (isEmpty) {
                        await mig.remove("template");
                    }
                },
            },
            {
                name: "yarn install",
                fn: async (mig) => {
                    await mig.yarn();
                },
            },
        ],
    },
    {
        version: "3.8.0",
        nextVersion: "3.9.0",
        steps: [
            {
                name: "upgrade babel core",
                fn: async (mig) => {
                    await mig.safelyUpgradeDependency("@babel/core", "^7.21.4");
                },
            },
            {
                name: "upgrade babel preset env",
                fn: async (mig) => {
                    await mig.safelyUpgradeDependency("@babel/preset-env", "^7.21.4");
                },
            },
            {
                name: "upgrade babel preset typescript",
                fn: async (mig) => {
                    await mig.safelyUpgradeDependency("@babel/preset-typescript", "^7.21.4");
                },
            },
            {
                name: "upgrade eslint config base",
                fn: async (mig) => {
                    await mig.safelyUpgradeDependency("@dzek69/eslint-config-base", "^2.4.0");
                },
            },
            {
                name: "upgrade eslint config import",
                fn: async (mig) => {
                    await mig.safelyUpgradeDependency("@dzek69/eslint-config-import", "^1.2.0");
                },
            },
            {
                name: "upgrade eslint config typescript",
                fn: async (mig) => {
                    await mig.safelyUpgradeDependency("@dzek69/eslint-config-typescript", "^1.1.0");
                },
            },
            {
                name: "upgrade @knodes/typedoc-plugin-pages",
                fn: async (mig) => {
                    // this is a bug, no such version exists:
                    await mig.safelyUpgradeDependency("@knodes/typedoc-plugin-pages", "^0.23.28");
                    const docsScript = mig.pkg.scripts.docs;
                    if (typeof docsScript !== "string") {
                        throw new Error("docs script doesn't exist");
                    }
                    const needle = "--pluginPages ./pagesconfig.json";
                    if (!docsScript.includes(needle)) {
                        throw new Error("docs script was modified, cannot update");
                    }
                    await mig.setScript("docs", docsScript.replace(needle, "").trim());
                    await mig.copy("typedoc.cjs");
                },
            },
            {
                name: "upgrade @types/jest",
                fn: async (mig) => {
                    await mig.safelyUpgradeDependency("@types/jest", "^29.5.0");
                },
            },
            {
                name: "upgrade @typescript-eslint/eslint-plugin",
                fn: async (mig) => {
                    await mig.safelyUpgradeDependency("@typescript-eslint/eslint-plugin", "^5.58.0");
                },
            },
            {
                name: "upgrade @typescript-eslint/parser",
                fn: async (mig) => {
                    await mig.safelyUpgradeDependency("@typescript-eslint/parser", "^5.58.0");
                },
            },
            {
                name: "upgrade eslint",
                fn: async (mig) => {
                    await mig.safelyUpgradeDependency("eslint", "^8.38.0");
                },
            },
            {
                name: "upgrade eslint-plugin-import",
                fn: async (mig) => {
                    await mig.safelyUpgradeDependency("eslint-plugin-import", "^2.27.5");
                },
            },
            {
                name: "upgrade fs-extra",
                fn: async (mig) => {
                    await mig.safelyUpgradeDependency("fs-extra", "^11.1.1");
                },
            },
            {
                name: "upgrade husky",
                fn: async (mig) => {
                    await mig.safelyUpgradeDependency("husky", "^8.0.3");
                },
            },
            {
                name: "upgrade jest",
                fn: async (mig) => {
                    await mig.safelyUpgradeDependency("jest", "^29.5.0");
                },
            },
            {
                name: "upgrade nodemon",
                fn: async (mig) => {
                    await mig.safelyUpgradeDependency("nodemon", "^2.0.22");
                },
            },
            {
                name: "upgrade prettier",
                fn: async (mig) => {
                    await mig.safelyUpgradeDependency("prettier", "^2.8.7");
                },
            },
            {
                name: "upgrade typedoc",
                fn: async (mig) => {
                    await mig.safelyUpgradeDependency("typedoc", "^0.24.1");
                },
            },
            {
                name: "upgrade typescript",
                fn: async (mig) => {
                    await mig.safelyUpgradeDependency("typescript", "^5.0.4");
                },
            },
        ],
    },
    {
        version: "3.9.0",
        nextVersion: "3.9.1",
        steps: [
            {
                name: "fix @knodes/typedoc-plugin-pages version",
                fn: async (mig) => {
                    mig.assertDevDependency("@knodes/typedoc-plugin-pages", "^0.23.28", new Error(
                        "typedoc-plugin-pages version is not 0.23.28, fix not needed",
                    ));
                    await mig.upgradeDependency("@knodes/typedoc-plugin-pages", "^0.23.4");
                },
            },
            {
                name: "yarn install",
                fn: async (mig) => {
                    await mig.yarn();
                },
            },
        ],
    },
    {
        version: "3.9.1",
        nextVersion: "3.10.0",
        steps: [
            {
                name: "upgrade @babel/core",
                fn: async (mig) => {
                    await mig.safelyUpgradeDependency("@babel/core", "^7.22.1");
                },
            },
            {
                name: "upgrade @babel/preset-env",
                fn: async (mig) => {
                    await mig.safelyUpgradeDependency("@babel/preset-env", "^7.22.4");
                },
            },
            {
                name: "upgrade @babel/preset-typescript",
                fn: async (mig) => {
                    await mig.safelyUpgradeDependency("@babel/preset-typescript", "^7.21.5");
                },
            },
            {
                name: "upgrade @types/jest",
                fn: async (mig) => {
                    await mig.safelyUpgradeDependency("@types/jest", "^29.5.2");
                },
            },
            {
                name: "upgrade prettier",
                fn: async (mig) => {
                    await mig.safelyUpgradeDependency("prettier", "^2.8.8");
                },
            },
            {
                name: "upgrade typescript",
                fn: async (mig) => {
                    await mig.safelyUpgradeDependency("typescript", "^5.1.3");
                },
            },
            {
                name: "add noUncheckedIndexedAccess to tsconfig.json",
                fn: async (mig) => {
                    const tsFiles = ["tsconfig.json", "tsconfig.cjs.json", "tsconfig.lint.json"];

                    await Promise.all(tsFiles.map(async (file) => {
                        await mig.updateContentsJSON<TSConfigJson>(file, (tsconfig) => {
                            if (!tsconfig.compilerOptions) {
                                // eslint-disable-next-line no-param-reassign
                                tsconfig.compilerOptions = {};
                            }
                            // eslint-disable-next-line no-param-reassign
                            tsconfig.compilerOptions.noUncheckedIndexedAccess = true;
                            return tsconfig;
                        });
                        await mig.sortTSConfigCompilerOptions(file);
                    }));
                },
            },
            {
                name: "sort package.json deps and devDeps",
                fn: async (mig) => {
                    await mig.sortPackageJson();
                },
            },
            {
                name: "yarn install",
                fn: async (mig) => {
                    await mig.yarn();
                },
            },
        ],
    },
    {
        version: "3.10.0",
        nextVersion: "3.11.0",
        aggressive: "compile.esm.after.mjs & compile.cjs.after.mjs build scripts will be overwritten",
        steps: [
            {
                name: "fix prepare script having husky without husky",
                fn: async (mig) => {
                    mig.assertNoAnyDependency("husky", new Error("husky dependency found, fix not needed"));
                    await mig.deleteScript("prepare");
                },
            },
            {
                name: "make copy of tsconfig for esm building",
                fn: async (mig) => {
                    await mig.assertNoFile(
                        "tsconfig.esm.json", new Error("tsconfig.esm.json already exists, fix not needed"),
                    );

                    await mig.copy("tsconfig.json", "tsconfig.esm.json");
                    mig.assertScript(
                        "compile:esm", "rm -rf esm && tsc && node ./build-scripts/compile.esm.after.mjs",
                        new Error("Can't update compile:esm script because it was modified"),
                    );
                    await mig.setScript(
                        "compile:esm",
                        "rm -rf esm && tsc --project tsconfig.esm.json && node ./build-scripts/compile.esm.after.mjs",
                    );
                },
            },
            {
                name: "add resolving typescript paths on build",
                fn: async (mig) => {
                    await mig.addDevDependency("resolve-tspaths", "^0.8.14");
                    await mig.copy("template/build-scripts/utils.mjs", "build-scripts/utils.mjs");
                    await mig.copy(
                        "template/build-scripts/compile.cjs.after.mjs", "build-scripts/compile.cjs.after.mjs",
                    );
                    await mig.copy(
                        "template/build-scripts/compile.esm.after.mjs", "build-scripts/compile.esm.after.mjs",
                    );
                },
            },
            {
                name: "unify babel config file name",
                jsx: true,
                fn: async (mig) => {
                    await mig.assertFile("babel.config.js");
                    await mig.rename("babel.config.js", "babel.config.cjs");
                },
            },
            {
                name: "fix babel config file name in npm ignore",
                fn: async (mig) => {
                    await mig.replaceLine(".npmignore", "/babel.config.js", "/babel.config.cjs");
                },
            },
            {
                name: "fix invalid babel config",
                jsx: true,
                fn: async (mig) => {
                    await mig.updateContents("babel.config.cjs", (contents) => {
                        const lineToFix = `extensions: [".js", ".jsx", ".es", ".es6", ".mjs", "ts", "tsx"]`;
                        if (!contents.includes(lineToFix)) {
                            throw new Error("babel.config.js has been modified, fix can't be applied");
                        }
                        return contents.replace(
                            lineToFix,
                            `extensions: [".js", ".jsx", ".es", ".es6", ".mjs", ".ts", ".tsx"]`,
                        );
                    });
                },
            },
            {
                name: "remove flow version from eslint settings",
                jsx: true,
                fn: async (mig) => {
                    await mig.updateContentsJSON<EslintRc>(".eslintrc.json", (data, set) => {
                        if (!data.settings?.react.flowVersion) {
                            throw new Error("Can't find flowVersion in eslint settings");
                        }
                        // eslint-disable-next-line no-param-reassign
                        delete data.settings.react.flowVersion;
                        return data;
                    });
                },
            },
            {
                name: "clean up tsconfig files",
                fn: async (mig) => {
                    const base = await mig.getContentsJSON<TSConfigJson>("tsconfig.json");
                    const esm = await mig.getContentsJSON<TSConfigJson>("tsconfig.esm.json");
                    const cjs = await mig.getContentsJSON<TSConfigJson>("tsconfig.cjs.json");
                    const lint = await mig.getContentsJSON<TSConfigJson>("tsconfig.lint.json");
                    removeCommonProperties(
                        base as Record<string, unknown>, esm as Record<string, unknown>,
                        cjs as Record<string, unknown>, lint as Record<string, unknown>,
                    );
                    removeCommonProperties(
                        base.compilerOptions!, esm.compilerOptions!, cjs.compilerOptions!, lint.compilerOptions!,
                    );

                    await mig.updateContentsJSON("tsconfig.esm.json", () => ({
                        extends: ["./tsconfig.json"],
                        ...esm,
                    }));
                    await mig.updateContentsJSON("tsconfig.cjs.json", () => ({
                        extends: ["./tsconfig.json"],
                        ...cjs,
                    }));
                    await mig.updateContentsJSON("tsconfig.lint.json", () => ({
                        extends: ["./tsconfig.json"],
                        ...lint,
                        exclude: [],
                    }));
                },
            },
            {
                name: "update jsx config in tsconfig file",
                fn: async (mig) => {
                    await mig.updateContentsJSON<TSConfigJson>("tsconfig.json", (base) => {
                        if (base.compilerOptions) {
                            // eslint-disable-next-line no-param-reassign
                            base.compilerOptions.jsx = "react-jsx";
                        }
                        return base;
                    });
                },
            },
            {
                name: "replace yarn with pnpm",
                fn: async (mig) => {
                    await mig.run("pnpm", ["import"]);
                    await mig.remove("yarn.lock");
                    await mig.remove("node_modules");
                    await mig.pnpm();
                },
            },
        ],
    },
    {
        version: "3.11.0",
        nextVersion: "3.11.1",
        steps: [
            {
                name: "update babel core",
                fn: async (mig) => {
                    await mig.safelyUpgradeDependency("@babel/core", "^7.22.8");
                },
            },
            {
                name: "update babel preset env",
                fn: async (mig) => {
                    await mig.safelyUpgradeDependency("@babel/preset-env", "^7.22.7");
                },
            },
            {
                name: "update babel preset typescript",
                fn: async (mig) => {
                    await mig.safelyUpgradeDependency("@babel/preset-typescript", "^7.22.5");
                },
            },
            {
                name: "update eslint base config",
                fn: async (mig) => {
                    await mig.safelyUpgradeDependency("@dzek69/eslint-config-base", "^2.5.0");
                },
            },
            {
                name: "update eslint import config",
                fn: async (mig) => {
                    await mig.safelyUpgradeDependency("@dzek69/eslint-config-import", "^1.3.0");
                },
            },
            {
                name: "update eslint import typescript config",
                fn: async (mig) => {
                    await mig.safelyUpgradeDependency("@dzek69/eslint-config-import-typescript", "^1.0.1");
                },
            },
            {
                name: "update eslint typescript config",
                fn: async (mig) => {
                    await mig.safelyUpgradeDependency("@dzek69/eslint-config-typescript", "^1.1.1");
                },
            },
            {
                name: "update eslint",
                fn: async (mig) => {
                    await mig.safelyUpgradeDependency("eslint", "^8.44.0");
                },
            },
            {
                name: "update eslint typescript plugin",
                fn: async (mig) => {
                    await mig.safelyUpgradeDependency("@typescript-eslint/eslint-plugin", "^5.61.0");
                },
            },
            {
                name: "update eslint typescript parser",
                fn: async (mig) => {
                    await mig.safelyUpgradeDependency("@typescript-eslint/parser", "^5.61.0");
                },
            },
            {
                name: "update jest",
                fn: async (mig) => {
                    await mig.safelyUpgradeDependency("jest", "^29.6.1");
                },
            },
            {
                name: "fix babel config file issues",
                fn: async (mig) => {
                    await mig.remove("babel.config.cjs");
                    await mig.copy("test/babel.config.cjs", "test/babel.config.cjs");
                    await mig.removeLine(".npmignore", "/babel.config.cjs");
                },
            },
            {
                name: "update jest config",
                fn: async (mig) => {
                    const txt = await mig.getContents("jest.config.cjs");
                    const data = parse<JestConfig>(txt);
                    if (data.testURL) {
                        if (!data.testEnvironmentOptions) {
                            data.testEnvironmentOptions = {};
                        }
                        data.testEnvironmentOptions.url = data.testURL;
                        delete data.testURL;
                    }
                    if (!data.transform) {
                        data.transform = {};
                    }
                    data.transform["\\.[jt]sx?$"] = ["babel-jest", { configFile: "./test/babel.config.cjs" }];
                    await mig.updateContents("jest.config.cjs", () => stringify(data));
                },
            },
            {
                name: "fix resolve-tspaths crash",
                fn: async (mig) => {
                    await mig.updateContentsJSON<TSConfigJson>("tsconfig.json", (data) => {
                        if (!data.compilerOptions) {
                            throw new Error("No compiler options in tsconfig.json");
                        }
                        if (!data.compilerOptions.paths) {
                            // eslint-disable-next-line no-param-reassign
                            data.compilerOptions.paths = {};
                        }
                        return data;
                    });
                },
            },
            {
                name: "update next",
                jsx: true,
                fn: async (mig) => {
                    await mig.safelyUpgradeDependency("next", "^13.4.9");
                },
            },
            {
                name: "update react",
                jsx: true,
                fn: async (mig) => {
                    await mig.safelyUpgradeDependency("react", "^18.2.0");
                    await mig.safelyUpgradeDependency("react-dom", "^18.2.0");
                },
            },
            {
                name: "pnpm install",
                fn: async (mig) => {
                    await mig.pnpm();
                },
            },
        ],
    },
    {
        version: "3.11.1",
        nextVersion: "3.11.2",
        steps: [
            {
                name: "upgrade scripts from yarn/npm to pnpm",
                fn: async (mig) => {
                    await mig.updatePkg(pkg => {
                        Object.keys(pkg.scripts).forEach((key) => {
                            // eslint-disable-next-line no-param-reassign
                            pkg.scripts[key] = pkg.scripts[key]!.replace(/yarn( run)? /ug, "pnpm run ");
                            // eslint-disable-next-line no-param-reassign
                            pkg.scripts[key] = pkg.scripts[key].replace(/npx --yes/ug, "pnpm dlx");
                        });

                        if (pkg.husky?.hooks && typeof pkg.husky.hooks === "object") {
                            const hooks = pkg.husky.hooks as Record<string, unknown>;
                            Object.keys(hooks).forEach((key) => {
                                if (typeof hooks[key] !== "string") {
                                    return;
                                }
                                hooks[key] = hooks[key].replace(/yarn( run)? /ug, "pnpm run ");
                            });
                        }
                    });
                },
            },
            {
                name: "update @babel/core",
                fn: async (mig) => {
                    await mig.safelyUpgradeDependency("@babel/core", "^7.22.20");
                },
            },
            {
                name: "update @babel/preset-env",
                fn: async (mig) => {
                    await mig.safelyUpgradeDependency("@babel/preset-env", "^7.22.20");
                },
            },
            {
                name: "update @babel/preset-typescript",
                fn: async (mig) => {
                    await mig.safelyUpgradeDependency("@babel/preset-typescript", "^7.22.15");
                },
            },
            {
                name: "update @types/jest",
                fn: async (mig) => {
                    await mig.safelyUpgradeDependency("@types/jest", "^29.5.5");
                },
            },
            {
                name: "update eslint-plugin-import",
                fn: async (mig) => {
                    await mig.safelyUpgradeDependency("eslint-plugin-import", "^2.28.1");
                },
            },
            {
                name: "update jest",
                fn: async (mig) => {
                    await mig.safelyUpgradeDependency("jest", "^29.7.0");
                },
            },
            {
                name: "update nodemon",
                fn: async (mig) => {
                    await mig.safelyUpgradeDependency("nodemon", "^3.0.1");
                },
            },
            {
                name: "update resolve-tspaths",
                fn: async (mig) => {
                    await mig.safelyUpgradeDependency("resolve-tspaths", "^0.8.15");
                },
            },
            {
                name: "update typescript",
                fn: async (mig) => {
                    await mig.safelyUpgradeDependency("typescript", "^5.2.2");
                },
            },
            {
                name: "pnpm install",
                fn: async (mig) => {
                    await mig.pnpm();
                },
            },
        ],
    },
    {
        version: "3.11.2",
        nextVersion: "3.12.0",
        aggressive: "Eslint config will be completely overridden if you use the default @dzek69/eslint-* packages."
            + " This should only matter to you if you added some custom overrides.",
        steps: [
            {
                name: "upgrade eslint config",
                fn: async (mig) => {
                    mig.assertDevDependency(
                        "@dzek69/eslint-config-base", null, new Error("You don't use @dzek69/eslint-* config"),
                    );
                    await mig.removeAnyDependency("@dzek69/eslint-config-base");
                    await mig.removeAnyDependency("@dzek69/eslint-config-import");
                    await mig.removeAnyDependency("@dzek69/eslint-config-import-typescript");
                    await mig.removeAnyDependency("@dzek69/eslint-config-typescript");
                    await mig.removeAnyDependency("@typescript-eslint/eslint-plugin");
                    await mig.removeAnyDependency("@typescript-eslint/parser");
                    await mig.removeAnyDependency("eslint");
                    await mig.removeAnyDependency("eslint-plugin-import");
                    await mig.addDevDependency("@ezez/eslint", "^0.0.6");

                    const eslintFiles = [".eslintrc.json", ".eslintrc.js", ".eslintrc.cjs", ".eslintrc.mjs"];

                    await Promise.all(eslintFiles.map((file) => mig.delete(file)));

                    await mig.copy("eslint.config.mjs");

                    await mig.updateContents(".npmignore", c => {
                        return c.split("\n")
                            .filter(line => !eslintFiles.map(s => "/" + s).includes(line.trim()))
                            .concat(["/eslint.config.mjs"])
                            .join("\n");
                    });

                    await mig.setScript("lint", "eslint src");
                },
            },
            {
                name: "fix audit script",
                fn: async (mig) => {
                    await mig.updatePath("scripts.prepublishOnly", value => {
                        return value.replace("pnpm run audit", "pnpm audit");
                    });
                },
            },
            {
                name: "update prettier",
                fn: async (mig) => {
                    await mig.safelyUpgradeDependency("prettier", "^3.2.5");
                },
            },
            {
                name: "update ts-node",
                fn: async (mig) => {
                    await mig.safelyUpgradeDependency("ts-node", "^10.9.2");
                },
            },
            {
                name: "update typescript",
                fn: async (mig) => {
                    await mig.safelyUpgradeDependency("typescript", "^5.4.5");
                },
            },
            {
                name: "pnpm install",
                fn: async (mig) => {
                    await mig.sortPackageJson();
                    await mig.pnpm();
                },
            },
        ],
    },
    {
        version: "3.12.0",
        nextVersion: "3.13.0",
        steps: [
            {
                jsx: true,
                name: "remove react related eslint leftovers",
                fn: async (mig) => {
                    mig.assertDevDependency("@ezez/eslint", null, new Error("You don't use @ezez/eslint"));
                    await mig.removeAnyDependency("@dzek69/eslint-config-react");
                    await mig.removeAnyDependency("eslint-plugin-react");
                },
            },
            {
                name: "bump @ezez/eslint",
                fn: async (mig) => {
                    await mig.safelyUpgradeDependency("@ezez/eslint", "^0.0.8");
                },
            },
            {
                name: "upgrade typedoc config file",
                fn: async (mig) => {
                    mig.assertDevDependency("typedoc", null, new Error("You don't use typedoc"));

                    await mig.removeAnyDependency("@knodes/typedoc-plugin-pages");
                    await mig.addDevDependency("typedoc", "0.26.0-beta.2");
                    await mig.delete("typedoc.cjs");
                    await mig.copy("typedoc.mjs");
                    await mig.pushLine(".npmignore", "/typedoc.mjs");
                },
            },
            {
                name: "update CHANGELOG format mention to EZEZ Changelog",
                fn: async (mig) => {
                    await mig.updateContents("CHANGELOG.md", (contents) => {
                        return contents.replace(
                            "[Keep a Changelog](http://keepachangelog.com/en/1.0.0/)",
                            "[EZEZ Changelog](https://ezez.dev/changelog/)",
                        );
                    });
                },
            },
            {
                name: "add prettier files to npm ignore",
                fn: async (mig) => {
                    await mig.pushLine(".npmignore", "/.prettierignore");
                    await mig.pushLine(".npmignore", "/.prettierrc.json");
                },
            },
            {
                name: "add .husky to npm ignore",
                fn: async (mig) => {
                    await mig.pushLine(".npmignore", "/.husky");
                },
            },
            {
                name: "update babel",
                fn: async (mig) => {
                    await mig.safelyUpgradeDependency("@babel/core", "^7.24.7");
                    await mig.safelyUpgradeDependency("@babel/preset-env", "^7.24.7");
                    await mig.safelyUpgradeDependency("@babel/preset-typescript", "^7.24.7");
                },
            },
            {
                name: "pnpm install",
                fn: async (mig) => {
                    await mig.sortPackageJson();
                    await mig.pnpm();
                },
            },
        ],
    },
    {
        version: "3.13.0",
        nextVersion: "3.14.0",
        steps: [
            {
                name: "update eslint",
                fn: async (mig) => {
                    mig.assertDevDependency(
                        "@ezez/eslint", null, new Error("You don't use @ezez/eslint"),
                    );

                    await mig.upgradeDependency("@ezez/eslint", "^0.3.0");
                    await mig.removeAnyDependency("eslint");

                    mig.assertScript(
                        "lint", "eslint src", new Error("Can't update lint script because it was modified"),
                    );
                    await mig.setScript("lint", "ezlint src");
                },
            },
            {
                name: "update @babel/core",
                fn: async (mig) => {
                    await mig.safelyUpgradeDependency("@babel/core", "^7.26.0");
                },
            },
            {
                name: "update @babel/preset-env",
                fn: async (mig) => {
                    await mig.safelyUpgradeDependency("@babel/preset-env", "^7.26.0");
                },
            },
            {
                name: "update @babel/preset-typescript",
                fn: async (mig) => {
                    await mig.safelyUpgradeDependency("@babel/preset-typescript", "^7.26.0");
                },
            },
            {
                name: "update @types/jest",
                fn: async (mig) => {
                    await mig.safelyUpgradeDependency("@types/jest", "^29.5.14");
                },
            },
            {
                name: "update fs-extra",
                fn: async (mig) => {
                    await mig.safelyUpgradeDependency("fs-extra", "^11.3.0");
                },
            },
            {
                name: "update nodemon",
                fn: async (mig) => {
                    await mig.safelyUpgradeDependency("nodemon", "^3.1.9");
                },
            },
            {
                name: "update prettier",
                fn: async (mig) => {
                    await mig.safelyUpgradeDependency("prettier", "^3.4.2");
                },
            },
            {
                name: "update resolve-tspaths",
                fn: async (mig) => {
                    await mig.safelyUpgradeDependency("resolve-tspaths", "^0.8.23");
                },
            },
            {
                name: "update typedoc",
                fn: async (mig) => {
                    await mig.safelyUpgradeDependency("typedoc", "0.27.6");
                },
            },
            {
                name: "update typescript",
                fn: async (mig) => {
                    await mig.safelyUpgradeDependency("typescript", "^5.7.3");
                },
            },
            {
                name: "pnpm install",
                fn: async (mig) => {
                    await mig.sortPackageJson();
                    await mig.pnpm();
                },
            },
            {
                name: "update ts-node config",
                fn: async (mig) => {
                    await mig.updateContentsJSON<TSConfigJson>("tsconfig.json", (data) => {
                        if ("ts-node" in data) {
                            throw new Error("ts-node is already in tsconfig.json, won't update");
                        }
                        // eslint-disable-next-line no-param-reassign
                        data["ts-node"] = {
                            experimentalSpecifierResolution: "node",
                            transpileOnly: true,
                            esm: true,
                        };
                        return data;
                    });
                },
            },
            {
                name: "fix jest config module mapping",
                fn: async (mig) => {
                    await mig.updateContents("jest.config.cjs", (data) => {
                        if (!data.includes(`'^(.*)\\.js$': '$1'`) && !data.includes(`"^(.*)\\.js$": "$1"`)) {
                            // no known mapping to fix?
                            if (data.includes(`"^(.*)\\\\.js$": "$1"`) || data.includes(`'^(.*)\\\\.js$': '$1'`)) {
                                // already fixed, do nothing
                                return;
                            }
                            throw new Error("Can't find jest mapping to fix, is it already fixed?");
                        }
                        return data
                            .replace(`'^(.*)\\.js$': '$1'`, `"^(.*)\\\\.js$": "$1"`)
                            .replace(`"^(.*)\\.js$": "$1"`, `"^(.*)\\\\.js$": "$1"`);
                    });
                },
            },
        ],
    },
];

const jsxMigration: JSXVersionMigration = {
    version: "non-React",
    nextVersion: "React",
    steps: [
        {
            name: "add react",
            fn: async (mig) => {
                await mig.addDependency("react", "^18.2.0");
                await mig.addDependency("react-dom", "^18.2.0");
            },
        },
        {
            name: "add next",
            fn: async (mig) => {
                await mig.addDevDependency("next", "^13.4.9");
            },
        },
        {
            name: "add .next folder to ignore files",
            fn: async (mig) => {
                await mig.pushLine(".npmignore", "/.next");
                await mig.pushLine(".gitignore", "/.next");
            },
        },
        {
            name: "add next-env to tsconfig",
            fn: async (mig) => {
                await mig.updateContentsJSON<TSConfigJson>("tsconfig.json", tsconfig => {
                    return {
                        ...tsconfig,
                        include: [...(tsconfig.include ?? []), "next-env.d.ts"],
                    };
                });
                await mig.updateContentsJSON<TSConfigJson>("tsconfig.cjs.json", tsconfig => {
                    return {
                        ...tsconfig,
                        include: [...(tsconfig.include ?? []), "next-env.d.ts"],
                    };
                });
                await mig.updateContentsJSON<TSConfigJson>("tsconfig.esm.json", tsconfig => {
                    return {
                        ...tsconfig,
                        include: [...(tsconfig.include ?? []), "next-env.d.ts"],
                    };
                });
            },
        },
        {
            name: "add next-env to npm ignore",
            fn: async (mig) => {
                await mig.pushLine(".npmignore", "/next-env.d.ts");
            },
        },
        {
            name: "add pages & demo folders in dist/esm to npm ignore",
            fn: async (mig) => {
                await mig.pushLine(".npmignore", "/esm/pages");
                await mig.pushLine(".npmignore", "/esm/demo");
            },
        },
        {
            name: "add sass",
            fn: async (mig) => {
                await mig.addDevDependency("sass", "^1.35.2");
            },
        },
        {
            name: "add types",
            fn: async (mig) => {
                await mig.addDevDependency("@types/react", "^18.2.14");
                await mig.addDevDependency("@types/react-dom", "^18.2.6");
            },
        },
        {
            name: "add demo files",
            fn: async (mig) => {
                await mig.copy("template/jsx/src/pages", "src/pages");
                await mig.copy("template/jsx/src/index.tsx", "src/index.tsx");
                await mig.copy("template/jsx/src/index.module.scss", "src/index.module.scss");
            },
        },
        {
            name: "set jsx information in libraryTemplate config",
            fn: async (mig) => {
                await mig.setPath("libraryTemplate.jsx", true);
            },
        },
        {
            name: "setup babel",
            fn: async (mig) => {
                // TODO this makes the lib to be non-esm, find workaround
                await mig.deletePath("type");
            },
        },
        {
            name: "set new package.json scripts",
            fn: async (mig) => {
                mig.assertScript(
                    "start:dev", "nodemon", new Error("Can't update start:dev script because it was modified"),
                );
                await mig.setScript("start:dev", "next dev");
            },
        },
        {
            name: "pnpm install",
            fn: async (mig) => {
                await mig.pnpm();
            },
        },
    ],
};

export { migrationsConfig, jsxMigration };

export type { VersionMigration };
