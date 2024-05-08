import { readFileSync, readdirSync, writeFileSync } from "fs"

const dir = "./txt/"
const additionalDir = "./txt_additional/"

const additionalFiles = readdirSync(additionalDir)

readdirSync(dir).forEach((file) => {
	let words = readFileSync(dir + file).toString()
	let additionalWords = ""

	if (additionalFiles.includes(file)) additionalWords = readFileSync(additionalDir + file).toString()

	words += additionalWords

	words = words.replaceAll("\r", "").replaceAll("\f", "").replaceAll("-", "").replaceAll(" ", "").split("\n")

	const finalWordsSet = new Set()

	words.forEach((word) => {
		if (word && word.length > 2) {
			finalWordsSet.add(word.toLowerCase())
		}
	})

	let finalWordsArray = Array.from(finalWordsSet)

	finalWordsArray = finalWordsArray.sort((a, b) => a.length - b.length)

	writeFileSync("./json/" + file.replace(".txt", ".json"), JSON.stringify(finalWordsArray))
})
