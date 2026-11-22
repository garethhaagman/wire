FROM node:20-slim
RUN npm install -g docsify-cli@4

WORKDIR /site
COPY apps/docs/index.html ./index.html
COPY apps/docs/_sidebar.md ./_sidebar.md
COPY README.md ./README.md
COPY internal-docs ./internal-docs

EXPOSE 3000
CMD ["docsify", "serve", ".", "-p", "3000"]
