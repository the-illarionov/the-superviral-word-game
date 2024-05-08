export function useAssert(condition: any, msg?: string): asserts condition {
  if (!condition)
    throw new Error(`Assertion failed! ${msg}`)
}
