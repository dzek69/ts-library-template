type Data = Record<string, unknown>;

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

export type {
    PackageJson,
};
