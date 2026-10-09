export type ChangeDirection = 'improvement' | 'regression' | 'unchanged' | 'unavailable'

export interface FormattedMetricChange {
  compact: string
  direction: ChangeDirection
  sentence: string
}

export function formatLowerIsBetterChange(
  baseline: number,
  challenger: number,
): FormattedMetricChange {
  if (
    !Number.isFinite(baseline) ||
    !Number.isFinite(challenger) ||
    baseline < 0 ||
    challenger < 0
  ) {
    return { compact: 'N/A', direction: 'unavailable', sentence: '无法比较' }
  }
  if (baseline === challenger) {
    return { compact: '0%', direction: 'unchanged', sentence: '无变化' }
  }
  const direction = challenger < baseline ? 'improvement' : 'regression'
  if (baseline === 0) {
    return {
      compact: 'N/A',
      direction,
      sentence: `${direction === 'improvement' ? '改善' : '回归'}（基线为 0，无法计算百分比）`,
    }
  }
  const percent = Math.abs(((challenger - baseline) / baseline) * 100)
  const value = formatPercent(percent)
  return direction === 'improvement'
    ? { compact: `−${value}%`, direction, sentence: `改善 ${value}%` }
    : { compact: `+${value}%`, direction, sentence: `回归 ${value}%` }
}

export function describeProfileOutcome(directions: readonly ChangeDirection[]): string {
  if (directions.length === 0) return '当前样本不足以比较 M0 与 M1'
  if (directions.every((item) => item === 'unavailable')) {
    return '当前样本不足以比较 M0 与 M1'
  }
  if (directions.every((item) => item === 'unchanged')) {
    return 'M1 与 M0 的重复工作指标没有变化'
  }
  const hasImprovement = directions.includes('improvement')
  const hasRegression = directions.includes('regression')
  if (hasImprovement && hasRegression) return 'M1 的重复工作指标出现了取舍'
  if (hasRegression) return 'M1 在本次样本中出现工作量回归'
  return directions.every((item) => item === 'improvement')
    ? 'M1 在本次样本中减少了重复工作'
    : 'M1 在本次样本中减少了部分重复工作'
}

function formatPercent(value: number): string {
  const rounded = Math.round(value * 10) / 10
  return Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)
}
