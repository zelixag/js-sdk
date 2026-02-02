/**
 * 微信小程序 SDK 构建脚本
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 检查并安装依赖
function installDependencies() {
  console.log('检查依赖...');
  const packageJsonPath = path.join(__dirname, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    console.error('package.json 不存在');
    return false;
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // 检查是否已安装依赖
  const nodeModulesPath = path.join(__dirname, 'node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    console.log('安装依赖...');
    execSync('npm install', { cwd: __dirname, stdio: 'inherit' });
  } else {
    console.log('依赖已存在');
  }

  return true;
}

// 构建 TypeScript
function buildTypescript() {
  console.log('开始构建 TypeScript...');
  
  try {
    // 使用 tsc 构建
    execSync('npx tsc --project tsconfig.json', { 
      cwd: __dirname, 
      stdio: 'inherit' 
    });
    
    console.log('TypeScript 构建成功');
    return true;
  } catch (error) {
    console.error('TypeScript 构建失败:', error.message);
    return false;
  }
}

// 复制必要的文件
function copyFiles() {
  console.log('复制构建文件...');
  
  const distDir = path.join(__dirname, 'dist');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  // 复制 package.json 到 dist
  const sourcePackage = path.join(__dirname, 'package.json');
  const destPackage = path.join(distDir, 'package.json');
  
  if (fs.existsSync(sourcePackage)) {
    const pkg = JSON.parse(fs.readFileSync(sourcePackage, 'utf8'));
    // 修改包配置以适应构建输出
    pkg.main = './index.js';
    pkg.types = './index.d.ts';
    fs.writeFileSync(destPackage, JSON.stringify(pkg, null, 2));
  }

  console.log('文件复制完成');
}

// 验证构建结果
function validateBuild() {
  console.log('验证构建结果...');
  
  const distDir = path.join(__dirname, 'dist');
  const expectedFiles = ['index.js', 'index.d.ts'];
  
  for (const file of expectedFiles) {
    const filePath = path.join(distDir, file);
    if (!fs.existsSync(filePath)) {
      console.error(`缺少构建文件: ${file}`);
      return false;
    }
  }
  
  console.log('构建验证通过');
  return true;
}

// 主构建函数
function build() {
  console.log('开始构建微信小程序 SDK...\n');
  
  if (!installDependencies()) {
    console.error('依赖安装失败');
    process.exit(1);
  }
  
  if (!buildTypescript()) {
    console.error('构建失败');
    process.exit(1);
  }
  
  copyFiles();
  
  if (!validateBuild()) {
    console.error('构建验证失败');
    process.exit(1);
  }
  
  console.log('\n构建完成！🎉');
  console.log('构建产物位于 ./dist 目录');
}

// 如果直接运行此脚本
if (require.main === module) {
  build();
}

module.exports = { build, installDependencies, buildTypescript, copyFiles, validateBuild };