#!/usr/bin/env bun
/**
 * Builds Asphyxia CORE standalone binaries and release zips.
 *
 *   bun run build                       # linux-x64, linux-arm64, windows-x64 + zips
 *   bun run build --target=bun-linux-x64 --no-zip --outfile=/tmp/asphyxia-core
 *
 * Uses Bun.build's compile mode (with bytecode and inline sourcemaps)
 * for cross-compilation, embeds icon.ico into Windows executables and
 * writes zip artifacts without external tools (Bun.hash.crc32 + zlib
 * raw deflate).
 */
import fs from 'node:fs';
import path from 'node:path';
import { deflateRawSync } from 'node:zlib';

const ROOT = path.resolve(import.meta.dir, '..');
const BUILD_DIR = path.join(ROOT, 'build');
const ENTRY = path.join(ROOT, 'src/AsphyxiaCore.ts');
const ICON = path.join(ROOT, 'icon.ico');

const TARGETS = {
  'bun-linux-x64': { binary: 'asphyxia-core', zip: 'asphyxia-core-linux-x64.zip' },
  'bun-linux-arm64': { binary: 'asphyxia-core-arm64', zip: 'asphyxia-core-arm64.zip' },
  'bun-windows-x64': { binary: 'asphyxia-core-x64.exe', zip: 'asphyxia-core-win-x64.zip' },
  'bun-windows-arm64': { binary: 'asphyxia-core-arm64.exe', zip: 'asphyxia-core-win-arm64.zip' },
  'bun-darwin-x64': { binary: 'asphyxia-core-darwin-x64', zip: 'asphyxia-core-darwin-x64.zip' },
  'bun-darwin-arm64': { binary: 'asphyxia-core-darwin-arm64', zip: 'asphyxia-core-darwin-arm64.zip' },
};

const DEFAULT_TARGETS = ['bun-linux-x64', 'bun-linux-arm64', 'bun-windows-x64'];

// ------------------------------------------------------------------ options

const args = process.argv.slice(2);
const targets = args
  .filter(arg => arg.startsWith('--target='))
  .map(arg => arg.slice('--target='.length));

if (targets.length === 0) targets.push(...DEFAULT_TARGETS);

const noZip = args.includes('--no-zip');
const outfileArg = args.find(arg => arg.startsWith('--outfile='));
const outfile = outfileArg ? outfileArg.slice('--outfile='.length) : null;

if (outfile && targets.length > 1) {
  console.error('build: --outfile can only be used with a single --target');
  process.exit(1);
}

// ------------------------------------------------------------------ helpers

function version() {
  const source = fs.readFileSync(path.join(ROOT, 'src/utils/Consts.ts'), 'utf8');
  const match = source.match(/VERSION = '([a-z0-9.]*)'/);
  if (!match) throw new Error('build: could not read VERSION from src/utils/Consts.ts');
  return match[1];
}

function targetInfo(target) {
  const known = TARGETS[target];
  if (known) return known;
  const suffix = target.replace(/^bun-/, '');
  return {
    binary: `asphyxia-core-${suffix}${suffix.startsWith('windows') ? '.exe' : ''}`,
    zip: `asphyxia-core-${suffix}.zip`,
  };
}

async function compile(target, binaryPath) {
  fs.mkdirSync(path.dirname(binaryPath), { recursive: true });
  const result = await Bun.build({
    entrypoints: [ENTRY],
    sourcemap: 'inline',
    compile: { target, outfile: binaryPath, bytecode: true },
  });
  if (!result.success) {
    for (const log of result.logs) console.error(log);
    throw new Error(`build: compilation failed for ${target}`);
  }
}

// ------------------------------------------------------- windows icon patch

let reseditPromise = null;
function loadResEdit() {
  if (!reseditPromise) reseditPromise = import('resedit');
  return reseditPromise;
}

