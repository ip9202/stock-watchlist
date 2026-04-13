#!/usr/bin/env python3
"""Add stock-watchlist link card to ip9202.site main page"""

INDEX_PATH = "/Users/irons_server/webroot/index.html"

# Stock watchlist project entry to add
NEW_PROJECT = """            {
                name: "Stock Watchlist",
                path: "/stocks",
                description: "한국 주식 워치리스트 - 실시간 시세, 차트, 뉴스, 공시",
                tech: ["Next.js 15", "TypeScript", "Prisma", "Kiwoom API"],
                status: "stable",
                icon: "stock"
            },"""

# Stock icon SVG
STOCK_ICON = """            stock: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>`,"""

with open(INDEX_PATH, "r") as f:
    content = f.read()

if "/stocks" in content:
    print("Stock Watchlist card already exists, skipping")
else:
    # Add project entry before the comment block
    marker = "            // Add new projects below"
    if marker in content:
        content = content.replace(marker, NEW_PROJECT + "\n" + marker)
    else:
        print("ERROR: Could not find project insertion point")
        exit(1)

    # Add stock icon
    icon_marker = "            default:"
    if icon_marker in content:
        content = content.replace(icon_marker, STOCK_ICON + "\n" + icon_marker)
    else:
        print("ERROR: Could not find icon insertion point")
        exit(1)

    with open(INDEX_PATH, "w") as f:
        f.write(content)

    print("CARD_ADDED")
