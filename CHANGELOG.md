All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [UNRELEASED]
(nothing yet)

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
