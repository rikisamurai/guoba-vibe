interface OscilloscopeProps {
  label?: string
  caption?: string
  active?: boolean
  measured?: boolean
}

const TICKS = ['00', '12', '24', '36', '48']

export function Oscilloscope({
  label = '流式文本提交轨迹',
  caption = 'arrival clock / display clock',
  active = true,
  measured = false,
}: OscilloscopeProps) {
  return (
    <figure className="scope" aria-label={label}>
      <div className="scope__bar">
        <span className={active ? 'scope__lamp is-active' : 'scope__lamp'} />
        <span>
          {measured ? (active ? 'MEASURED TRACE' : 'TRACE PAUSED') : 'CONCEPT ILLUSTRATION'}
        </span>
        <span className="scope__channel">CH·A / 16ms</span>
      </div>
      <div className="scope__screen">
        <svg
          viewBox="0 0 640 220"
          role="img"
          aria-label={
            measured ? '到达事件与界面提交的双通道波形' : '到达时钟与显示时钟的原理示意波形'
          }
        >
          <path
            className="scope__wave scope__wave--arrival"
            d="M0 70 H36 V38 H43 V70 H84 V50 H91 V70 H116 V31 H124 V70 H176 V45 H183 V70 H238 V34 H246 V70 H298 V51 H306 V70 H362 V40 H370 V70 H414 V29 H422 V70 H486 V48 H493 V70 H532 V35 H540 V70 H640"
          />
          <path
            className="scope__wave scope__wave--commit"
            d="M0 164 H74 C92 164 92 120 110 120 H166 C184 120 184 164 202 164 H284 C302 164 302 112 320 112 H382 C400 112 400 164 418 164 H502 C520 164 520 126 538 126 H640"
          />
        </svg>
        <div className="scope__legend" aria-hidden="true">
          <span>
            <i className="arrival" />
            NETWORK
          </span>
          <span>
            <i className="commit" />
            COMMIT
          </span>
        </div>
      </div>
      <figcaption>
        <span>{caption}</span>
        <span className="scope__ticks">
          {TICKS.map((tick) => (
            <i key={tick}>{tick}</i>
          ))}
        </span>
      </figcaption>
    </figure>
  )
}
