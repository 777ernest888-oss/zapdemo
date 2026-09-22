FROM node:22-alpine
WORKDIR /app
RUN apk add --no-cache --virtual .build-deps python3 make g++
COPY package*.json ./
RUN npm install --no-audit --no-fund --omit=dev && apk del .build-deps
COPY src ./src
COPY public ./public
EXPOSE 3000
CMD ["node", "src/index.js"]
