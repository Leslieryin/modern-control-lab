/**
 * 从 index.html 里抽出内联的数学代码，供测试直接 import。
 *
 * 为什么不把代码复制一份到测试目录：那样两边会慢慢漂移，测的就不是线上那份了。
 * 这里每次运行都从真实源码里现切，测的一定是用户实际加载的代码。
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const HTML = path.join(here, "..", "index.html");

/**
 * @param {string} from  起始标记（该行需包含此子串）
 * @param {string} to    结束标记（该行需包含此子串，不含此行）
 * @param {string} exports 要导出的标识符，逗号分隔
 */
export async function loadInline(from, to, exports) {
  const lines = fs.readFileSync(HTML, "utf-8").split(/\r?\n/);
  const a = lines.findIndex((l) => l.includes(from));
  const b = lines.findIndex((l) => l.includes(to));
  if (a < 0) throw new Error(`index.html 里找不到起始标记: ${from}`);
  if (b < 0) throw new Error(`index.html 里找不到结束标记: ${to}`);
  if (b <= a) throw new Error(`结束标记出现在起始标记之前: ${to}`);

  const code = lines.slice(a, b).join("\n");
  if (/<\/?script/.test(code)) throw new Error("截取范围混入了 script 标签，检查标记");

  const tmp = path.join(
    os.tmpdir(),
    `inline-${process.pid}-${Math.random().toString(36).slice(2)}.mjs`
  );
  fs.writeFileSync(tmp, `${code}\n\nexport { ${exports} };\n`, "utf-8");
  try {
    return await import(`file://${tmp.replace(/\\/g, "/")}`);
  } finally {
    fs.unlinkSync(tmp);
  }
}
