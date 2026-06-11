import { StyleSheet, Text, View } from 'react-native'

import { palette, radii } from './theme'

export type StatusChipTone = 'info' | 'neutral' | 'success' | 'warning'

export type StatusChipProps = {
  label: string
  tone?: StatusChipTone
  value?: string
}

const toneStyles = {
  info: {
    background: palette.blueSoft,
    foreground: '#1E4A9B',
  },
  neutral: {
    background: palette.sage,
    foreground: palette.inkMuted,
  },
  success: {
    background: palette.mintSoft,
    foreground: '#116B4A',
  },
  warning: {
    background: palette.amberSoft,
    foreground: '#875C00',
  },
} as const

export function StatusChip({ label, tone = 'neutral', value }: StatusChipProps) {
  const colors = toneStyles[tone]

  return (
    <View style={[styles.base, { backgroundColor: colors.background }]}>
      <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
      {value ? <Text style={[styles.value, { color: colors.foreground }]}>{value}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    flexDirection: 'row',
    gap: 7,
    minHeight: 30,
    paddingHorizontal: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0,
  },
  value: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0,
  },
})
