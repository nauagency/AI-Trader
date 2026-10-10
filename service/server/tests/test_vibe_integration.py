import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient


SERVER_DIR = Path(__file__).resolve().parents[1]
if str(SERVER_DIR) not in sys.path:
    sys.path.insert(0, str(SERVER_DIR))

import database
from routes_integrations import register_integration_routes
from routes_shared import RouteContext


class VibeIntegrationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        database.DATABASE_URL = ""
        database._SQLITE_DB_PATH = os.path.join(self.tmp.name, "test.db")
        database.init_database()
        app = FastAPI()
        register_integration_routes(app, RouteContext())
        self.client = TestClient(app)
        self.payload = {
            "run_id": "run_20261010_120000",
            "status": "success",
            "prompt": "Backtest BTC breakout",
            "symbols": ["BTCUSDT"],
            "start_date": "2023-01-01",
            "end_date": "2026-10-10",
            "metrics": {"total_return": 0.21, "sharpe": 1.3},
            "source_url": "https://vibetrading.nauagency.asia",
        }

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def test_rejects_missing_secret(self) -> None:
        with patch("routes_integrations.VIBE_BRIDGE_SECRET", "bridge-test-secret"):
            response = self.client.post("/api/integrations/vibe/runs", json=self.payload)
        self.assertEqual(response.status_code, 401)

    def test_imports_once_and_deduplicates_by_run_id(self) -> None:
        headers = {"X-Vibe-Bridge-Key": "bridge-test-secret"}
        with patch("routes_integrations.VIBE_BRIDGE_SECRET", "bridge-test-secret"):
            first = self.client.post("/api/integrations/vibe/runs", json=self.payload, headers=headers)
            second = self.client.post("/api/integrations/vibe/runs", json=self.payload, headers=headers)

        self.assertEqual(first.status_code, 200)
        self.assertTrue(first.json()["imported"])
        self.assertFalse(first.json()["duplicate"])
        self.assertEqual(second.status_code, 200)
        self.assertTrue(second.json()["duplicate"])
        self.assertTrue(second.json()["updated"])
        self.assertEqual(first.json()["signal_id"], second.json()["signal_id"])

        conn = database.get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) AS count FROM signals")
        self.assertEqual(cursor.fetchone()["count"], 1)
        cursor.execute("SELECT market, signal_type, content FROM signals")
        signal = cursor.fetchone()
        conn.close()
        self.assertEqual(signal["market"], "crypto")
        self.assertEqual(signal["signal_type"], "research-import")
        self.assertIn("paper only", signal["content"])

    def test_accepts_edge_validation_marker(self) -> None:
        response = self.client.post(
            "/api/integrations/vibe/runs",
            json=self.payload,
            headers={"X-Vibe-Bridge-Validated": "cloudflare-worker"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["imported"])


if __name__ == "__main__":
    unittest.main()
