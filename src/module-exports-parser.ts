import json5 from "json5";

const parse = <T>(source: string) => {
    let s = source;

    s = s.trim();
    if (s.endsWith(";")) {
        // eslint-disable-next-line @typescript-eslint/no-magic-numbers
        s = s.slice(0, -1);
    }

    if (/^module\.exports *=/u.test(s)) {
        const equal = s.indexOf("=");
        s = s.slice(equal + 1);
        s = s.trim();
    }

    return json5.parse<T>(s);
};

// eslint-disable-next-line @typescript-eslint/no-magic-numbers
const stringify = <T>(o: T, indent = 2) => {
    return "module.exports = " + JSON.stringify(o, null, indent) + ";\n";
};

export {
    parse, stringify,
};
