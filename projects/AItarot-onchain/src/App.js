// 文件：src/App.js
import React, { useState } from "react";
import axios from "axios";

// --- 配置 DeepSeek API Key
const DEEPSEEK_API_KEY = process.env.REACT_APP_DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";


// 所有牌阵配置
const ALL_CATEGORIES = [
  {
    label: "工作/创业",
    value: "work",
    spreads: [
      {
        label: "创业评估牌阵",
        value: "startup",
        positions: ["创业方向", "资金来源", "合伙关系", "客户设定", "店面区域定位", "事业前景"],
      },
      {
        label: "求职评估牌阵",
        value: "jobsearch",
        positions: ["工作性质", "工作地点", "薪资要求", "求职渠道", "求职趋势", "可以改进的地方"],
      },
      {
        label: "工作评估牌阵",
        value: "job",
        positions: ["能否胜任", "假期福利", "财务收入", "主管相处", "同事相处", "升迁加薪"],
      },
      {
        label: "工作二选一牌阵",
        value: "work2choose1",
        positions: ["当前自身状态", "选择A的状况", "选择A的影响", "选择B的状况", "选择B的影响"],
      },
    ],
  },
  {
    label: "人际关系",
    value: "relation",
    spreads: [
      {
        label: "人际关系牌阵",
        value: "relation",
        positions: ["你如何看待他", "他如何看待你", "两人相处的关系", "未来关系的发展"],
      },
      {
        label: "危机救援牌阵",
        value: "crisis",
        positions: ["发生争吵的问题点", "日常相处状况", "沟通方式", "如何化解纷争"],
      },
    ],
  },
  {
    label: "爱情",
    value: "love",
    spreads: [
      {
        label: "摆脱单身牌阵",
        value: "single",
        positions: ["没有对象的原因", "可以改进的地方", "可能找到对象的渠道"],
      },
      {
        label: "突破暧昧牌阵",
        value: "ambiguous",
        positions: ["自己本身的状况", "你对他的看法", "他对你的看法", "如何告白容易成功", "可能有阻碍", "他心中是否有别人"],
      },
      {
        label: "缘分检测牌阵",
        value: "bond",
        positions: ["你对关系的看法", "他对关系的看法", "彼此心灵契合", "是否有第三者", "缘分发展的前景"],
      },
      {
        label: "亲密关系牌阵",
        value: "intimacy",
        positions: ["金钱与价值观", "沟通方式", "日常相处", "性吸引力", "心灵契合", "与对方家人的关系", "未来发展前景"],
      },
    ],
  },
  {
    label: "财运",
    value: "wealth",
    spreads: [
      {
        label: "财富六芒星牌阵",
        value: "wealth6",
        positions: [
          "当前财务状况",
          "收入来源",
          "支出/负担",
          "投资与增长",
          "潜在风险",
          "财富发展建议",
        ],
      },
      {
        label: "财富三张牌阵",
        value: "wealth3",
        positions: ["当前财运", "阻碍/挑战", "机遇/建议"],
      },
      {
        label: "财富流动牌阵",
        value: "flow",
        positions: [
          "近期正财运",
          "偏财/意外之财",
          "财富流失的原因",
          "财富增长的机会",
          "需要警惕的问题",
          "财富能量的整体流向",
        ],
      },
    ],
  },
];

function getFreeCount() {
  // 每天重置，localStorage简单防刷
  const today = new Date().toISOString().slice(0, 10);
  const data = JSON.parse(localStorage.getItem("freeTarot") || "{}");
  if (data.date !== today) return 0;
  return data.count || 0;
}
function incFreeCount() {
  const today = new Date().toISOString().slice(0, 10);
  const data = JSON.parse(localStorage.getItem("freeTarot") || "{}");
  localStorage.setItem("freeTarot", JSON.stringify({ date: today, count: (data.count || 0) + 1 }));
}

