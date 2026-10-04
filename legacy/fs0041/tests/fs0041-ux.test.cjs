const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/content/index.ts', 'utf8');

test('FS-004.1 exposes a prominent current-channel block', () => {
  assert.match(source, /当前频道/);
  assert.match(source, /data-current-channel-text/);
  assert.match(source, /待进入频道/);
});

test('FS-004.1 exposes explicit import success and error feedback', () => {
  assert.match(source, /data-import-status/);
  assert.match(source, /导入成功：已恢复/);
  assert.match(source, /不是 Feed Switcher 备份/);
  assert.match(source, /不是有效的 JSON 文件/);
});
