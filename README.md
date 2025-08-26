# URL Shortener Microservice

## Quick start (after extracting)

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the service:
   ```bash
   npm start
   ```
3. Health check:
   ```bash
   curl http://localhost:3000/health
   ```
4. Create short URL (example):
   ```bash
   curl -s -X POST http://localhost:3000/shorturls \
     -H 'Content-Type: application/json' \
     -d '{"url":"https://example.com/very/long/path"}' | jq
   ```
5. Redirect test (open in browser or use curl):
   ```bash
   curl -I http://localhost:3000/<shortcode>
   ```
6. Get stats:
   ```bash
   curl http://localhost:3000/shorturls/<shortcode> | jq
   ```

Logs are written to `logs/app.log` via the mandatory custom logging middleware.

To change port or base URL, edit `.env` and restart the service.
