FROM node:10

WORKDIR /CDN

COPY package*.json ./
RUN npm install

COPY . .

CMD [ "npm", "start" ]