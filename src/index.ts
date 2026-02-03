/// <reference types="../worker-configuration" />
import { Hono } from "hono";

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.get("/horoscope/:sign", async (c) => {
  const KV = c.env.KV;
  const sign = c.req.param("sign").toLowerCase();
  const horoscope = await KV.get(`${sign}`, { type: "json" });

  if (!horoscope) {
    return c.json({ error: "Horoscope not found for this sign" }, 404);
  }

  return c.json(horoscope);
});

async function cronJob(env: CloudflareBindings) {
  const KV = env.KV;
  const signs = [
    "aries",
    "taurus",
    "gemini",
    "cancer",
    "leo",
    "virgo",
    "libra",
    "scorpio",
    "sagittarius",
    "capricorn",
    "aquarius",
    "pisces",
  ];
  await Promise.all(
    signs.map(async (sign) => {
      const json = {
        sign: sign,
        horoscope: {
          love: "Your love life is about to take a positive turn. Embrace new opportunities and be open to connections.",
          career:
            "A significant breakthrough is on the horizon. Stay focused and proactive in your professional endeavors.",
          health:
            "Prioritize your well-being by maintaining a balanced diet and regular exercise. Listen to your body's needs.",
        },
      };
      await KV.put(`${sign}`, JSON.stringify(json));
    }),
  );
}

export default {
  fetch: app.fetch,
  async scheduled(
    controller: ScheduledController,
    env: CloudflareBindings,
    ctx: ExecutionContext,
  ) {
    if (controller.cron === "0 0 * * *") {
      ctx.waitUntil(cronJob(env));
    }
  },
};
