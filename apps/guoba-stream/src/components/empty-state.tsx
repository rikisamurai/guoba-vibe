import { Download, Link2, MousePointerClick } from 'lucide-react'

const STEPS = [
  { Icon: Link2, text: 'Paste a post URL' },
  { Icon: MousePointerClick, text: 'Fetch available media' },
  { Icon: Download, text: 'Save the selected files' },
]

export function EmptyState() {
  return (
    <section className="border-seam bg-pan/70 animate-rise mt-4 rounded-xl border border-dashed p-5 motion-reduce:animate-none">
      <h2 className="font-display text-2xl font-semibold text-pretty">Drop in a post link</h2>
      <p className="text-husk mt-2 max-w-prose text-sm leading-6 text-pretty">
        Start with an x.com, twitter.com, or t.co link. The app keeps the form ready while the
        results area explains the next step.
      </p>
      <div className="mt-5 grid gap-2.5">
        {STEPS.map(({ Icon, text }) => (
          <div key={text} className="text-husk flex items-center gap-3 text-sm">
            <span className="border-seam bg-pan-deep/50 text-ember-soft grid size-8 place-items-center rounded-md border">
              <Icon className="size-4" aria-hidden />
            </span>
            <span>{text}</span>
          </div>
        ))}
      </div>
      <p className="text-faint mt-5 text-xs">Works with x.com, twitter.com and t.co links.</p>
    </section>
  )
}
