#!/usr/bin/env python3
"""Sync App Store listing (text + screenshots) from the repo to App Store Connect.

Sources of truth in the repo:
  store_assets/metadata/aso.json         description, keywords, promotionalText, whatsNew per language
  store_assets/screenshots/<lang>/*.png  iphone-6.9-*.png (1320x2868) and ipad-13-*.png (2064x2752)

The target is the newest iOS App Store version that is not live yet (the one being prepared or reviewed).
Screenshots of each display type are replaced as a whole and ordered by file name.

Credentials come from the environment (Codemagic's App Store Connect integration provides them):
  APP_STORE_CONNECT_ISSUER_ID, APP_STORE_CONNECT_KEY_IDENTIFIER, APP_STORE_CONNECT_PRIVATE_KEY
  APP_STORE_APPLE_ID  numeric app id

Usage:
  python3 scripts/asc_store_sync.py --dry-run          validate local files only, no network
  python3 scripts/asc_store_sync.py --metadata --screenshots
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import struct
import sys
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ASO_FILE = ROOT / "store_assets" / "metadata" / "aso.json"
SHOTS_DIR = ROOT / "store_assets" / "screenshots"
API = "https://api.appstoreconnect.apple.com/v1"

# App Store locale -> (aso.json key, screenshot folder)
LOCALES = {
    "tr": ("tr", "tr"),
    "en-US": ("en", "en"),
    "en-GB": ("en_GB", "en"),
}
# File prefix -> (App Store display type, accepted pixel sizes)
DISPLAY_TYPES = {
    "iphone-6.9": ("APP_IPHONE_67", {(1320, 2868), (1290, 2796), (1260, 2736)}),
    "ipad-13": ("APP_IPAD_PRO_3GEN_129", {(2064, 2752), (2048, 2732)}),
}
TEXT_FIELDS = ("description", "keywords", "promotionalText", "whatsNew")
TEXT_LIMITS = {"description": 4000, "keywords": 100, "promotionalText": 170, "whatsNew": 4000}
NOT_LIVE_STATES = {
    "PREPARE_FOR_SUBMISSION", "DEVELOPER_REJECTED", "REJECTED", "METADATA_REJECTED",
    "WAITING_FOR_REVIEW", "IN_REVIEW", "INVALID_BINARY", "PENDING_DEVELOPER_RELEASE",
}
MAX_SHOTS_PER_SET = 10


class SyncError(Exception):
    """Raised for any problem the operator has to fix (bad files, missing credentials, API refusal)."""


# ---------------------------------------------------------------- local validation

def png_size(path: Path) -> tuple[int, int]:
    with path.open("rb") as f:
        head = f.read(24)
    if head[:8] != b"\x89PNG\r\n\x1a\n":
        raise SyncError(f"{path} is not a PNG file")
    return struct.unpack(">II", head[16:24])


@dataclass(frozen=True)
class ShotSet:
    folder: str
    prefix: str
    display_type: str
    files: tuple[Path, ...]


def collect_screenshot_sets() -> list[ShotSet]:
    sets: list[ShotSet] = []
    for folder in sorted({f for _, f in LOCALES.values()}):
        base = SHOTS_DIR / folder
        for prefix, (display_type, sizes) in DISPLAY_TYPES.items():
            files = tuple(sorted(base.glob(f"{prefix}-*.png")))
            if not files:
                raise SyncError(f"no {prefix} screenshots in {base}")
            if len(files) > MAX_SHOTS_PER_SET:
                raise SyncError(f"{base}: {len(files)} {prefix} screenshots, App Store allows {MAX_SHOTS_PER_SET}")
            for f in files:
                if png_size(f) not in sizes:
                    raise SyncError(f"{f} is {png_size(f)}, expected one of {sorted(sizes)}")
            sets.append(ShotSet(folder, prefix, display_type, files))
    return sets


def load_texts() -> dict[str, dict[str, str]]:
    data = json.loads(ASO_FILE.read_text(encoding="utf-8"))
    texts: dict[str, dict[str, str]] = {}
    for locale, (key, _) in LOCALES.items():
        entry = data.get(key)
        if not entry:
            raise SyncError(f"aso.json has no '{key}' entry for {locale}")
        fields = {}
        for field in TEXT_FIELDS:
            value = entry.get(field, "")
            limit = TEXT_LIMITS[field]
            size = len(value.encode("utf-8")) if field == "keywords" else len(value)
            if size > limit:
                raise SyncError(f"{key}.{field} is {size} long, limit {limit}")
            if value:
                fields[field] = value
        texts[locale] = fields
    return texts


# ---------------------------------------------------------------- API client

class AscClient:
    """Minimal App Store Connect API client: JWT auth, JSON requests, error reporting."""

    def __init__(self, issuer: str, key_id: str, private_key: str):
        self._issuer, self._key_id, self._private_key = issuer, key_id, private_key
        self._token, self._token_exp = "", 0.0

    @classmethod
    def from_env(cls) -> "AscClient":
        names = ("APP_STORE_CONNECT_ISSUER_ID", "APP_STORE_CONNECT_KEY_IDENTIFIER", "APP_STORE_CONNECT_PRIVATE_KEY")
        missing = [n for n in names if not os.environ.get(n)]
        if missing:
            raise SyncError("missing credentials: " + ", ".join(missing))
        key = os.environ["APP_STORE_CONNECT_PRIVATE_KEY"].replace("\\n", "\n")
        return cls(os.environ[names[0]], os.environ[names[1]], key)

    def _auth(self) -> str:
        if time.time() < self._token_exp - 60:
            return self._token
        import jwt  # PyJWT[crypto]; imported lazily so --dry-run needs no packages
        exp = int(time.time()) + 15 * 60
        self._token = jwt.encode({"iss": self._issuer, "exp": exp, "aud": "appstoreconnect-v1"},
                                 self._private_key, algorithm="ES256", headers={"kid": self._key_id, "typ": "JWT"})
        self._token_exp = exp
        return self._token

    def request(self, method: str, path: str, body: dict | None = None) -> dict:
        url = path if path.startswith("http") else API + path
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(url, data=data, method=method, headers={
            "Authorization": f"Bearer {self._auth()}", "Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                raw = resp.read()
        except urllib.error.HTTPError as e:
            detail = e.read().decode(errors="replace")
            raise SyncError(f"{method} {path} -> HTTP {e.code}: {detail[:800]}") from None
        return json.loads(raw) if raw else {}

    def get_all(self, path: str) -> list[dict]:
        items, url = [], path
        while url:
            page = self.request("GET", url)
            items += page.get("data", [])
            url = page.get("links", {}).get("next")
        return items


# ---------------------------------------------------------------- sync steps

def find_target_version(client: AscClient, app_id: str) -> dict:
    versions = client.get_all(f"/apps/{app_id}/appStoreVersions?filter[platform]=IOS&limit=20")
    pending = [v for v in versions if v["attributes"].get("appStoreState") in NOT_LIVE_STATES]
    if not pending:
        raise SyncError("no iOS version waiting to go live; create the new version in App Store Connect first")
    version = max(pending, key=lambda v: v["attributes"].get("createdDate", ""))
    attrs = version["attributes"]
    print(f"Target version {attrs['versionString']} ({attrs['appStoreState']})")
    return version


def localizations_by_locale(client: AscClient, version_id: str) -> dict[str, dict]:
    locs = client.get_all(f"/appStoreVersions/{version_id}/appStoreVersionLocalizations")
    return {loc["attributes"]["locale"]: loc for loc in locs}


class MetadataSync:
    def __init__(self, client: AscClient):
        self._client = client

    def run(self, locs: dict[str, dict], texts: dict[str, dict[str, str]]) -> None:
        for locale, fields in texts.items():
            loc = locs.get(locale)
            if not loc:
                print(f"  {locale}: not a localization of this version, skipped")
                continue
            changed = {k: v for k, v in fields.items() if loc["attributes"].get(k) != v}
            if not changed:
                print(f"  {locale}: text already up to date")
                continue
            self._client.request("PATCH", f"/appStoreVersionLocalizations/{loc['id']}", {
                "data": {"type": "appStoreVersionLocalizations", "id": loc["id"], "attributes": changed}})
            print(f"  {locale}: updated {', '.join(changed)}")


class ScreenshotSync:
    def __init__(self, client: AscClient):
        self._client = client

    def run(self, locs: dict[str, dict], shot_sets: list[ShotSet]) -> None:
        for locale, (_, folder) in LOCALES.items():
            loc = locs.get(locale)
            if not loc:
                print(f"  {locale}: not a localization of this version, skipped")
                continue
            existing = {s["attributes"]["screenshotDisplayType"]: s
                        for s in self._client.get_all(f"/appStoreVersionLocalizations/{loc['id']}/appScreenshotSets")}
            for shot_set in (s for s in shot_sets if s.folder == folder):
                set_id = existing[shot_set.display_type]["id"] if shot_set.display_type in existing \
                    else self._create_set(loc["id"], shot_set.display_type)
                self._replace(set_id, shot_set.files)
                print(f"  {locale} {shot_set.prefix}: {len(shot_set.files)} screenshots uploaded")

    def _create_set(self, loc_id: str, display_type: str) -> str:
        res = self._client.request("POST", "/appScreenshotSets", {"data": {
            "type": "appScreenshotSets", "attributes": {"screenshotDisplayType": display_type},
            "relationships": {"appStoreVersionLocalization": {"data": {"type": "appStoreVersionLocalizations", "id": loc_id}}}}})
        return res["data"]["id"]

    def _replace(self, set_id: str, files: tuple[Path, ...]) -> None:
        for old in self._client.get_all(f"/appScreenshotSets/{set_id}/appScreenshots"):
            self._client.request("DELETE", f"/appScreenshots/{old['id']}")
        new_ids = [self._upload(set_id, f) for f in files]
        self._client.request("PATCH", f"/appScreenshotSets/{set_id}/relationships/appScreenshots",
                             {"data": [{"type": "appScreenshots", "id": i} for i in new_ids]})
        self._wait_processed(new_ids)

    def _upload(self, set_id: str, path: Path) -> str:
        blob = path.read_bytes()
        res = self._client.request("POST", "/appScreenshots", {"data": {
            "type": "appScreenshots", "attributes": {"fileName": path.name, "fileSize": len(blob)},
            "relationships": {"appScreenshotSet": {"data": {"type": "appScreenshotSets", "id": set_id}}}}})
        shot_id = res["data"]["id"]
        for op in res["data"]["attributes"]["uploadOperations"]:
            part = blob[op["offset"]: op["offset"] + op["length"]]
            headers = {h["name"]: h["value"] for h in op.get("requestHeaders", [])}
            req = urllib.request.Request(op["url"], data=part, method=op["method"], headers=headers)
            try:
                urllib.request.urlopen(req, timeout=120).read()
            except urllib.error.HTTPError as e:
                raise SyncError(f"upload of {path.name} failed: HTTP {e.code}") from None
        self._client.request("PATCH", f"/appScreenshots/{shot_id}", {"data": {
            "type": "appScreenshots", "id": shot_id,
            "attributes": {"uploaded": True, "sourceFileChecksum": hashlib.md5(blob).hexdigest()}}})
        return shot_id

    def _wait_processed(self, ids: list[str], timeout_s: int = 300) -> None:
        deadline = time.time() + timeout_s
        pending = set(ids)
        while pending and time.time() < deadline:
            for shot_id in list(pending):
                state = self._client.request("GET", f"/appScreenshots/{shot_id}")["data"]["attributes"] \
                    .get("assetDeliveryState", {}).get("state")
                if state == "COMPLETE":
                    pending.discard(shot_id)
                elif state == "FAILED":
                    raise SyncError(f"Apple could not process screenshot {shot_id}")
            if pending:
                time.sleep(5)
        if pending:
            print(f"  warning: {len(pending)} screenshots still processing; check App Store Connect")


# ---------------------------------------------------------------- entry point

def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--metadata", action="store_true", help="upload description, keywords, promo text, what's new")
    parser.add_argument("--screenshots", action="store_true", help="replace the screenshots")
    parser.add_argument("--dry-run", action="store_true", help="only validate local files")
    args = parser.parse_args(argv)
    try:
        texts = load_texts()
        shot_sets = collect_screenshot_sets()
        print(f"Local files OK: {len(texts)} languages, {sum(len(s.files) for s in shot_sets)} screenshots")
        if args.dry_run or not (args.metadata or args.screenshots):
            return 0
        app_id = os.environ.get("APP_STORE_APPLE_ID")
        if not app_id:
            raise SyncError("APP_STORE_APPLE_ID is not set")
        client = AscClient.from_env()
        version = find_target_version(client, app_id)
        locs = localizations_by_locale(client, version["id"])
        if args.metadata:
            print("Text:")
            MetadataSync(client).run(locs, texts)
        if args.screenshots:
            print("Screenshots:")
            ScreenshotSync(client).run(locs, shot_sets)
        print("Store listing sync finished")
        return 0
    except SyncError as e:
        print(f"ERROR: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
