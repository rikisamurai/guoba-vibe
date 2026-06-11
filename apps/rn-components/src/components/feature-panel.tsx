import { useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { palette, radii, shadow } from './theme'

export type FeaturePanelTone = 'amber' | 'blue' | 'mint' | 'red'

export type FeaturePanelItem = {
  description: string
  id: string
  metrics: ReadonlyArray<{
    label: string
    value: string
  }>
  title: string
  tone: FeaturePanelTone
}

export type FeaturePanelProps = {
  features: readonly FeaturePanelItem[]
  initialFeatureId?: string
  onSelectFeature?: (id: string) => void
  selectedFeatureId?: string
}

const toneColors = {
  amber: palette.amber,
  blue: palette.blue,
  mint: palette.mint,
  red: palette.red,
} as const

export function FeaturePanel({
  features,
  initialFeatureId,
  onSelectFeature,
  selectedFeatureId,
}: FeaturePanelProps) {
  const [localSelectedId, setLocalSelectedId] = useState(initialFeatureId ?? features[0]?.id)
  const activeId = selectedFeatureId ?? localSelectedId
  const activeFeature = useMemo(
    () => features.find((feature) => feature.id === activeId) ?? features[0],
    [activeId, features],
  )

  if (!activeFeature) {
    return null
  }

  const selectFeature = (id: string) => {
    setLocalSelectedId(id)
    onSelectFeature?.(id)
  }

  return (
    <View style={styles.panel}>
      <View style={styles.tabs}>
        {features.map((feature) => {
          const isActive = feature.id === activeFeature.id

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              key={feature.id}
              onPress={() => selectFeature(feature.id)}
              style={[styles.tab, isActive ? styles.activeTab : undefined]}
            >
              <View style={[styles.dot, { backgroundColor: toneColors[feature.tone] }]} />
              <Text style={styles.tabText}>{feature.title}</Text>
            </Pressable>
          )
        })}
      </View>

      <View style={styles.body}>
        <View style={[styles.accent, { backgroundColor: toneColors[activeFeature.tone] }]} />
        <View style={styles.copy}>
          <Text style={styles.title}>{activeFeature.title}</Text>
          <Text style={styles.description}>{activeFeature.description}</Text>
        </View>
      </View>

      <View style={styles.metrics}>
        {activeFeature.metrics.map((metric) => (
          <View key={metric.label} style={styles.metric}>
            <Text style={styles.metricValue}>{metric.value}</Text>
            <Text style={styles.metricLabel}>{metric.label}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  accent: {
    alignSelf: 'stretch',
    borderRadius: radii.pill,
    width: 8,
  },
  activeTab: {
    backgroundColor: palette.ink,
  },
  body: {
    flexDirection: 'row',
    gap: 14,
  },
  copy: {
    flex: 1,
    gap: 8,
  },
  description: {
    color: palette.inkMuted,
    fontSize: 15,
    letterSpacing: 0,
    lineHeight: 22,
  },
  dot: {
    borderRadius: radii.pill,
    height: 9,
    width: 9,
  },
  metric: {
    backgroundColor: palette.paper,
    borderColor: '#DDE8E1',
    borderRadius: radii.sm,
    borderWidth: 1,
    flex: 1,
    gap: 4,
    minWidth: 96,
    padding: 14,
  },
  metricLabel: {
    color: palette.inkMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  metricValue: {
    color: palette.ink,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0,
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  panel: {
    backgroundColor: palette.white,
    borderColor: '#D8E3DC',
    borderRadius: radii.sm,
    borderWidth: 1,
    gap: 18,
    maxWidth: 520,
    padding: 18,
    ...shadow,
  },
  tab: {
    alignItems: 'center',
    backgroundColor: palette.sage,
    borderRadius: radii.pill,
    flexDirection: 'row',
    gap: 8,
    minHeight: 36,
    paddingHorizontal: 12,
  },
  tabText: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0,
  },
  tabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  title: {
    color: palette.ink,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0,
  },
})
