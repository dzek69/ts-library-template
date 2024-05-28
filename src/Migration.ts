/* eslint-disable max-lines */
import child from "child_process";
import path, { join } from "path";

import fs from "fs-extra";
import { get, set, sortProps } from "@ezez/utils";
import semver from "semver";

import type { SpawnOptionsWithoutStdio } from "child_process";
import type { PackageJson, TSConfigJson } from "./types.js";

import { dirname } from "./dirname/dirname.js";

const thisDir = path.dirname(path.dirname(dirname));

const run = async (command: string, args: (string)[], options: SpawnOptionsWithoutStdio) => {
    return new Promise<void>((resolve, reject) => {
        const proc = child.spawn(command, args, options);
        proc.stdout.on("data", (data) => {
            console.info(String(data).trim());
        });

        proc.stderr.on("data", (data) => {
            console.info(String(data).trim());
        });

        proc.on("error", (error) => {
            reject(error);
        });

        proc.on("close", (code) => {
            if (!code) {
                resolve();
                return;
            }
            reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
        });
    });
};

const PKG_JSON_INDENT = 2;
const JSON_INDENT = 4;

interface Data { [key: string]: unknown }

interface Options {
    targetDir: string;
    pkg: PackageJson;
}

type GetSetPath = string | string[];

type MaybePromise<T> = T | Promise<T>;

type ContentsUpdater = (fileContents: string) => (MaybePromise<string | undefined>);
type JSONContentsUpdater<Src = Data, Target = Src> = (
    fileData: Src, setFn: (objPath: GetSetPath, value: unknown) => void
) => (Promise<Target | undefined> | Target | undefined);

type Dep = "dependencies" | "devDependencies";

class Migration {
    private readonly _targetDir: string;

    private readonly _pkg: PackageJson;

    public constructor(opts: Options) {
        this._targetDir = opts.targetDir;
        this._pkg = opts.pkg;
    }

    private _savePkg() {
        return fs.writeFile(
            join(this._targetDir, "package.json"),
            JSON.stringify(this._pkg, null, PKG_JSON_INDENT),
        );
    }

    public get jsx() {
        return Boolean(this._pkg.libraryTemplate!.jsx);
    }

    public get targetDir() {
        return this._targetDir;
    }

    public get pkg() {
        return this._pkg;
    }

    public async updatePkg(fn: (pkg: PackageJson) => unknown) {
        await fn(this._pkg);
        return this._savePkg();
    }

    public async setPath(objPath: GetSetPath, value: boolean | string | undefined | number | null) {
        set(this._pkg, objPath, value);
        await this._savePkg();
    }

    public async setScript(scriptName: string, value: string | undefined) {
        await this.setPath(["scripts", scriptName], value);
    }

    public async deletePath(objPath: GetSetPath) {
        const thePath = typeof objPath === "string" ? objPath.split(".") : [...objPath];
        const last = thePath.pop();

        const item = get(this._pkg, thePath);
        if (item == null || !last) {
            return;
        }

        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete (item as { [key: string]: unknown })[last];
        await this._savePkg();
    }

    public async deleteScript(scriptName: string) {
        await this.deletePath(["scripts", scriptName]);
    }

    public async upgradeScript(
        scriptName: string, oldValue: string, newValue: string, skipIfOldValueDifferent = false,
    ) {
        try {
            this.assertScript(
                scriptName,
                oldValue,
                new Error(
                    "cannot update " + scriptName + " script as it was modified\n  "
                    + "wanted new value:\n  `" + newValue + "`",
                ),
            );
        }
        catch (e: unknown) {
            if (skipIfOldValueDifferent) {
                return;
            }
            throw e as Error;
        }
        await this.setScript(scriptName, newValue);
    }

    // eslint-disable-next-line @typescript-eslint/no-shadow
    public async addDependency(name: string, version: string) {
        await this.setPath(["dependencies", name], version);
    }

    // eslint-disable-next-line @typescript-eslint/no-shadow
    public async addDevDependency(name: string, version: string) {
        await this.setPath(["devDependencies", name], version);
    }

    // eslint-disable-next-line @typescript-eslint/no-shadow
    public async upgradeDependency(name: string, version: string, defaultType: Dep = "dependencies") {
        const type = this.findDependency(name) ?? defaultType;
        await this.setPath([type, name], version);
    }

