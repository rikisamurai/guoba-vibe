# 事故分析：尾部 definition 改写了已经稳定的前文

## 摘要

M3 suffix reparse 在长回答中明显减少工作量，但一次回答先输出 `[spec]`，稍后在文末输出 `[spec]: /url` 后，M2 把前文变成链接，M3 仍显示普通文本。AST ranges 完全无 gap、无 overlap，结果却是错的。

## 最小复现

```markdown
# 说明

请阅读 [spec]。

最后一段

[spec]: /url
```

在 definition 到来前，前三个 root child 看起来都已闭合。错误实现把它们标成 stable prefix，只 parse 最后一个 root suffix，再与旧 prefix stitch。CommonMark link reference definition 却具有全文语义，能影响它之前的引用。

blockquote 中的 definition、footnote definition、duplicate definition 的 first-wins 规则也会制造类似的非局部依赖。

## 根因

“root block 已闭合”只说明 block 结构边界稳定，不等于语义独立。remark/mdast 没有公开的 AST checkpoint/resume interface；把某个 offset 叫 checkpoint，也不会自动携带 prefix definition context。

另一个诱因是把“保留最后两个 block”当安全规则。Markdown 非局部性不是固定 block 数能描述的，fixture 一换就会失效。

## Phase 1 修复

采用 correctness-first fallback：

1. M3 只声称 bounded suffix reparse + AST stitching，不声称 resumable parsing；
2. 最后一个 root child 始终留在 dirty tail；
3. 一旦当前 run 出现 link/footnote definition，整次 preview 回退 M2 full parse；
4. 未声明 incremental-safe 的全文 transform 同样回退；
5. diagnostic 记录原因与首次触发 offset；
6. 每个 committed prefix 都与 M2 oracle 做 normalized IR 等价验证。

整篇巨型 paragraph、fence、list 或 blockquote 没有 root checkpoint 时，也记录 `no_quiescent_checkpoint` 并退化，而不是为了漂亮指标错误切分。

## 防回归语料

- `[x]` 后追加 `[x]: /url`；
- prefix definition + tail reference；
- definition 位于 blockquote 但影响前文；
- duplicate definition 验证 first-wins；
- Setext、GFM table delimiter 跨 chunk；
- tight list 追加空行后整体变 loose；
- definition 形文本位于 fenced code 内，不应误触发全局 fallback。

## M3b 的演进门槛

未来可以构建 definition dependency index，把 prefix definitions 注入 suffix context，并定向 invalidation 引用它的 blocks。但只有 property-based partition tests 与 canonical oracle 能证明所有已支持 transform 等价后，才允许移除对应 fallback。优化目标不能先于语义证明。

参考：[CommonMark parsing strategy](https://spec.commonmark.org/0.31.2/#appendix-a-parsing-strategy)、[Link reference definitions](https://spec.commonmark.org/0.31.2/#link-reference-definitions)。
