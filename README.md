# Portfolio Tracker API

Real-time portfolio performance tracker with chart history and API endpoints for ESP32.

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/portfolio` | Full portfolio data with holdings + chart |
| `GET /api/summary` | Summary data + chart (for frontend) |
| `GET /api/update` | Updates chart data (called by cron every 5 min) |
| `GET /api/reset` | Reset today's chart data |

### Example Response (`/api/summary`)

```json
{
  "timestamp": "2024-01-15T14:30:00.000Z",
  "total": { "value": 515000, "percentChange": 0.45, "dollarChange": 2318 },
  "vti": { "value": 320000, "percentChange": 0.32, "dollarChange": 1024 },
  "personal": { "value": 195000, "percentChange": 0.66, "dollarChange": 1294 },
  "sp500": { "percentChange": 0.28 },
  "chart": {
    "portfolio": [
      { "time": "09:30", "value": 0.12, "timestamp": "..." },
      { "time": "09:35", "value": 0.18, "timestamp": "..." },
      { "time": "09:40", "value": 0.25, "timestamp": "..." }
    ],
    "sp500": [
      { "time": "09:30", "value": 0.08, "timestamp": "..." },
      { "time": "09:35", "value": 0.12, "timestamp": "..." },
      { "time": "09:40", "value": 0.15, "timestamp": "..." }
    ]
  }
}
```

## Deploy to Vercel

### 1. Create Upstash Redis Database (Free)

1. Go to [upstash.com](https://upstash.com) and create a free account
2. Create a new Redis database
3. Copy the `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

### 2. Install & Deploy

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel

# Add environment variables
vercel env add FINNHUB_API_KEY
# Enter: your-finnhub-api-key

vercel env add UPSTASH_REDIS_REST_URL
# Enter: your-upstash-url

vercel env add UPSTASH_REDIS_REST_TOKEN
# Enter: your-upstash-token

# Deploy to production
vercel --prod
```

### 3. Cron Job (Automatic)

Vercel Cron is configured in `vercel.json` to call `/api/update` every 5 minutes during market hours (Mon-Fri 9:00-16:00 ET).

**Note:** Vercel Cron requires a Pro plan. For free tier, use an external cron service like:
- [cron-job.org](https://cron-job.org) (free)
- [easycron.com](https://easycron.com) (free tier)

Set it to call: `https://your-project.vercel.app/api/update` every 5 minutes.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `FINNHUB_API_KEY` | Your Finnhub API key |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST Token |

## ESP32 Code Example

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* apiUrl = "https://your-project.vercel.app/api/summary";

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConnected to WiFi");
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(apiUrl);
    
    int httpCode = http.GET();
    
    if (httpCode == 200) {
      String payload = http.getString();
      
      DynamicJsonDocument doc(8192);
      deserializeJson(doc, payload);
      
      float totalPercent = doc["total"]["percentChange"];
      int totalDollar = doc["total"]["dollarChange"];
      float sp500Percent = doc["sp500"]["percentChange"];
      
      Serial.printf("Portfolio: %+.2f%% ($%+d)\n", totalPercent, totalDollar);
      Serial.printf("S&P 500:   %+.2f%%\n", sp500Percent);
      
      // Chart data available in doc["chart"]["portfolio"] and doc["chart"]["sp500"]
      JsonArray portfolioChart = doc["chart"]["portfolio"];
      Serial.printf("Chart points: %d\n", portfolioChart.size());
    }
    
    http.end();
  }
  
  delay(300000); // Update every 5 minutes
}
```

## Local Development

```bash
# Install dependencies
npm install

# Start frontend dev server
npm run dev

# Test API locally (requires Vercel CLI)
vercel dev
```

## How Chart Data Works

1. **Every 5 minutes** during market hours, `/api/update` is called
2. It fetches current prices from Finnhub
3. Calculates portfolio & S&P 500 percent changes
4. Appends new data points to Redis with timestamps
5. Data expires after 24 hours (resets each day)
6. `/api/summary` returns current values + full chart history

## Customizing Portfolio

Edit the holdings in:
- `api/portfolio.js`
- `api/summary.js`
- `api/update.js`
- `src/config/portfolio.ts` (frontend)
