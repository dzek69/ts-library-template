#!/usr/bin/env node

import path from "path";

import fs from "fs-extra";
import isEmptyDir from "empty-dir";

import type { PackageJson } from "./types";

import { dirname } from "./dirname/dirname.js";
import { Question } from "./Question.js";
import { getMigration, migrate, migrateJsx } from "./migrate.js";

const extractProjectName = (givenPath: string) => {
    if (givenPath === ".") {
        return path.basename(process.cwd());
    }
    if (path.isAbsolute(givenPath)) {
        return path.basename(givenPath);
    }
    return path.normalize(givenPath).replace(/\\/g, "/").split("/").filter(v => v !== "..").join("/");
};

const INDENT = 2;

interface CopyList { [key: string]: string }

const copyList: CopyList = {
    // target: source
    "package.json": "template/package.json",
    "LICENSE": "template/LICENSE",
    "README.md": "template/README.md",
    "CHANGELOG.md": "template/CHANGELOG.md",
    ".npmignore": "template/.REMOVE_THIS_npmignore",
    ".gitignore": "template/.REMOVE_THIS_gitignore",
    "build-scripts": "template/build-scripts",

    "test": "test",
    ".editorconfig": ".editorconfig",
    ".eslintrc.json": ".eslintrc.json",
    "babel.config.cjs": "babel.config.cjs",
    "jest.config.cjs": "jest.config.cjs",
    "nodemon.json": "nodemon.json",
    "tsconfig.cjs.json": "tsconfig.cjs.json",
    "tsconfig.lint.json": "tsconfig.lint.json",
    "tsconfig.json": "tsconfig.json",
    "pagesconfig.json": "pagesconfig.json",
    "typedoc.cjs": "typedoc.cjs",
    "tutorials/Test.md": "tutorials/Test.md",
};

(async () => { // eslint-disable-line max-statements
    const argsDir = process.argv[2] || ".";
    const argsJsx = (process.argv[3] === "--jsx") || false;
    const targetDir = path.resolve(argsDir);

    const thisDir = path.dirname(path.dirname(dirname));
    const thisPkg = JSON.parse(String(await fs.readFile(path.join(thisDir, "package.json")))) as PackageJson;

    console.info("Target dir:", targetDir);
    await fs.ensureDir(targetDir);
    const projectNameFromPath = extractProjectName(argsDir);

    const pkgPath = path.join(targetDir, "package.json");
    const isEmpty = await isEmptyDir(targetDir);
    if (!isEmpty) {
        await migrate(targetDir);
        if (argsJsx) {
            await migrateJsx(targetDir);
        }
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
    const jsxAnswer = argsJsx ? "y" : await q.ask("React library? [no]");
    const author = await q.ask("Author [NOT SET]");
    const defaultLicense = author || "NOT SET";
    const copy = await q.ask("Copyright (LICENSE), ie: My Name [" + defaultLicense + "]");
    q.close();

    const useJsx = jsxAnswer === "y" || jsxAnswer === "yes";

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
        jsx: false,
    };
    await fs.writeFile(pkgPath, JSON.stringify(targetPkg, null, INDENT));

    let lic;
    const licPath = path.join(targetDir, "LICENSE");
    const yr = new Date().getFullYear();
    lic = String(await fs.readFile(licPath));
    lic = lic.replace("(c)", `(c) ${yr} ${useCopy}`);
    await fs.writeFile(licPath, lic);

    await fs.ensureDir(path.join(targetDir, "src"));

    const mig = await getMigration(targetDir);

    if (repo) {
        await mig.run("git", ["init"]);
        await mig.run("git", ["remote", "add", "origin", repo]);
    }
    else {
        await mig.removeAnyDependency("husky");
        await mig.updatePath("husky", () => undefined);
    }

    if (useJsx) {
        await migrateJsx(targetDir);
        // includes yarn
    }
    else {
        await mig.yarn();
    }

    console.info("");
    console.info("Done");
})().catch((e: unknown) => {
    console.error("Error happened!");
    if (e instanceof Error) {
        console.error(e);
    }
    process.exit(1); // eslint-disable-line no-process-exit
});

type One = 1;
type StringifiedOne = `${One}`;

/**
 * Test function, just to test typedoc
 * @param {StringifiedOne} a - a value
 * @example testFn("test") // 'test.'
 */
const testFn = (a: StringifiedOne) => { return a + "."; };

export {
    testFn,
};
