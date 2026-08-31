#!/usr/bin/env python3
"""Local, dependency-free enode operations dashboard.

The server deliberately proxies Mediator calls so the bearer token never needs
to be exposed to browser JavaScript. Local proxy environment variables are
disabled for those calls because Mediator normally listens on loopback.
"""

from __future__ import annotations

import io
import csv
import json
import mimetypes
import os
import shutil
import socket
import subprocess
import sys
import tarfile
import time
import urllib.error
import urllib.parse
import urllib.request
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parent
STATIC_ROOT = ROOT / "static"
TERMINAL_STATES = {"FAILED", "SUCCEEDED"}


def load_config() -> dict[str, Any]:
    path = Path(os.environ.get("ENODE_DASHBOARD_CONFIG", ROOT / "config.json"))
    config: dict[str, Any] = {}
    if path.exists():
        with path.open("r", encoding="utf-8") as handle:
            config = json.load(handle)

    config["host"] = os.environ.get("ENODE_DASHBOARD_HOST", config.get("host", "127.0.0.1"))
    config["port"] = int(os.environ.get("ENODE_DASHBOARD_PORT", config.get("port", 8765)))
    config["mediator_url"] = os.environ.get(
        "ENODE_MEDIATOR_URL", config.get("mediator_url", "http://127.0.0.1:8080")
    ).rstrip("/")
    config["mediator_token"] = os.environ.get(
        "ENODE_MEDIATOR_TOKEN", config.get("mediator_token", "dev-dashboard-token")
    )
    config["principal"] = os.environ.get(
        "ENODE_PRINCIPAL", config.get("principal", "dashboard@localhost")
    )
    config["database_host"] = os.environ.get(
        "ENODE_DATABASE_HOST", config.get("database_host", "127.0.0.1")
    )
    config["database_port"] = int(os.environ.get(
        "ENODE_DATABASE_PORT", config.get("database_port", 5432)
    ))
    config["enode_bin_dir"] = os.environ.get(
        "ENODE_BIN_DIR", config.get("enode_bin_dir", "../enode-bin")
    )
    config.setdefault("enode_config_paths", [])
    config.setdefault("go_paths", [])
    if os.environ.get("ENODE_GO_PATHS"):
        config["go_paths"] = os.environ["ENODE_GO_PATHS"].split(os.pathsep)
    if os.environ.get("ENODE_NODE_CONFIG_PATHS"):
        config["enode_config_paths"] = os.environ["ENODE_NODE_CONFIG_PATHS"].split(os.pathsep)
    return config


CONFIG = load_config()
NO_PROXY_OPENER = urllib.request.build_opener(urllib.request.ProxyHandler({}))


def utc_ms() -> int:
    return int(time.time() * 1000)


def tcp_open(host: str, port: int, timeout: float = 0.7) -> tuple[bool, str]:
    try:
        with socket.create_connection((host, int(port)), timeout=timeout):
            return True, f"{host}:{port} 연결 가능"
    except OSError as exc:
        return False, f"{host}:{port} 연결 안 됨 ({exc.__class__.__name__})"


def command_path(name: str, configured: list[str] | None = None) -> str | None:
    found = shutil.which(name)
    if found:
        return found
    for raw in configured or []:
        candidate = Path(os.path.expandvars(os.path.expanduser(raw)))
        if not candidate.is_absolute():
            candidate = ROOT / candidate
        if candidate.is_file():
            return str(candidate.resolve())
    return None


def short_command(args: list[str], timeout: float = 2.0) -> tuple[bool, str]:
    try:
        result = subprocess.run(
            args,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=timeout,
            check=False,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        )
        message = (result.stdout or result.stderr).strip().splitlines()
        return result.returncode == 0, (message[0] if message else f"exit {result.returncode}")
    except (OSError, subprocess.TimeoutExpired) as exc:
        return False, exc.__class__.__name__


def resolved_local_path(raw: str) -> Path:
    candidate = Path(os.path.expandvars(os.path.expanduser(raw)))
    return candidate if candidate.is_absolute() else ROOT / candidate


def first_existing(paths: list[str]) -> str | None:
    for raw in paths:
        candidate = resolved_local_path(raw)
        if candidate.is_file():
            return str(candidate.resolve())
    return None


