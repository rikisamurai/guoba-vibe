/** One normalized event flowing from any token source into the engine. */
export type StreamEvent =
  | { type: 'delta'; text: string }
  | { type: 'done'; finishReason?: string }
  | { type: 'error'; message: string }

/**
 * The meeting point of real API streams and simulated streams.
 * Everything downstream (scheduler, store, renderers) only sees this shape.
 */
export interface TokenSource {
  events: AsyncIterable<StreamEvent>
  /** Idempotent. Stops the underlying stream; the iterator ends without a 'done' event. */
  abort(): void
}