    /**
     * Safely upgrades any dependency.
     * It checks if given dependency is installed and if it is not higher than given version.
     * @param name - package name
     * @param version - target version
     */
    public async safelyUpgradeDependency(name: string, version: string) { // eslint-disable-line @typescript-eslint/no-shadow
        const type = this.findDependency(name);
        if (!type) {
            throw new Error(`Cannot upgrade ${name}, because it is not installed`);
        }
        const depVersion = this._pkg[type]?.[name] as string;
        const minVersion = semver.minVersion(depVersion);
        if (!minVersion) {
            throw new TypeError(`Cannot parse current version of ${name}`);
        }
        const minNewVersion = semver.minVersion(version);
        if (!minNewVersion) {
            throw new TypeError(`Cannot parse next version of ${name}`);
        }
        if (semver.lt(minNewVersion, minVersion)) {
            throw new Error(
                `Currently installed version of ${name} ${minVersion.version} is higher than ${minNewVersion.version}`,
            );
        }
        await this.setPath([type, name], version);
    }

    /**
     * Detects if given dependency is a dependency or devDependency or not present
     * @param name
     */
    public findDependency(name: string) { // eslint-disable-line @typescript-eslint/no-shadow
        const deps = this._pkg.dependencies ?? {};
        const dev = this._pkg.devDependencies ?? {};
        if (deps[name]) {
            return "dependencies";
        }
        if (dev[name]) {
            return "devDependencies";
        }
        return null;
    }

    public async sortPackageJson() {
        await this.updatePkg((pkg) => {
            // eslint-disable-next-line no-param-reassign
            pkg.dependencies = sortProps(pkg.dependencies ?? {});
            // eslint-disable-next-line no-param-reassign
            pkg.devDependencies = sortProps(pkg.devDependencies ?? {});
            return pkg;
        });
    }

    public async sortTSConfigCompilerOptions(configFilePath: string) {
        await this.updateContentsJSON<TSConfigJson>(configFilePath, (data) => {
            // eslint-disable-next-line no-param-reassign
            data.compilerOptions = sortProps(data.compilerOptions ?? {});
            return data;
        });
    }

    /**
     * Removes file/dir within created library
     */
    public async remove(pathName: string) {
        await fs.remove(join(this._targetDir, pathName));
    }

    /**
     * Checks if given folder is empty within created library
     */
    public async isDirEmpty(dirName: string) {
        const dir = join(this._targetDir, dirName);
        const files = await fs.readdir(dir);
        return !files.filter(p => p !== "." && p !== "..").length;
    }

    public async assertNoFile(fileName: string, error?: Error) {
        const target = join(this._targetDir, fileName);
        if (await fs.pathExists(target)) {
            throw error ?? new Error(`File ${fileName} exists`);
        }
    }

    /**
     * Asserts file existence within created library
     */
    public async assertFile(fileName: string) {
        const target = join(this._targetDir, fileName);
        if (!(await fs.pathExists(target))) {
            throw new Error(`File ${fileName} does not exist`);
        }
    }

    /**
     * Moves files within created library
     */
    public async moveWithinLibrary(sourceName: string, targetName: string | null = null, overwrite = true) {
        await fs.move(
            join(this._targetDir, sourceName),
            join(this._targetDir, targetName ?? sourceName),
            { overwrite },
        );
    }

    /**
     * Copies file from ts-library-template to created library
     */
    public async copy(sourceName: string, targetName: string | null = null, overwrite = true) {
        await fs.copy(
            join(thisDir, sourceName),
            join(this._targetDir, targetName ?? sourceName),
            { overwrite },
        );
    }

    /**
     * Renames files within the created library
     */
    public async rename(source: string, target: string) {
        await fs.rename(join(this._targetDir, source), join(this._targetDir, target));
    }

    /**
     * Deletes a file/folder within the created library
     * If the file does not exist it silently ignores it
     */
    public async delete(file: string) {
        await fs.remove(join(this._targetDir, file));
    }

    public async updateContents(file: string, updater: ContentsUpdater) {
        const target = join(this._targetDir, file);
        const data = String(await fs.readFile(target));
        const contents = await updater(data);
        await fs.writeFile(target, contents ?? "");
    }

    public async getContents(file: string) {
        const target = join(this._targetDir, file);
        return String(await fs.readFile(target));
    }

    public async pushLine(file: string, line: string) {
        const target = join(this._targetDir, file);
        const data = String(await fs.readFile(target));
        const lines = data.split("\n");
        const hasLine = lines.map(s => s.trim()).find(s => s === line);
        if (hasLine) {
            return;
        }
        lines.push(line);
        await fs.writeFile(target, lines.join("\n"));
    }

