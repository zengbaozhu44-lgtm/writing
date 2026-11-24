#!/usr/bin/env node
/**
 * OBSERVATION ONLY — 纵向 Story Route Stress Test（生产主链，不改生产代码）
 *
 * 真实 RuntimeOrchestrator（Studio routes.js 同款接线：writer 注入 orchestrator）
 * + authored 双章计划（ch1 含 authored CADE 决策）+ 真实 LLM writer（deepseek 通道）。
 * 跑完只读采集 Truth 工件矩阵：CADE/Intent/Action/WCT/Actual/SR/State/timeline/
 * anchor/章缝读回/续写连续性。
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { RuntimeOrchestrator } from '../packages/inkos-runtime/src/pipeline/orchestrator.js';
import { createLlmWriter } from '../packages/inkos-brain/src/writer/llm-writer.js';
import { writeYaml } from '../packages/inkos-core/src/lib/yaml-store.js';

process.env.INKOS_LLM_API_KEY = '';
process.env.LLM_API_KEY = '';

const FIXTURE = path.resolve('tests/golden-baseline/fixtures/book');
const OUT = path.resolve('tmp-stress');
// 测试层 provider 切换（≠ 生产配置）：deepseek 402 期间用 STRESS_PROVIDER=zhipu（glm-4-flash）
const PROVIDERS = {
  deepseek: { baseUrl: 'https://api.deepseek.com', model: 'deepseek-chat', key: (s) => s.services.deepseek.apiKey },
  zhipu: { baseUrl: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-flash', key: (s) => s.services.zhipu.apiKey },
};
const PROVIDER = PROVIDERS[process.env.STRESS_PROVIDER || 'deepseek'] || PROVIDERS.deepseek;

const CH1 = {
  chapter: 1,
  pov: '林逸',
  goal: '林逸必须在闭馆前拿到封存档案，弄清苏眠给的地图像素从何而来',
  conflict: '档案馆夜间封锁，管理员受雇于镜渊，一旦动手就会触发警报',
  climax: '林逸砸碎档案柜玻璃取出档案，警报炸响，镜渊亲自堵住出口',
  cost: '档案只拿到一半，地图被迫交出',
  hook: '门外汇合后林逸发现地图是假的，而苏眠早该知道',
  scenes: [
    '林逸与苏眠在旧档案馆偏厅会面，苏眠交出半张手绘地图，只说「闭馆前有用」',
    '林逸独自潜入档案区，砸碎档案柜玻璃取出档案，警铃炸响，红外线封锁走廊',
    '镜渊现身出口拦住林逸，逼他交出地图才放行，林逸权衡后交出',
    '林逸脱身后与苏眠在侧门外汇合，比对残页发现地图是假的，苏眠神色闪躲',
  ],
  characterDecisions: [
    {
      characterId: '林逸', actionContent: '砸碎档案柜玻璃取出档案', sceneIndex: 2, decisionKind: 'commits',
      // EO-P4-Correspondence-V2: authored anchors（object/action/terminal 三组）
      anchors: { object: ['卷宗', '档案'], action: ['砸', '玻璃'], terminal: ['抽出', '拖出', '取出'] },
    },
  ],
  wordTarget: 500,
  characterSR: {
    林逸: {
      interpretation: [{ of: '苏眠给的地图', as: '她有所隐瞒，但未必是恶意' }],
      belief: ['管理员不只是一名值夜班的'],
      stance: [{ stance: 'suspects', about: '镜渊与档案馆的关系' }],
    },
  },
};

const CH2 = {
  chapter: 2,
  pov: '林逸',
  goal: '林逸要当面确认苏眠是否从一开始就在骗他，并夺回真图',
  conflict: '苏眠坚称真图已被镜渊调包，而她自己也被人跟踪',
  climax: '两人重回档案馆偏厅，林逸从苏眠的袖口搜出完整的真图',
  cost: '苏眠负气离开，林逸失去唯一的同盟',
  hook: '真图背面写着镜渊的名字和一个日期——母亲死亡当天',
  scenes: [
    '林逸在侧门外拦住正要离开的苏眠，当面摊开假地图质问',
    '苏眠承认地图被动过手脚，但坚称是镜渊调包，两人争执升级',
    '林逸和苏眠重回档案馆偏厅对质，林逸从她袖口搜出完整的真图',
    '苏晚负气离开后，林逸独自看真图，发现背面镜渊的名字与母亲死亡同日的日期',
  ],
  wordTarget: 500,
};

// Batch #1: ch3–ch10 continuing arc（Production Observation Batch Mode）
const CH3 = { chapter:3, pov:'林逸', goal:'林逸独自研究真图与母亲之死的关联，发现镜渊早已存在于母亲的过去', conflict:'真图背面信息指向一场被掩盖的事故，而管理员是当年目击者', climax:'林逸找到管理员老周对质，老周承认当年在场但拒绝说出真相', cost:'老周警告林逸再查会死，镜渊的人已经开始监视他', hook:'老周留下一句话：你母亲不是受害者，她是签字的人', scenes:['林逸独自在出租屋研究真图背面，用放大镜看墨迹发现两层字迹','林逸追查母亲旧档案，发现二十年前档案馆确有一场被封存的事故','林逸在闭馆后堵住老周对质，老周松口承认当年在场但拒绝说更多','老周离开前留下一句话：你母亲不是受害者，她是签字的人'] };
const CH4 = { chapter:4, pov:'林逸', time:'22:30', location:'林逸住处楼下', goal:'苏眠主动回来找林逸，带来镜渊内部的银线暗哨情报', conflict:'林逸不再信任苏眠但她掌握着他没有的信息', climax:'两人情报拼接后确认：镜渊在档案馆地下有第二个封存区', cost:'苏眠承认她替镜渊做过一次事——换回弟弟', hook:'地下封存区的编号与林逸母亲签字的档案编号一致', scenes:['苏眠深夜出现在林逸住处楼下，带着一份银线暗哨分布图','林逸冷面对质上次欺骗，苏眠说出交换条件：她替镜渊做过一次事','两人拼接情报确认地下封存区存在，入口在旧锅炉房','苏眠说出编号：与林逸母亲签字的档案编号一致'] };
const CH5 = { chapter:5, pov:'林逸', goal:'林逸与苏眠潜入地下封存区，找到母亲签字的原始档案', conflict:'封存区有独立安保系统且镜渊的人可能已在等候', climax:'林逸找到档案——一份事故责任认定书，母亲签在证人栏', cost:'档案被拿走的瞬间警报触发，两人被迫分头逃出', hook:'认定书上有三个签名：母亲、镜渊、以及一个被涂黑的名字', scenes:['两人从旧锅炉房管道进入地下封存区，苏眠负责破除门禁','封存区内部规模远超预期，林逸按编号找到目标档案柜','林逸取出档案看到责任认定书——母亲签在证人栏非责任栏','警报触发两人分头撤离，林逸将认定书折入内袋'] };
const CH6 = { chapter:6, pov:'林逸', goal:'林逸独自鉴定认定书真伪，发现涂黑签名可用紫外线复原', conflict:'复原需要专业设备，唯一来源是镜渊控制的检测室', climax:'林逸冒险潜入检测室复原签名——是苏眠的父亲', cost:'镜渊的人拍到了林逸进入检测室的画面', hook:'苏眠从未提过她父亲与事故的关联', scenes:['林逸在旧书店用简易紫外灯初试——涂黑处有残留墨迹','唯一能完整复原的设备在镜渊控制的检测室','林逸冒险潜入检测室完成紫外线摄影','复原出的签名让林逸僵在原地：是苏眠的父亲'] };
const CH7 = { chapter:7, pov:'林逸', time:'06:15', location:'苏眠住处楼下', goal:'林逸带着复原证据去找苏眠，要求她解释父亲的角色', conflict:'苏眠可能从一开始就知道全部真相', climax:'苏眠崩溃承认：她父亲是事故责任人，她接近林逸是镜渊安排的', cost:'两人关系彻底破裂', hook:'苏眠说她弟弟还在镜渊手里——她别无选择', scenes:['林逸在苏眠住处楼下等了一夜，把复原照片递给她','苏眠看到父亲签名后沉默了很久，然后开始发抖','苏眠承认全部：父亲是责任人，接近林逸是镜渊的安排','苏眠说她弟弟还在镜渊手里，她从头到尾没有选择'] };
const CH8 = { chapter:8, pov:'林逸', goal:'林逸独自策划营救苏眠弟弟并同时扳倒镜渊', conflict:'镜渊已经知道林逸掌握了认定书，双方都在争时间', climax:'林逸发现镜渊的目标不是掩盖事故而是地下封存区里的东西', cost:'老周在帮助林逸时被镜渊的人带走', hook:'封存区最深处还有一扇门，编号是林逸母亲的工号', scenes:['林逸独自勘察镜渊据点，绘制出苏眠弟弟被关的位置','老周冒险提供内部通道图，但警告林逸别开最深处那扇门','林逸发现镜渊近期增派了人手守护封存区最深处','老周被镜渊的人带走，临走前将一张旧工牌塞进林逸口袋'] };
const CH9 = { chapter:9, pov:'林逸', goal:'林逸独自潜入封存区最深处，用工牌打开母亲编号的门', conflict:'镜渊已在门后等候，这不是追逐而是邀请', climax:'门后是母亲的实验室——她不是签字证人，她是负责人', cost:'林逸的认知框架彻底崩塌', hook:'镜渊说：她没有被害，她是自愿消失的', scenes:['林逸用老周的工牌通过三道门禁进入最深处','门后是一间完好保存的实验室，设备上贴着母亲的标签','镜渊坐在实验室中央等候——他说是你母亲让我等你','镜渊说出真相：她没有被害，她是自愿消失的'] };
const CH10 = { chapter:10, pov:'林逸', time:'03:40', location:'封存区最深处实验室', goal:'林逸面对真相必须做出选择：公开事故还是接受母亲的遗愿', conflict:'公开意味着苏眠弟弟会死，不公开意味着镜渊继续掌控一切', climax:'林逸在实验室找到母亲留下的录音带，听到她最后的决定', cost:'无论选什么，都有人要为此付出代价', hook:'录音带最后一句：林逸，原谅妈妈，但不要打开那扇门', scenes:['林逸在崩溃后检查实验室，找到母亲藏匿的录音带','录音带前半段是事故经过——母亲为救人签下了封存协议','录音带后半段是给林逸的话——她解释了为什么必须消失','录音带最后一句让林逸停在原地：不要打开那扇门'] };

const ALL_CHAPTERS = { 1: CH1, 2: CH2, 3: CH3, 4: CH4, 5: CH5, 6: CH6, 7: CH7, 8: CH8, 9: CH9, 10: CH10 };

function makeBook() {
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'inkos-stress-'));
  fs.cpSync(FIXTURE, workDir, { recursive: true });
  const planDir = path.join(workDir, 'novel', '_system', 'chapter_plans');
  fs.mkdirSync(planDir, { recursive: true });
  writeYaml(path.join(planDir, 'chapter_0001.yaml'), CH1);
  writeYaml(path.join(planDir, 'chapter_0002.yaml'), CH2);
  for (let ch = 3; ch <= 10; ch += 1) {
    if (ALL_CHAPTERS[ch]) writeYaml(path.join(planDir, `chapter_${String(ch).padStart(4, '0')}.yaml`), ALL_CHAPTERS[ch]);
  }
  // WL-01: authored 07_state_board + 05_relationship_graph + CW seed 增补
  if (process.env.STRESS_WL01 === '1') {
    // 07 State Board
    fs.writeFileSync(path.join(workDir, 'novel', '07_state_board.md'), `# 07 State Board · 第 3 章后

> 整个世界当前状态。各势力此刻在干什么。每章更新。

## 都市守夜人
- **正在调查/执行**：追踪非法进入封存区的异能者；监控裂隙带周边活动
- **下一步**：增派封存区外围巡逻；排查内鬼

## 档案馆
- **正在运行**：闭馆时间 17:00；老周值夜班（18:00–06:00）；红外二级警报系统已启动
- **当前状态**：三楼东侧封存区门禁每 15 分钟刷新；电梯闭馆后锁定

## 林逸
- **目前计划**：查清母亲真相
- **不知道**：镜渊与母亲的完整关系；录音带的存在

## 苏眠
- **目前状态**：被银线暗哨跟踪中；弟弟仍被镜渊控制
`);
    // 05 Relationship Graph
    writeYaml(path.join(workDir, 'novel', '05_relationship_graph.yaml'), {
      meta: { version: 1 },
      edges: [
        { from: '林逸', to: '苏眠', relation: '被迫同盟', trust: 'low', note: '多次欺骗后勉强合作' },
        { from: '林逸', to: '老周', relation: '临时信任', trust: 'medium', note: '老周多次冒险提供情报' },
        { from: '镜渊', to: '林逸', relation: '观察对象', trust: 'none', note: '镜渊主动引导林逸接近真相' },
        { from: '苏眠', to: '镜渊', relation: '被迫服从', trust: 'none', note: '弟弟在镜渊手中' },
      ],
    });
  }
  // EO-CW-Store-Seed-01 / Projection-01 生产集成：可选 authored seed 注入（STRESS_CW_SEED=1）
  if (process.env.STRESS_CW_SEED === '1') {
    writeYaml(path.join(workDir, 'novel', '_system', 'character_world_seeds.yaml'), {
      version: 'character-world-seed-1',
      experiences: [
        { id: 'exp_a1', characterId: '林逸', text: '过去多次与管理员因档案馆权限发生冲突' },
        { id: 'exp_b1', characterId: '苏眠', text: '与管理员日常相处正常，只在白天来馆' },
      ],
      characters: {
        林逸: {
          knowledge: [
            { info: '管理员对档案区的看管远超职责', basis: 'past_experience', basisRef: 'exp_a1' },
            ...(process.env.STRESS_WL01 === '1'
              ? [{ info: '老周在档案馆干了十几年夜班，从不多问', basis: 'past_experience', basisRef: 'exp_a1' }]
              : []),
          ],
          belief: [{ proposition: '管理员在替什么人守着档案区', basis: 'inferred_from_known', basisRef: 'exp_a1' }],
          stance: [{ stance: 'suspects', about: '管理员与镜渊的关系', basis: 'inferred_from_known', basisRef: 'exp_a1' }],
          unknown: ['管理员为什么换锁'],
          formations_seal: [
            { kind: 'belief', content: '档案区藏着不该被人看见的东西' },
          ],
        },
        苏眠: {
          knowledge: [{ info: '档案馆闭馆后只剩管理员值守', basis: 'told_by', basisRef: 'exp_b1' }],
          belief: [{ proposition: '管理员只是按章办事', basis: 'past_experience', basisRef: 'exp_b1' }],
          stance: [{ stance: 'believes', about: '管理员的为人', basis: 'past_experience', basisRef: 'exp_b1' }],
        },
      },
    });
  }
  // WL-03: authored 15_npc_simulation（NPC 场外动向 · 世界层）+ 老周角色档（roster 门控前提）
  if (process.env.STRESS_WL03 === '1') {
    fs.writeFileSync(path.join(workDir, 'novel', '03_character_bible', '老周.md'), `# 老周

档案馆夜班管理员，干了十几年。当年事故的目击者。
- 公开身份：夜班管理员（18:00–06:00）
- 与林逸：临时信任，多次冒险提供情报
- 与镜渊：被迫配合，心怀恐惧
`);
    writeYaml(path.join(workDir, 'novel', '15_npc_simulation.yaml'), {
      meta: { last_simulated_day: 4 },
      npcs: [
        { name: '苏眠', day: 4, today_goal: '整理银线暗哨的跟踪规律，找出甩掉他们的固定窗口', plan_location: '灰桥区旧邮局二楼', may_meet: ['林逸'], plan_changed: false, world_impact: '暗哨盯梢升级，档案馆外围多了两张生面孔' },
        { name: '镜渊', day: 4, today_goal: '调阅地下封存区门禁日志，排查上周非法进入者', plan_location: '档案馆地下二层', may_meet: ['老周'], plan_changed: true, world_impact: '封存区最深处那扇门的巡逻频次翻倍' },
        { name: '老周', day: 4, today_goal: '值完夜班，把二十年前的旧值班记录从销毁清单里抽出来藏好', plan_location: '档案馆一层值班室', may_meet: ['镜渊'], plan_changed: false, world_impact: '销毁清单缺了一页，没人注意到' },
      ],
    });
  }
  // WL-04: authored faction（04_faction_bible）—— faction wiring 已在（detectFactions→compiler），
  // 生产内容失配（fixture 势力为异世界名，从不出现在 story corpus）→ 作者通道补匹配内容的势力档
  if (process.env.STRESS_WL04 === '1') {
    fs.writeFileSync(path.join(workDir, 'novel', '04_faction_bible', '都市守夜人.md'), `# 都市守夜人

裂隙都市的官方异常事务管理机构。编制外的夜巡体系。
- 追踪非法进入封存区的异能者；监控裂隙带周边活动
- 对镜渊：长期怀疑其与二十年前的档案馆事故有关，缺实证
- 对林逸：档案里标注为「观察对象」，尚未定性
- 行事方式：不主动接触平民，只在事发后收尾
`);
    fs.writeFileSync(path.join(workDir, 'novel', '04_faction_bible', '档案馆.md'), `# 档案馆

表面是公共文化机构，地下封存区由镜渊实际控制。
- 闭馆 17:00；夜班仅一名管理员（老周）
- 三楼东侧封存区门禁每 15 分钟刷新；地下二层有独立安保
- 对外口径：地下区域是设备层，不对外开放
`);
  }
  return workDir;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const workDir = makeBook();
  console.log('[stress] workDir =', workDir);

  const secrets = JSON.parse(fs.readFileSync('books/我的小说/.inkos/secrets.json', 'utf8'));
  const writer = createLlmWriter({
    ...PROVIDER,
    apiKey: PROVIDER.key(secrets),
    maxTokens: 2000,
    temperature: 0.85,
  });

  const runtime = new RuntimeOrchestrator(workDir, {
    writer,
    force: true,
    noAutoNext: true,
    // Phase 1.3 opt-in：STRESS_EXTRACTION=1 启用 LLM-assisted 提取（deepseek 通道）
    ...(process.env.STRESS_EXTRACTION === '1'
      ? { extraction: 'llm-assisted', extractionLlm: { ...PROVIDER, apiKey: PROVIDER.key(secrets) } }
      : {}),
  });
  const results = {};
  const chapters = process.env.STRESS_ONLY_CH
    ? [Number(process.env.STRESS_ONLY_CH)]
    : (process.env.STRESS_BATCH === '1' ? [1,2,3,4,5,6,7,8,9,10] : [1, 2]);
  for (const ch of chapters) {
    console.log(`\n===== runChapter ch${ch} =====`);
    try {
      results[ch] = await runtime.runChapter({ chapter: ch, force: true, noAutoNext: true });
      console.log(`[stress] ch${ch} pass=${results[ch]?.pass}`);
    } catch (e) {
      console.error(`[stress] ch${ch} FAILED:`, e?.message || e);
      results[ch] = { error: String(e?.message || e) };
      if (ch === 1 && process.env.STRESS_BATCH !== '1') break;
    }
  }
  fs.writeFileSync(path.join(OUT, 'workdir.txt'), workDir);
  fs.writeFileSync(path.join(OUT, 'run-results.json'), JSON.stringify({
    ch1: { pass: results[1]?.pass ?? null, error: results[1]?.error ?? null },
    ch2: { pass: results[2]?.pass ?? null, error: results[2]?.error ?? null },
  }, null, 2));
  console.log('\n[stress] done →', OUT);
}

main().catch((e) => { console.error(e); process.exit(1); });
