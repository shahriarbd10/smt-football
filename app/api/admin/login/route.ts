import { ADMIN_COOKIE_NAME, createAdminToken, validateAdminCredentials } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json();
  const email = String(body?.email || "").trim();
  const password = String(body?.password || "");

  if (!validateAdminCredentials(email, password)) {
    return Response.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = createAdminToken();

  const response = Response.json({ ok: true });
  response.headers.append(
    "Set-Cookie",
    `${ADMIN_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=43200`,
  );

  return response;
}
