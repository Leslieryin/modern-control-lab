/**
 * 数学核心测试：手写矩阵库、Ackermann 极点配置、状态空间仿真。
 *
 * 核心检验不看你公式写得像不像，而是把算出来的 K 代回闭环 A−BK，
 * 验证 det(λI−Acl) 在每个期望极点处确实为 0。这个标准糊弄不过去。
 *
 * 特征值/行列式由测试自己算（2×2 用解析式、3×3 用余子式展开），
 * 不复用被测代码，避免"自己验自己"。
 */
import fs from "node:fs";
import { loadInline } from "./extract.mjs";

const { parseMat, matMul, matRank, matInv, ackermann, polyFromPoles, ctrbMat, obsvMat, matT, eye } =
  await loadInline("function parseMat(t)", "function setupCanvas",
    "parseMat, matMul, matRank, matInv, hstack, vstack, ctrbMat, obsvMat, polyFromPoles, matPoly, ackermann, simSS, matT, matAdd, matScale, eye");

let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => {
  if (cond) { pass++; console.log(`  PASS  ${name}${extra ? "  [" + extra + "]" : ""}`); }
  else { fail++; console.log(`  FAIL  ${name}${extra ? "  [" + extra + "]" : ""}`); }
};

const sub = (A, B) => A.map((r, i) => r.map((v, j) => v - B[i][j]));
const near = (a, b, tol = 1e-6) => Math.abs(a - b) < tol;

/** 2×2 特征值，解析求解（只处理实根情形） */
function eig2(A) {
  const tr = A[0][0] + A[1][1];
  const det = A[0][0] * A[1][1] - A[0][1] * A[1][0];
  const disc = tr * tr - 4 * det;
  if (disc < 0) return null;
  const s = Math.sqrt(disc);
  return [Number(((tr + s) / 2).toFixed(6)), Number(((tr - s) / 2).toFixed(6))];
}

/** 3×3 行列式，余子式展开 */
const det3 = (M) =>
  M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) -
  M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) +
  M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]);

console.log("[矩阵基本运算]");
ok("单位阵乘任意阵不变",
   JSON.stringify(matMul(eye(2), [[2, 3], [4, 5]])) === JSON.stringify([[2, 3], [4, 5]]));
ok("转置 2×3 → 3×2",
   matT([[1, 2, 3], [4, 5, 6]]).length === 3 &&
   matT([[1, 2, 3], [4, 5, 6]])[0].length === 2);

console.log("\n[矩阵求逆]");
{
  const A = [[4, 7], [2, 6]];
  const I = matMul(A, matInv(A)).map((r) => r.map((v) => Number(v.toFixed(9))));
  ok("A·A⁻¹ = I", JSON.stringify(I) === JSON.stringify([[1, 0], [0, 1]]));
}
{
  const Ai = matInv([[1, 2], [3, 4]]).map((r) => r.map((v) => Number(v.toFixed(6))));
  ok("[[1,2],[3,4]]⁻¹ 与手算 [[-2,1],[1.5,-0.5]] 一致",
     JSON.stringify(Ai) === JSON.stringify([[-2, 1], [1.5, -0.5]]), JSON.stringify(Ai));
}
{
  const r = matInv([[1, 2], [2, 4]]); // 奇异
  ok("奇异矩阵不硬算（返回 falsy）", !r || !r.length);
}

console.log("\n[秩判断]");
ok("[[1,0],[0,1]] 秩 2", matRank([[1, 0], [0, 1]]) === 2);
ok("[[1,2],[2,4]] 秩 1（行线性相关）", matRank([[1, 2], [2, 4]]) === 1);
ok("零矩阵秩 0", matRank([[0, 0], [0, 0]]) === 0);
ok("3×3 满秩", matRank([[1, 2, 3], [0, 1, 4], [5, 6, 0]]) === 3);

console.log("\n[极点 → 特征多项式]");
ok("极点 -2,-3 → [6,5,1]",
   JSON.stringify(polyFromPoles([{ re: -2, im: 0 }, { re: -3, im: 0 }])) ===
   JSON.stringify([6, 5, 1]));
