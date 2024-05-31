import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 获取当前模块的文件路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const docsRoot = path.join(__dirname, '..', '..', 'docs');

function buildRoutePath(dirPath, fileName) {
  // 将目录路径转换为路由路径，去除'notes'前缀并替换路径分隔符
  return dirPath
    .replace(path.join(docsRoot, 'src/notes'), '/notes')
    .replace(/\\/g, '/')
    .replace(/^\//, '') + '/' + fileName.replace('.md', '');
}

function readFileList(dir = path.join(docsRoot, 'src/notes'), filesList = []) {
  const items = fs.readdirSync(dir);

  items.forEach(item => {
    const filePath = path.join(dir, item);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory() && item !== '.vuepress') {
      readFileList(filePath, filesList);  // 递归读取子目录
    } else if (stat.isFile() && path.extname(filePath) === '.md') { // 处理.md文件
      const routePath = buildRoutePath(dir, path.basename(filePath));
      filesList.push({
        filePath,
        routePath
      });
    }
  });

  return filesList;
}

export default readFileList;
