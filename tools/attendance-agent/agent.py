"""DentaSuite ирцийн агент — ZKTeco төхөөрөмжөөс 4370 портоор уншиж серверт илгээнэ.

ADMS (push) дэмждэггүй төхөөрөмжид (JDF200 гэх мэт) зориулсан. Салбарын
ресепшний компьютер дээр Task Scheduler-ээр 5 минут тутам ажиллана.

Найдвартай байдал:
  * Төхөөрөмж дээрх логийг ХЭЗЭЭ Ч устгахгүй — төхөөрөмж өөрөө "queue" болно.
    Сервер амжилттай хүлээн авсны дараа л cursor урагшилна. Интернэт тасарвал
    cursor хөдлөхгүй тул дараагийн ажиллалтаар дахин уншиж илгээнэ.
  * Cursor-оос overlap_hours (анхдагч 24 цаг)-ын өмнөхөөс дахин илгээнэ —
    төхөөрөмжийн цаг ухарсан ч бүртгэл алга болохгүй. Давхардлыг сервер хаана.
  * Өдөрт нэг удаа төхөөрөмжийн цагийг серверийн цагаар тохируулна.

Хэрэглээ:
  attendance-agent.exe            нэг удаа уншиж илгээнэ (Task Scheduler)
  attendance-agent.exe --test     холболтыг шалгаад дүнг харуулна (юу ч илгээхгүй, зөвхөн heartbeat)
  attendance-agent.exe --loop 300 300 секунд тутам тасралтгүй ажиллана
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import ssl
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta
from logging.handlers import RotatingFileHandler

VERSION = "1.0.0"
BATCH_SIZE = 1000
TS_FORMAT = "%Y-%m-%d %H:%M:%S"

log = logging.getLogger("attendance-agent")


class FatalError(Exception):
    """Тохиргооны алдаа — дахин оролдоод нэмэргүй (буруу токен, өөр төхөөрөмж)."""


# ── Туслах ─────────────────────────────────────────────────────────────────────

def base_dir() -> str:
    if getattr(sys, "frozen", False):
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.abspath(__file__))


def setup_logging(directory: str) -> None:
    log.setLevel(logging.INFO)
    fmt = logging.Formatter("%(asctime)s %(levelname)s %(message)s")
    fh = RotatingFileHandler(os.path.join(directory, "agent.log"), maxBytes=1_000_000, backupCount=3, encoding="utf-8")
    fh.setFormatter(fmt)
    log.addHandler(fh)
    # PyInstaller --noconsole үед stdout байхгүй
    if sys.stdout is not None:
        sh = logging.StreamHandler(sys.stdout)
        sh.setFormatter(fmt)
        log.addHandler(sh)


def load_json(path: str, default: dict) -> dict:
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return dict(default)


def save_json(path: str, data: dict) -> None:
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    os.replace(tmp, path)


def acquire_lock(directory: str):
    """Өмнөх ажиллалт дуусаагүй бол давхар ажиллахгүй."""
    fh = open(os.path.join(directory, "agent.lock"), "a+")
    try:
        if os.name == "nt":
            import msvcrt
            msvcrt.locking(fh.fileno(), msvcrt.LK_NBLCK, 1)
        else:
            import fcntl
            fcntl.flock(fh, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        fh.close()
        return None
    return fh


def show_message(title: str, text: str) -> None:
    """--test үед ресепшний ажилтанд харагдах цонх (console-гүй exe)."""
    if os.name == "nt":
        try:
            import ctypes
            ctypes.windll.user32.MessageBoxW(0, text, title, 0x40)
            return
        except Exception:
            pass
    print(text)


# ── Төхөөрөмж ─────────────────────────────────────────────────────────────────

def read_device(cfg: dict, state: dict, sync_time: bool) -> dict:
    from zk import ZK

    dev = cfg["device"]
    zk = ZK(
        dev["ip"],
        port=int(dev.get("port", 4370)),
        timeout=int(dev.get("timeout", 15)),
        password=int(dev.get("comm_key", 0)),
        force_udp=bool(dev.get("force_udp", False)),
        ommit_ping=True,
        # Хятад firmware (JDF200) нэрийг GBK-аар хадгалдаг — нэр эвдэрвэл "gbk" болгоно.
        encoding=dev.get("encoding", "UTF-8"),
    )

    conn = zk.connect()
    try:
        info = {
            "serial": safe(conn.get_serialnumber),
            "firmware": safe(conn.get_firmware_version),
            "model": safe(conn.get_device_name),
        }
        device_time = safe(conn.get_time)

        # Санах ойн дүүргэлт — бүртгэлийг устгадаггүй тул HR-д дүүрэхээс өмнө анхааруулна.
        if safe(conn.read_sizes):
            info["records"] = int(conn.records)
            info["records_capacity"] = int(conn.rec_cap) if conn.rec_cap else None

        users = [{"pin": str(u.user_id).strip(), "name": (u.name or "").strip() or None} for u in conn.get_users()]
        records = conn.get_attendance()

        # Өдөрт нэг удаа: төхөөрөмжийн цагийг серверийн цагаар (мэдэгдэх бол) тохируулна.
        today = datetime.now().strftime("%Y-%m-%d")
        if sync_time and state.get("last_time_sync") != today and "server_offset" in state:
            target = datetime.now() + timedelta(seconds=state["server_offset"])
            conn.set_time(target)
            state["last_time_sync"] = today
            log.info("Төхөөрөмжийн цагийг тохируулав: %s (өмнө нь %s)", target.strftime(TS_FORMAT), device_time)
            device_time = target
    finally:
        conn.disconnect()

    if isinstance(device_time, datetime):
        info["device_time"] = device_time.strftime(TS_FORMAT)

    punches = [
        {
            "pin": str(r.user_id).strip(),
            "punched_at": r.timestamp.strftime(TS_FORMAT),
            "punch_type": int(r.punch) if r.punch is not None else None,
            "verify_type": int(r.status) if r.status is not None else None,
        }
        for r in records
        if r.timestamp is not None and str(r.user_id).strip()
    ]
    punches.sort(key=lambda p: p["punched_at"])

    return {"info": info, "users": users, "punches": punches}


def safe(fn):
    try:
        return fn()
    except Exception:
        return None


# ── Сервер ────────────────────────────────────────────────────────────────────

def post(cfg: dict, payload: dict) -> dict:
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        cfg["server_url"],
        data=body,
        method="POST",
        headers={
            "Authorization": "Bearer " + cfg["api_token"],
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": f"DentaSuite-AttendanceAgent/{VERSION}",
        },
    )
    context = None if cfg.get("verify_ssl", True) else ssl._create_unverified_context()

    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=60, context=context) as res:
                return json.loads(res.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            detail = e.read().decode("utf-8", "replace")[:500]
            if e.code == 429:
                wait = int(e.headers.get("Retry-After", "30"))
                log.warning("Сервер түр хүлээхийг хүслээ (%s сек)", wait)
                time.sleep(min(wait, 120))
                continue
            if e.code in (401, 403, 409, 422):
                raise FatalError(f"Сервер татгалзлаа ({e.code}): {detail}") from e
            raise ConnectionError(f"Серверийн алдаа ({e.code}): {detail}") from e
    raise ConnectionError("Сервер олон удаа хүлээлгэлээ")


def remember_server_time(state: dict, response: dict) -> None:
    server_time = response.get("server_time")
    if server_time:
        offset = (datetime.strptime(server_time, TS_FORMAT) - datetime.now()).total_seconds()
        state["server_offset"] = round(offset)


# ── Үндсэн урсгал ──────────────────────────────────────────────────────────────

def run_once(cfg: dict, state_path: str, test: bool = False) -> str:
    state = load_json(state_path, {})

    data = read_device(cfg, state, sync_time=not test)
    save_json(state_path, state)  # цаг тохируулснаа сервер татгалзсан ч мартахгүй
    info, users, punches = data["info"], data["users"], data["punches"]
    log.info("Төхөөрөмж %s: %d хэрэглэгч, %d бүртгэл", info.get("serial"), len(users), len(punches))

    cursor = state.get("cursor")
    if cursor:
        since = (datetime.strptime(cursor, TS_FORMAT) - timedelta(hours=float(cfg.get("overlap_hours", 24)))).strftime(TS_FORMAT)
        pending = [p for p in punches if p["punched_at"] >= since]
    else:
        pending = punches

    if test:
        response = post(cfg, {"device": info, "punches": [], "users": users})
        remember_server_time(state, response)
        save_json(state_path, state)
        return (
            f"Төхөөрөмж: {info.get('model') or '?'} · SN {info.get('serial') or '?'}\n"
            f"Төхөөрөмжийн цаг: {info.get('device_time') or '?'}\n"
            f"Хэрэглэгч: {len(users)}, бүртгэл: {len(punches)} (илгээх: {len(pending)})\n"
            f"Сервертэй холбогдлоо ✓ (серверийн цаг {response.get('server_time')})"
        )

    # Хэрэглэгчийн жагсаалт өөрчлөгдсөн эсвэл өдөрт нэг удаа л илгээнэ.
    users_key = json.dumps(users, sort_keys=True, ensure_ascii=False)
    today = datetime.now().strftime("%Y-%m-%d")
    send_users = users if (state.get("users_key") != users_key or state.get("users_sent_on") != today) else []

    batches = [pending[i:i + BATCH_SIZE] for i in range(0, len(pending), BATCH_SIZE)] or [[]]
    accepted = duplicates = 0
    unmatched: set[str] = set()

    for i, batch in enumerate(batches):
        response = post(cfg, {"device": info, "punches": batch, "users": send_users if i == 0 else []})
        accepted += int(response.get("accepted", 0))
        duplicates += int(response.get("duplicates", 0))
        unmatched.update(response.get("unmatched_pins", []))

        if batch:
            latest = batch[-1]["punched_at"]
            if not state.get("cursor") or latest > state["cursor"]:
                state["cursor"] = latest
        if i == 0 and send_users:
            state["users_key"] = users_key
            state["users_sent_on"] = today
        remember_server_time(state, response)
        state["last_success_at"] = datetime.now().strftime(TS_FORMAT)
        save_json(state_path, state)  # хэсэг бүрийн дараа — тасарвал дахин эхнээс нь биш

    summary = f"Илгээв: {accepted} шинэ, {duplicates} давхардсан"
    if unmatched:
        summary += f"; тааруулаагүй PIN: {', '.join(sorted(unmatched))}"
    log.info(summary)
    return summary


def main() -> int:
    parser = argparse.ArgumentParser(description="DentaSuite ирцийн агент (ZKTeco 4370)")
    parser.add_argument("--config", default=None, help="config.json зам (анхдагч: exe-ийн хажууд)")
    parser.add_argument("--test", action="store_true", help="Холболт шалгах")
    parser.add_argument("--loop", type=int, default=0, help="N секунд тутам тасралтгүй ажиллах")
    args = parser.parse_args()

    directory = base_dir()
    setup_logging(directory)

    config_path = args.config or os.path.join(directory, "config.json")
    cfg = load_json(config_path, {})
    missing = [k for k in ("server_url", "api_token", "device") if not cfg.get(k)]
    if missing or not cfg.get("device", {}).get("ip"):
        msg = f"config.json дутуу байна: {', '.join(missing) or 'device.ip'} ({config_path})"
        log.error(msg)
        if args.test:
            show_message("Ирцийн агент", msg)
        return 2

    lock = acquire_lock(directory)
    if lock is None:
        log.info("Өмнөх ажиллалт дуусаагүй байна — алгасав")
        return 0

    state_path = os.path.join(directory, "state.json")

    while True:
        try:
            result = run_once(cfg, state_path, test=args.test)
            if args.test:
                show_message("Ирцийн агент — амжилттай", result)
                return 0
        except FatalError as e:
            log.error("%s", e)
            if args.test:
                show_message("Ирцийн агент — алдаа", str(e))
            return 2
        except Exception as e:  # сүлжээ/төхөөрөмж түр алдаа — дараагийн ажиллалтаар дахин оролдоно
            log.exception("Алдаа: %s", e)
            if args.test:
                show_message("Ирцийн агент — алдаа", f"{type(e).__name__}: {e}")
                return 1
            if not args.loop:
                return 1

        if not args.loop:
            return 0
        time.sleep(max(args.loop, 30))


if __name__ == "__main__":
    sys.exit(main())
