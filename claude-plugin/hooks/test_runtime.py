import http.server
import threading
import time
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
import urllib.error
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("runtime", Path(__file__).with_name("runtime.py"))
runtime = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runtime)


class LifecycleTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.env = patch.dict(os.environ, {"INTERTOOL_STATE_DIR": self.temp.name,
            "INTERTOOL_URL": "http://localhost:3001", "INTERTOOL_API_TOKEN": "test-token",
            "INTERTOOL_REPOSITORY": "acme/payments"})
        self.env.start()
        self.calls = []
        self.offline = False
        def request(path, payload):
            self.calls.append((path, payload))
            if self.offline:
                raise OSError("token or sensitive network error must not escape")
            return {"team": [], "personal": []} if path.endswith("context") else {"saved": True, "memory_id": "receipt-1"}
        self.r = runtime.Runtime(request=request)
        self.event = {"hook_event_name": "UserPromptSubmit", "session_id": "session-1", "cwd": self.temp.name,
                      "prompt": "RAW PROMPT MUST NOT BE SAVED", "transcript_path": "/private/raw-transcript"}

    def tearDown(self):
        self.r.close()
        self.env.stop()
        self.temp.cleanup()

    def begin(self):
        self.r.begin(self.event)
        return self.r.turn("session-1")["turn"]

    def capture(self, turn):
        return self.r.complete("session-1", turn, {"decision": "capture", "memory": {
            "title": "Retry discovery", "content": "Reuse the original request identifier when retrying payments.", "evidence": "Verified with retry integration test"}})

    def stop(self):
        return self.r.stop({**self.event, "hook_event_name": "Stop", "stop_hook_active": True})

    def test_retrieval_runs_without_agent_tool_call_and_excludes_prompt(self):
        result = self.r.begin(self.event)
        self.assertIn("additionalContext", result["hookSpecificOutput"])
        self.assertEqual(self.calls, [("/api/agent/context", {"repository": "acme/payments"})])
        database = (Path(self.temp.name) / "lifecycle.sqlite3").read_bytes()
        self.assertNotIn(b"RAW PROMPT", database)
        self.assertNotIn(b"raw-transcript", database)
        self.assertIsNotNone(self.r.status()["last_retrieval_at"])

    def test_stop_blocks_missing_decision_and_records_no_learning(self):
        turn = self.begin()
        self.assertEqual(self.stop()["decision"], "block")
        self.r.complete("session-1", turn, {"decision": "no_learning"})
        self.assertNotIn("decision", self.stop())
        self.assertEqual(self.r.status("session-1")["capture"], "no_learning")
        self.assertEqual(len(self.calls), 1)

    def test_queue_survives_restart_and_receipt_removes_payload(self):
        turn = self.begin()
        self.offline = True
        self.capture(turn)
        self.assertEqual(self.r.status("session-1")["capture"], "pending")
        self.assertIn("Memory pending", self.stop()["systemMessage"])
        self.r.close()
        self.r = runtime.Runtime(request=lambda *args: {"saved": True, "memory_id": "receipt-2"})
        self.r.flush(force=True)
        self.assertEqual(self.r.status("session-1")["capture"], "saved")
        item = self.r.db.execute("SELECT * FROM queue").fetchone()
        self.assertIsNone(item["payload"])
        self.assertEqual(item["receipt"], "receipt-2")

    def test_identical_completion_is_idempotent(self):
        turn = self.begin()
        self.capture(turn)
        self.capture(turn)
        self.assertEqual(self.r.db.execute("SELECT COUNT(*) FROM queue").fetchone()[0], 1)
        self.assertEqual(len([x for x in self.calls if x[0].endswith("capture")]), 1)

    def test_failed_ack_is_pending_and_backoff_is_recorded(self):
        turn = self.begin()
        self.r.request = lambda *args: {"saved": True}
        self.capture(turn)
        item = self.r.db.execute("SELECT * FROM queue").fetchone()
        self.assertEqual(item["state"], "pending")
        self.assertGreater(item["due"], 0)
        self.assertEqual(item["attempts"], 1)
        self.assertIsNone(self.r.status()["last_saved_at"])

    def test_rejected_capture_cannot_pass_stop_and_can_be_corrected(self):
        turn = self.begin()
        def rejected(*args):
            raise urllib.error.HTTPError("", 400, "bad", {}, None)
        self.r.request = rejected
        self.capture(turn)
        self.assertEqual(self.stop()["decision"], "block")
        self.r.request = lambda *args: {"saved": True, "memory_id": "corrected"}
        self.capture(turn)
        self.assertEqual(self.r.status("session-1")["capture"], "saved")

    def test_token_change_never_uploads_previous_users_queue(self):
        turn = self.begin()
        self.offline = True
        self.capture(turn)
        with patch.dict(os.environ, {"INTERTOOL_API_TOKEN": "another-user-token"}):
            other = runtime.Runtime(request=lambda *args: self.fail("Wrong account upload"))
            try:
                other.flush(force=True)
                self.assertEqual(other.status()["queue"], {})
                self.assertEqual(other.status()["pending_other_credentials"], 1)
            finally:
                other.close()

    def test_opt_out_removes_pending_summary(self):
        turn = self.begin()
        self.offline = True
        self.capture(turn)
        self.r.complete("session-1", turn, {"decision": "opt_out"})
        self.assertEqual(self.r.status()["queue"], {})
        self.assertEqual(self.r.status("session-1")["capture"], "opt_out")

    def test_secret_and_stale_turn_are_rejected_before_queue(self):
        turn = self.begin()
        with self.assertRaises(ValueError):
            self.r.complete("session-1", "old-turn", {"decision": "no_learning"})
        with self.assertRaises(ValueError):
            self.r.complete("session-1", turn, {"decision": "capture", "memory": {
                "title": "Secret example", "content": "The token is ghp_" + "a" * 40, "evidence": "test"}})
        self.assertEqual(self.r.db.execute("SELECT COUNT(*) FROM queue").fetchone()[0], 0)

    def test_continuation_does_not_reset_check_and_recovery_is_bounded(self):
        turn = self.begin()
        reason = self.stop()["reason"]
        self.r.begin({**self.event, "prompt": reason, "turn_id": "new-codex-turn"})
        self.assertEqual(self.r.turn("session-1")["turn"], turn)
        self.assertEqual(self.stop()["decision"], "block")
        self.assertIn("incomplete", self.stop()["systemMessage"])
        self.assertEqual(self.r.status("session-1")["capture"], "unchecked")

    def test_new_user_prompt_requires_new_check(self):
        first = self.begin()
        self.r.complete("session-1", first, {"decision": "no_learning"})
        second = self.begin()
        self.assertNotEqual(first, second)
        self.assertEqual(self.stop()["decision"], "block")

    def test_local_state_permissions(self):
        self.begin()
        self.assertEqual(Path(self.temp.name).stat().st_mode & 0o777, 0o700)
        self.assertEqual((Path(self.temp.name) / "lifecycle.sqlite3").stat().st_mode & 0o777, 0o600)

    def test_installer_preserves_existing_hooks_and_is_idempotent(self):
        for client, filename in (("codex", ".codex/hooks.json"), ("claude", ".claude/settings.local.json")):
            target = Path(self.temp.name) / filename
            target.parent.mkdir(exist_ok=True)
            target.write_text(json.dumps({"custom": True, "hooks": {"Stop": [{"hooks": [{"type":"command","command":"existing"}]}]}}))
            runtime.install(client, self.temp.name)
            runtime.install(client, self.temp.name)
            result = json.loads(target.read_text())
            self.assertTrue(result["custom"])
            self.assertEqual(len(result["hooks"]["Stop"]), 2)
            self.assertEqual(result["hooks"]["Stop"][0]["hooks"][0]["command"], "existing")

    def test_disabled_hook_does_no_network_or_state_work(self):
        disabled_dir = Path(self.temp.name) / "disabled"
        with patch.dict(os.environ, {"INTERTOOL_MEMORY_DISABLED": "1", "INTERTOOL_STATE_DIR": str(disabled_dir)}):
            result = subprocess.run([sys.executable, str(runtime.SCRIPT), "hook"], input=json.dumps(self.event), text=True, capture_output=True)
        self.assertEqual(result.returncode, 0)
        self.assertIn("disabled", result.stdout)
        self.assertFalse(disabled_dir.exists())

    def test_pause_prevents_uploads_and_resume_keeps_queue(self):
        turn = self.begin()
        self.offline = True
        self.capture(turn)
        self.r.pause_file.touch()
        self.offline = False
        calls_before = len(self.calls)
        self.r.flush(force=True)
        self.assertEqual(len(self.calls), calls_before)
        self.assertTrue(self.r.status()["paused"])
        self.assertIn("paused", self.stop()["systemMessage"])
        self.r.pause_file.unlink()
        self.r.flush(force=True)
        self.assertEqual(self.r.status("session-1")["capture"], "saved")

    def test_old_queue_receipt_does_not_complete_a_new_turn_or_session(self):
        first = self.begin()
        self.offline = True
        self.capture(first)
        self.begin()
        self.r.begin({**self.event, "session_id": "session-2"})
        self.offline = False
        self.r.flush(force=True)
        self.assertEqual(self.r.status("session-1")["capture"], "unchecked")
        self.assertEqual(self.r.status("session-2")["capture"], "unchecked")
        self.assertEqual(self.r.status()["queue"], {"saved": 1})

    def test_real_hook_process_queues_offline_and_worker_retries(self):
        requests = []
        online = threading.Event()
        class Handler(http.server.BaseHTTPRequestHandler):
            def do_POST(handler):
                payload = json.loads(handler.rfile.read(int(handler.headers["Content-Length"])))
                requests.append((handler.path, payload))
                is_capture = handler.path.endswith("capture")
                code = 200 if not is_capture or online.is_set() else 503
                body = {"saved": True, "memory_id": "real-receipt"} if is_capture else {"team": [], "personal": []}
                handler.send_response(code)
                handler.send_header("Content-Type", "application/json")
                handler.end_headers()
                handler.wfile.write(json.dumps(body).encode())
            def log_message(self, *args):
                pass
        server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            with patch.dict(os.environ, {"INTERTOOL_URL": "http://127.0.0.1:" + str(server.server_port)}):
                def invoke(*args, payload):
                    result = subprocess.run([sys.executable, str(runtime.SCRIPT), *args], input=json.dumps(payload), text=True, capture_output=True, timeout=15)
                    self.assertEqual(result.returncode, 0, result.stderr)
                    return json.loads(result.stdout)
                invoke("hook", payload=self.event)
                observer = runtime.Runtime()
                try:
                    turn = observer.turn("session-1")["turn"]
                    result = invoke("complete", "--session", "session-1", "--turn", turn, payload={"decision":"capture", "memory":{"title":"Process retry", "content":"The worker retries queued learning after an outage.", "evidence":"Controlled HTTP process test"}})
                    self.assertEqual(result["capture"], "pending")
                    online.set()
                    deadline = time.time() + 12
                    while time.time() < deadline and observer.status("session-1")["capture"] != "saved":
                        time.sleep(0.1)
                    self.assertEqual(observer.status("session-1")["capture"], "saved")
                    self.assertGreaterEqual(len([x for x in requests if x[0].endswith("capture")]), 2)
                    self.assertNotIn("RAW PROMPT", json.dumps(requests))
                finally:
                    observer.close()
        finally:
            server.shutdown()
            server.server_close()
            thread.join(timeout=2)

    def test_insecure_remote_endpoint_is_rejected(self):
        with patch.dict(os.environ, {"INTERTOOL_URL": "http://example.com"}):
            with self.assertRaises(ValueError):
                runtime.Runtime()


if __name__ == "__main__":
    unittest.main()
