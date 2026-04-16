import { Logger } from "@oliver/core";

/**
 * Validates a request coming from Forge.
 * 
 * @param req The incoming request
 * @returns { isValid: boolean, error?: string, status?: number, token?: string }
 */
export function validateForgeRequest(req: Request) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const secret = process.env.API_SECRET || process.env.FORGE_SHARED_SECRET;

  if (!token) {
    Logger.warn(`Forge Auth: Missing token in Authorization header`);
    return {
      isValid: false,
      error: 'Missing Authorization Header',
      status: 401
    };
  }

  if (!secret) {
    Logger.error(`Forge Auth: API_SECRET (or FORGE_SHARED_SECRET) not configured on server`);
    return {
      isValid: false,
      error: 'Server Configuration Error',
      status: 500
    };
  }

  if (token !== secret) {
    const receivedPrefix = token.substring(0, 4);
    const expectedPrefix = secret.substring(0, 4);

    Logger.warn(`Forge Auth: Token mismatch. Received: ${receivedPrefix}... Expected: ${expectedPrefix}...`);

    return {
      isValid: false,
      error: `Unauthorized: Secret mismatch (Rec: ${receivedPrefix}..., Exp: ${expectedPrefix}...)`,
      status: 401
    };
  }

  return { isValid: true, token };
}