def setup_checks() -> dict[str, Any]:
    checks: list[dict[str, Any]] = []

    claude = command_path("claude")
    if claude:
        version_ok, version = short_command([claude, "--version"])
        login_ok, login_note = short_command([claude, "auth", "status"], timeout=3.0)
        checks.append({
            "id": "claude",
            "label": "Claude CLI 설치 · 로그인",
            "ok": bool(version_ok and login_ok),
            "detail": f"{version}; {login_note}",
        })
    else:
        checks.append({"id": "claude", "label": "Claude CLI 설치 · 로그인", "ok": False, "detail": "CLI를 찾지 못함"})

    go = command_path("go", CONFIG.get("go_paths"))
    go_ok, go_detail = short_command([go, "version"]) if go else (False, "Go 실행 파일을 찾지 못함")
    checks.append({"id": "go", "label": "Go 설치", "ok": go_ok, "detail": go_detail})

    bin_dir = resolved_local_path(CONFIG["enode_bin_dir"])
    expected = [bin_dir / name for name in ("enode.exe", "mediator.exe", "runctl.exe")]
    existing = [path.name for path in expected if path.is_file()]
    checks.append({
        "id": "binaries",
        "label": "enode 바이너리",
        "ok": len(existing) == len(expected),
        "detail": f"{len(existing)}/{len(expected)} 확인 · {bin_dir}",
    })

    config_path = first_existing(CONFIG.get("enode_config_paths", []))
    checks.append({
        "id": "node_config",
        "label": "enode 노드 설정파일",
        "ok": config_path is not None,
        "detail": config_path or "설정된 후보 경로에서 찾지 못함",
    })

    db_ok, db_detail = tcp_open(CONFIG["database_host"], int(CONFIG["database_port"]))
    checks.append({"id": "database", "label": "테스트 DB 포트", "ok": db_ok, "detail": db_detail})

    mediator = urllib.parse.urlparse(CONFIG["mediator_url"])
    med_host = mediator.hostname or "127.0.0.1"
    med_port = mediator.port or (443 if mediator.scheme == "https" else 80)
    med_ok, med_detail = tcp_open(med_host, med_port)
    checks.append({"id": "mediator", "label": "Mediator 포트", "ok": med_ok, "detail": med_detail})

    return {"ok": True, "source": "live", "checked_at": utc_ms(), "checks": checks}


WORK_TEMPLATES = [
    {"id": "dump.analyze", "label": "램덤프 분석", "description": "크래시 덤프·스택·메모리 상태 분석"},
    {"id": "build", "label": "빌드", "description": "소스 빌드와 정적 검증"},
    {"id": "fuzz", "label": "퓨징", "description": "입력 corpus 기반 결함 탐색"},
    {"id": "test.run", "label": "테스트 수행", "description": "테스트 실행과 산출물 수집"},
    {"id": "test.inspect", "label": "결과 확인", "description": "판정·로그·record 검토"},
    {"id": "gerrit.push", "label": "Gerrit 패치 push", "description": "리뷰용 refs/for 패치 전송"},
]


def local_enode_processes() -> list[dict[str, Any]]:
    """Return only processes the OS currently reports as enode."""
    instances: list[dict[str, Any]] = []
    if os.name == "nt":
        try:
            result = subprocess.run(
                ["tasklist", "/FI", "IMAGENAME eq enode.exe", "/FO", "CSV", "/NH"],
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                timeout=3,
                check=False,
                creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
            )
            for row in csv.reader(result.stdout.splitlines()):
                if len(row) < 5 or row[0].lower() != "enode.exe":
                    continue
                instances.append({
                    "id": f"local-{row[1]}",
                    "name": f"local enode · PID {row[1]}",
                    "status": "RUNNING",
                    "source": "local-process",
                    "pid": int(row[1]),
                    "detail": f"{row[2]} · memory {row[4]}",
                    "functions": [],
                })
        except (OSError, subprocess.TimeoutExpired, ValueError):
            pass
    else:
        try:
            result = subprocess.run(
                ["ps", "-eo", "pid=,comm=,args="], capture_output=True, text=True,
                encoding="utf-8", errors="replace", timeout=3, check=False,
            )
            for line in result.stdout.splitlines():
                parts = line.strip().split(None, 2)
                if len(parts) < 2 or parts[1] != "enode":
                    continue
                instances.append({
                    "id": f"local-{parts[0]}", "name": f"local enode · PID {parts[0]}",
                    "status": "RUNNING", "source": "local-process", "pid": int(parts[0]),
                    "detail": parts[2] if len(parts) > 2 else "enode", "functions": [],
                })
        except (OSError, subprocess.TimeoutExpired, ValueError):
            pass
    return instances


