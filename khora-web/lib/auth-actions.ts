"use server";

export async function verifyLegacyCredentials(user: string, pass: string): Promise<boolean> {
  const envUser = process.env.BASIC_AUTH_USER;
  const envPass = process.env.BASIC_AUTH_PASS;

  if (!envUser || !envPass) {
    // If no basic auth is configured, we can't authenticate this way
    return false;
  }

  return user === envUser && pass === envPass;
}
