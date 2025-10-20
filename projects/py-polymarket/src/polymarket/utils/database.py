import logging
import math
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Mapping, Optional

import pandas as pd
from sqlalchemy import Column, DateTime, Float, Index, Integer, String, create_engine, text
from sqlalchemy.dialects.mysql import insert as mysql_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from tenacity import retry, stop_after_attempt, wait_exponential

from config import settings
from config.settings import DB_CONFIG


logger = logging.getLogger(__name__)

Base = declarative_base()


class MarketData(Base):
    __tablename__ = "market_data"

    timestamp = Column(DateTime, primary_key=True)
    market_id = Column(String(64), primary_key=True)
    price = Column(Float)
    volume = Column(Float)
    bid = Column(Float)
    ask = Column(Float)

    __table_args__ = (
        Index("idx_market_timestamp", "market_id", "timestamp"),
        {"mysql_charset": "utf8mb4", "mysql_engine": "InnoDB"},
    )


class OrderEvent(Base):
    __tablename__ = "order_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, index=True)
    market_id = Column(String(64), index=True)
    action = Column(String(8))
    event = Column(String(16))
    size = Column(Float)
    reason = Column(String(64))
    runtime_mode = Column(String(16))
    source = Column(String(16))


class TradeEvent(Base):
    __tablename__ = "trade_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, index=True)
    order_id = Column(String(80), index=True)
    market_id = Column(String(64), index=True)
    action = Column(String(8))
    shares = Column(Float)
    price = Column(Float)
    notional = Column(Float)
    status = Column(String(16))
    execution_mode = Column(String(16))


class PositionSnapshot(Base):
    __tablename__ = "position_snapshots"

    market_id = Column(String(64), primary_key=True)
    updated_at = Column(DateTime, index=True)
    side = Column(String(8))
    notional = Column(Float)
    shares = Column(Float)
    entry_yes = Column(Float)
    opened_at = Column(DateTime)


class RealizedExit(Base):
    __tablename__ = "realized_exits"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, index=True)
    market_id = Column(String(64), index=True)
    side = Column(String(8))
    reason = Column(String(64))
    notional = Column(Float)
    shares = Column(Float)
    pnl = Column(Float)
    pnl_after_fees = Column(Float)
    fees = Column(Float)


def _to_float(value: Any) -> Optional[float]:
    try:
        if value is None:
            return None
        result = float(value)
        if math.isnan(result) or math.isinf(result):
            return None
        return result
    except (TypeError, ValueError):
        return None


