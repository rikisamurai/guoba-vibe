# Handbook Search

一套面向真实业务知识库的本地检索与问答系统。它使用公开的
[GitLab Handbook](https://handbook.gitlab.com/handbook/) 作为知识库，先把手册下载并建立索引，
再根据用户问题检索原文。默认返回相关原文证据和引用，也可以让本地 Qwen 生成带引用的回答。

当前语料固定在 GitLab Handbook commit
[`eb7f028c`](https://gitlab.com/gitlab-com/content-sites/handbook/-/tree/eb7f028cc25d3dd8cdfbe7b0b4f834c79a64d7cb/content/handbook)，
方便重复实验和比较不同检索方案。

## 先看结论

- 这是一个真实知识库应用，不是只用于跑分的 RAG benchmark。
- 项目暂时没有面向普通用户的网页 UI，提供命令行、JSON API 和 `/docs` 接口调试页面。
- 知识库、检索索引和模型推理都在本机；平时查询不会重新访问 GitLab。
- `fetch` 和 `index` 只在第一次初始化或主动更新知识库时运行。
- 默认 `extractive` 回答器找到相关原文时返回 `evidence_found`，它不承诺片段已经构成完整答案。
- 只有本地 `Qwen/Qwen3-4B` 成功生成、JSON 合法且引用编号通过校验时，才会返回 `answered`。
- 没有相关证据、Qwen 拒答或引用校验失败时，系统返回 `not_found`，而不是要求模型猜答案。

一次查询的数据流是：

```text
用户问题 → 中文改写 → BM25 + 向量检索 → RRF 融合 → MiniLM 重排
         → 相关证据门禁 → 原文证据或 Qwen3 回答 → 来源引用
```

## 5 分钟快速体验

下面的命令适用于已经完成首次初始化、并且本地已有索引的环境：

```bash
cd apps/handbook-search
uv run handbook-search ask "一笔 5,500 美元的业务费用应该走 Navan 还是 Zip？"
```

返回的是 JSON：

- `status: "evidence_found"`：默认路径找到了相关原文，但没有声称它已经完整回答问题；
- `text`：命中的原文证据；
- `citations`：原文标题、章节、链接和引用片段；
- `status: "not_found"`：没有找到相关证据，系统拒绝回答。

如果希望把英文原文整理成自然的中文答案：

```bash
uv run handbook-search ask \
  "一笔 5,500 美元的业务费用应该走 Navan 还是 Zip？" \
  --answerer qwen3
```

`qwen3` 会在本机运行。它只有在生成结果和引用都通过校验时才返回 `answered`，否则返回
`not_found`。首次使用需要下载 `Qwen/Qwen3-4B`，占用的磁盘和内存也明显高于默认的
`extractive` 回答器。当前自动评测不包含生成答案的正确性和完整性。

## 第一次初始化

需要 Python 3.12 和 [uv](https://docs.astral.sh/uv/)。在仓库根目录执行：

```bash
cd apps/handbook-search
uv sync --extra models
uv run handbook-search fetch
uv run handbook-search index --embedder e5-small
```

三步分别完成：

1. 安装项目和本地模型所需依赖；
2. 按 `knowledge-source.json` 下载固定版本的 GitLab Handbook；
3. 切分文档并建立 BM25 与 E5 向量索引。

首次使用某个模型时，Hugging Face 会下载模型权重。依赖、语料、索引和模型准备好之后，
后续查询都会复用本地文件。

### 本地保存了什么

| 内容                          | 位置                     | 什么时候变化         |
| ----------------------------- | ------------------------ | -------------------- |
| GitLab Handbook 原文          | `.cache/handbook-source` | 执行 `fetch` 时      |
| BM25 与向量索引               | `.data/index`            | 执行 `index` 时      |
| 数据源地址、commit 和许可证   | `knowledge-source.json`  | 人工修改数据源版本时 |
| E5、MiniLM、翻译及 Qwen3 权重 | Hugging Face 本地缓存    | 第一次使用对应模型时 |

`.cache/` 和 `.data/` 已被 Git 忽略，不会提交到仓库。删除它们后需要重新运行相应的
`fetch` 或 `index`。Hugging Face 模型缓存也会在后续运行中直接复用。

## 日常怎么用

初始化完成后，不需要每次运行 `fetch` 或 `index`。

### 只看检索结果

```bash
uv run handbook-search search \
  "一笔 5,500 美元的业务费用应该走 Navan 还是 Zip？" \
  --limit 5
```

`search` 返回排序后的知识片段、原文链接和各阶段分数，适合调试检索效果。

### 直接获得回答

```bash
uv run handbook-search ask "一笔 5,500 美元的业务费用应该走 Navan 还是 Zip？"
```

`ask` 在检索后运行相关证据门禁。默认 `extractive` 回答器返回 `evidence_found` 或
`not_found`，不会把原文片段包装成完整答案；指定 `--answerer qwen3` 后，校验通过的生成结果
才会返回 `answered`。

中文问题默认先用 `Helsinki-NLP/opus-mt-zh-en` 改写成英文，再检索英文手册。可以通过
`--query-rewriter none` 关闭改写，用相同评测集比较效果。

### 启动常驻服务

连续查询时建议启动 API，让模型保持在内存中，避免每条命令都重新加载模型：

```bash
uv run handbook-search serve --host 127.0.0.1 --port 8000
```

启动后可以打开 <http://127.0.0.1:8000/docs>，直接在浏览器里填写问题和调用接口。
这只是 FastAPI 自带的接口调试页，不是正式产品 UI。

检查服务状态：

```bash
curl http://127.0.0.1:8000/health
```

`/health` 只确认 API 进程已经启动，不会提前加载或检查索引和模型。需要确认查询链路完整可用时，
还要实际调用一次 `/search` 或 `/answer`。

检索原文：

```bash
curl -X POST http://127.0.0.1:8000/search \
  -H 'Content-Type: application/json' \
  -d '{"query":"一笔 5,500 美元的业务费用应该走 Navan 还是 Zip？","limit":5}'
```

获取证据或生成式回答：

```bash
curl -X POST http://127.0.0.1:8000/answer \
  -H 'Content-Type: application/json' \
  -d '{"query":"一笔 5,500 美元的业务费用应该走 Navan 还是 Zip？","limit":10}'
```

`/answer` 的三个状态与 CLI 一致：默认命中原文是 `evidence_found`，校验通过的 Qwen 生成结果
是 `answered`，没有相关证据或生成校验失败是 `not_found`。

需要 Qwen3 生成式回答时，用下面的方式启动服务：

```bash
uv run handbook-search serve --answerer qwen3
```

## 命令速查

| 命令                 | 用途                                         | 是否需要经常运行         |
| -------------------- | -------------------------------------------- | ------------------------ |
| `fetch`              | 下载并校验配置中指定的 Handbook commit       | 首次初始化或更新语料时   |
| `index`              | 切分文档，建立 BM25 和向量索引               | 首次初始化或语料变化后   |
| `search`             | 返回排序后的知识片段                         | 日常查询                 |
| `ask`                | 返回相关原文证据，或使用 Qwen 生成带引用回答 | 日常查询                 |
| `serve`              | 启动 `/health`、`/search`、`/answer` API     | 连续查询或接入其他应用时 |
| `eval-seed`          | 从标题生成待人工审核的评测候选问题           | 扩充评测集时             |
| `eval-run`           | 计算 Recall、MRR、nDCG 和检索延迟            | 调整检索方案后           |
| `eval-answerability` | 评估 evidence gate 是否应接受当前 Top 10     | 调整证据门禁后           |

查看全部参数：

```bash
uv run handbook-search --help
uv run handbook-search ask --help
uv run handbook-search serve --help
```

## 如何更新知识库

`fetch` 不会自动拉取 GitLab 的最新主分支。它只会下载并检出 `knowledge-source.json` 中
明确指定的 commit，这是为了保证评测可以复现。

需要更新知识库时：

1. 选择并记录新的 GitLab Handbook commit；
2. 修改 `knowledge-source.json` 的 `commit`；
3. 重新下载语料并建立索引；
4. 运行评测，确认新语料没有让检索效果明显退化。

```bash
uv run handbook-search fetch
uv run handbook-search index --embedder e5-small
uv run handbook-search eval-run eval/reviewed
uv run handbook-search eval-answerability eval/reviewed
```

只修改 commit 或只执行 `fetch` 都不够：查询使用的是 `.data/index`，所以语料变化后必须
重新执行 `index`。如果 `serve` 已经在运行，还要在索引完成后重启它；现有进程会继续使用
启动时加载的旧索引。

## 检索方案

当前实现采用一套适合中小型知识库的本地混合检索链路：

1. 按 Markdown 页面、标题和章节结构解析文档；
2. 创建保留页面标题和标题路径的上下文 chunk；
3. 将中文问题改写为英文，以匹配 GitLab Handbook 的语言；
4. 并行运行 SQLite FTS5 BM25 和 `intfloat/multilingual-e5-small` 向量检索；
5. 使用 reciprocal-rank fusion（RRF）合并候选结果；
6. 默认使用 `cross-encoder/mmarco-mMiniLMv2-L12-H384-v1` 重新排序；
7. 判断是否找到相关证据，再返回原文，或使用 `Qwen/Qwen3-4B` 生成带引用的答案。

向量索引使用精确的内存映射矩阵。当前语料规模下，这样可以避免近似最近邻搜索的召回
损失，也不需要额外部署向量数据库。只有在数据量、过滤条件或多租户需求明显增长后，
才有必要引入分布式搜索服务。

`e5-small` 是当前完整语料的实用配置。项目也实现了
`Qwen/Qwen3-Embedding-0.6B` 和 `Qwen/Qwen3-Reranker-0.6B` 质量配置，但它们更慢，
应该先通过同一套评测证明收益，再用于日常索引和查询。

### 不下载模型的快速冒烟测试

下面的配置只验证管线是否能跑通，不代表真实检索质量：

```bash
uv sync
uv run handbook-search fetch
uv run handbook-search index --index-dir .data/index-smoke --embedder hashing --page-limit 100
uv run handbook-search search "expense report" \
  --index-dir .data/index-smoke \
  --embedder hashing --reranker none --query-rewriter none
```

## 真实评测结果

结果来自 M5 Pro、24 GB 内存，使用 30 条人工审核的可回答问题。暖态延迟不包含模型初始化。

| 检索配置                          | Recall@10 |      英文 |      中文 | 暖态 p95 |
| --------------------------------- | --------: | --------: | --------: | -------: |
| BM25 + hashing 冒烟基线           |     40.0% |     66.7% |      0.0% |    79 ms |
| BM25 + multilingual E5 + RRF      |     60.0% |     72.2% |     41.7% |    89 ms |
| 上一项 + multilingual MiniLM 重排 |     73.3% |     94.4% |     41.7% |   403 ms |
| 上一项 + 中文查询改写             | **90.0%** | **94.4%** | **83.3%** |   984 ms |

完整语料包含 4,114 个页面，生成 54,233 个 chunk。E5 索引构建耗时 247 秒，峰值内存
约 1.68 GB。

30 条可回答问题与 10 条不可回答问题合并评测时，evidence gate accuracy 为 85.0%，拒答
precision 为 88.9%，拒答 recall 为 61.5%，其中有 5 个 false accept 和 1 个 false reject。
可回答问题只有在当前 Top 10 实际命中 Gold 时才期望门禁接受；不可回答问题始终期望拒绝。
这组数字衡量的是相关证据门禁，不是最终回答质量。中文查询改写显著缩小了跨语言召回差距，
但也提高了检索延迟。

模型保持暖态时，人工单次检查得到的 Qwen3-4B 回答耗时为 4.14 秒，未来价格问题拒答耗时
为 2.37 秒。这两项只是人工检查，不属于自动评测结果。

## 评测与可信边界

评测数据使用稳定的 `commit + 页面路径 + 标题路径 + 原文位置` 标记 Gold evidence，
不依赖可能随切分方案变化的 chunk ID。运行时命中必须同时满足页面路径、完整
`heading_path` 和证据文本重叠；Gold span 还会校验起点非负、终点大于起点，并要求跨度长度
等于证据文本长度。

常用命令：

```bash
uv run handbook-search eval-run eval/reviewed
uv run handbook-search eval-answerability eval/reviewed
uv run handbook-search eval-run eval/reviewed --query-rewriter none
```

详细的评测集维护方式见 [eval/README.md](eval/README.md)。

当前自动评测覆盖：

- 检索：Recall@k、MRR、nDCG@k；
- 证据门禁：`retrieval_has_gold`、`gate_accepts`、accuracy、拒答 precision 和 recall，以及
  false accept / false reject 明细；
- 运行信息：暖态检索延迟、固定语料版本和模型来源。

当前还没有自动评测最终答案的正确性、引用支持度和完整性。这些指标需要人工标签，或者先
验证一套独立、可靠的 judge，不能把一次模型生成结果当成客观得分。

## 常见问题

### 为什么查询时没有访问 GitLab？

因为 `search`、`ask` 和 `serve` 只读取本地 `.data/index`。GitLab 只在执行 `fetch` 时访问。

### 提示知识库或索引不存在怎么办？

缺少 `.cache/handbook-source` 时先运行 `uv run handbook-search fetch`；缺少 `.data/index` 时运行
`uv run handbook-search index --embedder e5-small`。如果更换了 `knowledge-source.json` 中的
commit，需要依次重新运行这两个命令。

### 提示索引和查询模型不一致怎么办？

日常查询保留默认的 `--embedder auto`，系统会读取索引记录的模型配置。如果需要改用另一种
embedding 模型，必须用同一个 `--embedder` 重新建立索引，不能拿旧索引直接查询。

### 提示缺少模型依赖怎么办？

执行 `uv sync --extra models`。只运行 `uv sync` 适用于 hashing 冒烟配置，不能运行默认的
E5、MiniLM、中文改写或 Qwen3 模型。

### 为什么第一次中文查询比较慢？

中文改写模型会在第一条中文问题到来时延迟加载。连续使用时建议运行 `serve`，让翻译、
向量和重排模型保持暖态。

### `search` 和 `ask` 有什么区别？

`search` 用来观察系统找到了哪些原文；`ask` 会继续运行相关证据门禁。默认 `extractive`
返回原文证据和引用，只有 `qwen3` 会尝试生成答案。排查检索问题时先看 `search`，给其他程序
接入时通常调用 `ask` 或 `/answer`。

### 什么时候使用 Qwen3？

默认 `extractive` 最稳妥，也最容易核对原文。只有在需要自然语言归纳、机器资源允许，并且
能够接受更长延迟时，再选择 `--answerer qwen3`。Qwen3 仍然只允许根据检索证据回答，只有
输出 JSON 合法且引用编号通过校验时才返回 `answered`。

## 数据来源与许可证

本目录中的软件属于当前代码仓库。知识库内容归 GitLab 所有，来源为
[GitLab Handbook](https://handbook.gitlab.com/handbook/)。重新分发知识库内容或基于语料生成的
产物时，需要保留 GitLab 的归属说明并遵守 CC BY-SA 4.0。
