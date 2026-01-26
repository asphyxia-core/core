## v1.60a
- **CORE**: Core is now open-source.
- **CORE**: Removed 16 profile count limit.

## v1.50e
- **CORE**: Change country code from `AX` to `JP` in `facility.get`

## v1.50d
- **CORE**: Fix a problem where `kencode` would crash if any array is empty

## v1.50c

- **CORE**: Fix a problem where undefined database is being loaded when using the Query Shell under `--dev` mode

## v1.50b

- **CORE**: Swapped the `nedb` dependency to `@seald-io/nedb`

## v1.50a

- **API**: Extended `R.WebUIEvent` to allow the handler to respond with data
- **WebUI**: `emit()` function now returns an axios promise, in which you can grab the response data

## v1.40d

- **API**: Added `R.ExtraModuleHandler` to allow plugins to define extra modules
- **Misc**: Fixed a problem where binary data was accidentally treated as card number

## v1.31d

- **CORE**: Fixed a issue where plugins have problem updating migrated data
- **CORE**: Added a configurable ICMP IP target for keepalive
- **CORE**: Fixed a problem where the nfcid checker is detecting non nfcids
- **CORE**: Now, nfcid checker will provide both refid and cardid to plugins
- **CORE**: Fixed a problem where the xml parser fails on empty attributes
- **API**: Added `U.EncodeString` and `U.DecodeString`

## v1.30f

- **WebUI**: Fixed a problem where sometime the database is shown twice
- **CORE**: Fixed an issue where the command line options are ignored
- **PluginLoader**: Fixed an error during card-in if the current gamecode is not registered by any plugins
- **Misc**: Upgrade TypeScript to 4.2.3
- **Misc**: Plugins are now targeting es2017 to make sure TypeScript correctly transpile newer ES features for NodeJS 10 and 12
- **PluginLoader**: Migrate to new database files, now each database has it's own db file. Please backup your old `savedata.db`
- **WebUI**: Emit handlers now take body size up to 50M

## v1.20f

- **Misc**: Auto startup now respects bind address and supports IPv6 better
- **Misc**: Fixed an issue where submitting config change sometimes leads to bad request error
- **CORE**: `kencode` parser now tries to print the path of failure
- **WebUI**: Fixed a problem that `POST /emit/<event_name>` fails
- **API**: Added `IO.Exists` for checking whether a file exists
- **API**: Added `U.NFC2Card` and `U.Card2NFC` for card number conversion
- **WebUI**: Removed "Game Support" section in plugins' overview if no game support is registered
- **WebUI**: Minor WebUI visual update

## v1.19

- **WebUI**: Query shell is now available for all installed plugins even if there are no DB data of them
- **WebUI**: Fixed a issue where the WebUI of plugins with uppercase letter cannot be accessed
- **WebUI**: Custom WebUI pages now works without `//DATA//` section.
- **API**: Fixed a typechecking issue where `{ exists: true }` query is only allowed on number/string fields
- **API**: Provided API `R.DataFile` to allow users to upload their data to the plugins folder
- **API**: `DB.Upsert` now rejects null as refid
- **API**: Added `CORE_VERSION`, `CORE_VERSION_MAJOR` and `CORE_VERSION_MINOR` constants

## v1.18

- **CORE**: Fixed an access issue when binding 0.0.0.0

## v1.17 release candidate

- **WebUI**: URL queries is now exposed as `query` for custom WebUI pug files
- **WebUI**: `emit` function is now available directly in pug files

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

- **API**: Lodash (`_`) is now exposed as API.
- **WebUI**: Added a query shell for plugins. You need to enable developer mode to use it
- **WebUI**: Added a dark mode which follows system's color preference

## v1.14 beta

- **WebUI**: Deleting any data now requires an additional step to prevent accidental deletion
- **WebUI**: You can now delete plugins' data in the "Data Management" page

## v1.13 beta

- **PluginLoader**: Now a gamecode can not be registered by multiple plugins
- **Router**: Errors in plugins now print stack
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
