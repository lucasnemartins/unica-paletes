# syntax=docker/dockerfile:1.3

###################################
# 1) Build your Expo web bundle   #
###################################
FROM node:18-slim as builder

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build:web

###################################
# 2) Serve it with nginx + SSL    #
###################################
FROM nginx:alpine

# copy SPA fallback config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# copy the pre-built static files
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]