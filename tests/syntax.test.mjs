/**
 * 整体语法兜底：把 index.html 的完整内联 <script> 切出来跑 node --check。
 *
 * 数学核心测试只抽取片段，UI 胶水代码（DOM 事件、渲染流程）没有任何语法
 * 兜底——一个手滑的括号会让整页白屏，而 CI 照样全绿。node --check 只解析
 * 不执行，浏览器全局（document/window）不存在也不会报错。
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(here, "..", "index.html"), "utf-8");

const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);

let fail = 0;
if (scripts.length === 0) {
  console.log("  FAIL  index.html 里没有内联 <script>，检查抽取正则");
  fail = 1;
}
scripts.forEach((code, i) => {
  const tmp = path.join(os.tmpdir(), `syntax-${process.pid}-${i}.js`);
  fs.writeFileSync(tmp, code, "utf-8");
  try {
    execFileSync(process.execPath, ["--check", tmp], { stdio: "pipe" });
    console.log(`  PASS  <script> #${i + 1} 语法通过（${code.length} 字符）`);
  } catch (e) {
    console.log(`  FAIL  <script> #${i + 1} 语法错误:\n${e.stderr}`);
    fail = 1;
  } finally {
    fs.unlinkSync(tmp);
  }
});
process.exit(fail);