class DatabaseManager:
    def __init__(
        self,
        pool_size: int = 20,
        max_overflow: int = 10,
        *,
        database_url: Optional[str] = None,
        engine_kwargs: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Create database engine with optional override for tests/tooling."""

        engine_kwargs = dict(engine_kwargs or {})

        if database_url:
            self.engine = create_engine(database_url, **engine_kwargs)
        else:
            db_user = DB_CONFIG.get("user")
            db_pwd = DB_CONFIG.get("password")
            db_host = DB_CONFIG.get("host", "localhost")
            db_name = DB_CONFIG.get("database", "polymarket_db")

            mysql_url = (
                f"mysql+pymysql://{db_user}:{db_pwd}@{db_host}/{db_name}?charset=utf8mb4"
                if db_user and db_pwd
                else None
            )
            if mysql_url:
                try:
                    mysql_kwargs = {**engine_kwargs}
                    mysql_kwargs.update(
                        {
                            "pool_size": pool_size,
                            "max_overflow": max_overflow,
                            "pool_recycle": 3600,
                        }
                    )
                    candidate = create_engine(mysql_url, **mysql_kwargs)
                    with candidate.connect() as _:  # connectivity probe
                        pass
                    self.engine = candidate
                except Exception as exc:  # pragma: no cover - connectivity fallback
                    logger.warning(
                        "MySQL connection failed, falling back to SQLite: %s", exc
                    )
                    fallback_url = f"sqlite:///./{db_name}.sqlite3"
                    self.engine = create_engine(fallback_url, **engine_kwargs)
            else:
                fallback_url = f"sqlite:///./{db_name}.sqlite3"
                self.engine = create_engine(fallback_url, **engine_kwargs)

        self._backend = self.engine.url.get_backend_name()
        self._init_db()
        self.Session = sessionmaker(bind=self.engine)

    def _init_db(self) -> None:
        """Initialise schema (and database when using MySQL)."""

        try:
            with self.engine.connect() as conn:
                if self._backend.startswith("mysql"):
                    conn.execute(
                        text(
                            "CREATE DATABASE IF NOT EXISTS polymarket_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
                        )
                    )
                    conn.execute(
                        text(
                            "ALTER DATABASE polymarket_db CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci"
                        )
                    )
        except Exception:  # pragma: no cover - best effort bootstrap
            pass
        Base.metadata.create_all(self.engine)

    def _prepare_record(
        self, market: Mapping[str, Any], timestamp: datetime
    ) -> Optional[Dict[str, Any]]:
        market_id = str(
            market.get("market_id")
            or market.get("condition_id")
            or market.get("id")
            or market.get("market")
            or ""
        ).strip()
        if not market_id:
            return None

        timestamp = self._resolve_timestamp(market, timestamp)
        price = _to_float(
            market.get("yes_price")
            or market.get("price")
            or market.get("mid_price")
            or market.get("bid")
            or market.get("ask")
        )
        bid = _to_float(market.get("bid"))
        ask = _to_float(market.get("ask"))
        volume = _to_float(
            market.get("volume_24h") or market.get("volume") or market.get("liquidity")
        )

        if price is None:
            if bid is not None and ask is not None:
                price = (bid + ask) / 2.0
            elif bid is not None:
                price = bid
            elif ask is not None:
                price = ask
            else:
                return None

        return {
            "timestamp": timestamp,
            "market_id": market_id,
            "price": price,
            "volume": volume if volume is not None else 0.0,
            "bid": bid if bid is not None else price,
            "ask": ask if ask is not None else price,
        }

    def _resolve_timestamp(self, market: Mapping[str, Any], default: datetime) -> datetime:
        candidate = market.get('timestamp') or market.get('observed_at') or market.get('captured_at')
        parsed = self._parse_timestamp(candidate)
        return parsed if parsed is not None else default

    def _parse_timestamp(self, value: Any) -> Optional[datetime]:
        if value is None:
            return None
        if isinstance(value, datetime):
            dt = value
        elif isinstance(value, (int, float)):
            try:
                dt = datetime.fromtimestamp(float(value), tz=timezone.utc)
            except (OSError, ValueError):
                return None
        elif isinstance(value, str):
            text = value.strip()
            if not text:
                return None
            if text.endswith('Z'):
                text = text[:-1] + '+00:00'
            try:
                dt = datetime.fromisoformat(text)
            except ValueError:
                return None
        else:
            return None
        if dt.tzinfo is None:
            return dt
        return dt.astimezone(timezone.utc).replace(tzinfo=None)

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10),
        before_sleep=lambda _: logger.warning("Retrying database insert ..."),
    )
    def batch_insert(self, data: List[Mapping[str, Any]], chunk_size: int = 1000) -> None:
        """Persist market snapshots, tolerating missing fields."""

        if not data:
            return

        normalized: List[Dict[str, Any]] = []
        tick = datetime.utcnow()
        for item in data:
            record = self._prepare_record(item, tick)
            if record:
                normalized.append(record)
                tick += timedelta(milliseconds=1)

        if not normalized:
            logger.debug("No market records prepared for persistence")
            return

        backend = self._backend
        for offset in range(0, len(normalized), chunk_size):
            chunk = normalized[offset : offset + chunk_size]
            try:
                if backend.startswith("sqlite"):
                    stmt = sqlite_insert(MarketData.__table__).values(chunk)
                    stmt = stmt.on_conflict_do_update(
                        index_elements=[
                            MarketData.market_id.name,
                            MarketData.timestamp.name,
                        ],
                        set_={
                            "price": stmt.excluded.price,
                            "volume": stmt.excluded.volume,
                            "bid": stmt.excluded.bid,
                            "ask": stmt.excluded.ask,
                        },
                    )
                else:
                    stmt = mysql_insert(MarketData.__table__).values(chunk)
                    stmt = stmt.on_duplicate_key_update(
                        price=stmt.inserted.price,
                        volume=stmt.inserted.volume,
                        bid=stmt.inserted.bid,
                        ask=stmt.inserted.ask,
                    )
                with self.engine.begin() as conn:
                    conn.execute(stmt)
            except Exception as exc:
                logger.error("Batch insert failed at offset %s: %s", offset, exc)
                raise

    def fast_bulk_insert(self, data: List[Mapping[str, Any]]) -> None:
        """High throughput ingestion for historical backfills."""

        normalized = [self._prepare_record(item, datetime.utcnow()) for item in data]

    # ---- orders/trades/positions/realized persistence ---------------------

    def insert_order_event(self, payload: Mapping[str, Any]) -> None:
        ts = self._coerce_dt(payload.get("timestamp"))
        row = {
            "timestamp": ts,
            "market_id": payload.get("market_id"),
            "action": payload.get("action"),
            "event": payload.get("event") or payload.get("status") or "submit",
            "size": payload.get("size"),
            "reason": payload.get("reason"),
            "runtime_mode": payload.get("runtime_mode"),
            "source": payload.get("source"),
        }
        with self.engine.begin() as conn:
            conn.execute(OrderEvent.__table__.insert().values(row))

    def insert_trade_event(self, payload: Mapping[str, Any]) -> None:
        ts = self._coerce_dt(payload.get("timestamp"))
        row = {
            "timestamp": ts,
            "order_id": payload.get("order_id"),
            "market_id": payload.get("market_id"),
            "action": payload.get("side") or payload.get("action"),
            "shares": payload.get("filled_shares"),
            "price": payload.get("average_price") or payload.get("price"),
            "notional": payload.get("filled_notional") or payload.get("notional"),
            "status": payload.get("status"),
            "execution_mode": payload.get("execution_mode"),
        }
        with self.engine.begin() as conn:
            conn.execute(TradeEvent.__table__.insert().values(row))

    def upsert_position(self, position: Mapping[str, Any]) -> None:
        ts = self._coerce_dt(position.get("updated_at") or position.get("opened_at") or datetime.utcnow())
        market_id = position.get("market_id")
        if not market_id:
            return
        row = {
            "market_id": market_id,
            "updated_at": ts,
            "side": position.get("side"),
            "notional": position.get("notional"),
            "shares": position.get("shares"),
            "entry_yes": position.get("entry_yes"),
            "opened_at": self._coerce_dt(position.get("opened_at")),
        }
        with self.engine.begin() as conn:
            if self._backend.startswith("sqlite"):
                stmt = sqlite_insert(PositionSnapshot.__table__).values(row)
                stmt = stmt.on_conflict_do_update(
                    index_elements=[PositionSnapshot.market_id.name],
                    set_={
                        "updated_at": stmt.excluded.updated_at,
                        "side": stmt.excluded.side,
                        "notional": stmt.excluded.notional,
                        "shares": stmt.excluded.shares,
                        "entry_yes": stmt.excluded.entry_yes,
                        "opened_at": stmt.excluded.opened_at,
                    },
                )
                conn.execute(stmt)
            else:
                stmt = mysql_insert(PositionSnapshot.__table__).values(row)
                stmt = stmt.on_duplicate_key_update(
                    updated_at=stmt.inserted.updated_at,
                    side=stmt.inserted.side,
                    notional=stmt.inserted.notional,
                    shares=stmt.inserted.shares,
                    entry_yes=stmt.inserted.entry_yes,
                    opened_at=stmt.inserted.opened_at,
                )
                conn.execute(stmt)

    def insert_realized_exit(self, record: Mapping[str, Any]) -> None:
        ts = self._coerce_dt(record.get("timestamp"))
        row = {
            "timestamp": ts,
            "market_id": record.get("market_id"),
            "side": record.get("side"),
            "reason": record.get("reason"),
            "notional": record.get("notional"),
            "shares": record.get("shares"),
            "pnl": record.get("pnl"),
            "pnl_after_fees": record.get("pnl_after_fees"),
            "fees": record.get("fees"),
        }
        with self.engine.begin() as conn:
            conn.execute(RealizedExit.__table__.insert().values(row))

    @staticmethod
    def _coerce_dt(value: Any) -> datetime:
        if isinstance(value, datetime):
            return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
        if isinstance(value, (int, float)):
            try:
                return datetime.fromtimestamp(float(value), tz=timezone.utc)
            except Exception:
                return datetime.utcnow().replace(tzinfo=timezone.utc)
        if isinstance(value, str):
            txt = value.strip()
            if txt.endswith("Z"):
                txt = txt.replace("Z", "+00:00")
            try:
                dt = datetime.fromisoformat(txt)
                return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
            except Exception:
                return datetime.utcnow().replace(tzinfo=timezone.utc)
        return datetime.utcnow().replace(tzinfo=timezone.utc)
        normalized = [item for item in normalized if item]
        if not normalized:
            return
        df = pd.DataFrame(normalized)
        df.to_sql(
            name="market_data",
            con=self.engine,
            if_exists="append",
            index=False,
            method="multi",
            chunksize=5000,
        )

    def query_returns_history(self, days: int = 30, max_points: int = 200) -> List[float]:
        """Return capped list of percentage returns for recent price history."""

        cutoff = datetime.utcnow() - timedelta(days=days)
        with self.Session() as session:
            rows = (
                session.query(MarketData.timestamp, MarketData.price)
                .filter(MarketData.timestamp >= cutoff)
                .order_by(MarketData.timestamp)
                .all()
            )

        if not rows:
            return []

        df = pd.DataFrame(rows, columns=["timestamp", "price"])
        df = df[df["price"].notnull()].sort_values("timestamp")
        if df.empty:
            return []

        returns = df["price"].pct_change().dropna()
        if returns.empty:
            return []

        tail = returns.clip(lower=-1.0, upper=1.0).tail(max_points)
        return tail.round(6).tolist()

    def get_current_balance(self) -> float:
        """Estimate portfolio balance using cumulative price returns."""

        baseline = float(getattr(settings.trading, "initial_balance", 10_000.0))
        with self.Session() as session:
            rows = (
                session.query(MarketData.timestamp, MarketData.price)
                .order_by(MarketData.timestamp)
                .all()
            )

        if not rows:
            return baseline

        df = pd.DataFrame(rows, columns=["timestamp", "price"])
        df = df[df["price"].notnull()].sort_values("timestamp")
        if df.empty:
            return baseline

        returns = df["price"].pct_change().dropna()
        if returns.empty:
            return baseline

        cumulative = float((returns + 1.0).prod())
        if not math.isfinite(cumulative) or cumulative <= 0:
            return baseline

        return round(baseline * cumulative, 2)

    def get_open_positions(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Return synthetic open positions derived from recent market records."""

        with self.Session() as session:
            rows = (
                session.query(
                    MarketData.market_id,
                    MarketData.price,
                    MarketData.volume,
                    MarketData.bid,
                    MarketData.ask,
                    MarketData.timestamp,
                )
                .order_by(MarketData.market_id, MarketData.timestamp.desc())
                .limit(limit * 3)
                .all()
            )

        if not rows:
            return []

        positions: List[Dict[str, Any]] = []
        seen = set()
        for row in rows:
            market_id = getattr(row, "market_id", row[0])
            if market_id in seen:
                continue
            seen.add(market_id)
            price = getattr(row, "price", row[1])
            volume = getattr(row, "volume", row[2])
            bid = getattr(row, "bid", row[3])
            ask = getattr(row, "ask", row[4])
            timestamp = getattr(row, "timestamp", row[5])
            positions.append(
                {
                    "market_id": market_id,
                    "price": price,
                    "volume": volume,
                    "bid": bid,
                    "ask": ask,
                    "timestamp": timestamp.isoformat() if timestamp else None,
                }
            )
            if len(positions) >= limit:
                break
        return positions


__all__ = ["DatabaseManager", "MarketData"]

