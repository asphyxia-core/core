## v1.19

- **WebUI**: Query shell is now avaliable for all installed plugins even if there are no DB data of them
- **WebUI**: Fixed a issue where the WebUI of plugins with uppercase letter cannot be accessed
- **WebUI**: Custom WebUI pages now works without `//DATA//` section.
- **API**: Fixed a typechecking issue where `{ exists: true }` query is only allowed on number/string fields
- **API**: Provided API `R.DataFile` to allow users to upload their data to the plugins folder
- **API**: `DB.Upsert` now rejects null as refid
- **API**: Added `CORE_VERSION`, `CORE_VERSION_MAJOR` and `CORE_VERSION_MINOR` constants

## v1.18

- **CORE**: Fixed an access issue when binding 0.0.0.0

## v1.17 release candidate

- **PluginWebUI**: URL queries is now exposed as `query` for custom WebUI pug files
- **PluginWebUI**: `emit` function is now available directly in pug files

## v1.16 beta

- **WebUI**: Improved experience on mobile
- **PluginLoader**: Fixed a problem where plugin API fails if CORE is launched in shell
- **PluginLoader**: Fixed a problem where API wrapped in node built-in functions may fail
- **API**: Now `$()` rejects non-plain objects as data
- **API**: `$.ELEMENTS` and `$().elements` now always return valid arrays
- **API**: DB queries now ignore `__refid` fields instead of throwing errors
- **API**: The default handler of `R.Unhandled()` now correctly log plugins' identifiers
- **API**: `K.ITEM()`, `K.ARRAY()` and `K.ATTR()` now have proper typings for TypeScript

## v1.15 beta

- **PluginLoader**: Lodash (`_`) is now exposed as API.
- **WebUI**: Added a query shell for plugins. You need to enable developer mode to use it
- **WebUI**: Added a dark mode which follows system's color preference

## v1.14 beta

- **WebUI**: Deleting any data now requires an additional step to prevent accidental deletion
- **WebUI**: You can now delete plugins' data in the "Data Management" page

## v1.13 beta

- **PluginLoader**: Now a gamecode can not be registered by multiple plugins
- **Router**: Errors in plugins now print callstack
- **Typescript**: Updated to 3.9.3
- **Typescript**: Typescript will now skip type checking if CORE is not in Developer Mode
- **CORE**: Fixed a problem where kencoded-message parsing fails if the message contains arrays

## v1.12 beta

- **Router**: Errors in plugins are now properly reported
- **PluginLoader**: Fixed pug doctype
- **CORE**: CardManager now uses plugins' profile data to determine binded attribute
- **WebUI**: Edit buttons in plugin's profiles page will not appear if no custom profile pages exist

## v1.10 beta

- First WebUI public beta
