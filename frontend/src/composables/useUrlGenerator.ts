function generateUrljoinGame({
  hostId,
  locale,
  mode,
  paramsOnly = false,
}:
{
  hostId: string
  locale: Locale
  mode: PlayerModes
  paramsOnly?: boolean
}) {
  const l = locale.charAt(0)
  const m = mode.charAt(0)

  const params = `?h=${hostId}&l=${l}&m=${m}`
  const origin = `${location.origin}${import.meta.env.BASE_URL}lobby`
  return (paramsOnly ? '' : origin) + params
}

function generateUrlDictionary(locale: Locale) {
  return `${import.meta.env.BASE_URL}dictionaries/${locale}.json?v=1`
}

export {
  generateUrljoinGame,
  generateUrlDictionary,
}
