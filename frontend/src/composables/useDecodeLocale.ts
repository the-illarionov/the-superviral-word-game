export function useDecodeLocale() {
  const l = new URL(document.location.href).searchParams.get('l')

  if (!l)
    return false

  let locale: Locale
  if (l === 'y')
    locale = 'ykt'
  else if (l === 'e')
    locale = 'en'
  else if (l === 'r')
    locale = 'ru'
  else return l
  return locale
}
