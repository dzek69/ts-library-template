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
    scripts: Record<string, string>;
    exports?: Record<string, Record<string, string>>;
    husky?: Record<string, unknown>;
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

interface NewPagesConfigPage {
    title: string;
    source: string;
    children?: NewPagesConfigPage[];
}

interface NewPagesConfigJson {
    pages: NewPagesConfigPage[];
    source?: string;
}

interface TSConfigJson {
    "include"?: string[];
    "compilerOptions"?: {
        [key: string]: unknown;
        noImplicitOverride?: boolean;
        jsx?: string;
    };
    "ts-node"?: object;
}

interface JestConfig {
    collectCoverageFrom?: string[];
    setupFiles?: string[];
    moduleNameMapper?: Record<string, string>;
    transform?: Record<string, string | [string, Record<string, string>]>;
    testEnvironmentOptions?: Record<string, string>;
    testURL?: string;
}

type EslintRc = Linter.BaseConfig & {
    settings?: {
        react: {
            createClass?: string;
            pragma?: string;
            version?: string;
            flowVersion?: string;
        };
    };
};

export type {
    PackageJson,
    PagesConfigJson,
    NewPagesConfigJson,
    TSConfigJson,
    JestConfig,
    EslintRc,
};
