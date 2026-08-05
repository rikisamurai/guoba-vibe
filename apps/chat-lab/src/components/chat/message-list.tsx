export function MessageList() {
  return (
    <div className="flex-1 overflow-y-auto py-8">
      <div className="mx-auto flex max-w-[720px] flex-col gap-6 px-7">
        <div className="border-seam bg-panel-2 max-w-[78%] self-end rounded-[14px] rounded-br-[4px] border px-4 py-3 text-[14.5px] leading-relaxed">
          Show me how a streaming markdown renderer stays stable while tokens are still arriving.
        </div>
        <div>
          <div className="text-faint mb-2.5 flex items-center gap-2.5 font-mono text-[10.5px] tracking-[0.1em] uppercase">
            <span className="bg-pulse/12 text-pulse rounded px-1.5 py-0.5 tracking-[0.08em]">
              idle
            </span>
            <span>M0 · naive</span>
          </div>
          <div className="text-mute text-[14.5px] leading-[1.65]">
            Assistant replies will stream here. Pick a source on the right and send a message.
          </div>
        </div>
      </div>
    </div>
  )
}
