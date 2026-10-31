# modern-control-lab · 现代控制理论交互实验台

[![在线演示](https://img.shields.io/badge/demo-%E5%9C%A8%E7%BA%BF%E6%89%93%E5%BC%80-0f6cbd?style=flat-square)](https://leslieryin.github.io/modern-control-lab/)
![CI](https://github.com/Leslieryin/modern-control-lab/actions/workflows/ci.yml/badge.svg)

**打开即用的单文件 HTML**——[在线直接用](https://leslieryin.github.io/modern-control-lab/)，或下载 `index.html` 双击离线运行。《现代控制理论 / 线性系统理论》课程核心实验的交互实现，所有矩阵运算在浏览器本地完成。

与经典控制版 [control-lab](https://github.com/Leslieryin/control-lab) 配套：那边用传递函数讲经典控制理论，这边用状态空间讲现代控制理论。

> **EN** — Interactive lab for modern control theory: state-space response, controllability and observability, Ackermann pole placement, state observer and Kalman filter. All matrix math is hand-written and runs in your browser. [Try it →](https://leslieryin.github.io/modern-control-lab/)

![拖动期望阻尼比，闭环响应与反馈增益 K 实时重算](docs/demo.gif)

## 五个实验

- **状态空间响应** —— ẋ=Ax+Bu、y=Cx 的阶跃响应与状态轨迹（RK4 数值积分）。编辑 A/B/C 矩阵，实时看状态分量、输出曲线与特征值（2×2 解析）。
- **能控性与能观性** —— 构造 W<sub>c</sub>=[B AB ⋯]、W<sub>o</sub>=[C;CA ⋯]，高斯消元求秩判别。编辑矩阵 + 两个内置反例（可控不可观 / 不可控），附相平面轨迹。
- **极点配置** —— 状态反馈 u=−Kx+N·r，按 **Ackermann 公式**计算增益。拖动期望 ζ/ω<sub>n</sub> 滑块，开环（发散）vs 闭环实时对比；含前置增益 N 补偿稳态误差。
- **状态观测器** —— 全维观测器 ẋ̂=Ax̂+Bu+L(y−Cx̂)，对偶 Ackermann 设计 L。拖动观测器带宽 α，看估计 x̂ 追踪真值 x、误差按 A−LC 极点收敛。
- **卡尔曼滤波** —— 匀速运动跟踪的完整 KF：预测 + 校正 + 协方差传播（固定随机种子可复现）。拖动测量/过程噪声滑块，看估计 RMSE 对比测量 RMSE。

## 已验证的数学锚点（对拍记录）

下面每一条都在 `tests/matrix.test.mjs` 里有同类断言（个别数值锚点与示例矩阵不同，验证的是同一条数学性质），CI 每次提交都会跑一遍——不是"当初对过一次"就完事。

- **Ackermann 公式**：2 阶系统期望极点 −2/−4，把算出的 K 代回闭环 A−BK，特征值确为 −2/−4；3 阶能控标准型算得 K=[6, 11, 6]，与教科书逐位一致。另外验 `det(λI−Acl)` 在三个期望极点处残差为 0、在 λ=0 处不为 0（证明极点真的被移动了）
- **能控性矩阵**：A=[[1,1],[0,2]], B=[0;1] → W<sub>c</sub>=[[0,1],[1,2]]，与手算一致
- **能观性矩阵**：A=[[0,1],[−2,−3]]、C=[1,0] 时 W<sub>o</sub>=[[1,0],[0,1]]（页面默认 A=[[1,1],[0,2]] 时 W<sub>o</sub>=[[1,0],[1,1]]，同样满秩）
- **矩阵求逆**：[[1,2],[3,4]]⁻¹=[[−2,1],[1.5,−0.5]] 与手算一致；奇异矩阵返回 falsy 而不硬算
- **秩判别**：线性相关的 [[1,2],[2,4]] 判为秩 1，零矩阵判为秩 0
- **极点 → 多项式**：−2/−3 → [6,5,1]；共轭复极点 −1±2j → [5,2,1]
- **不可控系统**：B 为零向量时 `ackermann` 返回 `null`，不输出一个假 K

界面上的超调量、前置增益 N、卡尔曼 RMSE 属于仿真层的观测值，没有写进自动化断言（它们依赖 RK4 步长与随机种子），保留人工核对：

- 闭环超调 4.6% = e^(−πζ/√(1−ζ²)) 理论值
- 前置增益 N=−1/(C(A−BK)⁻¹B)=9.00，闭环终值精确到 1.00
- 卡尔曼滤波：估计 RMSE 0.248m vs 测量 RMSE 1.425m（提升 83%），速度估计收敛到真值附近

## 内置的矩阵库

原生 JS 实现的线性代数：乘法/转置/加法、**高斯消元求秩**（能控能观判别）、**Gauss-Jordan 求逆**（Ackermann 需要的 W<sub>c</sub>⁻¹）、多项式矩阵求值 φ(A)、RK4 定步长积分。无任何外部库。

> 测试不复制这些代码：`tests/extract.mjs` 每次运行时从 `index.html` 里现切，测的一定是用户实际加载的那份，不会出现"测试和线上代码各走各的"。

## 快速开始

```bash
# 直接双击 index.html，或：
python -m http.server 8123   # 浏览器打开 http://127.0.0.1:8123/
```

## 测试

```bash
node tests/matrix.test.mjs
```

19 条断言覆盖矩阵运算、秩判别与 Ackermann 极点配置（上文对拍记录的自动化部分），需要 Node ≥ 18。测试不复制源码：`tests/extract.mjs` 每次运行时从 `index.html` 里现切，测的一定是用户实际加载的那份。

## 适合谁

- 正在学《现代控制理论》《线性系统理论》的本科生（配合 control-lab 覆盖两门控制课）
- 准备考研复试想快速过一遍状态空间方法核心考点的同学（能控能观判据、极点配置、观测器是高频考点）
- 想直观理解卡尔曼滤波「预测+校正」过程的工程师

## License

MIT
