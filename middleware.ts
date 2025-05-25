import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Get the path from the request
  const path = request.nextUrl.pathname

  // Get the token from cookies
  const isAuthenticated = request.cookies.has('auth_token')

  // Define public paths that don't need authentication
  const isPublicPath = path === '/' || path === '/login'

  // Redirect logic
  if (!isAuthenticated && !isPublicPath) {
    // Redirect to login if trying to access protected route without auth
    return NextResponse.redirect(new URL('/', request.url))
  }

  if (isAuthenticated && isPublicPath) {
    // Redirect to dashboard if trying to access login while authenticated
    return NextResponse.redirect(new URL('/Dashboard', request.url))
  }

  return NextResponse.next()
}

// Configure which routes to run middleware on
export const config = {
  matcher: ['/', '/Dashboard/:path*']
} 