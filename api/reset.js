// Reset chart data for today (useful for testing)
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

function getTodayKey() {
  const now = new Date();
  return `chart:${now.toISOString().split('T')[0]}`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  try {
    const todayKey = getTodayKey();
    await redis.del(todayKey);

    return res.status(200).json({
      success: true,
      message: `Chart data for ${todayKey} has been reset`,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}


