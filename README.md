# Worker-Proxy
A simple Websocket to TCP proxy based on cloudflare workers.

Usage:
1. Deploy the worker script
2. Configure YOUR token
3. Access the proxy via `wss://YOUR-WORKER-DOMAIN?host=HOST&port=PORT` with `Authroization: YOUR_TOKEN` header
