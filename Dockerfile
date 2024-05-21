FROM node:18

WORKDIR /app

COPY Express-Server/package*.json ./

RUN npm install

COPY Express-Server .

EXPOSE 3000

CMD ["npm", "start"]