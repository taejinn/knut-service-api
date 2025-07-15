
FROM node:20
ENV TZ Asia/Seoul
RUN mkdir -p /var/app
WORKDIR /var/app
COPY . .
RUN npm install
RUN npm run build
EXPOSE 4000
CMD [ "node", "dist/main.js" ]