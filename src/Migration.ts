/* eslint-disable max-lines */
import child from "child_process";
import path, { join } from "path";

import fs from "fs-extra";
import { get, set } from "bottom-line-utils";
import semver from "semver";

import type { SpawnOptionsWithoutStdio } from "child_process";
import type { PackageJson } from "./types.js";

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

type ContentsUpdater = (fileContents: string) => (Promise<string> | string);
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

    public async setPath(objPath: GetSetPath, value: unknown) {
        set(this._pkg, objPath, value);
        await this._savePkg();
    }

    public async setScript(scriptName: string, value: string) {
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

    public async addDependency(name: string, version: string) {
        await this.setPath(["dependencies", name], version);
    }

    public async addDevDependency(name: string, version: string) {
        await this.setPath(["devDependencies", name], version);
    }

    public async upgradeDependency(name: string, version: string, defaultType: Dep = "dependencies") {
        const type = this.findDependency(name) ?? defaultType;
        await this.setPath([type, name], version);
    }

    public async safelyUpgradeDependency(name: string, version: string) {
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
        if (!semver.gt(minNewVersion, minVersion)) {
            throw new Error(
                `Currently installed version of ${name} ${minVersion.version} is higher than ${minNewVersion.version}`,
            );
        }
        await this.setPath([type, name], version);
    }

    public findDependency(name: string) {
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

    public async remove(dirName: string) {
        await fs.remove(join(this._targetDir, dirName));
    }

    public async copy(sourceName: string, targetName: string | null = null, overwrite = true) {
        await fs.copy(
            join(thisDir, sourceName),
            join(this._targetDir, targetName ?? sourceName),
            { overwrite },
        );
    }

    public async rename(source: string, target: string) {
        await fs.rename(join(this._targetDir, source), join(this._targetDir, target));
    }

    public async updateContents(file: string, updater: ContentsUpdater) {
        const target = join(this._targetDir, file);
        const data = String(await fs.readFile(target));
        const contents = await updater(data);
        await fs.writeFile(target, contents);
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

    public async updatePath(objPath: GetSetPath, updater: ContentsUpdater) {
        const current = get(this._pkg, objPath);
        const newValue = updater(String(current));
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

    public assertNoDependency(name: string, error: Error) {
        if (this._pkg.dependencies && name in this._pkg.dependencies) {
            throw error;
        }
    }

    public assertNoDevDependency(name: string, error: Error) {
        if (this._pkg.devDependencies && name in this._pkg.devDependencies) {
            throw error;
        }
    }

    public assertNoAnyDependency(name: string, error: Error) {
        this.assertNoDependency(name, error);
        this.assertNoDevDependency(name, error);
    }

    public assertDevDependency(name: string, version: string | null, error: Error) {
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

    public async removeDependency(name: string) {
        await this.deletePath(["dependencies", name]);
    }

    public async removeDevDependency(name: string) {
        await this.deletePath(["devDependencies", name]);
    }

    public async removeAnyDependency(name: string) {
        const depType = this.findDependency(name);
        if (!depType) { return; }
        await this.deletePath([depType, name]);
    }

    public yarn() {
        return run("yarn", [], {
            cwd: this._targetDir,
            shell: true,
        });
    }
}

export { Migration };
export type { PackageJson };
