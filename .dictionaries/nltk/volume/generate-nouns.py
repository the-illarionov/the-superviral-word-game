import nltk
from nltk.corpus import words
from nltk.corpus import stopwords

words = nltk.pos_tag(words.words())
stopwords = stopwords.words("english")

nouns = []

for word, pos in words:
	if(pos == "NN" and word not in stopwords):
		nouns.append(word)

with open('en.txt', "w") as file:
	for noun in nouns:
		file.write(noun + "\n")

print('Done!')