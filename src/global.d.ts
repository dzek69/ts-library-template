declare module "bottom-line-utils" {
    function get(obj: unknown, path: string | string[]): unknown;

    export {
        get,
    };
}
