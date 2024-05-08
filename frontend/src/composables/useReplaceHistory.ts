export function useReplaceHistory(replace: string) {
  history.replaceState(
    history.state,
    '',
    replace,
  )
}
