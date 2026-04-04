# syntax=docker/dockerfile:1.3

###################################
# 1) Build your Expo web bundle   #
###################################
FROM node:18-slim as builder

WORKDIR /app

COPY package*.json ./

# cache-bust: 2026-04-04
RUN npm install --legacy-peer-deps

COPY . .

ARG EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY
ENV EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=$EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY

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