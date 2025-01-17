All notable changes to this project will be documented in this file.

The format is based on [EZEZ Changelog](https://ezez.dev/changelog/)
and this project does not adhere to [Semantic Versioning](http://semver.org/spec/v2.0.0.html) - it's hard to determine
what is an addition and what is a fix.
Totally breaking changes will bump major version though.

## [UNRELEASED]
(nothing yet)

## [3.14.0] - 2025-01-17
### Fixed
- self: regression: crashing one step when upgrading to 3.9.0 (happens on 3.13.0 only)
- self: upgrading from 3.11.0 to 3.11.2 crashing on upgrading scripts
- lib: ts-node crashing, because some esm compatibility error
- lib: jest config, crashing on modules ending with `js`
### Changed
- lib: @ezez/eslint version bump, removes requirement for installing `eslint` manually
- lib: deps update
- self: make errors more visible with emoji on error
- parse all json files with json5, to avoid crashing, stringify with just JSON
### Dev
- self: deps update

## [3.13.0] - 2024-06-10
### Changed
- lib: CHANGELOG mentioned format updated to EZEZ Changelog
- lib: eslint rules bump
- lib: typedoc version upgrade
- lib: babel update
- self: deps update
- self: add audit before publishing
### Fixed
- lib: remove react eslint leftovers on jsx projects
- lib: added some unnecessary files to `.npmignore`

## [3.12.0] - 2024-05-28
### Fixed
- lib: backwards fixed upgrade script from 3.8.0: git initializing when already inside a git root
- lib: audit script
### Changed
- lib: eslint configuration now uses `@ezez/eslint` single package with zero config setup
- lib: deps update
### Dev
- self: deps update

## [3.11.2] - 2023-09-19
### Fixed
- lib: upgrade path of 3.11.0 - should pnpm import before install
- lib: scripts using yarn instead of pnpm
### Changed
- lib: deps update
- self: deps update

## [3.11.1] - 2023-07-08
### Changed
- lib: deps update
- lib: jest config update so it doesnt contain deprecated options
- self: deps update
### Fixed
- lib: issues with babel config file introduced in 3.11.0
- lib: resolve-tspaths crashing when paths empty

## [3.11.0] - 2023-07-06
### Added
- lib: resolve ts paths in files - dir and extensionless imports are now safe (but blocked by eslint)
### Changed
- lib: tsconfig files now includes .esm version always
- lib: make tsconfig.json a common file to extend from
- lib: replaced yarn with pnpm
### Fixed
- lib: `prepare` script invalid when not having a git repo
- lib: babel config filename different on jsx and non-jsx libs, name is unified now
- lib: invalid npm ignore for babel config
- lib: removed flow version setting from eslint in jsx, causing pile of warnings on eslint

## [3.10.0] - 2023-06-03
### Changed
- lib: bumped some dependencies
- lib: added `noUncheckedIndexedAccess` to `tsconfig`
- lib: from now on tsconfig compilerOptions and package.json deps will be sorted with each upgrade

## [3.9.1] - 2023-04-14
### Fixed
- lib: `@knodes/typedoc-plugin-pages` invalid version after upgrading to 3.9.0
- lib: missing yarn for 3.9.0

## [3.9.0] - 2023-04-14
### Changed
- lib: dependencies bump
### Fixed
- self: small type issue in `updateContents` function

## [3.8.0] - 2023-02-19
### Added
- lib: git init when project has a repo defined
### Changed
- lib: husky is removed if not a repo
- lib: yarn install on initialize
### Fixed
- lib: prettier files copied into `template` folder when upgrading to 3.7.0
- self: `updatePath` could fail if used with async functions
### Dev
- self: added some docs to migration functions
- self: added a function to get migrator to perform manual tasks outside actual migration
- self: `setPath` is type-safer now

## [3.7.1] - 2023-02-09
### Fixed
- lib: breaking ability to import libraries because `types` added into `exports` in `3.7.0` as last property

## [3.7.0] - 2023-02-06
### Fixed
- `docs` script and `updates:*` scripts were outdated/missing if project was **created** with 3.6.0 version
### Changed
- lib: updated `typescript`
- `types` are added into `exports` list
### Added
- empty prettier install

## [3.6.0] - 2022-09-28
### Added
- lib: added `updates` scripts for easy checking what packages can be updated
- self: `safelyUpgradeDependency` function for easier version bumps
### Changed
- lib: updated a lot of libs
- lib: updated `docs` script

## [3.5.3] - 2022-09-26
### Changed
- lib: upgrade `ts-node`
- lib: upgrade `husky`
### Fixed
- lib: husky not installed properly

## [3.5.2] - 2022-08-21
### Fixed
- lib: newly created libraries had broken `docs` script since 3.5.0

## [3.5.1] - 2022-07-25
### Fixed
- self: missing `.pagesconfig` in npm package, preventing new lib from being created

## [3.5.0] - 2022-07-21
### Fixed
- lib: incorrect babel config file name in `.npmignore`
- lib: added `next-env` to `tsconfig`
### Changed
- lib: added `next-env` to `.npmignore`
- lib: added `pagesconfig.json` to `.npmignore`
- lib: added `.next` folder to npm & git ignore
- lib: added `demo` & `pages` folders to npm ignore for `esm` and `dist` folders
- lib: upgrade `eslint`
- lib: upgrade `nodemon`
- lib: upgrade `typedoc`
- lib: upgrade `typescript`
### Dev
- self: lint & deps upgrade
### Added
- lib: add eslint import plugin and rules

## [3.4.1] - 2022-02-13
### Fixed
- lib: audit issues - bump husky, jest, nodemon, typedoc
- self: audit issues - bump husky, jest, nodemon, typedoc

## [3.4.0] - 2021-09-18
### Added
- lib: eslint rules for React
### Changed
- lib: better support for React - using `next` for dev server instead of `parcel`

## [3.3.2] - 2021-08-18
### Changed
- lib: bump `eslint` & config

## [3.3.1] - 2021-07-04
### Changed
- lib: bumped `typedoc-plugin-pages-fork-fork` which fixes some bugs

## [3.3.0] - 2021-07-04
### Fixed
- lib: bug breaking `docs` script on 3.2.0 update
### Added
- self: migration update path based on prev value
- lib: `yarn audit` on prepublishOnly

## [3.2.0] - 2021-07-01
### Added
- lib: pages plugin for typedoc
- lib: `@types/jest`
### Changed
- lib: bump `@dzek69/eslint-config-typescript`, `jest`, `typedoc`
- self: migration copy without overwrite
- self: some typings improvements

## [3.1.1] - 2021-05-18
### Added
- lib: `start:dev:compatibility` restored, it is actually needed, even with `@types/`
- self: `husky` prepush hook
### Changed
- lib: bump `@dzek69/eslint-config-typescript`

## [3.1.0] - 2021-05-06
### Added
- self: React libraries creating support
- self: upgrading library to React type
### Changed
- lib: added `root: true` to eslint config file to prevent possible issues
### Removed
- lib: `start:dev:compatibility` as it is not needed, use `@types/` dir in your src instead
### Fixed
- self: library not working for creating new lib due to a missing file

## [3.0.3] - 2021-04-30
### Changed
- self: aggressive changes list should start with bullet point
- lib: tsconfig overwrite-update, set `lib` field because some build ins are unavailable without them
- lib: tsconfig update, uncommented everything, set all extra options to null
- lib: tsconfig `noUnusedLocals` & `noUnusedParameters` should be false in all files
- lib: tsconfig is now standard json to help with future safer updates
- lib: added `.eslintrc.json` to `.npmignore`
### Fixed
- lib: added missing `compile.cjs.after.mjs` code which fixes cjs output code use
- lib: added `babel-plugin-module-extension` dependency, which is required after updating one the deep deps

## [3.0.2] - 2021-04-14
### Changed
- updated typedoc and typescript

## [3.0.1] - 2021-02-26
### Changed
- updated eslint config
### Fixed
- build script failing

## [3.0.0] - 2021-02-19
### Added
- migrations support
- linting
- docs
### Fixed
- esm code output

## [0.0.2-beta.5 and earlier] - 2021-02-19
### Added
- first version
- migrations support
