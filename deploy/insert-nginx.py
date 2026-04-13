#!/usr/bin/env python3
"""Insert stock-watchlist nginx config into nginx.conf"""

NGINX_CONF = "/opt/homebrew/etc/nginx/nginx.conf"

STOCK_BLOCK = """
        # Stock Watchlist static assets
        location /stocks/_next/static/ {
            proxy_pass http://127.0.0.1:3005;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # Stock Watchlist _next dynamic resources
        location /stocks/_next/ {
            proxy_pass http://127.0.0.1:3005;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Stock Watchlist main + API
        location /stocks {
            proxy_pass http://127.0.0.1:3005;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
"""

with open(NGINX_CONF, "r") as f:
    content = f.read()

if "location /stocks" in content:
    print("Stock Watchlist config already exists, skipping")
else:
    marker = "# RateStance/Economy static assets"
    if marker not in content:
        marker = "location /economy"

    idx = content.find(marker)
    if idx == -1:
        print("ERROR: Could not find insertion point")
        exit(1)

    content = content[:idx] + STOCK_BLOCK + "\n        " + content[idx:]

    with open(NGINX_CONF, "w") as f:
        f.write(content)

    print("NGINX_UPDATED")
