FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --no-audit

COPY . .

RUN npm run build

EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001

CMD ["npm", "run", "server:start"]
