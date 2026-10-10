---
pageType: home

hero:
  name: How Streaming Render Works
  text: 流式 Markdown 渲染完全指南
  tagline: 从 SSE 协议到稳定前缀缓存与重型节点调度，亲手实现一个 AI 聊天的流式富文本渲染器
  actions:
    - theme: brand
      text: 开始学习
      link: /guide/intro
features:
  - title: 四层问题模型
    details: 传输层、显示调度层、语法层、渲染层——把「流式 Markdown 为什么难」拆解成可以逐个击破的问题。
  - title: 三阶段演进
    details: P0 全文重解析基线 → P1 调度器与稳定前缀 → P2 Shiki/Mermaid 重型节点，每一步都有升级前后的对比 demo。
  - title: 流回放模拟器
    details: 不烧 token、可复现——用可配置的恶意 chunk 时间线（jitter、burst、边界截断）验证渲染器的每个边界。
---
