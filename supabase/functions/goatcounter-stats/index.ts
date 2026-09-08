const allowedOrigins = new Set([
  "https://danielslaserart.de",
  "https://www.danielslaserart.de",
]);

const jsonHeaders = (origin: string | null) => {
  const headers: Record<string, string> = {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store, max-age=0",
    "x-content-type-options": "nosniff",
    "x-robots-tag": "noindex, nofollow, noarchive",
    vary: "Origin",
  };

  if (origin && allowedOrigins.has(origin)) {
    headers["access-control-allow-origin"] = origin;
  }

  return headers;
};

const reply = (body: unknown, status: number, origin: string | null) =>
  new Response(JSON.stringify(body), {
    status,
    headers: jsonHeaders(origin),
  });

const parseDate = (value: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");

  if (request.method === "OPTIONS") {
    if (!origin || !allowedOrigins.has(origin)) {
      return reply({ error: "origin_not_allowed" }, 403, origin);
    }

    const headers = jsonHeaders(origin);
    headers["access-control-allow-methods"] = "GET, OPTIONS";
    headers["access-control-allow-headers"] = "content-type";
    return new Response(null, { status: 204, headers });
  }

  if (request.method !== "GET") {
    return reply({ error: "method_not_allowed" }, 405, origin);
  }

  if (!origin || !allowedOrigins.has(origin)) {
    return reply({ error: "origin_not_allowed" }, 403, origin);
  }

  const apiToken = Deno.env.get("GOATCOUNTER_API_TOKEN") ?? "";
  if (!apiToken) {
    return reply({ error: "server_not_configured" }, 500, origin);
  }

  const requestUrl = new URL(request.url);
  const ranges = {
    today: parseDate(requestUrl.searchParams.get("today")),
    week: parseDate(requestUrl.searchParams.get("week")),
    month: parseDate(requestUrl.searchParams.get("month")),
    total: new Date("2020-01-01T00:00:00.000Z"),
  } as const;

  if (!ranges.today || !ranges.week || !ranges.month) {
    return reply({ error: "invalid_date_range" }, 400, origin);
  }

  const fetchTotal = async (start: Date) => {
    const url = new URL(
      "https://danielslaserart.goatcounter.com/api/v0/stats/total",
    );
    url.searchParams.set("start", start.toISOString());

    const response = await fetch(url, {
      headers: {
        accept: "application/json",
        authorization: `Bearer ${apiToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`GoatCounter API returned ${response.status}`);
    }

    const data = await response.json();
    const total = Number(data?.total);
    if (!Number.isFinite(total)) {
      throw new Error("GoatCounter API returned an invalid total");
    }

    return total;
  };

  try {
    const entries = await Promise.all(
      Object.entries(ranges).map(async ([name, start]) => [
        name,
        await fetchTotal(start as Date),
      ]),
    );

    return reply(
      {
        ...Object.fromEntries(entries),
        updatedAt: new Date().toISOString(),
      },
      200,
      origin,
    );
  } catch (error) {
    console.error("GoatCounter statistics could not be loaded", error);
    return reply({ error: "upstream_failed" }, 502, origin);
  }
});
