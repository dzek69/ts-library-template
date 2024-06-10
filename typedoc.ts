import { readFile, writeFile, mkdtemp, copyFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

import type { TypeDocOptionMap } from "typedoc/dist/lib/utils/options/declaration";

import * as pagesConfig from "./pagesconfig.json" with { type: "json" };

type Page = {
    title: string;
    source?: string; // no source means it's a directory
    childrenDir?: string;
    childrenOutputDir?: string;
    childrenSourceDir?: string;
    moduleRoot?: boolean;
    output?: string;
    children?: Page[];
};

type PagesConfig = {
    source?: string;
    pages?: Page[];
};

const config = (pagesConfig as unknown as { default: PagesConfig }).default;

const tutorials: string[] = [];

type ConvertOptions = {
    parent: string;
    pages: Page[];
    root?: string | undefined;
};

const tempDir = await mkdtemp(join(tmpdir(), "ts-library-template-"));

const shouldPathUseRoot = (path: string) => !path.startsWith("./") && !path.startsWith("../") && !path.startsWith("/");

const generateTitle = (title: string, group?: string) => {
    const tit = title.replace(/"/gu, `\\"`);
    const sub = (group ?? "").replace(/"/gu, `\\"`);
    const finalTitle = [sub, tit].filter(Boolean).join("/");
    return `---
title: ${finalTitle}
---
`; // leave the ending new line
};

let i = 0;
// eslint-disable-next-line @typescript-eslint/no-shadow
const convertPages = async ({ pages, parent, root }: ConvertOptions) => {
    for (const page of pages) {
        if (page.source) {
            const fullPath = shouldPathUseRoot(page.source) ? join(root ?? "", page.source) : page.source;
            const tempPath = join(tempDir, `${i++}.md`);
            tutorials.push(tempPath);
            await copyFile(fullPath, tempPath);

            await writeFile(tempPath, generateTitle(page.title, parent) + await readFile(fullPath, "utf-8"));
        }
        if (page.children) {
            await convertPages({
                pages: page.children,
                parent: parent ? parent + "/" + page.title : page.title,
                root: page.moduleRoot ? join(root ?? "", page.childrenSourceDir ?? "") : root,
            });
        }
    }
};

if (config.pages?.length) {
    const root = config.source;
    await convertPages({ pages: config.pages, parent: "", root: root });
}

console.info({
    tutorials,
    tempDir,
});

export default {
    projectDocuments: tutorials,
    sortEntryPoints: false,
} satisfies Partial<TypeDocOptionMap>;
