const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store, max-age=0",
  "x-content-type-options": "nosniff",
  "x-robots-tag": "noindex, nofollow, noarchive",
};

const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: jsonHeaders });

function timingSafeEqual(left: string, right: string) {
  const encoder = new TextEncoder();
  const a = encoder.encode(left);
  const b = encoder.encode(right);
  let difference = a.length ^ b.length;
  const length = Math.max(a.length, b.length);

  for (let index = 0; index < length; index += 1) {
    difference |= (a[index] ?? 0) ^ (b[index] ?? 0);
  }

  return difference === 0;
}

Deno.serve(async (request) => {
  if (request.method !== "GET") {
    return reply({ error: "method_not_allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const expectedToken = Deno.env.get("ORDER_MONITOR_TOKEN") ?? "";
  const userId = Deno.env.get("ORDER_MONITOR_USER_ID") ?? "";

  if (!supabaseUrl || !serviceRoleKey || !expectedToken || !userId) {
    return reply({ error: "server_not_configured" }, 500);
  }

  const url = new URL(request.url);
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const suppliedToken = bearer || url.searchParams.get("token") || "";

  if (!suppliedToken || !timingSafeEqual(suppliedToken, expectedToken)) {
    return reply({ error: "unauthorized" }, 401);
  }

  const query = new URL("/rest/v1/order_monitor_state", supabaseUrl);
  query.searchParams.set("user_id", `eq.${userId}`);
  query.searchParams.set("select", "updated_at,data");
  query.searchParams.set("limit", "1");

  const response = await fetch(query, {
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      accept: "application/json",
    },
  });

  if (!response.ok) {
    return reply({ error: "database_read_failed" }, 502);
  }

  const rows = await response.json();
  const row = Array.isArray(rows) ? rows[0] : null;

  if (!row) {
    return reply({ error: "snapshot_not_found" }, 404);
  }

  return reply({
    updatedAt: row.updated_at,
    snapshot: row.data,
  });
});
