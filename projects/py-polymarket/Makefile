.PHONY: install test trade monitor simulate backtest demo docker-build docker-up monitoring-up

install:
	python -m pip install --upgrade pip
	pip install -e ".[dev]"

test:
	pytest tests -q

trade:
	polymarket-launch trade --interval 60

monitor:
	polymarket-launch monitor --port 8888

simulate:
	polymarket-simulate --offline --markets 5 --output reports/simulation.json

backtest:
	polymarket-backtest --offline --markets 10 --output reports/backtest.json

demo:
	polymarket-demo --offline

docker-build:
	./infra/docker/build-trader.sh

docker-up:
	docker compose -f infra/docker/docker-compose.yml up --build

monitoring-up:
	docker compose -f infra/monitoring/docker-compose.yml up
