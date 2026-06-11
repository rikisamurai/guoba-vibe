import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native'

import StorybookUIRoot from '../.rnstorybook'
import { FeaturePanel, GBButton, InsightCard, StatusChip } from './components'
import { demoFeatures } from './stories/story-data'

const showStorybook = process.env.EXPO_PUBLIC_STORYBOOK_ENABLED === 'true'

export default function App() {
  if (showStorybook) {
    return <StorybookUIRoot />
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Guoba RN Components</Text>
          <Text style={styles.title}>Native component lab</Text>
          <Text style={styles.description}>
            A small cross-platform component set with web and native Storybook entry points.
          </Text>
        </View>

        <View style={styles.row}>
          <GBButton label="Create token" />
          <GBButton label="Preview" variant="secondary" />
          <StatusChip label="Stable" tone="success" value="98%" />
        </View>

        <InsightCard
          actionLabel="Review"
          delta="+12%"
          metric="42k"
          progress={72}
          subtitle="Weekly retained users"
          title="Retention"
        />
        <FeaturePanel features={demoFeatures} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  content: {
    gap: 22,
    padding: 24,
  },
  description: {
    color: '#66736E',
    fontSize: 16,
    letterSpacing: 0,
    lineHeight: 23,
    maxWidth: 520,
  },
  eyebrow: {
    color: '#26A875',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  header: {
    gap: 8,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  safeArea: {
    backgroundColor: '#EEF3EE',
    flex: 1,
  },
  title: {
    color: '#17201D',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 0,
  },
})
