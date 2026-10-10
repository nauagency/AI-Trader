"""Authenticated service-to-service imports from Vibe-Trading."""

from __future__ import annotations

import json
import secrets
from datetime import datetime, timezone

from fastapi import FastAPI, Header, HTTPException

from config import VIBE_BRIDGE_SECRET
from database import begin_write_transaction, get_db_connection
from routes_models import VibeRunImportRequest
from routes_shared import RouteContext, invalidate_signal_read_caches, utc_now_iso_z
from services import _reserve_signal_id


def _require_bridge_secret(value: str | None, validated: str | None) -> None:
    edge_validated = validated == "cloudflare-worker"
    direct_validated = bool(
        VIBE_BRIDGE_SECRET
        and value
        and secrets.compare_digest(value, VIBE_BRIDGE_SECRET)
    )
    if not edge_validated and not direct_validated:
        raise HTTPException(status_code=401, detail="Invalid bridge credentials")


def _market_for_symbols(symbols: list[str]) -> str:
    joined = " ".join(symbol.upper() for symbol in symbols)
    if "BTC" in joined or "ETH" in joined:
        return "crypto"
    if "XAU" in joined or "GOLD" in joined:
        return "metals"
    if any(code in joined for code in ("EURUSD", "GBPUSD", "USDJPY", "FOREX")):
        return "forex"
    return "research"


def _content(data: VibeRunImportRequest) -> str:
    metrics = ", ".join(
        f"{key}={value}" for key, value in sorted(data.metrics.items())
        if value is not None
    ) or "No metrics recorded"
    period = " → ".join(value for value in (data.start_date, data.end_date) if value) or "unspecified"
    lines = [
        data.prompt or "Vibe-Trading backtest",
        f"Run: {data.run_id}",
        f"Period: {period}",
        f"Metrics: {metrics}",
        "Mode: research/paper only; no live order was created.",
    ]
    if data.source_url:
        lines.append(f"Source: {data.source_url.rstrip('/')}/runs/{data.run_id}")
    return "\n".join(lines)


def _integration_agent_id(cursor) -> int:
    cursor.execute("SELECT id FROM agents WHERE name = ?", ("Vibe-Trading",))
    row = cursor.fetchone()
    if row:
        return int(row["id"])
    now = utc_now_iso_z()
    cursor.execute(
        """
        INSERT INTO agents (name, role, identity_status, cash, deposited, created_at, updated_at)
        VALUES (?, 'integration', 'verified', 0, 0, ?, ?)
        """,
        ("Vibe-Trading", now, now),
    )
    return int(cursor.lastrowid)


def register_integration_routes(app: FastAPI, ctx: RouteContext) -> None:
    @app.post('/api/integrations/vibe/runs')
    async def import_vibe_run(
        data: VibeRunImportRequest,
        x_vibe_bridge_key: str | None = Header(None),
        x_vibe_bridge_validated: str | None = Header(None),
    ):
        _require_bridge_secret(x_vibe_bridge_key, x_vibe_bridge_validated)
        run_id = data.run_id.strip()
        if not run_id or len(run_id) > 160:
            raise HTTPException(status_code=400, detail="Invalid run_id")
        if data.status.lower() not in {"success", "completed", "ok"}:
            raise HTTPException(status_code=400, detail="Only successful runs can be imported")

        conn = get_db_connection()
        cursor = conn.cursor()
        duplicate = False
        try:
            begin_write_transaction(cursor)
            symbols = [symbol.strip().upper() for symbol in data.symbols if symbol.strip()]
            market = _market_for_symbols(symbols)
            title_symbols = ", ".join(symbols) or "Market research"
            cursor.execute(
                "SELECT signal_id FROM integration_imports WHERE source = ? AND external_id = ?",
                ("vibe-trading", run_id),
            )
            existing = cursor.fetchone()
            if existing:
                duplicate = True
                signal_id = int(existing["signal_id"])
                cursor.execute(
                    """
                    UPDATE signals
                    SET market = ?, title = ?, content = ?, symbols = ?, tags = ?
                    WHERE signal_id = ?
                    """,
                    (
                        market,
                        f"Vibe backtest · {title_symbols}",
                        _content(data),
                        json.dumps(symbols, ensure_ascii=False),
                        json.dumps(["vibe-trading", "backtest", "paper-only"]),
                        signal_id,
                    ),
                )
                cursor.execute(
                    "UPDATE integration_imports SET payload_json = ? WHERE source = ? AND external_id = ?",
                    (data.model_dump_json(), "vibe-trading", run_id),
                )
                conn.commit()
            else:
                agent_id = _integration_agent_id(cursor)
                signal_id = _reserve_signal_id(cursor)
                now = utc_now_iso_z()
                cursor.execute(
                    """
                    INSERT INTO signals
                    (signal_id, agent_id, message_type, market, signal_type, title, content, symbols, tags, timestamp, created_at)
                    VALUES (?, ?, 'strategy', ?, 'research-import', ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        signal_id,
                        agent_id,
                        market,
                        f"Vibe backtest · {title_symbols}",
                        _content(data),
                        json.dumps(symbols, ensure_ascii=False),
                        json.dumps(["vibe-trading", "backtest", "paper-only"]),
                        int(datetime.now(timezone.utc).timestamp()),
                        now,
                    ),
                )
                cursor.execute(
                    """
                    INSERT INTO integration_imports (source, external_id, signal_id, payload_json)
                    VALUES (?, ?, ?, ?)
                    """,
                    ("vibe-trading", run_id, signal_id, data.model_dump_json()),
                )
                conn.commit()
        except HTTPException:
            conn.rollback()
            raise
        except Exception as exc:
            conn.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to import Vibe run: {exc}") from exc
        finally:
            conn.close()

        invalidate_signal_read_caches(ctx, refresh_trending=True)
        return {
            "success": True,
            "imported": not duplicate,
            "duplicate": duplicate,
            "updated": duplicate,
            "signal_id": signal_id,
        }
