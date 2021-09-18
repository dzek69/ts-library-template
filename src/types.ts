import type { Linter } from "eslint";

interface Data { [key: string]: unknown }

interface PackageJson extends Record<string, unknown> {
    name: string;
    version: string;
    repository?: string;
    author?: string;
    libraryTemplate?: {
        version: string;
        language?: "typescript";
        fixDefaultForCommonJS?: boolean;
        jsx?: boolean;
    };
    dependencies?: Data;
    devDependencies?: Data;
    scripts: Data;
}

interface PagesConfigJson {
    groups?: {
        title: string;
        pages: {
            title: string;
            source: string;
        }[];
    }[];
}

type EslintRc = Linter.BaseConfig;

export type {
    PackageJson,
    PagesConfigJson,
    EslintRc,
};