def observed_enodes() -> dict[str, Any]:
    """Return the Mediator observation and keep local processes diagnostic-only."""
    local_processes = local_enode_processes()
    try:
        snapshot = proxy_json("/v1/nodes")
    except RuntimeError as exc:
        return {
            "ok": True,
            "source": "live-observation",
            "mediator_ok": False,
            "checked_at": utc_ms(),
            "nodes": [],
            "local_processes": local_processes,
            "templates": WORK_TEMPLATES,
            "warning": str(exc),
        }
    return {
        "ok": True,
        "source": "live-observation",
        "mediator_ok": True,
        "checked_at": utc_ms(),
        "observed_at": snapshot.get("observed_at"),
        "nodes": snapshot.get("nodes", []),
        "local_processes": local_processes,
        "templates": WORK_TEMPLATES,
        "note": "GET /v1/nodes는 만료되지 않은 광고와 응답 시점의 임대를 보여주며 배정 가능성을 약속하지 않음",
    }


def mediator_request(path: str, *, accept: str = "application/json") -> tuple[bytes, str, int]:
    url = CONFIG["mediator_url"] + path
    request = urllib.request.Request(
        url,
        headers={
            "Authorization": f"Bearer {CONFIG['mediator_token']}",
            "X-Enode-Principal": CONFIG["principal"],
            "Accept": accept,
        },
    )
    try:
        with NO_PROXY_OPENER.open(request, timeout=4) as response:
            return response.read(), response.headers.get_content_type(), response.status
    except urllib.error.HTTPError as exc:
        body = exc.read()
        message = body.decode("utf-8", errors="replace")[:1000] or str(exc)
        raise RuntimeError(f"Mediator HTTP {exc.code}: {message}") from exc
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        reason = getattr(exc, "reason", exc)
        raise RuntimeError(f"Mediator 연결 안 됨: {reason}") from exc


def proxy_json(path: str) -> dict[str, Any]:
    raw, _content_type, _status = mediator_request(path)
    try:
        value = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise RuntimeError("Mediator가 유효한 JSON을 반환하지 않음") from exc
    if isinstance(value, dict):
        return value
    return {"items": value}


def walk_harness(value: Any, path: str = "$") -> list[dict[str, Any]]:
    found: list[dict[str, Any]] = []
    if isinstance(value, dict):
        harness = value.get("harness")
        if isinstance(harness, dict):
            found.append({"path": f"{path}.harness", **harness})
        for key, child in value.items():
            if key != "harness":
                found.extend(walk_harness(child, f"{path}.{key}"))
    elif isinstance(value, list):
        for index, child in enumerate(value):
            found.extend(walk_harness(child, f"{path}[{index}]"))
    return found


def parse_record(raw: bytes) -> dict[str, Any]:
    steps: list[dict[str, Any]] = []
    harness: list[dict[str, Any]] = []
    try:
        with tarfile.open(fileobj=io.BytesIO(raw), mode="r:*") as archive:
            for member in archive.getmembers():
                normalized = member.name.replace("\\", "/")
                if not member.isfile() or not normalized.startswith("steps/") or not normalized.endswith(".json"):
                    continue
                extracted = archive.extractfile(member)
                if extracted is None:
                    continue
                try:
                    value = json.loads(extracted.read().decode("utf-8"))
                except (UnicodeDecodeError, json.JSONDecodeError):
                    continue
                steps.append({"file": normalized, "data": value})
                harness.extend({"file": normalized, **item} for item in walk_harness(value))
    except tarfile.TarError as exc:
        return {"available": True, "parsed": False, "error": f"record tar 파싱 실패: {exc}", "steps": [], "harness": []}
    return {"available": True, "parsed": True, "steps": steps, "harness": harness}


