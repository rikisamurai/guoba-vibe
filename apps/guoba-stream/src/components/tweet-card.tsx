import type { ResolvedTweet } from '../../lib/types'

export function TweetCard({ tweet }: { tweet: ResolvedTweet }) {
  return (
    <section className="border-crust bg-pan animate-rise my-4 rounded-xl border p-3.5 motion-reduce:animate-none">
      <div className="flex items-start gap-2.5">
        <img
          src={tweet.avatarUrl}
          alt=""
          referrerPolicy="no-referrer"
          className="bg-crust size-9 rounded-full"
        />
        <div className="min-w-0">
          <p className="text-sm font-medium">
            {tweet.authorName} <span className="text-bran font-normal">@{tweet.authorHandle}</span>
          </p>
          <p className="text-husk mt-0.5 text-sm text-pretty break-words">{tweet.text}</p>
        </div>
      </div>
    </section>
  )
}
