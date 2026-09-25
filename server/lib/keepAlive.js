/**
 * Keep-Alive Pinger for Render Free Tier
 * Render spins down free web services after 15 minutes of inactivity.
 * This background task pings the /api/health endpoint every 14 minutes
 * using RENDER_EXTERNAL_URL (automatically provided by Render) or SERVER_URL.
 */

export function startKeepAlive() {
  const rawUrl = process.env.RENDER_EXTERNAL_URL || process.env.SERVER_URL;

  if (!rawUrl) {
    // In local development or if no public URL is configured
    return;
  }

  // Normalize URL (strip trailing slash)
  const baseUrl = rawUrl.replace(/\/+$/, '');
  const healthEndpoint = `${baseUrl}/api/health`;

  // Ping every 14 minutes (14 * 60 * 1000 ms) to beat the 15-minute idle sleep timer
  const INTERVAL_MS = 14 * 60 * 1000;

  console.log(`⏰ [KeepAlive] Initialized. Pinging ${healthEndpoint} every 14 minutes.`);

  setInterval(async () => {
    try {
      const response = await fetch(healthEndpoint, {
        headers: {
          'User-Agent': 'Render-KeepAlive-Service/1.0',
        },
      });

      if (response.ok) {
        console.log(`💚 [KeepAlive] Ping successful at ${new Date().toISOString()}`);
      } else {
        console.warn(`⚠️ [KeepAlive] Ping returned status ${response.status}`);
      }
    } catch (err) {
      console.error(`⚠️ [KeepAlive] Ping failed: ${err.message}`);
    }
  }, INTERVAL_MS);
}
