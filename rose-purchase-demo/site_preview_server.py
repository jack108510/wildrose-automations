"""Local-only website style scanner for the Rose purchase preview.

Run with: python3 site_preview_server.py
The service never writes submitted URLs or business data to disk.
"""

from collections import Counter
from html.parser import HTMLParser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import colorsys
import ipaddress
import json
import math
import os
import re
import signal
import socket
import subprocess
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request


ROOT = Path(__file__).resolve().parent
PORT = 8799
CHROME = Path("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
COLOR = re.compile(r"#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?(?:[0-9a-fA-F]{2})?\b")


def public_url(raw):
    raw = str(raw or "").strip()
    if not re.match(r"^https?://", raw, re.I):
        raw = "https://" + raw
    parsed = urllib.parse.urlsplit(raw)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname or parsed.username or parsed.password:
        raise ValueError("Enter a public website URL.")
    if parsed.port not in {None, 80, 443}:
        raise ValueError("Use a standard public website URL.")
    host = parsed.hostname
    if host.lower() in {"localhost", "localhost.localdomain"}:
        raise ValueError("Enter a public website URL.")
    try:
        addresses = socket.getaddrinfo(host, parsed.port or (443 if parsed.scheme == "https" else 80))
    except OSError as exc:
        raise ValueError("That website could not be found.") from exc
    if not addresses or any(not ipaddress.ip_address(item[4][0]).is_global for item in addresses):
        raise ValueError("Enter a public website URL.")
    return urllib.parse.urlunsplit((parsed.scheme, parsed.netloc, parsed.path or "/", parsed.query, ""))


class PublicRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, msg, headers, newurl):
        return super().redirect_request(request, fp, code, msg, headers, public_url(newurl))


OPENER = urllib.request.build_opener(PublicRedirect())


def fetch_text(url, limit=900_000):
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (compatible; RoseStylePreview/1.0)", "Accept-Encoding": "identity"})
    with OPENER.open(request, timeout=9) as response:
        content_type = response.headers.get("Content-Type", "")
        if not any(kind in content_type for kind in ("text/html", "text/css", "application/xhtml+xml")):
            raise ValueError("That page did not return readable website content.")
        data = response.read(limit)
        charset = response.headers.get_content_charset() or "utf-8"
        return data.decode(charset, "replace"), response.url


class SiteHTML(HTMLParser):
    def __init__(self):
        super().__init__()
        self.title = ""
        self.site_name = ""
        self.theme = ""
        self.icon = ""
        self.logo = ""
        self.stylesheets = []
        self.inline_styles = []
        self._title = False
        self._style = False

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "title":
            self._title = True
        elif tag == "style":
            self._style = True
        elif tag == "meta":
            key = (attrs.get("name") or attrs.get("property") or "").lower()
            if key == "theme-color":
                self.theme = attrs.get("content", "")
            elif key == "og:site_name":
                self.site_name = attrs.get("content", "")
        elif tag == "link":
            rel = (attrs.get("rel") or "").lower()
            href = attrs.get("href", "")
            if "icon" in rel and not self.icon:
                self.icon = href
            if "stylesheet" in rel and href and len(self.stylesheets) < 8:
                self.stylesheets.append(href)
        elif tag == "img" and not self.logo:
            source = attrs.get("src", "")
            description = " ".join((attrs.get("class") or "", attrs.get("id") or "")).lower()
            if "logo" in source.lower() or "logo" in description:
                self.logo = attrs.get("src", "")

    def handle_endtag(self, tag):
        if tag == "title":
            self._title = False
        elif tag == "style":
            self._style = False

    def handle_data(self, data):
        if self._title:
            self.title += data
        if self._style:
            self.inline_styles.append(data)


def normalize_color(value):
    found = COLOR.search(str(value or ""))
    if not found:
        return None
    code = found.group(0).lower()
    if len(code) == 4:
        code = "#" + "".join(c * 2 for c in code[1:])
    return code[:7]


def css_color(value):
    hexadecimal = normalize_color(value)
    if hexadecimal:
        return hexadecimal
    match = re.search(r"oklch\(\s*([\d.]+)(%)?\s+([\d.]+)\s+([\d.]+)", str(value or ""), re.I)
    if not match:
        return None
    lightness = float(match.group(1)) / (100 if match.group(2) else 1)
    chroma = float(match.group(3))
    hue = math.radians(float(match.group(4)))
    a, b = chroma * math.cos(hue), chroma * math.sin(hue)
    l = (lightness + .3963377774 * a + .2158037573 * b) ** 3
    m = (lightness - .1055613458 * a - .0638541728 * b) ** 3
    s = (lightness - .0894841775 * a - 1.2914855480 * b) ** 3
    linear = (
        4.0767416621 * l - 3.3077115913 * m + .2309699292 * s,
        -1.2684380046 * l + 2.6097574011 * m - .3413193965 * s,
        -.0041960863 * l - .7034186147 * m + 1.7076147010 * s,
    )
    def encoded(channel):
        value = 12.92 * channel if channel <= .0031308 else 1.055 * channel ** (1 / 2.4) - .055
        return max(0, min(255, round(value * 255)))
    return "#" + "".join(f"{encoded(channel):02x}" for channel in linear)


