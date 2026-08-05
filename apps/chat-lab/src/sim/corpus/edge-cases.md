# Edge cases, deliberately hostile

This corpus exists to be cut in the worst places. **Bold spans that run long enough to be split by any chunker**, *italics beside them*, and `inline code with a tricky ` + "backtick" story*.

Multi-byte text: 中文字符每个占三字节,émoji 和组合字符如 café、naïve、👨‍👩‍👧‍👦、🇯🇵、é 都必须完整到达。

A link that loves to break: [a fairly long link label that chunkers adore](https://example.com/a/rather/long/path?with=query&and=more) and a bare one: <https://example.com>.

Setext trap
===========

The line above only becomes a heading when the `===` row arrives — a naive block freezer gets this wrong.

- A loose list item

  with a continuation paragraph that arrives much later
- Second item with **bold across
  a line break** inside it

| Column A | Column B | Column C |
| --- | --- | --- |
| pipes \| escaped | **bold cell** | `code cell` |
| 中文单元格 | emoji 🎯 | trailing |

```text
an intentionally long fence that stays open for many chunks
line 2 ***** not emphasis in here *****
line 3 with | pipes | that are not a table
```

Final paragraph after the fence closes, ending mid-thought with strong **emphasis
