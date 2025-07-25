import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true });
  
  // Clear the auth cookie
  response.cookies.set({
    name: 'auth_token',
    value: '',
    expires: new Date(0),
    path: '/',
  });

  // Clear the user data cookie
  response.cookies.set({
    name: 'user_data',
    value: '',
    expires: new Date(0),
    path: '/',
  });

  return response;
} 