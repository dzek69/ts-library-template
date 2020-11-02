#!/usr/bin/env node

import fs from "fs-extra";
import path from "path";
import isEmptyDir from "empty-dir";
import { get } from "bottom-line-utils";
import { dirname } from "./dirname/dirname.js";

import Question from "./Question.js";

interface PackageJson {
    name: string;
    version: string;
    repository?: string;
    author?: string;
    libraryTemplate?: {
        version: string;
        language?: "typescript";
        fixDefaultForCommonJS?: boolean;
    };
}

const extractProjectName = (givenPath: string) => {
    if (givenPath === ".") {
        return path.basename(process.cwd());
    }
    if (path.isAbsolute(givenPath)) {
        return path.basename(givenPath);
    }
    return path.normalize(givenPath).replace(/\\/g, "/").split("/").filter(v => v !== "..").join("/");
};

const migrate = async (/* options: Record<string, never>*/) => {
    await new Promise(resolve => { setTimeout(resolve, 1); });
};

const INDENT = 2;

type CopyList = Record<string, string>;

const copyList: CopyList = {
    // target: source
    "package.json": "template/package.json",
    "LICENSE": "template/LICENSE",
    "README.md": "template/README.md",
    "CHANGELOG.md": "template/CHANGELOG.md",

    "build-scripts": "build-scripts",
    "test": "test",
    ".editorconfig": ".editorconfig",
    ".eslintrc.json": ".eslintrc.json",
    ".gitignore": ".gitignore",
    ".npmignore": ".npmignore",
    "babel.config.cjs": "babel.config.cjs",
    "jest.config.cjs": "jest.config.cjs",
    "nodemon.json": "nodemon.json",
    "tsconfig.cjs.json": "tsconfig.cjs.json",
    "tsconfig.lint.json": "tsconfig.lint.json",
    "tsconfig.json": "tsconfig.json",
};

(async () => { // eslint-disable-line max-statements
    const argsDir = process.argv[2] || ".";
    const targetDir = path.resolve(argsDir);

    const thisDir = path.dirname(path.dirname(dirname));
    const thisPkg = JSON.parse(String(await fs.readFile(path.join(thisDir, "package.json")))) as PackageJson;

    console.info("Target dir:", targetDir);
    await fs.ensureDir(targetDir);
    const projectNameFromPath = extractProjectName(argsDir);

    const pkgPath = path.join(targetDir, "package.json");
    const isEmpty = await isEmptyDir(targetDir);
    if (!isEmpty) {
        let pkg, lang, ver,
            rethrow = false;
        try {
            pkg = JSON.parse(String(await fs.readFile(pkgPath))) as PackageJson;
            ver = get(pkg, ["libraryTemplate", "version"]) as string | undefined;
            // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
            if (!ver) {
                throw new Error("No version");
            }

            lang = get(pkg, ["libraryTemplate", "language"]) as string | undefined;
            if (lang !== "typescript") {
                rethrow = true;
                throw new Error("Migration from js-library-template is currently not supported");
            }
        }
        catch (e: unknown) {
            if (rethrow) {
                throw e;
            }
            throw new Error("Target directory is not empty, no supported library found to upgrade.");
        }

        await migrate(
            // {
            // targetDir, pkg, ver, thisPkg,
            // }
        );
        return;
    }
    console.info("Creating new library");

    const copyProcess = Promise.all([Object.entries(copyList).map(async ([targetName, sourceName]) => {
        const target = path.join(targetDir, targetName);
        const source = path.join(thisDir, sourceName);
        await fs.copy(source, target);
    })]);

    await copyProcess;

    const q = new Question();
    const project = await q.ask("Project name? [" + projectNameFromPath + "]");
    const version = await q.ask("Version? [0.0.1]");
    const repo = await q.ask("Repository URL? [NOT SET]");
    const author = await q.ask("Author [NOT SET]");
    const defaultLicense = author || "NOT SET";
    const copy = await q.ask("Copyright (LICENSE), ie: My Name [" + defaultLicense + "]");
    q.close();

    const useCopy = copy || author;
    const useProjectName = project || projectNameFromPath;

    const targetPkg = JSON.parse(String(await fs.readFile(pkgPath))) as PackageJson;
    targetPkg.name = useProjectName;
    targetPkg.version = version || "0.0.1";
    if (repo) {
        targetPkg.repository = repo;
    }
    else {
        delete targetPkg.repository;
    }
    if (author) {
        targetPkg.author = author;
    }
    else {
        delete targetPkg.author;
    }
    targetPkg.libraryTemplate = {
        version: thisPkg.version,
        language: "typescript",
        fixDefaultForCommonJS: true,
    };
    await fs.writeFile(pkgPath, JSON.stringify(targetPkg, null, INDENT));

    let lic;
    const licPath = path.join(targetDir, "LICENSE");
    const yr = new Date().getFullYear();
    lic = String(await fs.readFile(licPath));
    lic = lic.replace("(c)", `(c) ${yr} ${useCopy}`);
    await fs.writeFile(licPath, lic);

    await fs.ensureDir(path.join(targetDir, "src"));

    console.info("");
    console.info("Done");
})().catch((e: unknown) => {
    console.error("Error happened!");
    if (e instanceof Error) {
        console.error(e);
    }
    process.exit(1); // eslint-disable-line no-process-exit
});

export {};
