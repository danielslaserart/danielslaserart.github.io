const allowedOrigins = [
  "https://danielslaserart.de",
  "https://www.danielslaserart.de",
];

function makeHeaders(origin: string) {
  return {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-origin": allowedOrigins.includes(origin) ? origin : "",
    "access-control-allow-methods": "GET, OPTIONS",
  };
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin") || "";
  const responseHeaders = makeHeaders(origin);

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: responseHeaders });
  }

  if (request.method !== "GET" || !allowedOrigins.includes(origin)) {
    return new Response(JSON.stringify({ error: "not_allowed" }), {
      status: 403,
      headers: responseHeaders,
    });
  }

  const token = Deno.env.get("GOATCOUNTER_API_TOKEN");

  if (!token) {
    return new Response(JSON.stringify({ error: "missing_token" }), {
      status: 500,
      headers: responseHeaders,
    });
  }

  const requestUrl = new URL(request.url);
  const starts = [
    requestUrl.searchParams.get("today"),
    requestUrl.searchParams.get("week"),
    requestUrl.searchParams.get("month"),
    "2020-01-01T00:00:00.000Z",
  ];

  if (starts.slice(0, 3).some((value) => !value)) {
    return new Response(JSON.stringify({ error: "missing_dates" }), {
      status: 400,
      headers: responseHeaders,
    });
  }

  async function loadTotal(start: string | null) {
    const url = new URL(
      "https://danielslaserart.goatcounter.com/api/v0/stats/total",
    );
    url.searchParams.set("start", start || "");

    const response = await fetch(url, {
      headers: {
        authorization: `Bearer ${token}`,
        accept: "application/json",
        "content-type": "application/json",
      },
    });

    const data = await response.json();
    return Number(data.total);
  }

  const totals = await Promise.all(starts.map(loadTotal));

  return new Response(
    JSON.stringify({
      today: totals[0],
      week: totals[1],
      month: totals[2],
      total: totals[3],
      updatedAt: new Date().toISOString(),
    }),
    { status: 200, headers: responseHeaders },
  );
});
