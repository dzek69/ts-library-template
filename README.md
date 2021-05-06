A template for writing next awesome TypeScript library/project.

## The idea

The idea behind this project is to provide a ready-to-use base for writing a library or end project in TypeScript, with
all the tools needed without days wasted on Googling random error messages produces by TS/JS ecosystem hell.

See also JS-only, previous project: [js-library-template][1]. This project should replace it.

## Usage

Install `ts-library-template` globally.

### Create new library:
- `tslib <dirname>` and answer some questions to create your project.

### Upgrade library after upgrading `ts-library-template`:
- `tslib <dirname>` and maybe accept upgrade if needed.

Upgrades are not always fully compatible, especially if you change some configuration, everything should be however easy
to fix.

### Upgrade existing non-React library to React library:
- `tslib <dirname> --jsx`

### License

MIT

[1]: https://www.npmjs.com/package/js-library-template
