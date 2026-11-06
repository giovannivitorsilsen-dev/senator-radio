FROM node:22-alpine
ENV NODE_ENV=production PORT=3000
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force
COPY server.js ./
COPY public ./public
RUN chown -R node:node /app
USER node
EXPOSE 3000
CMD ["node","server.js"]
