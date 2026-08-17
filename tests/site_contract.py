#!/usr/bin/env python3
"""Dependency-free structural contract for the Magrathea OSS presentation site."""

from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse
import hashlib
import json
import sys

ROOT = Path(__file__).resolve().parents[1]
ERRORS = []


def require(condition, message):
    if not condition:
        ERRORS.append(message)


class Document(HTMLParser):
    def __init__(self, text):
        super().__init__(convert_charrefs=True)
        self.text = text
        self.tags = []
        self.attrs = []
        self.ids = set()
        self.links = []
        self.images = []
        self.meta = []
        self.headings = []
        self._heading = None

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        self.tags.append(tag)
        self.attrs.append((tag, values))
        if values.get("id"):
            self.ids.add(values["id"])
        if tag == "a":
            self.links.append(values)
        if tag == "img":
            self.images.append(values)
        if tag == "meta":
            self.meta.append(values)
        if tag in {"h1", "h2", "h3"} and self._heading is None:
            self._heading = [tag, ""]

    def handle_data(self, data):
        if self._heading:
            self._heading[1] += data

    def handle_endtag(self, tag):
        if self._heading and self._heading[0] == tag:
            self.headings.append((tag, " ".join(self._heading[1].split())))
            self._heading = None


def parse(path):
    require(path.is_file(), f"missing required file: {path.relative_to(ROOT)}")
    if not path.is_file():
        return None
    document = Document(path.read_text(encoding="utf-8"))
    document.feed(document.text)
    return document


required_files = [
    "index.html",
    "404.html",
    "assets/css/site.css",
    "assets/js/site.js",
    "assets/img/magrathea-orbit.svg",
    "assets/img/magrathea-orbit.provenance.json",
    "assets/img/magrathea-world-desktop.avif",
    "assets/img/magrathea-world-desktop.webp",
    "assets/img/magrathea-world-desktop.jpg",
    "assets/img/magrathea-world-portrait.avif",
    "assets/img/magrathea-world-portrait.webp",
    "assets/img/magrathea-world-portrait.jpg",
    "assets/img/source/magrathea-world-desktop-comfyui.png",
    "assets/img/source/magrathea-world-portrait-comfyui.png",
    "assets/img/magrathea-world.comfyui.json",
    "assets/img/magrathea-world.provenance.json",
    "assets/img/og-card.png",
    "site.webmanifest",
    "robots.txt",
    "sitemap.xml",
    ".nojekyll",
    "README.md",
    "features/presentation-site.feature",
]
for filename in required_files:
    require((ROOT / filename).is_file(), f"missing required file: {filename}")

index = parse(ROOT / "index.html")
not_found = parse(ROOT / "404.html")

if index:
    lower = index.text.lower()
    html_tags = [attrs for tag, attrs in index.attrs if tag == "html"]
    require(html_tags and html_tags[0].get("lang") == "en", "home page must declare lang=en")
    for landmark in ("header", "nav", "main", "footer"):
        require(landmark in index.tags, f"home page is missing <{landmark}>")
    require(
        sum(1 for tag, _ in index.headings if tag == "h1") == 1,
        "home page must contain exactly one h1",
    )
    require(
        any("skip-link" in a.get("class", "") for a in index.links),
        "home page needs a skip link",
    )

    for section_id in (
        "magrathea-world",
        "constellation",
        "git",
        "pki",
        "object-store",
        "method",
        "principles",
        "open-source",
    ):
        require(section_id in index.ids, f"home page is missing #{section_id}")

    require(
        index.text.find('id="magrathea-world"') < index.text.find('class="hero"'),
        "generated Magrathea artwork must precede the existing hero",
    )
    visual_images = [
        image for image in index.images
        if "visual-intro-art" in image.get("class", "")
    ]
    require(len(visual_images) == 1, "home page needs exactly one visual-intro artwork image")
    if visual_images:
        artwork = visual_images[0]
        require(
            "Magrathea" in artwork.get("alt", ""),
            "generated artwork needs a useful Magrathea alt",
        )
        require(
            artwork.get("fetchpriority") == "high",
            "landing artwork must be high priority",
        )
        require(
            artwork.get("width") == "1536" and artwork.get("height") == "864",
            "landing artwork dimensions must be explicit",
        )
    picture_sources = [attrs for tag, attrs in index.attrs if tag == "source"]
    for source in (
        "assets/img/magrathea-world-desktop.avif",
        "assets/img/magrathea-world-desktop.webp",
        "assets/img/magrathea-world-portrait.avif",
        "assets/img/magrathea-world-portrait.webp",
        "assets/img/magrathea-world-portrait.jpg",
    ):
        require(
            any(attrs.get("srcset") == source for attrs in picture_sources),
            f"responsive artwork source is missing: {source}",
        )

    for phrase in (
        "software",
        "made to",
        "measure.",
        "magrathea git",
        "magrathea pki",
        "magrathea objectstore",
        "self-hosted",
        "bdd-first",
        "java 21",
        "git over ssh",
        "x.509",
        "s3-compatible",
        "production readiness",
        "source of truth",
        "public source publication preparing",
    ):
        require(phrase in lower, f"home page is missing truthful product token: {phrase}")

    for forbidden in (
        "production-ready platform",
        "enterprise-ready",
        "certified secure",
        "fully compliant",
        "google analytics",
        "googletagmanager",
        "fonts.googleapis.com",
    ):
        require(forbidden not in lower, f"home page contains forbidden claim/dependency: {forbidden}")

    for repository in (
        "https://github.com/Magrathea-oss/magrathea-pki",
        "https://github.com/Magrathea-oss/magrathea-objectstorage",
    ):
        require(repository in index.text, f"public project link is missing: {repository}")

    descriptions = [meta.get("content", "") for meta in index.meta if meta.get("name") == "description"]
    require(any(len(value) >= 100 for value in descriptions), "meta description must be useful")
    require(any(tag == "link" and attrs.get("rel") == "canonical" for tag, attrs in index.attrs), "canonical link is missing")
    require(any(tag == "script" and attrs.get("src") == "assets/js/site.js" and "defer" in attrs for tag, attrs in index.attrs), "deferred site script is missing")
    require(all("alt" in image for image in index.images), "every image must have an alt attribute")

    for link in index.links:
        href = link.get("href", "")
        require(bool(href), "anchor has an empty href")
        if link.get("target") == "_blank":
            rel = set(link.get("rel", "").split())
            require({"noopener", "noreferrer"}.issubset(rel), f"external link lacks safe rel: {href}")
        if href.startswith("#"):
            require(href[1:] in index.ids, f"fragment does not resolve: {href}")
        parsed = urlparse(href)
        if href and not href.startswith("#") and not parsed.scheme and not href.startswith("mailto:"):
            target = href.split("#", 1)[0].split("?", 1)[0]
            if target:
                require((ROOT / target).exists(), f"local link does not resolve: {href}")

