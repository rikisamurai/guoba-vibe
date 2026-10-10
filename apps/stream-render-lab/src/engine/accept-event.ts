import type { InternalEnvelope, RunOutcome } from '../protocol/types'
import type { EngineClock } from './clock'
import type { RunModel } from './run-model'
import type { RunPhase, StartRenderInput } from './types'

interface EventAcceptorContext {
  model: RunModel
  input: StartRenderInput
  clock: EngineClock
  trace: InternalEnvelope[]
  phase(): RunPhase
  setPhase(phase: RunPhase): void
  setOutcome(outcome: RunOutcome): void
  publish(): void
  scheduleFrame(): void
  reconcileHeavy(): void
  settle(): Promise<void>
}

export function createEventAcceptor(context: EventAcceptorContext) {
  const { model, input, clock } = context

  function failLifecycle(message: string): true {
    context.setOutcome({
      kind: 'failed',
      failure: { kind: 'protocol', code: 'lifecycle_violation', message },
    })
    model.addDiagnostic('lifecycle_violation', message)
    model.endAllParts()
    context.setPhase('draining')
    context.publish()
    if (model.hasBacklog()) context.scheduleFrame()
    else void context.settle()
    return true
  }

  return (envelope: InternalEnvelope): boolean => {
    model.noteEvent(envelope.internalSeq)
    if (input.trace === 'full') context.trace.push(envelope)
    const event = envelope.event
    if (event.type === 'response.start') {
      if (context.phase() !== 'connecting') {
        return failLifecycle('response.start occurred more than once')
      }
      context.setPhase('streaming')
      context.publish()
    } else if (event.type === 'part.start') {
      if (context.phase() !== 'streaming' || !model.startPart(event.partId, event.kind)) {
        return failLifecycle(`part.start is invalid for ${event.partId}`)
      }
      context.publish()
    } else if (event.type === 'part.delta') {
      if (!model.appendPart(event.partId, event.delta, clock.now())) {
        return failLifecycle(`part.delta references inactive ${event.partId}`)
      }
      if (input.profile === 'M0') {
        const startedAt = clock.now()
        model.commitPreview('direct', startedAt)
        model.recordParseDuration('preview', clock.now() - startedAt)
        context.reconcileHeavy()
        context.publish()
      } else context.scheduleFrame()
    } else if (event.type === 'part.end') {
      if (!model.endPart(event.partId)) {
        return failLifecycle(`part.end references inactive ${event.partId}`)
      }
    } else if (event.type === 'diagnostic') {
      model.addDiagnostic(event.code, event.message)
      if (input.trace !== 'off') context.publish()
    } else {
      const cleanTerminal =
        event.outcome.kind !== 'completed' && event.outcome.kind !== 'incomplete'
      if (!cleanTerminal && (context.phase() !== 'streaming' || model.hasActiveParts())) {
        return failLifecycle('successful terminal requires response.start and no active parts')
      }
      model.endAllParts()
      context.setOutcome(event.outcome)
      context.setPhase('draining')
      context.publish()
      if (!model.hasBacklog()) void context.settle()
      else context.scheduleFrame()
      return true
    }
    return false
  }
}
