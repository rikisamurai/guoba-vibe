import { Moon, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { useTheme } from '@/lib/theme'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const { t } = useTranslation()
  const Icon = theme === 'dark' ? Sun : Moon
  const nextMode = t(theme === 'dark' ? 'theme.light' : 'theme.dark')
  const label = t('theme.switchTo', { mode: nextMode })
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
    >
      <Icon />
    </Button>
  )
}
