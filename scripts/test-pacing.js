/**
 * @inkos/director/pacing 单元验证
 */
import { analyzePacing, persistPacingReport } from '../packages/inkos-director/pacing/index.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const scene = { index: 1, id: 'ch1_s1', goal: '抉择', conflict: '系统拒药' };

const explainOnly = `
2055 年的城市在算法下运行。天空是灰蓝色的，空气里带着消毒水的味道。街道两侧是整齐的玻璃幕墙，阳光被过滤成一种柔和的白。系统每天推送最优路线，健康评分决定你能买什么、住哪里。这是一个被精密优化的未来，每个人都生活在数据编织的网里。历史告诉我们这种秩序源于上世纪末的协议与算法机制。城市的轮廓在晨雾中缓缓展开，远处的建筑群像沉默的纪念碑。空气里弥漫着一种被过滤过的清新，温度湿度都由中央系统调节。人们习惯了这种便利，很少去想背后的规则意味着什么。因此整个社会呈现出一种表面上的稳定，本质上却是被精密计算的平衡。所谓个体选择，指的是在系统给出的选项里挑选最优解。背景是这样形成的：算法接管了交通、医疗、教育和信用。机制确保了效率，协议约束了越界行为。设定上的铁律是任何偏离都会被评分系统记录。世界观在此展开，像一层透明的罩子扣在每个人肩上。所谓效率，意味着个体必须服从全局最优。因此每一次选择都被记录，每一个偏差都会被修正。这意味着自由只是一种被允许范围内的幻觉。
`;

const good = `
林晓推开维修舱门，工具箱砸在脚边。

「还有几台？」调度 AI 问。

「三台。」他抹汗，「但我女儿的药——」

「规则优先。」AI 打断他。

林晓攥紧扳手——系统还在加码，他必须在维修与授权之间选一条路。

他转向最后一台机器人，芯片里跳出未加密日志。林晓盯着屏幕，指尖发冷——他到底该上报，还是假装没看见？
`;

const bad = analyzePacing(explainOnly, scene);
const ok = analyzePacing(good, scene);

console.log('bad pacing pass', bad.pass, 'failures', bad.failures.length);
console.log('good pacing pass', ok.pass);
console.log('report keys', Object.keys(bad.report));

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'inkos-pacing-'));
const file = persistPacingReport(tmp, 1, scene, bad.report);
console.log('report file', file, 'exists', fs.existsSync(file));

if (!bad.report.rules?.eventBand) {
  console.error('FAIL: report missing rules');
  process.exit(1);
}
if (bad.pass) {
  console.error('FAIL: explain-only should fail pacing');
  process.exit(1);
}
if (!ok.pass) {
  console.error('FAIL: good scene should pass pacing', ok.failures);
  process.exit(1);
}
if (!file?.endsWith('pacing_report.json')) {
  console.error('FAIL: pacing_report.json not written');
  process.exit(1);
}
console.log('OK');
