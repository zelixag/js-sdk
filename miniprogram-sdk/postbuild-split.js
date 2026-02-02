/**
 * 微信小程序单文件限制 500KB，将构建产物拆成多个 <500KB 的 part，入口用 eval 串起来
 */
const fs = require('fs');
const path = require('path');

const MAX_PART_BYTES = 380 * 1024; // 转义后约 +15%，留余量
const distDir = path.join(__dirname, 'dist');
const mainFile = path.join(distDir, 'xmov-avatar-mp.js');

if (!fs.existsSync(mainFile)) {
  console.warn('postbuild-split: dist/xmov-avatar-mp.js 不存在，跳过');
  return;
}

let code = fs.readFileSync(mainFile, 'utf8');
const totalBytes = Buffer.byteLength(code, 'utf8');

if (totalBytes <= 500 * 1024) {
  console.log('postbuild-split: 单文件未超 500KB，不拆包');
  return;
}

// 在 ";\n" 或 "}\n" 处切分
const parts = [];
let start = 0;
const re = /[;\}]\s*\n/g;

while (start < code.length) {
  let end = Math.min(start + MAX_PART_BYTES, code.length);
  if (end >= code.length) {
    parts.push(code.slice(start));
    break;
  }
  const chunk = code.slice(start, end);
  let lastMatch = null;
  let m;
  re.lastIndex = 0;
  while ((m = re.exec(chunk)) !== null) lastMatch = m;
  if (lastMatch) {
    end = start + lastMatch.index + lastMatch[0].length;
  }
  parts.push(code.slice(start, end));
  start = end;
}

// 每段写成 module.exports = "<escaped>"，入口 require 后 eval
parts.forEach((p, i) => {
  const partPath = path.join(distDir, `xmov-avatar-mp.part${i + 1}.js`);
  const escaped = JSON.stringify(p);
  if (Buffer.byteLength(escaped, 'utf8') > 500 * 1024) {
    console.error('postbuild-split: part' + (i + 1) + ' 转义后仍超 500KB，请减小 MAX_PART_BYTES');
    throw new Error('part too large');
  }
  fs.writeFileSync(partPath, 'module.exports=' + escaped + ';\n');
});

// 入口：依次 require 并 eval，使所有代码在同一 scope，最后一段会设置 module.exports
const loaderCode = [
  '// 小程序单文件 500KB 限制，拆包后由入口 eval 串起',
  parts.map((_, i) => `eval(require('./xmov-avatar-mp.part${i + 1}.js'));`).join('\n'),
  '// exports 由最后一段设置'
].join('\n');

fs.writeFileSync(mainFile, loaderCode);
console.log('postbuild-split: 已拆成 ' + parts.length + ' 个 part + 入口，每 part < 500KB');
