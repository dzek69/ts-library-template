import fs from "fs-extra";
import child from "child_process";
import path, { join } from "path";
import { get, set } from "bottom-line-utils";
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

type Data = Record<string, unknown>;

interface Options {
    targetDir: string;
    pkg: PackageJson;
}

type GetSetPath = string | string[];

type ContentsUpdater = (fileContents: string) => (Promise<string> | string);
type JSONContentsUpdater = (
    fileData: Data, setFn: (objPath: GetSetPath, value: unknown) => void
) => (Promise<Data | undefined> | Data | undefined);

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

    public async setPath(objPath: GetSetPath, value: unknown) {
        set(this._pkg, objPath, value);
        await this._savePkg();
    }

    public async setScript(scriptName: string, value: string) {
        await this.setPath(["scripts", scriptName], value);
    }

    public async deleteScript(scriptName: string) {
        // @TODO add and use deletePath
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete this._pkg.scripts[scriptName];
        await this._savePkg();
    }

    public async upgradeScript(scriptName: string, oldValue: string, newValue: string) {
        this.assertScript(
            scriptName,
            oldValue,
            new Error(
                "cannot update " + scriptName + " script as it was modified\n  "
                + "wanted new value:\n  `" + newValue + "`",
            ),
        );
        await this.setScript(scriptName, newValue);
    }

    public async addDependency(name: string, version: string) {
        await this.setPath(["dependencies", name], version);
    }

    public async addDevDependency(name: string, version: string) {
        await this.setPath(["devDependencies", name], version);
    }

    public async upgradeDependency(name: string, version: string, defaultType = "dependencies") {
        const type = this.findDependency(name) ?? defaultType;
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
    }

    public async remove(dirName: string) {
        await fs.remove(join(this._targetDir, dirName));
    }

    public async copy(sourceName: string, targetName: string | null = null) {
        await fs.copy(
            join(thisDir, sourceName),
            join(this._targetDir, targetName ?? sourceName),
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

    public async updateContentsJSON(file: string, updater: JSONContentsUpdater) {
        const target = join(this._targetDir, file);
        const data = JSON.parse(String(await fs.readFile(target))) as Data;
        const newData = await updater(data, set.bind(null, data));
        await fs.writeFile(target, JSON.stringify(newData ?? data, null, JSON_INDENT));
    }

    public assertPath(objPath: GetSetPath, value: unknown, error: Error) {
        if (get(this._pkg, objPath) !== value) {
            throw error;
        }
    }

    public assertScript(scriptName: string, value: string, error: Error) {
        this.assertPath(["scripts", scriptName], value, error);
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

    public yarn() {
        return run("yarn", [], {
            cwd: this._targetDir,
            shell: true,
        });
    }
}

export { Migration };
export type { PackageJson };
