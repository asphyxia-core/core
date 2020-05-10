import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';

import { Logger } from './Logger';
import path from 'path';
import { ARGS } from './ArgParser';

export const EXEC_PATH = (process as any).pkg ? path.dirname(process.argv0) : process.cwd();
export const MODULE_PATH = path.join(EXEC_PATH, 'modules');
export const SAVE_PATH = ARGS.save_path || path.join(EXEC_PATH, 'savedata');

export function GetCallerModule(): { name: string; single: boolean } {
  const oldPrepareStackTrace = Error.prepareStackTrace;
  Error.prepareStackTrace = (_, stack) => stack;
  const stack = new Error().stack as any;
  Error.prepareStackTrace = oldPrepareStackTrace;
  if (stack !== null && typeof stack === 'object') {
    let inModule = false;
    let entryFile = null;
    for (const file of stack) {
      const filename: string = file.getFileName();
      if (filename.startsWith(MODULE_PATH)) {
        entryFile = path.relative(MODULE_PATH, filename);
        inModule = true;
      } else {
        if (inModule) {
          break;
        }
      }
    }

    if (entryFile !== null) {
      const mod = entryFile.split(path.sep)[0];
      if (mod.endsWith('.js') || mod.endsWith('.ts')) {
        return { name: mod.substr(0, mod.length - 3), single: true };
      } else {
        return { name: mod, single: false };
      }
    } else {
      return null;
    }
  }
  return null;
}

export function ExistsFile(file: string): boolean {
  try {
    return existsSync(`${file}.json`);
  } catch (err) {
    return false;
  }
}

export function PrepareSaveDirectory(mod: string): string {
  const dir = path.join(SAVE_PATH, mod);

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  return dir;
}

export function ReadSave(file: string): any {
  const mod = GetCallerModule();
  if (!mod) {
    Logger.error(`unknown module:`);
    Logger.error(new Error().stack);
  }

  const dir = PrepareSaveDirectory(mod.name);
  const fullFile = path.join(dir, `${file}.json`);
  try {
    if (!existsSync(fullFile)) {
      return null;
    }
    const data = JSON.parse(
      readFileSync(fullFile, {
        encoding: 'UTF-8',
      })
    );
    return data;
  } catch (err) {
    Logger.error(err);
    return null;
  }
}

export function WriteSave(file: string, data: any, formated = false) {
  const mod = GetCallerModule();
  if (!mod) {
    Logger.error(`unknown module:`);
    Logger.error(new Error().stack);
  }

  const dir = PrepareSaveDirectory(mod.name);
  const fullFile = path.join(dir, `${file}.json`);
  try {
    if (formated) {
      writeFileSync(fullFile, JSON.stringify(data, null, 4));
    } else {
      writeFileSync(fullFile, JSON.stringify(data));
    }
    Logger.info(`${file}.json saved`, { module: mod.name });
  } catch (err) {
    Logger.error(`file writing failed: ${err}`, { module: mod.name });
  }
}

// export function WriteDebugFile(file: string, data: any) {
//   if (process.env.ASPHYXIA_PRINT_LOG !== 'print') return;
//   try {
//     let output = JSON.stringify(data, null, 2);
//     const kitemReplace = /\{\s*\n\s*['"]@attr['"]: \{\s*\n\s*['"]?__type['"]?: ['"](.*)['"],?\s*\n\s*\},\s*\n\s*['"]@content['"]: \[\s*\n*\s*(.*)\s*\n*\s*\],?\s*\n\s*\}/g;
//     const strReplace = /\{\s*\n\s*['"]@attr['"]: \{\s*\n\s*['"]?__type['"]?: ['"](str)['"],?\s*\n\s*\},\s*\n\s*['"]@content['"]: (['"].*['"]),?\s*\n\s*\}/g;
//     const karrayReplace = /\{\s*\n\s*['"]@attr['"]: \{\s*\n\s*['"]?__type['"]?: ['"](.*)['"],\s*\n\s*['"]?__count['"]?: .*\s*\n\s*\},?\s*\n\s*['"]@content['"]: (\[(?:[^\]]|\n)*\]),?\s*\n\s*\}/g;

//     output = output.replace(kitemReplace, "kitem('$1', $2)");
//     output = output.replace(strReplace, "kitem('$1', $2)");
//     output = output.replace(karrayReplace, "karray('$1', $2)");
//     writeFileSync(`${file}.js`, `const debug = ${output};`);
//     Logger.debug(`Debug File ${file}.js Saved`);
//   } catch (err) {
//     Logger.debug(`Debug File ${file}.js Saving Failed`);
//   }
// }

// export function ReadXML(file: string): any {
//   try {
//     if (!existsSync(`${file}.xml`)) {
//       return null;
//     }
//     const data = xmlToData(readFileSync(`${file}.xml`));
//     return data;
//   } catch (err) {
//     Logger.error(err);
//     return false;
//   }
// }

export function WriteFile(file: string, data: string) {
  const mod = GetCallerModule();
  if (!mod) return;

  let target = file;
  if (!path.isAbsolute(file)) {
    target = path.resolve(MODULE_PATH, mod.name, file);
  }

  try {
    writeFileSync(target, data);
  } catch (err) {
    Logger.error(`file writing failed: ${err}`, { module: mod });
  }
}

// export function PrintXML(data: any) {
//   try {
//     Logger.info(dataToXML(data));
//   } catch (err) {
//     Logger.error(err);
//   }
// }

export function ReadAssets(file: string): any {
  let fullFile = path.join(__dirname, 'assets', `${file}`);
  if (!(process as any).pkg) {
    fullFile = path.join('../../build-env/assets', `${file}`);
  }

  try {
    if (!existsSync(fullFile)) {
      return null;
    }
    const data = readFileSync(fullFile, {
      encoding: 'UTF-8',
    });
    return data;
  } catch (err) {
    return null;
  }
}
