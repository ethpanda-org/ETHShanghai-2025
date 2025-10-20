#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
IMAGE_NAME="${IMAGE_NAME:-polymarket/trader:local}"
DOCKER_FILE="${DOCKER_FILE:-infra/docker/Dockerfile.trader}"

echo "Building image ${IMAGE_NAME} from ${DOCKER_FILE}"
docker build -f "${ROOT_DIR}/${DOCKER_FILE}" -t "${IMAGE_NAME}" "${ROOT_DIR}"

if [[ "${PUSH_IMAGE:-false}" == "true" ]]; then
  docker push "${IMAGE_NAME}"
fi