async function embedWindowsIcon(exePath, icoPath) {
  const original = fs.readFileSync(exePath);
  const originalSize = original.length;
  const { NtExecutable, NtExecutableResource, Resource, Data } = await loadResEdit();

  const exe = NtExecutable.from(original);
  const sections = exe.getAllSections();
  const rsrc = sections.find(section => section.info.name === '.rsrc');
  if (!rsrc) throw new Error('no .rsrc section');

  // pe-library refuses resources followed by anything but '.reloc'; Bun
  // places '.bun' last. Hide those sections while parsing, restore after.
  const hidden = [];
  for (const section of sections) {
    if (
      section !== rsrc &&
      section.info.name !== '.reloc' &&
      section.info.virtualAddress > rsrc.info.virtualAddress
    ) {
      hidden.push([section, section.info.virtualAddress]);
      section.info.virtualAddress = 0;
    }
  }

  const resources = NtExecutableResource.from(exe);
  for (const [section, virtualAddress] of hidden) {
    section.info.virtualAddress = virtualAddress;
  }

  const groups = Resource.IconGroupEntry.fromEntries(resources.entries);
  if (groups.length === 0) throw new Error('no icon group');

  const iconFile = Data.IconFile.from(fs.readFileSync(icoPath));
  for (const group of groups) {
    Resource.IconGroupEntry.replaceIconsForResource(
      resources.entries,
      group.id,
      group.lang,
      iconFile.icons.map(item => item.data)
    );
  }

  // Rebuild the resource tree inside the existing section so the file
  // size and every other section stay untouched.
  const generated = resources.generateResourceData(
    rsrc.info.virtualAddress,
    exe.getFileAlignment(),
    true,
    false
  );
  const sectionData = new Uint8Array(rsrc.data);
  if (generated.bin.byteLength > sectionData.length) {
    throw new Error('new icon resources do not fit in the resource section');
  }
  sectionData.set(new Uint8Array(generated.bin));

  const output = Buffer.from(exe.generate());
  if (output.length !== originalSize) {
    throw new Error('patched executable changed size');
  }
  fs.writeFileSync(exePath, output);
}

// ---------------------------------------------------------------- zip writer

function dosDateTime(date) {
  const year = Math.max(1980, date.getFullYear());
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

function collectZipEntries(root, prefix) {
  const entries = [];
  const walk = (directory, name) => {
    for (const item of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name)
    )) {
      if (item.name === 'node_modules') continue;
      const full = path.join(directory, item.name);
      const entryName = `${name}${item.name}`;
      if (item.isDirectory()) {
        const stat = fs.statSync(full);
        entries.push({ name: `${entryName}/`, directory: true, mtime: stat.mtime, mode: stat.mode });
        walk(full, `${entryName}/`);
      } else if (item.isFile()) {
        const stat = fs.statSync(full);
        entries.push({ name: entryName, path: full, mtime: stat.mtime, mode: stat.mode });
      }
    }
  };
  walk(root, `${prefix}/`);
  return entries;
}

function createZip(zipPath, files) {
  const chunks = [];
  const central = [];
  let offset = 0;

  for (const file of files) {
    const name = Buffer.from(file.name, 'utf8');
    const data = file.directory ? Buffer.alloc(0) : fs.readFileSync(file.path);
    const crc = data.length ? Bun.hash.crc32(data) >>> 0 : 0;
    const compressed = data.length ? deflateRawSync(data, { level: 9 }) : data;
    const method = data.length ? 8 : 0;
    const { time, date } = dosDateTime(file.mtime);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    chunks.push(local, name, compressed);

    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50, 0);
    entry.writeUInt16LE(0x031e, 4);
    entry.writeUInt16LE(20, 6);
    entry.writeUInt16LE(0, 8);
    entry.writeUInt16LE(method, 10);
    entry.writeUInt16LE(time, 12);
    entry.writeUInt16LE(date, 14);
    entry.writeUInt32LE(crc, 16);
    entry.writeUInt32LE(compressed.length, 20);
    entry.writeUInt32LE(data.length, 24);
    entry.writeUInt16LE(name.length, 28);
    entry.writeUInt16LE(0, 30);
    entry.writeUInt16LE(0, 32);
    entry.writeUInt16LE(0, 34);
    entry.writeUInt16LE(0, 36);
    const mode = file.mode ?? (file.directory ? 0o40755 : 0o100644);
    entry.writeUInt32LE((((mode & 0xffff) << 16) | (file.directory ? 0x10 : 0)) >>> 0, 38);
    entry.writeUInt32LE(offset, 42);
    central.push(entry, name);

    offset += local.length + name.length + compressed.length;
  }

  const centralBuffer = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralBuffer.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  fs.writeFileSync(zipPath, Buffer.concat([...chunks, centralBuffer, end]));
}

