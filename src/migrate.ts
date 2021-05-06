import path from "path";
import * as brokenSemver from "semver";
import { get, last } from "bottom-line-utils";
import fs from "fs-extra";

import type { VersionMigration } from "./migrations.config.js";
import type { PackageJson } from "./Migration.js";

import { jsxMigration, migrationsConfig } from "./migrations.config.js";
import { Migration } from "./Migration.js";
import Question from "./Question.js";

interface ApplyOptions {
    migration: Migration;
    migrations: VersionMigration[];
    updateVersion: boolean;
}

const semver = {
    // @ts-expect-error Semver has broken exports
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition,@typescript-eslint/no-unsafe-member-access
    gte: (brokenSemver.gte || brokenSemver.default.gte),
};

// eslint-disable-next-line max-statements
const applyMigrations = async ({ migration, migrations, updateVersion }: ApplyOptions) => {
    let skipped = 0;

    const err = (e: Error) => {
        skipped++;
        console.warn("✖", e.message);
    };

    for (let i = 0; i < migrations.length; i++) {
        const migrationConfig = migrations[i];

        console.info(`Upgrading [${migrationConfig.version} -> ${migrationConfig.nextVersion}]`);
        for (let j = 0; j < migrationConfig.steps.length; j++) {
            const step = migrationConfig.steps[j];
            if ("jsx" in step && step.jsx !== migration.jsx) {
                continue;
            }
            console.info();
            console.info(`- ${step.name}`);
            await step.fn(migration).then(
                () => { console.warn("✔ ok"); },
                err,
            );
        }
    }
    const migCfg = last(migrations);
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (migCfg && updateVersion) {
        await migration.setPath("libraryTemplate.version", migCfg.nextVersion);
    }

    return skipped;
};

const aggressiveMessage = async (migrations: VersionMigration[]) => {
    const aggressive = migrations.map(m => m.aggresive).filter(Boolean) as string[];
    if (!aggressive.length) {
        return true;
    }
    console.info("");
    console.info("WARNING: Aggressive upgrade detected!");
    console.info(
        "Aggressive upgrade means that customizations applied over previously-generated library may be lost "
            + "or that library won't work after upgrading without further changes to the code. Please verify this list "
            + "of POTENTIAL POSSIBLE issues and accept the upgrade progress:",
    );
    console.info(aggressive.map(a => "- " + a.trim()).join("\n"));
    console.info("");

    const q = new Question();
    const accept = await q.ask("Do you want to continue? (y/n) [n]");
    q.close();

    return accept.startsWith("y");
};

const prepareMigrate = async (targetDir: string) => {
    let pkg, lang, ver,
        rethrow = false;

    const pkgPath = path.join(targetDir, "package.json");

    try {
        pkg = JSON.parse(String(await fs.readFile(pkgPath))) as PackageJson;
        ver = get(pkg, ["libraryTemplate", "version"]) as string | undefined;
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

    return {
        pkg, ver,
    };
};

const migrate = async (targetDir: string) => { // eslint-disable-line max-statements
    const { pkg, ver } = await prepareMigrate(targetDir);

    const migration = new Migration({ targetDir, pkg });
    const migrations = migrationsConfig.filter(migrationConfig => {
        return semver.gte(migrationConfig.version, ver);
    });

    const versions = migrations.map(m => m.nextVersion);
    const cont = await aggressiveMessage(migrations);
    if (!cont) {
        console.info("Upgrade stopped.");
        return;
    }

    if (!migrations.length) {
        console.info("The project is up to date with current ts-library-template.");
        return;
    }
    console.info(`${migrations.length} updates to apply, versions: ${versions.join(", ")}`);

    const updateVersion = true;
    const skipped = await applyMigrations({ migration, migrations, updateVersion });

    console.info();
    if (skipped) {
        console.info(`Skipped ${skipped} upgrades. Please perform them manually if needed.`);
    }
    console.info("Upgrading finished.");
};

const migrateJsx = async (targetDir: string) => {
    const { pkg } = await prepareMigrate(targetDir);
    if (pkg.libraryTemplate!.jsx) {
        // do not need migration from non-jsx to jsx
        return;
    }

    const migration = new Migration({ targetDir, pkg });
    const migrations = [jsxMigration];

    const updateVersion = false;
    const skipped = await applyMigrations({ migration, migrations, updateVersion });
    console.info();
    if (skipped) {
        console.info(`Skipped ${skipped} upgrades. Please perform them manually if needed.`);
    }

    console.info("Upgrading finished.");
};

export { migrate, migrateJsx };