def rgb(code):
    return tuple(int(code[i:i + 2], 16) for i in (1, 3, 5))


def blend(a, b, ratio):
    values = tuple(round(x * (1 - ratio) + y * ratio) for x, y in zip(rgb(a), rgb(b)))
    return "#" + "".join(f"{value:02x}" for value in values)


def accent_from_css(css, theme):
    theme_color = css_color(theme)
    if theme_color:
        h, saturation, value = colorsys.rgb_to_hsv(*(x / 255 for x in rgb(theme_color)))
        if saturation >= .28 and .18 <= value <= .94:
            return theme_color
    named = re.findall(r"--([\w-]*(?:accent|primary|brand|highlight)[\w-]*)\s*:\s*([^;}{]+)", css, re.I)
    for key, value in named:
        if key.lower() in {"primary", "brand", "brand-primary"}:
            color = css_color(value)
            if color:
                _, saturation, brightness = colorsys.rgb_to_hsv(*(part / 255 for part in rgb(color)))
                if saturation >= .28 and .18 <= brightness <= .94:
                    return color
    candidates = [css_color(value) for _, value in named]
    candidates.extend(normalize_color(value) for value in COLOR.findall(css))
    counts = Counter(color for color in candidates if color)
    ranked = []
    for color, count in counts.items():
        _, saturation, value = colorsys.rgb_to_hsv(*(x / 255 for x in rgb(color)))
        if saturation < .3 or not .18 <= value <= .95:
            continue
        named_bonus = 6 if color in candidates[:len(named)] else 0
        ranked.append((min(count, 30) + named_bonus + saturation * 3, color))
    return max(ranked)[1] if ranked else "#ff5722"


def safe_asset(base, asset):
    if not asset:
        return ""
    try:
        return public_url(urllib.parse.urljoin(base, asset))
    except ValueError:
        return ""


def scan(url):
    source = public_url(url)
    html, final_url = fetch_text(source)
    page = SiteHTML()
    page.feed(html)
    css = "\n".join(page.inline_styles)
    for href in page.stylesheets[:3]:
        stylesheet = safe_asset(final_url, href)
        if not stylesheet:
            continue
        try:
            content, _ = fetch_text(stylesheet, 350_000)
            css += "\n" + content
        except (ValueError, OSError, urllib.error.URLError):
            continue
    accent = accent_from_css(css, page.theme)
    host = urllib.parse.urlsplit(final_url).hostname or "Website"
    title = re.split(r"\s+[|–—-]\s+", page.site_name or page.title or "")[0].strip()
    name = (title[:52] or host.removeprefix("www.")).strip()
    logo = safe_asset(final_url, page.logo or page.icon)
    return {
        "url": final_url,
        "host": host.removeprefix("www."),
        "name": name,
        "accent": accent,
        "softAccent": blend(accent, "#ffffff", .60),
        "panel": blend(accent, "#ffffff", .91),
        "stage": blend(accent, "#f5eee8", .89),
        "logo": logo,
        "source": "Website colors and branding",
    }


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_POST(self):
        if self.path not in {"/api/site-style", "/api/site-shot"}:
            self.send_error(404)
            return
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if not 1 <= size <= 2048:
                raise ValueError("Enter a website URL.")
            body = json.loads(self.rfile.read(size))
            if self.path == "/api/site-shot":
                url = public_url(body.get("url"))
                if not CHROME.exists():
                    raise ValueError("Website preview is unavailable on this computer.")
                with tempfile.TemporaryDirectory(prefix="rose-site-shot-") as folder:
                    screenshot = Path(folder) / "site.png"
                    process = subprocess.Popen([
                        str(CHROME), "--headless=new", "--disable-gpu", "--no-first-run",
                        "--no-default-browser-check", "--disable-extensions",
                        "--disable-background-networking", "--disable-dev-shm-usage",
                        "--hide-scrollbars", "--window-size=1365,2800",
                        "--virtual-time-budget=1500", f"--user-data-dir={folder}/profile",
                        f"--screenshot={screenshot}", url,
                    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
                    try:
                        deadline = time.monotonic() + 14
                        while time.monotonic() < deadline and (not screenshot.exists() or screenshot.stat().st_size < 1000):
                            time.sleep(.2)
                        if not screenshot.exists() or screenshot.stat().st_size < 1000:
                            raise ValueError("Could not capture that website. Try another public URL.")
                        payload = screenshot.read_bytes()
                    finally:
                        try:
                            os.killpg(process.pid, signal.SIGTERM)
                        except ProcessLookupError:
                            pass
                        try:
                            process.wait(timeout=2)
                        except subprocess.TimeoutExpired:
                            os.killpg(process.pid, signal.SIGKILL)
                            process.wait(timeout=2)
            else:
                payload = json.dumps(scan(body.get("url"))).encode()
            status = 200
        except (ValueError, KeyError, json.JSONDecodeError, urllib.error.URLError, OSError, subprocess.TimeoutExpired) as exc:
            payload = json.dumps({"error": str(exc) or "Could not read that website."}).encode()
            status = 400
        self.send_response(status)
        self.send_header("Content-Type", "image/png" if status == 200 and self.path == "/api/site-shot" else "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print(f"Rose purchase preview: http://127.0.0.1:{PORT}/", flush=True)
    server.serve_forever()
