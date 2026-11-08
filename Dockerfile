FROM mcr.microsoft.com/playwright:v1.56.1-noble

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

RUN chmod +x start.sh

CMD ["./start.sh"]
