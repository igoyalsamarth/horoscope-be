/// <reference types="../worker-configuration" />
import { Hono } from "hono";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { zodSchema } from "ai";
import { z } from "zod";

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
  const google = createGoogleGenerativeAI({
    apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY,
  });

  const today = new Date();

  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const dayOfMonth = today.getDate();
  const hours = today.getHours();
  const minutes = today.getMinutes();
  const seconds = today.getSeconds();
  const dayOfWeekIndex = today.getDay();

  const astroJson = await fetch(
    `https://json.freeastrologyapi.com/western/planets`,
    {
      method: "POST",
      headers: {
        "x-api-key": env.ASTRO_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        year: year,
        month: month,
        date: dayOfMonth,
        hours: hours,
        minutes: minutes,
        seconds: seconds,
        latitude: 17.38405,
        longitude: 78.45636,
        timezone: 5.5,
        config: {
          observation_point: "topocentric",
          ayanamsha: "tropical",
          language: "en",
        },
      }),
    },
  );

  const daysList = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const dayOfWeekName = daysList[dayOfWeekIndex];

  const KV = env.KV;

  const horoscopeSchema = zodSchema(
    z.object({
      aries: z.object({
        love: z.string().describe("Love and relationship horoscope"),
        career: z.string().describe("Career and professional horoscope"),
        health: z.string().describe("Health and wellness horoscope"),
      }),
      taurus: z.object({
        love: z.string().describe("Love and relationship horoscope"),
        career: z.string().describe("Career and professional horoscope"),
        health: z.string().describe("Health and wellness horoscope"),
      }),
      gemini: z.object({
        love: z.string().describe("Love and relationship horoscope"),
        career: z.string().describe("Career and professional horoscope"),
        health: z.string().describe("Health and wellness horoscope"),
      }),
      cancer: z.object({
        love: z.string().describe("Love and relationship horoscope"),
        career: z.string().describe("Career and professional horoscope"),
        health: z.string().describe("Health and wellness horoscope"),
      }),
      leo: z.object({
        love: z.string().describe("Love and relationship horoscope"),
        career: z.string().describe("Career and professional horoscope"),
        health: z.string().describe("Health and wellness horoscope"),
      }),
      virgo: z.object({
        love: z.string().describe("Love and relationship horoscope"),
        career: z.string().describe("Career and professional horoscope"),
        health: z.string().describe("Health and wellness horoscope"),
      }),
      libra: z.object({
        love: z.string().describe("Love and relationship horoscope"),
        career: z.string().describe("Career and professional horoscope"),
        health: z.string().describe("Health and wellness horoscope"),
      }),
      scorpio: z.object({
        love: z.string().describe("Love and relationship horoscope"),
        career: z.string().describe("Career and professional horoscope"),
        health: z.string().describe("Health and wellness horoscope"),
      }),
      sagittarius: z.object({
        love: z.string().describe("Love and relationship horoscope"),
        career: z.string().describe("Career and professional horoscope"),
        health: z.string().describe("Health and wellness horoscope"),
      }),
      capricorn: z.object({
        love: z.string().describe("Love and relationship horoscope"),
        career: z.string().describe("Career and professional horoscope"),
        health: z.string().describe("Health and wellness horoscope"),
      }),
      aquarius: z.object({
        love: z.string().describe("Love and relationship horoscope"),
        career: z.string().describe("Career and professional horoscope"),
        health: z.string().describe("Health and wellness horoscope"),
      }),
      pisces: z.object({
        love: z.string().describe("Love and relationship horoscope"),
        career: z.string().describe("Career and professional horoscope"),
        health: z.string().describe("Health and wellness horoscope"),
      }),
    }),
  );

  const result = await generateText({
    model: google("gemini-2.5-flash"),
    output: Output.object({
      schema: horoscopeSchema,
    }),
    prompt: `You are an expert western planetary astrologer. Based on the following planetary positions, generate a detailed horoscope for each of the twelve zodiac signs (aries, taurus, gemini, cancer, leo, virgo, libra, scorpio, sagittarius, capricorn, aquarius, pisces) focusing on love, career, and health. Provide practical advice and insights for each sign.\nToday is ${dayOfWeekName}, ${month}/${dayOfMonth}/${year}\nThe planetary positions are as follows: ${astroJson.text()}`,
  });

  const horoscopes = result.output;

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
  ] as const;

  await Promise.all(
    signs.map(async (sign) => {
      const json = {
        sign: sign,
        horoscope: horoscopes[sign],
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
    if (controller.cron === "*/10 * * * *") {
      ctx.waitUntil(cronJob(env));
    }
  },
};
