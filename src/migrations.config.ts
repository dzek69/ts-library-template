/* eslint-disable max-lines */
import path from "path";

import { makeArray } from "bottom-line-utils";
import fs from "fs-extra";

import type { Migration } from "./Migration";
import type { PagesConfigJson, EslintRc, TSConfigJson, NewPagesConfigJson } from "./types";

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
    aggresive?: string;
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
                                data.extends = makeArray(data.extends);
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
                                data.extends = makeArray(data.extends);
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
                        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
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
];

const jsxMigration: JSXVersionMigration = {
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
            name: "add next",
            fn: async (mig) => {
                await mig.addDevDependency("next", "^11.1.0");
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
                await mig.addDevDependency("@types/react", "^17.0.4");
                await mig.addDevDependency("@types/react-dom", "^17.0.3");
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
                await mig.remove("babel.config.cjs");

                await mig.addDevDependency("babel-plugin-module-resolver", "^4.1.0");
                await mig.copy("template/jsx/babel.config.js", "babel.config.js");

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
            name: "add eslint config for react",
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
                            data.extends = makeArray(data.extends);
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
};

export { migrationsConfig, jsxMigration };

export type { VersionMigration };