// -------------------------------------------------------------------- main

function ensureDependencies() {
  if (fs.existsSync(path.join(ROOT, 'node_modules'))) return;

  console.log('Installing dependencies...');
  let result = Bun.spawnSync(['bun', 'install', '--frozen-lockfile'], {
    cwd: ROOT,
    stdout: 'inherit',
    stderr: 'inherit',
  });
  if (result.exitCode !== 0) {
    result = Bun.spawnSync(['bun', 'install'], {
      cwd: ROOT,
      stdout: 'inherit',
      stderr: 'inherit',
    });
  }
  if (result.exitCode !== 0) {
    console.error('build: failed to install dependencies');
    process.exit(result.exitCode ?? 1);
  }
}

async function main() {
  ensureDependencies();
  const ver = version();
  fs.mkdirSync(BUILD_DIR, { recursive: true });
  console.log(`Building Asphyxia CORE ${ver}`);

  const built = [];
  for (const target of targets) {
    const { binary, zip } = targetInfo(target);
    const binaryPath = outfile ? path.resolve(outfile) : path.join(BUILD_DIR, binary);
    console.log(`  -> ${target}`);
    await compile(target, binaryPath);

    if (target.startsWith('bun-windows-')) {
      try {
        await embedWindowsIcon(binaryPath, ICON);
        console.log(`     embedded icon.ico`);
      } catch (err) {
        console.warn(`     warning: could not embed icon.ico: ${err.message}`);
      }
    }

    // Bun strips a trailing .exe when naming sidecar maps
    built.push({ target, binary, zip, binaryPath });
  }

  if (noZip || outfile) {
    console.log('Done.');
    return;
  }

  // stage assets/plugins next to the binaries for packaging
  fs.rmSync(path.join(BUILD_DIR, 'assets'), { recursive: true, force: true });
  fs.rmSync(path.join(BUILD_DIR, 'plugins'), { recursive: true, force: true });
  fs.cpSync(path.join(ROOT, 'assets'), path.join(BUILD_DIR, 'assets'), { recursive: true });
  fs.cpSync(path.join(ROOT, 'plugins'), path.join(BUILD_DIR, 'plugins'), {
    recursive: true,
    filter: source => path.basename(source) !== 'node_modules',
  });

  for (const { binary, zip, binaryPath } of built) {
    const zipPath = path.join(BUILD_DIR, zip);
    const binaryStat = fs.statSync(binaryPath);
    const files = [
      { name: binary, path: binaryPath, mtime: binaryStat.mtime, mode: binaryStat.mode },
      ...collectZipEntries(path.join(BUILD_DIR, 'assets'), 'assets'),
      ...collectZipEntries(path.join(BUILD_DIR, 'plugins'), 'plugins'),
    ];
    createZip(zipPath, files);
    console.log(`  -> ${zip} (${files.length} files, ${(fs.statSync(zipPath).size / 1048576).toFixed(1)} MiB)`);
  }

  console.log('Done. Artifacts in ./build');
}

await main();
