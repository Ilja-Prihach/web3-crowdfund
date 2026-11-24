FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*
RUN npm install --global @foundry-rs/anvil@1.7.1 @foundry-rs/cast@1.7.1
RUN ln -sf /usr/local/lib/node_modules/@foundry-rs/cast/node_modules/@foundry-rs/cast-linux-*/bin/cast /usr/local/bin/cast \
    && ln -sf /usr/local/lib/node_modules/@foundry-rs/anvil/node_modules/@foundry-rs/anvil-linux-*/bin/anvil /usr/local/bin/anvil
RUN npm install --global solc@0.8.24 @openzeppelin/contracts@5.7.0
WORKDIR /contracts
COPY contracts/src ./src
COPY docker/demo/seed.sh /seed.sh
COPY docker/demo/compile.cjs /compile.cjs