ok("共轭复极点 -1±2j → [5,2,1]",
   JSON.stringify(polyFromPoles([{ re: -1, im: 2 }, { re: -1, im: -2 }])) ===
   JSON.stringify([5, 2, 1]));

console.log("\n[能控性 / 能观性矩阵]");
{
  const A = [[0, 1], [-2, -3]], B = [[0], [1]], C = [[1, 0]];
  ok("Wc = [B AB]", JSON.stringify(ctrbMat(A, B)) === JSON.stringify([[0, 1], [1, -3]]));
  ok("Wo = [C; CA]", JSON.stringify(obsvMat(A, C)) === JSON.stringify([[1, 0], [0, 1]]));
}

console.log("\n[Ackermann 极点配置 —— 核心检验]");
{
  const A = [[0, 1], [-2, -3]], B = [[0], [1]], want = [-2, -4];
  const K = ackermann(A, B, want.map((p) => ({ re: p, im: 0 })));
  ok("2 阶系统算出 K", Array.isArray(K) && K.length === 2, JSON.stringify(K));
  if (Array.isArray(K)) {
    const BK = B.map((r) => K.map((v) => r[0] * v));
    const got = eig2(sub(A, BK)).slice().sort((a, b) => a - b);
    ok("闭环 A−BK 特征值 = -2,-4",
       got[0] !== null && near(got[0], -4) && near(got[1], -2),
       `实得 ${JSON.stringify(got)}，K=${JSON.stringify(K)}`);
  }
}
{
  // 能控标准型，开环三重极点 0；教科书结论 K = [6,11,6]
  const A = [[0, 1, 0], [0, 0, 1], [0, 0, 0]], B = [[0], [0], [1]];
  const want = [-1, -2, -3];
  const K = ackermann(A, B, want.map((p) => ({ re: p, im: 0 })));
  ok("3 阶 K = [6,11,6]（教科书结果）",
     Array.isArray(K) && K.every((v, i) => near(v, [6, 11, 6][i])), JSON.stringify(K));
  if (Array.isArray(K)) {
    const Acl = sub(A, B.map((r) => K.map((v) => r[0] * v)));
    const worst = Math.max(...want.map((lam) =>
      Math.abs(det3(Acl.map((r, i) => r.map((v, j) => (i === j ? lam - v : -v)))))));
    ok("det(λI−Acl) 在每个期望极点处为 0", worst < 1e-9, `最大残差 ${worst.toExponential(2)}`);
    const atZero = Math.abs(det3(Acl.map((r, i) => r.map((v, j) => (i === j ? -v : -v)))));
    ok("λ=0 处 det ≠ 0（证明确实移动了极点）", atZero > 1e-6, `det(−Acl)=${atZero.toFixed(4)}`);
  }
}
{
  const K = ackermann([[0, 1], [0, 0]], [[0], [0]],
    [{ re: -1, im: 0 }, { re: -2, im: 0 }]);
  ok("不可控系统返回 null（不硬算假 K）", K === null);
}

console.log("\n[实验2 示例按钮回归：旧例子 A=[[0,1],[-9,-1.2]] 实际完全能观，与按钮文字自相矛盾]");
{
  // 修复后的「双积分器只测速度」例子：能控、但不完全能观（x₁ 不可重构）
  const A = parseMat("0, 1; 0, 0"), B = parseMat("0; 1"), C = parseMat("0, 1");
  ok("Wc 秩 2（能控）", matRank(ctrbMat(A, B)) === 2);
  ok("Wo 秩 1（不完全能观）", matRank(obsvMat(A, C)) === 1);
  const src = fs.readFileSync(new URL("../index.html", import.meta.url), "utf-8");
  const js = src.split(/\r?\n/);
  const i = js.findIndex((l) => l.includes('ct-ex1").addEventListener'));
  const block = i >= 0 ? js.slice(i, i + 2).join("\n") : "";
  ok("ct-ex1 按钮绑定的是该例子（旧矩阵已移除）",
     block.includes('ct-A").value="0, 1; 0, 0"') && !block.includes("-9, -1.2"));
}

console.log(`\n结果：${pass} 通过 / ${fail} 失败`);
process.exit(fail ? 1 : 0);
