/**
 * 从 api-now/db.json 生成 E2E 用的固定测试数据 e2e/fixtures/db.json。
 *
 * E2E 用的是这份快照，而不是 api-now/db.json：日常开发时改了 mock 数据，E2E 的结果不会跟着变。
 * 想更新测试数据时，手动运行一次：
 *   npm run e2e:fixture
 * 然后检查改动、更新受影响的用例，再提交。
 *
 * api-now/db.json 里的图片地址已经是 /api/images/...（通过 Vite 的 /api 代理加载，不依赖
 * json-server 跑在哪个端口）。这里仍保留一次转换：以后新加的数据如果又写成了
 * http://localhost:3002/images/...，生成快照时也会被改成 /api/images/...。
 */
const fs = require('fs');
const path = require('path');

const source = path.resolve(__dirname, '../../api-now/db.json');
const target = path.resolve(__dirname, 'db.json');

const content = fs.readFileSync(source, 'utf8').replace(/http:\/\/localhost:3002\//g, '/api/');
JSON.parse(content); // 确认转换后仍然是合法的 JSON

fs.writeFileSync(target, content);
console.log(`已生成 ${path.relative(process.cwd(), target)}`);
