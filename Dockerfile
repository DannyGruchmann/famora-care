# ---- Build stage ----
FROM node:20.19-alpine AS builder

WORKDIR /app

# Copy manifests first so this layer stays cached while only sources change
COPY package.json package-lock.json ./

# npm install instead of npm ci: a lockfile written on macOS omits the @emnapi/*
# packages, which are the wasm fallback of a native dependency and only resolve on
# linux. npm ci refuses to install then ("Missing: @emnapi/core from lock file"),
# so the deploy would break on a machine that never ran the install.
RUN npm install --no-audit --no-fund

COPY . .

# Angular bakes config into the bundle, so these have to be set before ng build runs.
# The prebuild hook writes them into src/environments/environment.ts.
#
# Deliberately ARG without ENV: build args are already visible to RUN, and an ENV
# instruction would additionally persist the value as an image layer. They exist only
# in this stage — the nginx image below inherits nothing from it.
#
# Only the anon key belongs here. It ships inside the public bundle by design and Row
# Level Security is what protects the data. The service_role key must never be passed
# in; generate-environment.mjs aborts the build if it is.
ARG SUPABASE_URL
ARG SUPABASE_ANON_KEY

RUN npm run build

# ---- Runtime stage ----
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist/famora/browser /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
