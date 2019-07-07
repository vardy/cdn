FROM node:10

WORKDIR /usr/src/yamvp

COPY package*.json ./
RUN npm install

COPY . .
EXPOSE 3000

CMD [ "npm", "run", "start" ]