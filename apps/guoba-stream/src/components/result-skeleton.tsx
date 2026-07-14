export function ResultSkeleton() {
  return (
    <div className="mt-4 grid animate-pulse gap-3" aria-hidden>
      <div className="border-crust bg-pan rounded-xl border p-3.5">
        <div className="flex items-start gap-2.5">
          <div className="bg-crust size-9 rounded-full" />
          <div className="min-w-0 flex-1">
            <div className="bg-seam h-3.5 w-36 rounded" />
            <div className="bg-seam mt-2 h-3 w-4/5 rounded" />
          </div>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {['first', 'second'].map((item) => (
          <div key={item} className="border-crust bg-pan overflow-hidden rounded-xl border">
            <div className="bg-seam/60 aspect-video" />
            <div className="flex items-center gap-2 p-2.5">
              <div className="bg-seam h-9 w-20 rounded-md" />
              <span className="flex-1" />
              <div className="bg-seam size-9 rounded-md" />
              <div className="bg-seam h-9 w-20 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
