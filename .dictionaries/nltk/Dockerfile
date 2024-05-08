FROM "ubuntu"

WORKDIR /root

RUN apt-get update && \
	apt-get install python3.10 -y && \
	apt-get install pip -y && \
	pip install pipenv && \
	ln -s /usr/bin/python3.10 /usr/bin/python && \
	pip install nltk

COPY preparation.py .

RUN python preparation.py