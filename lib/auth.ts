import jwt from "jsonwebtoken";

const ADMIN_EMAIL = "smtfootball@admin.com";
const ADMIN_PASSWORD = "123456";
const COOKIE_NAME = "smt_admin_token";

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is missing. Add it to .env.local");
  }

  return secret;
}

export function validateAdminCredentials(email: string, password: string) {
  return email === ADMIN_EMAIL && password === ADMIN_PASSWORD;
}

export function createAdminToken() {
  return jwt.sign(
    {
      role: "admin",
      email: ADMIN_EMAIL,
    },
    getJwtSecret(),
    {
      expiresIn: "12h",
    },
  );
}

export function verifyAdminToken(token?: string | null) {
  if (!token) {
    return false;
  }

  try {
    const payload = jwt.verify(token, getJwtSecret()) as { role?: string };
    return payload.role === "admin";
  } catch {
    return false;
  }
}

export const ADMIN_COOKIE_NAME = COOKIE_NAME;
