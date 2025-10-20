# Docker Assets

- `Dockerfile.trader`: builds the polymarket launcher image.
- `docker-compose.yml`: spins up the trader and monitor services (offline mode by default).
- `build-trader.sh`: helper script to build (and optionally push) the Docker image.

## Usage

```bash
./build-trader.sh               # builds polymarket/trader:local
IMAGE_NAME=my-registry/trader:latest ./build-trader.sh  # custom tag
PUSH_IMAGE=true IMAGE_NAME=my-registry/trader:latest ./build-trader.sh
```

After building, run `docker compose up --build` from this directory to test locally.
