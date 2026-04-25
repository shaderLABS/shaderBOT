FROM oven/bun:alpine

RUN apk add --no-cache vips postgresql-client

WORKDIR /app

COPY bun.lockb package.json ./
RUN bun install --frozen-lockfile --production

COPY drizzle/ drizzle/
COPY settings.template.jsonc ./
COPY src/ src/
COPY tsconfig.json ./
COPY scripts/prod/docker/entrypoint.sh ./

RUN addgroup -S shaderbot && adduser -S shaderbot -G shaderbot \
    && chmod +x entrypoint.sh \
    && mkdir -p customContent/channelBackup \
    && chown -R shaderbot:shaderbot /app

USER shaderbot

ENTRYPOINT ["./entrypoint.sh"]
