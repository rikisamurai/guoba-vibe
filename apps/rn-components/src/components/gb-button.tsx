import type { GestureResponderEvent, StyleProp, ViewStyle } from 'react-native'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'

import { palette, radii } from './theme'

export type GBButtonVariant = 'danger' | 'primary' | 'secondary'
export type GBButtonSize = 'medium' | 'small'

export type GBButtonProps = {
  disabled?: boolean
  label: string
  loading?: boolean
  onPress?: (event: GestureResponderEvent) => void
  size?: GBButtonSize
  style?: StyleProp<ViewStyle>
  variant?: GBButtonVariant
}

const variantStyles = {
  danger: {
    background: palette.red,
    border: palette.red,
    foreground: palette.white,
  },
  primary: {
    background: palette.ink,
    border: palette.ink,
    foreground: palette.white,
  },
  secondary: {
    background: palette.white,
    border: '#C9D6CF',
    foreground: palette.ink,
  },
} as const

export function GBButton({
  disabled = false,
  label,
  loading = false,
  onPress,
  size = 'medium',
  style,
  variant = 'primary',
}: GBButtonProps) {
  const isDisabled = disabled || loading
  const colors = variantStyles[variant]

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        size === 'small' ? styles.small : styles.medium,
        {
          backgroundColor: colors.background,
          borderColor: colors.border,
          opacity: isDisabled ? 0.58 : pressed ? 0.78 : 1,
        },
        style,
      ]}
    >
      <View style={styles.content}>
        {loading ? <ActivityIndicator color={colors.foreground} size="small" /> : null}
        <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0,
  },
  medium: {
    minHeight: 46,
    paddingHorizontal: 18,
  },
  small: {
    minHeight: 36,
    paddingHorizontal: 14,
  },
})
