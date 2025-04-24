import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { env } from '~/env';

// This middleware runs during app initialization
export function middleware(request: NextRequest) {
  // Log environment variables status during initialization
  console.log('Environment variables status:');
  console.log('- REVAI_API_KEY:', env.REVAI_API_KEY ? 'Set' : 'Not set');
  console.log('- GROQ_API_KEY:', env.GROQ_API_KEY ? 'Set' : 'Not set');
  
  // Allow the request to continue
  return NextResponse.next();
}

// Configure which paths this middleware will run on
export const config = {
  matcher: ['/api/:path*'],
}; 