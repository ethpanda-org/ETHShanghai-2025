FROM --platform=linux/x86_64 ubuntu:22.04

ARG DEBIAN_FRONTEND=noninteractive

ENV ARGS=""

RUN apt update \
  && apt install -y sudo curl postgresql postgresql-contrib
  
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - \
  && sudo apt-get install -y nodejs

COPY ../../binary-linux-22.1 /usr/local/bin/matchstick
RUN chmod a+x /usr/local/bin/matchstick

COPY ../ /matchstick/tests/
WORKDIR /matchstick

CMD ["/usr/local/bin/matchstick"]
