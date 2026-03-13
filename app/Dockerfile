# build environment
FROM node:16 as build
WORKDIR /app
ENV PATH /app/node_modules/.bin:$PATH
COPY package.json /app/package.json
RUN npm install
RUN npm install react-scripts@5.0.1 -g --silent
COPY . /app
RUN npm run build

# production environment
FROM nginx:1.23.1-alpine
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80