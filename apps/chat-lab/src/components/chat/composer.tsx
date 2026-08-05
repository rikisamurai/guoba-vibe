import { ArrowUp } from 'lucide-react'

export function Composer() {
  return (
    <div className="border-seam border-t px-7 pt-4 pb-5">
      <form
        className="border-seam bg-panel mx-auto flex max-w-[720px] items-center gap-3 rounded-xl border py-3 pr-3 pl-4"
        onSubmit={(event) => event.preventDefault()}
      >
        <input
          type="text"
          placeholder="Ask anything…"
          className="text-ink placeholder:text-faint flex-1 bg-transparent text-sm outline-none"
        />
        <button
          type="submit"
          className="bg-pulse text-void flex items-center gap-2 rounded-lg px-4 py-2 font-mono text-[12.5px] font-medium"
        >
          <ArrowUp className="size-3.5" />
          Send
        </button>
      </form>
    </div>
  )
}