if not_found:
    require("World not found" in not_found.text, "404 page needs a clear title")
    require('href="./"' in not_found.text, "404 page needs a home link")

css_path = ROOT / "assets/css/site.css"
if css_path.is_file():
    css = css_path.read_text(encoding="utf-8")
    for token in (
        ":focus-visible",
        "prefers-reduced-motion",
        "forced-colors",
        "overflow-wrap",
        "--night: #08282d",
        "--accent: #0c776e",
        "--signal: #e59a43",
        ".visual-intro",
        ".product-grid",
        ".orbit-map",
    ):
        require(token in css, f"CSS is missing required responsive/brand token: {token}")

js_path = ROOT / "assets/js/site.js"
if js_path.is_file():
    js = js_path.read_text(encoding="utf-8")
    for token in ("aria-expanded", "IntersectionObserver", "prefers-reduced-motion", "dataset.product", "dataset.world"):
        require(token in js, f"progressive enhancement script is missing: {token}")

logo_path = ROOT / "assets/img/magrathea-orbit.svg"
provenance_path = ROOT / "assets/img/magrathea-orbit.provenance.json"
if logo_path.is_file() and provenance_path.is_file():
    provenance = json.loads(provenance_path.read_text(encoding="utf-8"))
    digest = hashlib.sha256(logo_path.read_bytes()).hexdigest()
    require(digest == provenance.get("sha256"), "orbit artwork does not match recorded provenance")
    require(provenance.get("thirdPartySource") is None, "orbit artwork must remain original Magrathea artwork")

art_provenance_path = ROOT / "assets/img/magrathea-world.provenance.json"
art_workflow_path = ROOT / "assets/img/magrathea-world.comfyui.json"
if art_provenance_path.is_file() and art_workflow_path.is_file():
    art_provenance = json.loads(art_provenance_path.read_text(encoding="utf-8"))
    art_workflow = json.loads(art_workflow_path.read_text(encoding="utf-8"))
    require(
        art_provenance.get("schema") == "magrathea-generated-artwork-provenance-v1",
        "generated artwork provenance schema differs",
    )
    require(
        art_workflow.get("schema") == "magrathea-comfyui-artwork-workflow-v1",
        "generated artwork workflow schema differs",
    )
    require(
        art_provenance.get("generation", {}).get("thirdPartyReferenceImages") == [],
        "generated artwork must not claim unrecorded reference images",
    )
    for rendition in ("desktop", "portrait"):
        prompt = art_workflow.get(rendition, {}).get("prompt", {})
        require(prompt, f"generated artwork workflow is missing {rendition}")
        require(
            not any(node.get("class_type") == "LoadImage" for node in prompt.values()),
            f"generated {rendition} artwork unexpectedly depends on a reference image",
        )
        for artifact in art_provenance.get("outputs", {}).get(rendition, []):
            path = ROOT / artifact.get("path", "")
            require(
                path.is_file(),
                f"generated artwork output is missing: {artifact.get('path')}",
            )
            if path.is_file():
                require(
                    path.stat().st_size == artifact.get("sizeBytes"),
                    f"generated artwork size differs: {artifact.get('path')}",
                )
                require(
                    hashlib.sha256(path.read_bytes()).hexdigest()
                    == artifact.get("sha256"),
                    f"generated artwork hash differs: {artifact.get('path')}",
                )
    delivered = [
        ROOT / f"assets/img/magrathea-world-{rendition}.{extension}"
        for rendition in ("desktop", "portrait")
        for extension in ("avif", "webp", "jpg")
    ]
    require(
        all(path.stat().st_size < 125_000 for path in delivered if path.is_file()),
        "a delivered landing artwork exceeds 125 KB",
    )

manifest_path = ROOT / "site.webmanifest"
if manifest_path.is_file():
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    require(manifest.get("name") == "Magrathea OSS", "web manifest must identify Magrathea OSS")

if ERRORS:
    print("SITE CONTRACT: FAIL", file=sys.stderr)
    for error in ERRORS:
        print(f" - {error}", file=sys.stderr)
    sys.exit(1)

print("SITE CONTRACT: PASS")
