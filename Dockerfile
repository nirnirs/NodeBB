# The base image is the latest 8.x node (LTS)
FROM node:8.15.1@sha256:918f0be3932f555cd2645ca828b9c231a2dab10d9cf2dbb58896411207bbe52f

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

ARG NODE_ENV
ENV NODE_ENV $NODE_ENV
COPY install/package.json /usr/src/app/package.json
RUN npm install && npm cache clean --force
COPY . /usr/src/app

ENV NODE_ENV=production \
    daemon=false \
    silent=false

CMD ./nodebb start

# the default port for NodeBB is exposed outside the container
EXPOSE 4567