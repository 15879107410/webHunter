import type {
  AnalysisInputSnapshot,
  AnalysisResult,
  BookmarkRecord,
  FavoriteItem,
  FilterOption,
  ResearchCard,
  WorkspaceStat
} from "@webhunter/shared";

export const navItems = [
  { label: "探索", href: "/" },
  { label: "结果", href: "/results" },
  { label: "灵感", href: "/inspiration" },
  { label: "定价", href: "/pricing" }
];

export const exampleSites = ["gumroad.com", "notion.so", "linear.app"];

export const recentResearch: ResearchCard[] = [
  {
    id: "cal",
    name: "cal.com",
    domain: "cal.com",
    category: "生产力",
    summary: "开源日程管理基础设施，旨在简化全球范围内的预订操作。",
    tags: ["PLG 模型", "SaaS"],
    analyzedAt: "2026-03-26T08:30:00.000Z",
    pageCount: 3,
    analysisMode: "rules"
  },
  {
    id: "framer",
    name: "framer.com",
    domain: "framer.com",
    category: "设计工具",
    summary: "专业的网站构建工具，专注于高保真动画和极致速度。",
    tags: ["订阅制", "创意类"],
    analyzedAt: "2026-03-25T12:00:00.000Z",
    pageCount: 3,
    analysisMode: "rules"
  },
  {
    id: "reflect",
    name: "reflect.app",
    domain: "reflect.app",
    category: "笔记应用",
    summary: "网络化思考与笔记工具，优先考虑隐私保护和响应速度。",
    tags: ["高级付费", "工具类"],
    analyzedAt: "2026-03-24T10:15:00.000Z",
    pageCount: 2,
    analysisMode: "rules"
  },
  {
    id: "raycast",
    name: "raycast.com",
    domain: "raycast.com",
    category: "开发工具",
    summary: "适用于 macOS 的可扩展启动器，通过快捷键大幅提升效率。",
    tags: ["Freemium", "MacOS"],
    analyzedAt: "2026-03-23T15:45:00.000Z",
    pageCount: 4,
    analysisMode: "rules"
  }
];

export const recentFavorites: FavoriteItem[] = [
  {
    id: "stripe",
    name: "Stripe",
    summary: "全球在线支付基础设施。",
    opportunityLevel: "高潜力",
    pricingModel: "交易抽成 (Usage-based)",
    savedAt: "2024-03-20"
  },
  {
    id: "cursor",
    name: "Cursor",
    summary: "基于 AI 的现代代码编辑器。",
    opportunityLevel: "爆发式",
    pricingModel: "SaaS (订阅制)",
    savedAt: "2024-03-24"
  },
  {
    id: "perplexity",
    name: "Perplexity",
    summary: "AI 搜索与研究助手。",
    opportunityLevel: "高热度",
    pricingModel: "Freemium",
    savedAt: "2024-03-26"
  }
];

export const analysisResults: Record<string, AnalysisResult> = {
  runable: {
    id: "runable",
    siteName: "runable.com",
    siteUrl: "https://www.runable.com",
    statusLabel: "实时分析",
    meta: {
      analyzedAt: "2026-03-27T10:20:00.000Z",
      pageCount: 3,
      pageTypes: ["home", "pricing", "faq"],
      analysisMode: "rules"
    },
    summary:
      "这是一个给开发团队用的临时环境平台，帮他们不用反复折腾预发布环境，就能快速测试和协作。",
    categories: ["SaaS", "B2B", "高速增长"],
    decisionCards: [
      { label: "市场机会", value: "中高，有细分切口", tone: "positive" },
      { label: "竞争强度", value: "中等偏高", tone: "warning" },
      { label: "是否建议做", value: "建议避开大盘，切垂直场景", tone: "positive" }
    ],
    coreFeatures: ["即时环境克隆", "GitHub/GitLab 深度集成", "自动数据脱敏"],
    coreValue: "开发效率 + 更少的环境配置成本 + 更快的协作速度",
    targetUsers: ["DevOps 工程师", "后端开发人员", "CTO 与创始人"],
    marketOpportunity: [
      { title: "市场大小", content: "全球开发者工具市场，十亿美金级" },
      { title: "竞争强度", content: "高（Vercel, Railway 等竞争对手）" },
      { title: "红海/细分机会", content: "复杂后端环境与数据合规" },
      { title: "风险提示", content: "云厂商原生工具的替代风险" }
    ],
    pricing: {
      startingPrice: "$49",
      pricePoints: ["$49", "$199", "$499", "$999"],
      plans: [
        { label: "Starter", price: "$49" },
        { label: "Team", price: "$199" },
        { label: "Growth", price: "$499" },
        { label: "Enterprise", price: "$999" }
      ],
      billingCycle: "月付 & 年付",
      trial: "14 天免费试用",
      model: "基于用量的 SaaS",
      whyPricingWorks:
        "这种产品按月收费成立的原因，是它替用户省下来的研发协作成本，通常远高于工具订阅费。"
    },
    growthInsights: [
      {
        title: "为什么用户付费？",
        content:
          "主要是为了速度。开发人员在基础设施设置上花费的时间成本远高于每月的订阅费。对于工程主管来说，这是一项“买个心安”的支出。"
      },
      {
        title: "市场切入点建议",
        content:
          "领域极度垂直但在不断扩张。虽然 Vercel 统治了前端，但复杂的后端密集型环境仍未得到充分服务。在企业合规性领域具有高增长潜力。"
      }
    ],
    buildAdvice: [
      {
        title: "专注于合规性",
        content:
          "从为 HIPAA 或金融科技公司提供“安全临时环境”切入，这些公司的标准工具往往无法通过审计。"
      },
      {
        title: "垂直行业集成",
        content: "专门为数据科学团队（有重度 GPU 需求）构建，而不是通用的 Web 开发人员。"
      }
    ],
    similarProducts: [
      { name: "Vercel", status: "planned" },
      { name: "Railway", status: "planned" },
      { name: "Render", status: "planned" },
      { name: "Heroku", status: "planned" }
    ],
    evidenceGroups: [
      {
        level: "explicit",
        title: "明确可见",
        items: [
          {
            title: "关键要素",
            detail: "首页文案、Pricing 层级、CTA 样式",
            snippet: "\"Start free trial\" snippet found"
          },
          {
            title: "FAQ 信息",
            detail: "确认了对于 GitHub/GitLab 的原生支持深度"
          }
        ]
      },
      {
        level: "inferred",
        title: "高概率判断",
        items: [
          {
            title: "增长模式推断",
            detail: "根据页面结构和免费试用流程推断它偏 PLG 驱动"
          }
        ]
      },
      {
        level: "strategy",
        title: "策略建议",
        items: [
          {
            title: "差异化方向",
            detail: "系统给出的创业切入方向，基于当前市场细分空缺生成"
          }
        ]
      }
    ],
    evidenceSnapshots: [
      { title: "落地页片段", detail: "“部署只需几秒，而非几小时。”" },
      { title: "定价页数据", detail: "检测到 3 个层级：初创、团队、企业。" },
      { title: "客户证言", detail: "“将我们的 CI/CD 管道时间缩短了 40%。”" }
    ]
  }
};

