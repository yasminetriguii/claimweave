FROM node:24-bookworm-slim
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4173 DATABASE_PATH=/data/claimweave.sqlite
WORKDIR /app
COPY --chown=node:node package.json server.mjs backend.mjs ./
COPY --chown=node:node dist ./dist
RUN mkdir /data && chown node:node /data
USER node
EXPOSE 4173
CMD ["node","server.mjs"]
