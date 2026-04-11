"""
Catalogue scraper: fetches a retailer's website and extracts product names/descriptions
to give Claude context for personalised recommendations.
"""
import re
import requests
from bs4 import BeautifulSoup
from typing import Optional


# Common product-related CSS selectors and patterns used by furniture retailers
PRODUCT_SELECTORS = [
    # Schema.org product markup
    "[itemtype*='Product'] [itemprop='name']",
    "[itemtype*='Product'] [itemprop='description']",
    # Common e-commerce class names
    ".product-title", ".product-name", ".product__title",
    ".product-card__title", ".product-item__title",
    "h2.product-name", "h3.product-name",
    ".item-title", ".item-name",
    # Generic heading patterns inside product containers
    ".products h2", ".products h3", ".products h4",
    ".product-grid h2", ".product-grid h3",
    ".product-list h2", ".product-list h3",
    ".catalog h2", ".catalog h3",
    # WooCommerce
    ".woocommerce-loop-product__title",
    # Shopify
    ".product-card__name", ".card__heading",
]


def scrape_catalogue(url: str, max_products: int = 40) -> str:
    """
    Scrape a retailer's website and return a plain-text summary of their products.
    Returns a string like:
      "Product Catalogue for [store]:
       - Harmony Sectional Sofa (Gray) — $2,499
       - Comfort Grand Armchair — $899
       ..."
    """
    if not url:
        return ""

    # Normalise URL
    if not url.startswith("http"):
        url = "https://" + url

    # Try common catalogue/product page paths
    candidate_urls = [url]
    for path in ["/collections/all", "/products", "/shop", "/furniture", "/catalog", "/collections"]:
        candidate_urls.append(url.rstrip("/") + path)

    products = []
    for candidate in candidate_urls:
        try:
            resp = requests.get(
                candidate,
                timeout=15,
                headers={
                    "User-Agent": "Mozilla/5.0 (compatible; ReclaimBot/1.0; +https://reclaimarketing.com)",
                    "Accept": "text/html,application/xhtml+xml",
                },
                allow_redirects=True,
            )
            if resp.status_code != 200:
                continue

            soup = BeautifulSoup(resp.text, "lxml")

            # Remove scripts, styles, nav, footer
            for tag in soup(["script", "style", "nav", "footer", "header", "noscript"]):
                tag.decompose()

            # Try structured selectors first
            found = []
            for selector in PRODUCT_SELECTORS:
                elements = soup.select(selector)
                for el in elements:
                    text = el.get_text(separator=" ", strip=True)
                    if text and len(text) > 3 and len(text) < 200:
                        found.append(text)
                if len(found) >= 5:
                    break

            # Fallback: look for price-adjacent text (strong signal of product listings)
            if len(found) < 5:
                price_pattern = re.compile(r'\$[\d,]+')
                for el in soup.find_all(["h2", "h3", "h4", "strong", "a"]):
                    # Check if there's a price nearby
                    parent = el.parent
                    if parent and price_pattern.search(parent.get_text()):
                        text = el.get_text(strip=True)
                        if text and 4 < len(text) < 150:
                            found.append(text)

            # Deduplicate while preserving order
            seen = set()
            for item in found:
                clean = " ".join(item.split())
                if clean.lower() not in seen and len(clean) > 4:
                    seen.add(clean.lower())
                    products.append(clean)
                if len(products) >= max_products:
                    break

            if len(products) >= 5:
                break  # Found enough products from this URL

        except Exception as e:
            print(f"Scrape error for {candidate}: {e}")
            continue

    if not products:
        return ""

    lines = ["Current product catalogue:"] + [f"- {p}" for p in products[:max_products]]
    return "\n".join(lines)


def scrape_catalogue_safe(url: str) -> tuple[str, Optional[str]]:
    """
    Returns (catalogue_text, error_message).
    catalogue_text is empty string on failure.
    """
    try:
        text = scrape_catalogue(url)
        if not text:
            return "", "No products found on the website. The site may require JavaScript or have an unusual layout."
        return text, None
    except Exception as e:
        return "", str(e)
