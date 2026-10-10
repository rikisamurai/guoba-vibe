import { PROVIDERS } from '../../lib/providers'
import { updateSettings, useSettings } from '../store/settings-store'

const OPTIONS = PROVIDERS.flatMap((provider) =>
  provider.models.map((model) => ({
    value: `${provider.id}:${model.id}`,
    label: `${provider.label} · ${model.id}`,
    provider: provider.id,
    model: model.id,
  })),
)

export function ProviderSelect() {
  const settings = useSettings()
  return (
    <div className="border-seam bg-panel flex items-center gap-2 rounded-lg border py-2 pr-2 pl-3 font-mono text-[12.5px]">
      <span className="bg-pulse size-[7px] rounded-full" />
      <select
        value={`${settings.provider}:${settings.model}`}
        onChange={(event) => {
          const option = OPTIONS.find((entry) => entry.value === event.target.value)
          if (option !== undefined) {
            updateSettings({ provider: option.provider, model: option.model })
          }
        }}
        className="text-ink bg-transparent outline-none"
      >
        {OPTIONS.map((option) => (
          <option key={option.value} value={option.value} className="bg-panel text-ink">
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}
