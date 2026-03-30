import { NextRequest, NextResponse } from 'next/server';

/**
 * Validates a request coming from Forge.
 * 
 * @param req The incoming request
 * @returns { isValid: boolean, error?: NextResponse, token?: string }
 */
export function validateForgeRequest(req: Request | NextRequest) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const secret = process.env.API_SECRET;

  if (!token) {
    console.warn(`Forge Auth: Missing token in Authorization header`);
    return { 
      isValid: false, 
      error: new NextResponse('Missing Authorization Header', { status: 401 }) 
    };
  }

  if (!secret) {
    console.error(`Forge Auth: API_SECRET not configured on server`);
    return { 
      isValid: false, 
      error: new NextResponse('Server Configuration Error', { status: 500 }) 
    };
  }

  if (token !== secret) {
    const receivedPrefix = token.substring(0, 4);
    const expectedPrefix = secret.substring(0, 4);
    
    console.warn(`Forge Auth: Token mismatch. Received: ${receivedPrefix}... Expected: ${expectedPrefix}...`);
    
    return { 
      isValid: false, 
      error: new NextResponse(`Unauthorized: Secret mismatch (Rec: ${receivedPrefix}..., Exp: ${expectedPrefix}...)`, { status: 401 }) 
    };
  }

  return { isValid: true, token };
}
