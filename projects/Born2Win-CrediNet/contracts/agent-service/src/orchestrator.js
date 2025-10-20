// 编排/路由占位：可替换为 CrewAI/LangChain 真实实现
export function routeJob({ job, agentProfiles, minAvgScore = 70, preferredValidator }) {
  // 简化：按技能匹配 + 平均分/白名单过滤
  const candidates = agentProfiles
    .filter(a => a.skills?.some(s => job.tags?.includes(s)))
    .filter(a => (a.averageScore ?? 100) >= minAvgScore)
    .sort((a,b) => (b.averageScore ?? 0) - (a.averageScore ?? 0));
  return { selected: candidates[0], candidates };
}

export async function planExecution({ job, agent }) {
  // 简化：返回步骤计划
  return [
    { step: 'fetch_inputs', desc: '拉取输入数据' },
    { step: 'process', desc: `使用 ${agent.name} 能力处理` },
    { step: 'package', desc: '打包生成验证包（requestUri/hash）' }
  ];
}


