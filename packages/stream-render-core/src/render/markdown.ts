import MarkdownIt from 'markdown-it'

/**
 * html: false 是安全基线——模型输出不是可信模板，原样 HTML 一律转义。
 * markdown-it 内置 validateLink 已拒绝 javascript:/vbscript:/file:/data:
 * （data:image 除外），无需额外 sanitize 链。
 */
export const md: MarkdownIt = new MarkdownIt({
  html: false,
  linkify: true,
})