export default function App() {
  const [category, setCategory] = useState(ALL_CATEGORIES[0]);
  const [spread, setSpread] = useState(category.spreads[0]);
  const [question, setQuestion] = useState("");
  const [drawnCards, setDrawnCards] = useState([]);
  const [aiResult, setAIResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [freeUsed, setFreeUsed] = useState(getFreeCount() >= 1);

  // 卡牌池（可扩展正逆位和牌名，demo为英文大阿尔克那）
  const tarotCards = [
    "愚人", "魔术师", "女祭司", "女皇", "皇帝", "教皇", "恋人", "战车", "力量", "隐士", "命运之轮", "正义", "倒吊人", "死神", "节制", "恶魔", "高塔", "星星", "月亮", "太阳", "审判", "世界"
  ];
  // 随机抽牌
  function drawCards(num) {
    const cards = [];
    for (let i = 0; i < num; i++) {
      const idx = Math.floor(Math.random() * tarotCards.length);
      const upright = Math.random() > 0.5 ? "正位" : "逆位";
      cards.push({ name: tarotCards[idx], position: upright });
    }
    setDrawnCards(cards);
    setAIResult("");
  }

// AI解读
async function handleAI() {
  setLoading(true);
  setAIResult("AI智能分析生成中…");

  // 组 prompt
  const spreadText = spread.positions
    .map((pos, i) => `${pos}: ${drawnCards[i]?.name || ""}（${drawnCards[i]?.position || ""}）`)
    .join("\n");

  const prompt = `你是一名资深的中文塔罗牌解读大师。请根据下述用户主题、抽到的牌阵（每张牌含正逆位）、各牌位意义，生成一段详细、针对性强的原创塔罗占卜解读。要求：
- 解读内容要结合用户具体问题和各牌位的含义；
- 不要仅仅罗列每张牌的几个关键字；
- 分点分析每张牌对应的现实含义，并在结尾给出综合建议；
- 语言风格生活化、自然、温暖，并避免与市面塔罗书原文雷同；
- 遇到含义模糊或多解的牌，也要结合牌阵、上下文和用户提问灵活推理。
用户提问：【${question}】
所用牌阵：【${spread.label}】
各牌如下：
${spreadText}
请生成详细占卜分析（至少300字），并给出可行动建议。`;

  try {
    const { data } = await axios.post(DEEPSEEK_API_URL, {
      model: "deepseek-chat",
      messages: [
        { role: "system", content: "你是专业的中文塔罗牌解读AI。" },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1800,
    }, {
      headers: {
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        "Content-Type": "application/json"
      }
    });

    console.log("API响应:", data);

    const result =
      data.choices?.[0]?.message?.content ||
      data.choices?.[0]?.text ||
      "解读失败，请重试";
    setAIResult(result);

  } catch (e) {
    console.error("API调用错误:", e);
    setAIResult(
      `调用AI失败：${e?.response?.data?.message || e?.message || "未知错误"}`
    );
  }

  setLoading(false);
  incFreeCount();
  setFreeUsed(true);
}


  // 支付按钮占位（可接入合约或钱包支付逻辑）
  function handlePay() {
    alert("支付入口占位：集成钱包、合约，支付完成后可解锁今日更多解读。");
  }

  // 导航和牌阵切换
  function handleCategoryChange(val) {
    const cat = ALL_CATEGORIES.find((v) => v.value === val);
    setCategory(cat);
    setSpread(cat.spreads[0]);
    setDrawnCards([]);
    setAIResult("");
  }
  function handleSpreadChange(val) {
    const sp = category.spreads.find((v) => v.value === val);
    setSpread(sp);
    setDrawnCards([]);
    setAIResult("");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 p-4">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-4 text-center">AI链上塔罗占卜</h1>
        {/* 主题导航 */}
        <div className="flex gap-4 mb-4">
          {ALL_CATEGORIES.map((c) => (
            <button key={c.value}
              className={`px-3 py-2 rounded-lg ${category.value === c.value ? "bg-blue-200 font-bold" : "bg-gray-100"}`}
              onClick={() => handleCategoryChange(c.value)}
            >{c.label}</button>
          ))}
        </div>
        {/* 牌阵选择 */}
        <div className="flex gap-3 items-center mb-4">
          <span>请选择牌阵：</span>
          <select className="border rounded px-2 py-1"
            value={spread.value}
            onChange={e => handleSpreadChange(e.target.value)}
          >
            {category.spreads.map(sp => (
              <option value={sp.value} key={sp.value}>{sp.label}</option>
            ))}
          </select>
        </div>
        {/* 占卜问题 */}
        <div className="mb-3">
          <input className="w-full border px-3 py-2 rounded-lg"
            placeholder="请输入你要占卜的问题（如：下半年我的工作运如何？）"
            value={question}
            onChange={e => setQuestion(e.target.value)}
          />
        </div>
        {/* 抽牌按钮 */}
        <div className="mb-4">
          <button className="bg-indigo-500 text-white px-5 py-2 rounded-xl shadow"
            onClick={() => drawCards(spread.positions.length)}
          >点击抽牌</button>
        </div>
        {/* 展示抽牌结果 */}
        {drawnCards.length > 0 && (
          <div className="mb-4">
            <div className="grid grid-cols-2 gap-2">
              {spread.positions.map((pos, i) => (
                <div key={i} className="bg-gray-50 p-2 rounded shadow">
                  <div className="font-semibold">{pos}</div>
                  <div className="text-lg">{drawnCards[i]?.name} <span className="text-xs">{drawnCards[i]?.position}</span></div>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* AI解读 & 付费判断 */}
        {drawnCards.length > 0 && (
          <>
            {!freeUsed ? (
              <button className="bg-green-600 text-white px-6 py-2 rounded-xl shadow-lg"
                onClick={handleAI}
                disabled={loading}
              >{loading ? "AI智能分析中..." : "免费AI解读（每日一次）"}</button>
            ) : (
              <button className="bg-yellow-400 text-black px-6 py-2 rounded-xl shadow-lg"
                onClick={handlePay}
              >支付解锁更多占卜（支持加密货币）</button>
            )}
          </>
        )}
        {/* AI结果 */}
        {aiResult && (
          <div className="mt-6 bg-gray-50 border rounded-xl p-4 text-gray-800 whitespace-pre-line shadow">
            <strong>AI解读：</strong>
            <div>{aiResult}</div>
          </div>
        )}
        {/* 底部免责声明 */}
        <div className="mt-10 text-xs text-gray-500 text-center">
          部分牌阵结构与灵感参考自多本经典塔罗教材，所有解读均由AI实时生成，仅供学习娱乐，不构成任何专业建议。
        </div>
      </div>
    </div>
  );
}
