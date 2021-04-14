import type { Migration } from "./Migration";

interface MigrationStep {
    name: string;
    fn: (mig: Migration) => Promise<void>;
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
];

export { migrationsConfig };

export type { VersionMigration };