def run_payload(run_id: str) -> dict[str, Any]:
    quoted = urllib.parse.quote(run_id, safe="")
    run = proxy_json(f"/v1/runs/{quoted}")
    state = str(run.get("state", "")).upper()
    record: dict[str, Any] = {"available": False, "steps": [], "harness": []}
    if state in TERMINAL_STATES:
        try:
            raw, _content_type, _status = mediator_request(
                f"/v1/runs/{quoted}/record", accept="application/x-tar, application/gzip, application/octet-stream"
            )
            record = parse_record(raw)
        except RuntimeError as exc:
            record = {"available": False, "error": str(exc), "steps": [], "harness": []}
    return {"ok": True, **run, "record": record, "fetched_at": utc_ms()}


def git_email() -> dict[str, Any]:
    candidates = [
        ["git", "config", "--global", "user.email"],
        ["git", "-C", str(ROOT.parent.parent / "work" / "enode"), "config", "user.email"],
    ]
    for command in candidates:
        ok, value = short_command(command)
        if ok and "@" in value:
            return {"ok": True, "source": "live", "email": value}
    return {"ok": False, "source": "live", "email": "확인되지 않음", "error": "git user.email 미설정"}


class DashboardHandler(BaseHTTPRequestHandler):
    server_version = "EnodeDashboard/1.0"

    def log_message(self, fmt: str, *args: Any) -> None:
        sys.stderr.write("[%s] %s\n" % (self.log_date_time_string(), fmt % args))

    def send_bytes(self, status: int, body: bytes, content_type: str, *, cache: bool = False) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "public, max-age=300" if cache else "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.end_headers()
        try:
            self.wfile.write(body)
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
            pass

    def send_json(self, status: int, value: Any) -> None:
        body = json.dumps(value, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        self.send_bytes(status, body, "application/json; charset=utf-8")

    def serve_file(self, path: Path) -> None:
        try:
            resolved = path.resolve(strict=True)
            resolved.relative_to(STATIC_ROOT.resolve())
        except (OSError, ValueError):
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        content_type = mimetypes.guess_type(resolved.name)[0] or "application/octet-stream"
        if content_type.startswith("text/") or content_type in {"application/javascript", "application/json"}:
            content_type += "; charset=utf-8"
        self.send_bytes(HTTPStatus.OK, resolved.read_bytes(), content_type, cache=resolved.suffix in {".css", ".js"})

    def do_GET(self) -> None:  # noqa: N802 - BaseHTTPRequestHandler API
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        if path == "/":
            self.serve_file(STATIC_ROOT / "index.html")
            return
        if path in {"/me", "/me/"}:
            self.serve_file(STATIC_ROOT / "me.html")
            return
        if path.startswith("/static/"):
            self.serve_file(STATIC_ROOT / path.removeprefix("/static/"))
            return
        try:
            if path == "/api/health":
                self.send_json(HTTPStatus.OK, {"ok": True, "service": "enode-dashboard", "time": utc_ms()})
            elif path == "/api/setup":
                self.send_json(HTTPStatus.OK, setup_checks())
            elif path == "/api/profile":
                self.send_json(HTTPStatus.OK, git_email())
            elif path == "/api/enodes":
                self.send_json(HTTPStatus.OK, observed_enodes())
            elif path == "/api/capabilities":
                self.send_json(HTTPStatus.OK, {"ok": True, "source": "live", **proxy_json("/v1/capabilities")})
            elif path == "/api/asks":
                self.send_json(HTTPStatus.OK, {"ok": True, "source": "live", **proxy_json("/v1/asks")})
            elif path.startswith("/api/run/"):
                run_id = urllib.parse.unquote(path.removeprefix("/api/run/")).strip()
                if not run_id:
                    self.send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": "run id가 필요함"})
                else:
                    self.send_json(HTTPStatus.OK, run_payload(run_id))
            else:
                self.send_error(HTTPStatus.NOT_FOUND)
        except RuntimeError as exc:
            self.send_json(HTTPStatus.SERVICE_UNAVAILABLE, {"ok": False, "source": "live", "error": str(exc)})
        except Exception as exc:  # Keep the local UI alive while reporting panel failure.
            self.send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"ok": False, "error": f"서버 오류: {exc.__class__.__name__}"})


def main() -> None:
    server = ThreadingHTTPServer((CONFIG["host"], int(CONFIG["port"])), DashboardHandler)
    print(f"enode dashboard: http://{CONFIG['host']}:{CONFIG['port']}/", flush=True)
    print(f"personal view:   http://{CONFIG['host']}:{CONFIG['port']}/me", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
