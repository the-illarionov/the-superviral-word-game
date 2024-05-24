export function useFindPossibleWords(randomWord: string, wordList: string[]) {
  const possibleWords: string[] = []

  function canFormWord(word: string, randomWord: string) {
    const letterCount: {
      [key: string]: number
    } = {}

    for (const letter of randomWord)
      letterCount[letter] = (letterCount[letter] || 0) + 1

    for (const letter of word) {
      if (!letterCount[letter])
        return false

      letterCount[letter] -= 1
    }

    return true
  }

  for (const word of wordList) {
    if (canFormWord(word, randomWord))
      possibleWords.push(word)
  }

  return possibleWords
}