export const analysisInputs: Record<string, AnalysisInputSnapshot> = {
  runable: {
    siteUrl: "https://www.runable.com",
    siteName: "runable.com",
    pages: [
      {
        url: "https://www.runable.com",
        pageType: "home",
        title: "Runable | Ephemeral environments for backend teams",
        description: "Create secure preview environments for complex backend systems without repetitive setup.",
        headings: ["Ephemeral environments", "Ship faster with less setup", "Built for backend-heavy teams"],
        ctas: ["Start free trial", "Book demo"],
        excerpt: "Runable helps engineering teams spin up temporary environments quickly so testing and collaboration do not depend on painful infra setup."
      },
      {
        url: "https://www.runable.com/pricing",
        pageType: "pricing",
        title: "Pricing | Runable",
        description: "Plans for startups, teams and enterprise organizations.",
        headings: ["Pricing", "Startups", "Teams", "Enterprise"],
        ctas: ["Start free trial", "Contact sales"],
        excerpt: "Pricing indicates a startup, team and enterprise plan structure with trial-driven acquisition and custom enterprise motion."
      },
      {
        url: "https://www.runable.com/faq",
        pageType: "faq",
        title: "FAQ | Runable",
        description: "Answers about GitHub, GitLab, security and environment isolation.",
        headings: ["FAQ", "GitHub and GitLab support", "Security and masking"],
        ctas: ["Talk to sales"],
        excerpt: "FAQ content emphasizes GitHub and GitLab integration, security controls and masking for production-like environments."
      }
    ],
    combinedText:
      "Runable helps engineering teams create secure ephemeral environments for backend-heavy systems. Start free trial. Book demo. Pricing includes startup, teams and enterprise. GitHub and GitLab integrations. Security and masking for production-like data."
  }
};

export const workspaceStats: WorkspaceStat[] = [
  { label: "已收藏 24", value: "24" },
  { label: "高潜力 6", value: "6", tone: "positive" },
  { label: "待复盘 8", value: "8", tone: "warning" }
];

export const filterOptions: FilterOption[] = [
  { label: "全部", active: true },
  { label: "SaaS" },
  { label: "AI 工具" },
  { label: "B2B" },
  { label: "B2C" },
  { label: "Freemium" },
  { label: "高潜力" },
  { label: "红海" },
  { label: "值得抄" },
  { label: "待研究" }
];

export const workspaceRecords: BookmarkRecord[] = [
  {
    id: "nexusflow",
    name: "NexusFlow AI",
    domain: "nexusflow.io",
    label: "高潜力",
    oneLiner: "AI 驱动的企业采购自动化 SaaS",
    pricingModel: "订阅制 (199$/mo 起)",
    targetUsers: "中大型企业采购部门负责人",
    opportunityLevel: "A+ (刚需)",
    note: "场景刚需，但竞争不小，适合做垂直行业版（如针对制造业）。"
  },
  {
    id: "lumina",
    name: "Lumina Studio",
    domain: "lumina.design",
    label: "待复盘",
    oneLiner: "精品化 AI 创意资产托管服务",
    pricingModel: "按项目收费 (High-ticket)",
    targetUsers: "注重品牌调性的 DTC 品牌商",
    opportunityLevel: "B (红海但有利润)",
    note: "交付门槛高，难以规模化，作为现金流业务不错。"
  }
];

export const searchSuggestions = [
  "一句话看懂这个网站做什么",
  "看清目标用户和核心痛点",
  "识别收费方式和付费理由",
  "判断这个方向值不值得做"
];
