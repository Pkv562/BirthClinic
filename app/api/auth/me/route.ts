import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  try {
    // Check if auth_token cookie exists
    const authToken = request.cookies.get('auth_token');
    
    if (!authToken || authToken.value !== 'authenticated') {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Since we don't store user ID in the cookie, we need to get it from the request
    // For now, we'll return a generic response indicating the user is authenticated
    // In a real implementation, you might want to store user ID in the cookie or use a session
    
    return NextResponse.json({
      authenticated: true,
      message: 'User is authenticated'
    });

  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
} 