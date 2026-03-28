import Link from "next/link";
import { Card, PageShell, Pill, SectionTitle } from "@/src/components/ui";

const plans = [
  {
    name: "Free",
    price: "¥0",
    period: "/月",
    description: "先快速看懂陌生网站，适合每天轻量刷站找灵感。",
    badge: "适合试用",
    badgeTone: "default" as const,
    cta: "免费开始",
    highlight: false,
    features: ["每月 20 次基础分析", "最近分析记录", "基础收藏到灵感库", "大白话产品/用户/收费总结"]
  },
  {
    name: "Pro",
    price: "¥79",
    period: "/月",
    description: "给高频刷站的独立开发者，重点是更深的商业判断和研究沉淀。",
    badge: "推荐",
    badgeTone: "positive" as const,
    cta: "升级 Pro",
    highlight: true,
    features: ["每月 300 次分析", "更完整的市场机会和切入建议", "灵感库标签 / 备注 / 筛选", "优先使用更深度分析能力"]
  },
  {
    name: "Team",
    price: "¥299",
    period: "/月",
    description: "适合小团队一起做站点研究、选题评估和竞品复盘。",
    badge: "团队协作",
    badgeTone: "warning" as const,
    cta: "联系团队版",
    highlight: false,
    features: ["5 个成员席位", "共享灵感库与研究记录", "团队级收藏管理", "后续支持更多导出与协作能力"]
  }
];

const faqs = [
  {
    question: "MVP 为什么现在就要有定价页？",
    answer: "因为导航里已经有定价入口，而且后面做登录、额度和付费时，这页会直接承接商业化。现在先把套餐逻辑和价值讲清楚，后续接支付会更顺。"
  },
  {
    question: "首版付费点最值得卖什么？",
    answer: "最适合先卖的是更高分析额度、更深的商业判断、更完整的灵感库管理，而不是一开始就卖一堆花哨数据。"
  },
  {
    question: "后面可以怎么扩成更强的 Pro 功能？",
    answer: "可以继续加相似产品发现、技术栈识别、流量估算、更多证据源和团队协作能力，但这些适合在主链路稳定后逐步加。"
  }
];

const comparisonRows = [
  {
    label: "基础网站分析",
    values: ["20 次/月", "300 次/月", "不限量可谈"]
  },
  {
    label: "大白话商业拆解",
    values: ["有", "有", "有"]
  },
  {
    label: "创业切入建议",
    values: ["基础版", "深度版", "团队版"]
  },
  {
    label: "收藏与灵感库",
    values: ["基础收藏", "标签/备注/筛选", "团队共享"]
  },
  {
    label: "团队协作",
    values: ["无", "无", "支持"]
  }
];

