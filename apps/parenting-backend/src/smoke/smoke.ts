const BASE_URL = process.env.BASE_URL ?? "http://localhost:4000";
const TEST_EMAIL = `smoke+${Date.now()}@example.com`;
const TEST_PASSWORD = "SmokeTest123!";

let passed = 0;
let failed = 0;
let token: string | null = null;

async function check(
  label: string,
  fn: () => Promise<{ status: number; body: unknown }>,
  expect: (r: { status: number; body: unknown }) => void,
): Promise<void> {
  try {
    const result = await fn();
    expect(result);
    console.log(`  ✓  ${label}`);
    passed++;
  } catch (err) {
    console.error(`  ✗  ${label}: ${err instanceof Error ? err.message : String(err)}`);
    failed++;
  }
}

async function request(method: string, path: string, opts: { body?: unknown; auth?: string } = {}) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.auth) headers["Authorization"] = `Bearer ${opts.auth}`;
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: opts.body != null ? JSON.stringify(opts.body) : undefined,
  });
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { status: res.status, body };
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

console.log(`\nSmoke tests → ${BASE_URL}\n`);

await check("GET /health returns 200", async () => {
  return request("GET", "/health");
}, ({ status }) => {
  assert(status === 200, `expected 200, got ${status}`);
});

await check("POST /api/identity/signup creates account", async () => {
  return request("POST", "/api/identity/signup", {
    body: { email: TEST_EMAIL, password: TEST_PASSWORD },
  });
}, ({ status, body }) => {
  assert(status === 200, `expected 200, got ${status}`);
  assert(typeof (body as Record<string, unknown>).token === "string", "missing token");
  token = (body as Record<string, unknown>).token as string;
});

await check("POST /api/identity/login returns token", async () => {
  return request("POST", "/api/identity/login", {
    body: { email: TEST_EMAIL, password: TEST_PASSWORD },
  });
}, ({ status, body }) => {
  assert(status === 200, `expected 200, got ${status}`);
  assert(typeof (body as Record<string, unknown>).token === "string", "missing token");
});

await check("GET /api/identity/me returns user", async () => {
  assert(token != null, "no token from signup");
  return request("GET", "/api/identity/me", { auth: token! });
}, ({ status, body }) => {
  assert(status === 200, `expected 200, got ${status}`);
  const user = (body as Record<string, unknown>).user as Record<string, unknown>;
  assert(user?.email === TEST_EMAIL, `expected email ${TEST_EMAIL}, got ${user?.email}`);
});

await check("DELETE /api/identity/me cleans up test account", async () => {
  assert(token != null, "no token from signup");
  return request("DELETE", "/api/identity/me", { auth: token! });
}, ({ status }) => {
  assert(status === 200, `expected 200, got ${status}`);
});

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
