# How streaming renderers stay calm

Static markdown rendering takes one complete string. Streaming rendering takes a string that **grows while you look at it**, and may pause in the middle of any construct. That single difference splits the problem into four layers.

## The four layers

| Layer | Job | Typical failure |
| --- | --- | --- |
| Transport | absorb chunk size and latency | merged chunks, broken UTF-8 |
| Scheduling | turn arrival rhythm into visible rhythm | huge jumps, laggy tails |
| Syntax | survive unclosed `**bold**` and fences | flicker, swallowed prose |
| Rendering | reuse what is already stable | long tasks, scroll drift |

The key insight is that *arrival time* and *visible time* are two different clocks. A buffer sits between them and absorbs jitter, the way a reservoir absorbs rain. 水库不怕暴雨,渲染器不怕 burst。

## What readers actually notice

1. Text that appears in **even, believable strides** — not one giant paragraph slam.
2. Bold and links that never flash half-broken syntax like `**this.
3. Code blocks that hold still once they are finished.
4. A scroll position that respects the reader — 一旦向上滚动,就不再抢夺视口。

> A renderer earns trust by being boring: no jumps, no flicker, no surprise reflows. Emoji should survive too: 👨‍👩‍👧‍👦 stays a family, café keeps its accent.

### A short checklist

- [x] Decode bytes with a streaming decoder
- [x] Commit on a merged cadence, not per token
- [ ] Freeze finished blocks with stable ids
- [ ] Give heavy nodes their own clock

The rest of this article walks each layer with examples, starting from the transport buffer and ending at the paint pipeline. None of it requires exotic tooling — just discipline about **who owns which clock**, and honesty about what the parser can know mid-stream.
