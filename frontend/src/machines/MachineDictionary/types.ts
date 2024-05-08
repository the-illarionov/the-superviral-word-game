export type MachineDictionaryEvent =
  {
    type: 'Awake'
    locale: Locale
  } | {
    type: 'Set words for locale'
    words: string[]
    locale: Locale
  } | {
    type: 'Found missing words for locale'
    locale: Locale
  } | {
    type: 'Download dictionary for locale'
    locale: Locale
  } | {
    type: 'All words are set'
  }
