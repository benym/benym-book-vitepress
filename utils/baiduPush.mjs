import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import readFileList from './modules/readFileList.mjs';
import { fileURLToPath } from 'url';

// 获取当前模块的文件路径
const __filename = fileURLToPath(import.meta.url);
// 从文件路径中获取目录名
const __dirname = path.dirname(__filename);
// 百度链接推送文件
const urlsRoot = path.join(__dirname, '..', 'urls.txt');
const DOMAIN = process.argv.splice(2)[0]; // 获取命令行传入的域名参数

if (!DOMAIN) {
  console.error(chalk.red('请在运行此文件时指定一个你要进行百度推送的域名参数，例：node utils/baiduPush.js https://xugaoyi.com'));
  process.exit(1);
}

main();

/**
 * 主体函数
 */
async function main() {
  fs.writeFileSync(urlsRoot, DOMAIN + '\r\n');

  const files = await readFileList(); // 假设readFileList返回的是Promise，或者确保它异步工作

  files.forEach(file => {
    // 假设markdown文件位于docs目录下，且我们想排除根目录下的README.md等特殊文件
    if (file.filePath.includes('README.md')) return;

    // 构建URL路径：移除文件开头的'./docs/'部分，替换文件路径分隔符为URL路径分隔符，并去掉后缀.md
    const urlPath = file.routePath; // 移除.md后缀

    const link = `\r\n${DOMAIN}/${urlPath}`;
    console.log(link);
    fs.appendFileSync(urlsRoot, link);
  });

  console.log(chalk.green('百度链接推送文件已生成: ', urlsRoot));
}
