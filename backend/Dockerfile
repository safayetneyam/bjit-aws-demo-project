FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY prisma ./prisma
RUN npx prisma generate
COPY src ./src
ARG BACKEND_CONTAINER_PORT=4000
EXPOSE $BACKEND_CONTAINER_PORT
CMD ["npm", "start"]
