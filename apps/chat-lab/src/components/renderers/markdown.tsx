import type { ComponentProps } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const COMPONENTS: ComponentProps<typeof ReactMarkdown>['components'] = {
  h1: (props) => <h1 className="mt-5 mb-3 text-lg font-bold first:mt-0" {...props} />,
  h2: (props) => <h2 className="mt-5 mb-2.5 text-[17px] font-bold first:mt-0" {...props} />,
  h3: (props) => <h3 className="mt-4 mb-2 text-[15.5px] font-bold first:mt-0" {...props} />,
  p: (props) => <p className="mb-3 last:mb-0" {...props} />,
  a: (props) => (
    <a className="text-pulse decoration-pulse/40 underline underline-offset-2" {...props} />
  ),
  ul: (props) => <ul className="mb-3 list-disc space-y-1 pl-5" {...props} />,
  ol: (props) => <ol className="mb-3 list-decimal space-y-1 pl-5" {...props} />,
  blockquote: (props) => (
    <blockquote className="border-pulse/50 text-mute mb-3 border-l-2 pl-3.5" {...props} />
  ),
  hr: () => <hr className="border-seam my-4" />,
  table: (props) => (
    <div className="border-seam mb-3 overflow-x-auto rounded-lg border">
      <table className="w-full border-collapse text-[13px]" {...props} />
    </div>
  ),
  th: (props) => (
    <th
      className="border-seam bg-panel-2 text-mute border-b px-3 py-1.5 text-left font-mono text-[11px] tracking-wider uppercase"
      {...props}
    />
  ),
  td: (props) => <td className="border-seam/60 border-b px-3 py-1.5 align-top" {...props} />,
  pre: (props) => (
    <pre
      className="border-seam bg-panel mb-3 overflow-x-auto rounded-[10px] border p-3.5 font-mono text-[12.5px] leading-relaxed"
      {...props}
    />
  ),
  code: (props) => {
    const { className, children, ...rest } = props
    const isBlock = typeof className === 'string' && className.includes('language-')
    if (isBlock) {
      return (
        <code className={className} {...rest}>
          {children}
        </code>
      )
    }
    return (
      <code
        className="border-seam bg-panel-2 rounded-[5px] border px-1 py-px font-mono text-[12.5px]"
        {...rest}
      >
        {children}
      </code>
    )
  },
}

export function Markdown({ text }: { text: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={COMPONENTS}>
      {text}
    </ReactMarkdown>
  )
}
