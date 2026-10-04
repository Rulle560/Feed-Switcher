import { copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Script } from 'node:vm';

export const ROOT = realpathSync(fileURLToPath(new URL('../', import.meta.url)));
export const SOURCE = join(ROOT, 'src', 'extension');
export const DIST = join(ROOT, 'dist');
export const RUNTIME_FILES = Object.freeze([
  'background.js', 'content.js', 'core.js', 'manifest.json',
  'popup.css', 'popup.html', 'popup.js', 'privacy.css', 'privacy.html', 'privacy.js', 'terms.html',
  'icons/icon16.png', 'icons/icon32.png', 'icons/icon48.png', 'icons/icon128.png'
].sort());

function assertOutputDirectory(directory) {
  const target = resolve(directory);
  const name = relative(ROOT, target);
  if (dirname(target) !== ROOT || (name !== 'dist' && !/^\.test-build-[A-Za-z0-9_-]+$/.test(name))) {
    throw new Error('Refusing to change a directory outside the designated build outputs.');
  }
  if (existsSync(target) && lstatSync(target).isSymbolicLink()) throw new Error('Refusing a linked build output.');
  return target;
}

export function removeOutputDirectory(directory) {
  rmSync(assertOutputDirectory(directory), { recursive: true, force: true });
}

function localPath(directory, name) {
  if (typeof name !== 'string' || !name || isAbsolute(name) || /[\\?#:]|(^|\/)\.\.?($|\/)/.test(name)) {
    throw new Error(`Invalid local resource path: ${String(name)}`);
  }
  const path = resolve(directory, name);
  if (!relative(resolve(directory), path) || relative(resolve(directory), path).startsWith('..')) throw new Error('Resource escapes extension directory.');
  if (!RUNTIME_FILES.includes(name)) throw new Error(`Unexpected runtime resource: ${name}`);
  if (!existsSync(path) || !lstatSync(path).isFile() || lstatSync(path).isSymbolicLink()) throw new Error(`Missing or linked resource: ${name}`);
  return path;
}

function collectFiles(directory, prefix = '') {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const name = prefix + entry.name;
    if (entry.isSymbolicLink()) throw new Error('Linked runtime files are forbidden.');
    if (entry.isDirectory()) return collectFiles(join(directory, entry.name), `${name}/`);
    if (!entry.isFile()) throw new Error('Unexpected runtime file type.');
    return [name];
  }).sort();
}

function exact(actual, expected, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${label} mismatch`);
}

export function validateExtension(directory, { compareSource = false } = {}) {
  exact(collectFiles(directory), RUNTIME_FILES, 'Runtime file allowlist');
  const manifest = JSON.parse(readFileSync(localPath(directory, 'manifest.json'), 'utf8'));
  const packageInfo = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  if (manifest.manifest_version !== 3) throw new Error('Manifest must be V3.');
  if (manifest.minimum_chrome_version !== '120') throw new Error('Unexpected browser compatibility baseline.');
  if (manifest.version !== packageInfo.version) throw new Error('Package and manifest versions differ.');
  exact(manifest.permissions, ['storage'], 'Required permissions');
  exact(manifest.host_permissions, ['https://www.youtube.com/*'], 'Required hosts');
  exact(manifest.optional_host_permissions, ['http://127.0.0.1:8787/*'], 'Optional hosts');
  if (manifest.externally_connectable || manifest.web_accessible_resources || manifest.content_security_policy) throw new Error('Unexpected access or CSP expansion.');
  exact(manifest.content_scripts, [{ matches: ['https://www.youtube.com/*'], js: ['core.js', 'content.js'], run_at: 'document_idle' }], 'Content script loading');
  if (manifest.background?.service_worker !== 'background.js' || manifest.background?.type) throw new Error('Unexpected worker entry.');
  if (manifest.action?.default_popup !== 'popup.html') throw new Error('Unexpected popup entry.');
  for (const icon of Object.values(manifest.icons || {})) localPath(directory, icon);
  const core = readFileSync(localPath(directory, 'core.js'), 'utf8');
  if (!core.includes(`FSCore.CLIENT_VERSION = '${manifest.version}';`)) throw new Error('Runtime client version differs.');
  for (const name of RUNTIME_FILES.filter((file) => file.endsWith('.js'))) {
    const code = readFileSync(localPath(directory, name), 'utf8');
    new Script(code, { filename: name });
    if (/\beval\s*\(|\bnew\s+Function\s*\(/.test(code)) throw new Error('Dynamic code execution is forbidden.');
    if (/\bimport\s*\(/.test(code)) throw new Error('Unexpected dynamic script import.');
    for (const match of code.matchAll(/\bimportScripts\s*\(([^)]*)\)/g)) {
      if (name !== 'background.js' || match[1] !== "'core.js'") throw new Error('Unexpected script import.');
    }
    for (const match of code.matchAll(/https?:\/\/[^"'`\s)]+/g)) {
      if (!match[0].startsWith('https://www.youtube.com/') && match[0] !== 'http://127.0.0.1:8787') {
        throw new Error('Unexpected network origin in extension JavaScript.');
      }
    }
    if (name !== 'core.js' && /FSCore\.CLIENT_VERSION\s*=|\(function \(FSCore\)/.test(code)) throw new Error('Shared core was duplicated.');
  }
  for (const name of ['popup.css', 'privacy.css']) {
    if (/@import|url\(\s*["']?https?:/i.test(readFileSync(localPath(directory, name), 'utf8'))) throw new Error('Remote styles are forbidden.');
  }
  const worker = readFileSync(localPath(directory, 'background.js'), 'utf8');
  if (!worker.includes("importScripts('core.js');")) throw new Error('Worker must load local shared core.');
  for (const name of ['popup.html', 'privacy.html', 'terms.html']) {
    const html = readFileSync(localPath(directory, name), 'utf8');
    const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
    const sources = scripts.map((match) => {
      const src = match[1].match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1];
      if (!src || match[2].trim()) throw new Error('Inline or missing script source.');
      localPath(directory, src);
      return src;
    });
    exact(sources, name === 'terms.html' ? [] : ['core.js', name.replace('.html', '.js')], `${name} script order`);
    if (/\son[a-z]+\s*=/i.test(html) || /javascript:/i.test(html)) throw new Error('Inline HTML execution is forbidden.');
    for (const match of html.matchAll(/\b(?:href|src)\s*=\s*["']([^"']+)["']/gi)) {
      if (/^https:\/\//.test(match[1]) || match[1].startsWith('#')) continue;
      localPath(directory, match[1]);
    }
  }
  if (compareSource) for (const name of RUNTIME_FILES) {
    if (!readFileSync(localPath(directory, name)).equals(readFileSync(localPath(SOURCE, name)))) throw new Error(`Built file differs from source: ${name}`);
  }
  return manifest;
}

export function buildExtension(directory = DIST) {
  validateExtension(SOURCE);
  const target = assertOutputDirectory(directory);
  removeOutputDirectory(target);
  for (const name of RUNTIME_FILES) {
    const destination = join(target, name);
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(localPath(SOURCE, name), destination);
  }
  validateExtension(target, { compareSource: true });
  return target;
}