    public async replaceLine(file: string, line: string, withLine: string) {
        const target = join(this._targetDir, file);
        const data = String(await fs.readFile(target));
        const lines = data.split("\n");
        let replaced = false;

        const newLines = lines.map(s => {
            const trimmed = s.trim();
            if (trimmed === line) {
                replaced = true;
                return withLine;
            }
            return s;
        });

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (!replaced) {
            return;
        }
        await fs.writeFile(target, newLines.join("\n"));
    }

    /**
     * Removes line from file. It trims lines and value before comparing.
     */
    public async removeLine(file: string, line: string) {
        const target = join(this._targetDir, file);
        const data = String(await fs.readFile(target));
        const lines = data.split("\n");

        const newLines = lines.filter(s => s.trim() !== line.trim());
        await fs.writeFile(target, newLines.join("\n"));
    }

    public async updateContentsJSON<Src = Data, Target = Src>(file: string, updater: JSONContentsUpdater<Src, Target>) {
        const target = join(this._targetDir, file);
        const data = JSON.parse(String(await fs.readFile(target))) as Src;
        const newData = await updater(
            data,
            // @ts-expect-error `set` needs better typings
            set.bind(null, data),
        );
        await fs.writeFile(target, JSON.stringify(newData ?? data, null, JSON_INDENT));
    }

    public async getContentsJSON<Src = Data>(file: string) {
        const target = join(this._targetDir, file);
        return JSON.parse(String(await fs.readFile(target))) as Src;
    }

    /**
     * Updates package.json contents at given path
     * @param objPath - path to object within package.json
     * @param updater - updater function
     */
    public async updatePath(objPath: GetSetPath, updater: ContentsUpdater) {
        const current = get(this._pkg, objPath);
        const newValue = await updater(String(current));
        await this.setPath(objPath, newValue);
    }

    public assertPath(objPath: GetSetPath, value: unknown, error: Error) {
        if (get(this._pkg, objPath) !== value) {
            throw error;
        }
    }

    public assertNoPath(objPath: GetSetPath, error: Error) {
        if (get(this._pkg, objPath) !== undefined) {
            throw error;
        }
    }

    public assertScript(scriptName: string, value: string, error: Error) {
        this.assertPath(["scripts", scriptName], value, error);
    }

    public assertNoScript(scriptName: string, error: Error) {
        this.assertNoPath(["scripts", scriptName], error);
    }

    public assertNoDependency(name: string, error: Error) { // eslint-disable-line @typescript-eslint/no-shadow
        if (this._pkg.dependencies && name in this._pkg.dependencies) {
            throw error;
        }
    }

    public assertNoDevDependency(name: string, error: Error) { // eslint-disable-line @typescript-eslint/no-shadow
        if (this._pkg.devDependencies && name in this._pkg.devDependencies) {
            throw error;
        }
    }

    public assertNoAnyDependency(name: string, error: Error) { // eslint-disable-line @typescript-eslint/no-shadow
        this.assertNoDependency(name, error);
        this.assertNoDevDependency(name, error);
    }

    public assertDevDependency(name: string, version: string | null, error: Error) { // eslint-disable-line @typescript-eslint/no-shadow
        if (
            !this._pkg.devDependencies
            || (
                (version && this._pkg.devDependencies[name] !== version)
                || (!version && !this._pkg.devDependencies[name])
            )
        ) {
            throw error;
        }
    }

    public async removeDependency(name: string) { // eslint-disable-line @typescript-eslint/no-shadow
        await this.deletePath(["dependencies", name]);
    }

    public async removeDevDependency(name: string) { // eslint-disable-line @typescript-eslint/no-shadow
        await this.deletePath(["devDependencies", name]);
    }

    public async removeAnyDependency(name: string) { // eslint-disable-line @typescript-eslint/no-shadow
        const depType = this.findDependency(name);
        if (!depType) { return; }
        await this.deletePath([depType, name]);
    }

    /**
     * Runs `yarn` within created library
     * @deprecated Use `pnpm` instead
     */
    public yarn() {
        return this.run("yarn");
    }

    /**
     * Runs `pnpm i` within created library
     */
    public pnpm() {
        return this.run("pnpm", ["i"]);
    }

    /**
     * Runs given application within created library
     */
    public run(applicationPath: string, args: string[] = []) {
        return run(applicationPath, args, {
            cwd: this._targetDir,
            shell: true,
        });
    }
}

export { Migration };
export type { PackageJson };
