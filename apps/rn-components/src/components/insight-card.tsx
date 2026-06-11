import { Pressable, StyleSheet, Text, View } from 'react-native'

import { palette, radii, shadow } from './theme'

export type InsightCardProps = {
  actionLabel?: string
  delta?: string
  metric: string
  onActionPress?: () => void
  progress: number
  subtitle: string
  title: string
}

const clampProgress = (value: number) => Math.max(0, Math.min(100, value))

export function InsightCard({
  actionLabel,
  delta,
  metric,
  onActionPress,
  progress,
  subtitle,
  title,
}: InsightCardProps) {
  const safeProgress = clampProgress(progress)

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        {delta ? <Text style={styles.delta}>{delta}</Text> : null}
      </View>

      <Text style={styles.metric}>{metric}</Text>
      <View
        accessibilityLabel={`${title} progress`}
        accessibilityRole="progressbar"
        accessibilityValue={{ max: 100, min: 0, now: safeProgress }}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={safeProgress}
        style={styles.track}
      >
        <View style={[styles.progress, { width: `${safeProgress}%` }]} />
      </View>

      {actionLabel ? (
        <Pressable accessibilityRole="button" onPress={onActionPress} style={styles.action}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  action: {
    alignSelf: 'flex-start',
    borderBottomColor: palette.mint,
    borderBottomWidth: 2,
    paddingBottom: 3,
  },
  actionText: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0,
  },
  card: {
    backgroundColor: palette.white,
    borderColor: '#D8E3DC',
    borderRadius: radii.sm,
    borderWidth: 1,
    gap: 18,
    maxWidth: 360,
    padding: 20,
    ...shadow,
  },
  delta: {
    backgroundColor: palette.mintSoft,
    borderRadius: radii.pill,
    color: '#0D6B48',
    fontSize: 13,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'space-between',
  },
  metric: {
    color: palette.ink,
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: 0,
  },
  progress: {
    backgroundColor: palette.mint,
    borderRadius: radii.pill,
    height: '100%',
  },
  subtitle: {
    color: palette.inkMuted,
    fontSize: 14,
    letterSpacing: 0,
    marginTop: 4,
  },
  title: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0,
  },
  track: {
    backgroundColor: palette.sage,
    borderRadius: radii.pill,
    height: 10,
    overflow: 'hidden',
  },
})
