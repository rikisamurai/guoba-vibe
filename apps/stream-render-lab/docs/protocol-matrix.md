# Streaming 协议矩阵

> 能力核验日期：2026-08-06。运行时模型与开关以 `api/capability-data.ts` 为唯一来源；供应商能力会变化，本文不替代 live capability check。

## 1. 共同管线

三种 adapter 都接收 WHATWG SSE event，而不是自己拆字符串：

```text
arbitrary bytes
→ stateful TextDecoder(stream=true)
→ SSE fields/data dispatch
→ provider JSON/event adapter
→ one or more SourceEvent
→ internalSeq
```

SSE 层负责 BOM、CR/LF/CRLF、多行 `data:`、comment、`id`、`retry` 与空行派发。仅包含 `retry` 的控制记录会以 `SseRetryControl` 暴露，并由 provider adapter 归一化为 `sse_retry` diagnostic；它不是伪造的 message event。EOF 时没有空行完成的残留 event 必须丢弃；provider adapter 再根据是否已有 terminal proof 决定 `truncated`。

## 2. Provider 对照

| 维度              | Chat Completions                                                            | Responses                                                      | Anthropic Messages                        |
| ----------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------- |
| DeepSeek 路径     | `/chat/completions`                                                         | `/responses`                                                   | `/anthropic/v1/messages`                  |
| 结构地址          | `choice.index`                                                              | `item_id`, `output_index`, `content_index`                     | content block `index`                     |
| provider 顺序游标 | 无                                                                          | `sequence_number`                                              | 无                                        |
| answer delta      | `delta.content`                                                             | `response.output_text.delta`                                   | `text_delta`                              |
| reasoning delta   | `delta.reasoning_content`                                                   | reasoning text/summary delta                                   | `thinking_delta`                          |
| tool 参数         | `delta.tool_calls[].function.arguments`，按 choice/tool index 保持稳定 part | 仅 `response.function_call_arguments.delta`                    | `input_json_delta.partial_json`           |
| terminal proof    | `[DONE]`                                                                    | `response.completed`, `response.incomplete`, `response.failed` | `message_stop`                            |
| 明确不完整        | `finish_reason=length/content_filter` + `[DONE]`                            | `response.incomplete`                                          | `stop_reason=max_tokens` + `message_stop` |

当前 cross-protocol 默认模型是 `deepseek-v4-flash`。它是集中配置的核验结果，不是永久协议规则。

Responses adapter 当前只归一化 answer、reasoning 与 function-call arguments。DeepSeek API 本身支持的 server-side web search、output annotations，以及其他 tool/status 事件尚未进入本实验的 `StreamEvent` 模型；协议矩阵不把这些 provider 能力宣称为已实现功能。

参考：[DeepSeek Chat Completions API](https://api-docs.deepseek.com/api/create-chat-completion/)、[DeepSeek Responses API](https://api-docs.deepseek.com/api/create-response/)、[DeepSeek Anthropic API](https://api-docs.deepseek.com/guides/anthropic_api/)、[Anthropic Streaming](https://platform.claude.com/docs/en/build-with-claude/streaming)、[WHATWG SSE](https://html.spec.whatwg.org/multipage/server-sent-events.html#parsing-an-event-stream)。

## 3. 顺序规则

### Responses

- `sequence_number` 必须严格递增；倒退或重复是 protocol failure。
- gap 记录 `responses_sequence_gap` diagnostic，但不假定序号必须连续。
- 同一 provider payload 可能产生 `part.start` 与 `part.delta` 等多个事件，通过 `splitIndex` 保持局部顺序。

### Chat Completions

`choiceIndex` 只定位 choice。它不能用于断流检测，也不能跨 chunk 排序。adapter 为每个 reasoning/answer part 建立稳定 id。

### Anthropic

`blockIndex` 只定位 content block。Tool JSON 在 `input_json_delta` 阶段只累积 partial string，到 `content_block_stop` 才解析/验证；不同 block 的 index 不是全局事件序号。

### Engine

adapter 归一化后，由 engine 独立分配 `internalSeq = 0,1,2…`。React 的 `revision` 与这些 source 顺序字段完全正交。

## 4. Outcome 映射

| 观察到的事实                                   | `RunOutcome`          | 说明                                     |
| ---------------------------------------------- | --------------------- | ---------------------------------------- |
| provider 明确正常 terminal                     | `completed`           | 仍需 drain 和 canonical parse            |
| provider 明确达到长度/过滤限制                 | `incomplete`          | 有 terminal proof，保留 reason           |
| terminal proof 前正常 EOF                      | `truncated/eof`       | 可重试，保留已接受 raw                   |
| 读取流抛错/断连                                | `truncated/transport` | 可重试，不伪装 provider failure          |
| provider error event                           | `failed/provider`     | 保留 provider code/message               |
| Chat `insufficient_system_resource` + `[DONE]` | `failed/provider`     | 推理资源不足导致生成被中断，不算正常完成 |
| 已知 JSON malformed 或生命周期违规             | `failed/protocol`     | 不能继续可信归一化                       |
| 用户停止或新 run 取代旧 run                    | `cancelled`           | 与 provider 结果分开                     |

`incomplete` 和 `truncated` 不能合并：前者是 provider 明确陈述的完成状态，后者是 transport 没有给出足够证据。

## 5. Tool JSON 的安全边界

流中 partial JSON 不是 JSON。adapter 应把它作为 `{kind:'json', fragment}` 原样累积：Chat 通过稳定 choice/tool address 跨 chunk 关联，Anthropic 到 block terminal 才解析验证。即使解析成功，Phase 1 也只渲染可检查内容，不执行真实 Tool。

## 6. 必测 wire cases

- UTF-8 多字节字符在任意 byte 边界被切开；
- CR、LF、CRLF 与跨 chunk 的 CRLF；
- 多行 `data:`、comment heartbeat、BOM、`id`、`retry`；
- SSE EOF 残留不派发；
- 每种协议的 completed/incomplete/failed/truncated；
- Responses sequence 重复、倒退与 gap；
- Anthropic 多 block 交错与 partial tool JSON；
- 一个 provider event 拆成多个 internal events时 `splitIndex` 稳定。