export default function PricingPage() {
  return (
    <PageShell currentPath="/pricing">
      <section className="hero-gradient px-6 py-20">
        <div className="section-shell text-center">
          <span className="mb-6 inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold tracking-wide text-primary">
            商业化承接页
          </span>
          <h1 className="mx-auto max-w-4xl font-display text-5xl font-extrabold leading-[1.05] tracking-tight md:text-7xl">
            先把陌生网站看懂
            <br />
            再决定值不值得做
          </h1>
          <p className="mx-auto mt-8 max-w-3xl text-lg leading-relaxed text-textMuted md:text-xl">
            定价不是为了卖“分析次数”，而是为了卖更快的创业判断。先看懂它卖什么、卖给谁、怎么收费，再决定你要不要跟进。
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Pill tone="positive">适合独立开发者</Pill>
            <Pill>围绕网站分析主链路定价</Pill>
            <Pill tone="warning">后续可继续叠加深度分析</Pill>
          </div>
        </div>
      </section>

      <section className="section-shell py-24">
        <SectionTitle
          eyebrow="Pricing"
          title="首版套餐先卖清晰价值，不卖复杂概念"
          description="先围绕分析额度、商业判断深度和灵感库能力做分层，后面再补支付与配额控制。"
        />

        <div className="grid gap-8 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={plan.highlight ? "relative border-primary bg-white p-8 shadow-soft" : "p-8"}
            >
              {plan.highlight ? (
                <div className="absolute right-6 top-6">
                  <Pill tone={plan.badgeTone}>{plan.badge}</Pill>
                </div>
              ) : null}

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <h2 className="font-display text-2xl font-bold">{plan.name}</h2>
                  {!plan.highlight ? <Pill tone={plan.badgeTone}>{plan.badge}</Pill> : null}
                </div>
                <p className="text-sm leading-relaxed text-textMuted">{plan.description}</p>
                <div className="flex items-end gap-2">
                  <span className="font-display text-5xl font-extrabold text-primary">{plan.price}</span>
                  <span className="pb-1 text-sm font-medium text-textMuted">{plan.period}</span>
                </div>
              </div>

              <div className="mt-8 space-y-4">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-3 rounded-2xl bg-surfaceAlt px-4 py-3 text-sm font-medium text-textMuted">
                    <span className="text-primary">✔</span>
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              <button
                className={
                  plan.highlight
                    ? "mt-8 w-full rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white"
                    : "mt-8 w-full rounded-xl border border-zinc-200 px-5 py-3 text-sm font-bold text-textPrimary"
                }
              >
                {plan.cta}
              </button>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-surfaceAlt py-24">
        <div className="section-shell">
          <SectionTitle
            title="套餐差异一眼看懂"
            description="这一版先把最关键的差异摆出来，避免做得像传统 SaaS 一样过度复杂。"
          />

          <Card className="overflow-hidden p-0">
            <div className="overflow-auto">
              <div className="min-w-[720px]">
                <div className="grid grid-cols-[1.3fr_repeat(3,minmax(0,1fr))] border-b border-zinc-100 bg-white text-sm font-bold">
                  <div className="px-6 py-4 text-textMuted">能力项</div>
                  <div className="px-6 py-4 text-center">Free</div>
                  <div className="bg-primary px-6 py-4 text-center text-white">Pro</div>
                  <div className="px-6 py-4 text-center">Team</div>
                </div>
                {comparisonRows.map((row, index) => (
                  <div
                    key={row.label}
                    className={`grid grid-cols-[1.3fr_repeat(3,minmax(0,1fr))] text-sm ${
                      index !== comparisonRows.length - 1 ? "border-b border-zinc-100" : ""
                    }`}
                  >
                    <div className="bg-white px-6 py-4 font-medium text-textPrimary">{row.label}</div>
                    {row.values.map((value, valueIndex) => (
                      <div
                        key={value}
                        className={`px-6 py-4 text-center text-textMuted ${
                          valueIndex === 1 ? "bg-primary/10 font-bold text-primary" : "bg-white"
                        }`}
                      >
                        {value}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </section>

      <section className="section-shell py-24">
        <div className="grid gap-8 lg:grid-cols-2">
          <Card className="p-8">
            <SectionTitle
              eyebrow="Why This Pricing"
              title="为什么这样分层"
              description="这套分层不是为了凑套餐，而是围绕真实使用频次和决策深度拆出来的。"
            />
            <div className="space-y-5 text-sm leading-relaxed text-textMuted">
              <p>Free 负责让用户先跑通“输入网址 到 得到大白话结论”的核心体验，先感受到这个产品值不值。</p>
              <p>Pro 负责承接真正高频刷站的人，他们更在乎的是分析深度、灵感沉淀和选题判断效率。</p>
              <p>Team 则不是多几个按钮，而是把研究结果从个人收藏变成团队资产，适合一起做选题和竞品复盘的小团队。</p>
            </div>
          </Card>

          <Card className="bg-primary p-8 text-white">
            <SectionTitle
              eyebrow="Next Step"
              title="当前开发状态"
              description="这页已经可访问，后面会继续接支付、额度和账号体系。"
            />
            <div className="space-y-4 text-sm leading-relaxed text-white/80">
              <p>当前重点仍是把分析主链路做稳：抓取、分析、结果页、收藏与灵感库。</p>
              <p>支付、配额控制、订阅管理属于下一阶段的商业化实现，不阻塞当前 MVP 使用。</p>
              <p>也就是说，现在这页先承担产品表达和后续商业化占位，功能会逐步接实。</p>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/"
                className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-primary"
              >
                先去试分析
              </Link>
              <Link
                href="/inspiration"
                className="rounded-xl border border-white/20 px-5 py-3 text-sm font-bold text-white"
              >
                查看灵感库
              </Link>
            </div>
          </Card>
        </div>
      </section>

      <section className="bg-zinc-50 py-24">
        <div className="section-shell">
          <SectionTitle title="常见问题" description="先把首版最容易问到的点说清楚。" />
          <div className="grid gap-6 lg:grid-cols-3">
            {faqs.map((faq) => (
              <Card key={faq.question} className="p-8">
                <h3 className="font-display text-xl font-bold">{faq.question}</h3>
                <p className="mt-4 text-sm leading-relaxed text-textMuted">{faq.answer}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
