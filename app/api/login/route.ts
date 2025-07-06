import { supabase } from '@/lib/supabase/client';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      console.error('Error parsing request body:', error);
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { name, password } = body;

    // Validate input
    if (!name || !password) {
      console.error('Missing name or password:', { name, password });
      return NextResponse.json({ error: 'Name and password are required' }, { status: 400 });
    }

    const trimmedName = name.trim();

    // First try admin authentication
    const { data: adminData, error: adminError } = await supabase
      .from('admin')
      .select('first_name, middle_name, last_name, password, role');

    if (adminError) {
      console.error('Admin query error:', adminError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // Check admin credentials
    const admin = adminData?.find((record) => {
      const dbFullName = [
        record.first_name,
        record.middle_name,
        record.last_name
      ]
        .filter(Boolean)
        .join(' ')
        .trim();
      return dbFullName.toLowerCase() === trimmedName.toLowerCase() && record.password === password;
    });

    if (admin) {
      // Admin login successful
      const fullName = [admin.first_name, admin.middle_name, admin.last_name]
        .filter(Boolean)
        .join(' ')
        .trim();

      const response = NextResponse.json({
        success: true,
        user: {
          name: fullName,
          firstName: admin.first_name,
          role: admin.role,
          avatar: null,
          userType: 'admin',
          isAdmin: true,
          isDoctor: false,
          clinicianId: null
        }
      });

      // Store user data in a cookie for cross-tab persistence
      const userData = {
        name: fullName,
        firstName: admin.first_name,
        role: admin.role,
        avatar: null,
        userType: 'admin',
        isAdmin: true,
        isDoctor: false,
        clinicianId: null
      };

      response.cookies.set({
        name: 'auth_token',
        value: 'authenticated',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7
      });

      // Store user data in a non-httpOnly cookie for client-side access
      response.cookies.set({
        name: 'user_data',
        value: JSON.stringify(userData),
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7
      });

      return response;
    }

    // If not admin, try clinician authentication
    // First get person details
    const { data: personData, error: personError } = await supabase
      .from('person')
      .select('id, first_name, middle_name, last_name, fileurl');

    if (personError) {
      console.error('Person query error:', personError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // Find matching person by name
    const person = personData?.find((p) => {
      const dbFullName = [p.first_name, p.middle_name, p.last_name]
        .filter(Boolean)
        .join(' ')
        .trim();
      return dbFullName.toLowerCase() === trimmedName.toLowerCase();
    });

    if (!person) {
      return NextResponse.json({ error: 'Invalid name or password' }, { status: 401 });
    }

    // Get clinician details
    const { data: clinicianData, error: clinicianError } = await supabase
      .from('clinicians')
      .select('id, role, password')
      .eq('id', person.id)
      .single();

    if (clinicianError) {
      console.error('Clinician query error:', clinicianError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!clinicianData || clinicianData.password !== password) {
      return NextResponse.json({ error: 'Invalid name or password' }, { status: 401 });
    }

    // Clinician login successful
    const fullName = [person.first_name, person.middle_name, person.last_name]
      .filter(Boolean)
      .join(' ')
      .trim();

    const response = NextResponse.json({
      success: true,
      user: {
        name: fullName,
        firstName: person.first_name,
        role: clinicianData.role,
        avatar: person.fileurl,
        userType: 'clinician',
        isAdmin: false,
        isDoctor: clinicianData.role.toLowerCase().includes('doctor'),
        clinicianId: clinicianData.id.toString()
      }
    });

    // Store user data in a cookie for cross-tab persistence
    const userData = {
      name: fullName,
      firstName: person.first_name,
      role: clinicianData.role,
      avatar: person.fileurl,
      userType: 'clinician',
      isAdmin: false,
      isDoctor: clinicianData.role.toLowerCase().includes('doctor'),
      clinicianId: clinicianData.id.toString()
    };

    response.cookies.set({
      name: 'auth_token',
      value: 'authenticated',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7
    });

    // Store user data in a non-httpOnly cookie for client-side access
    response.cookies.set({
      name: 'user_data',
      value: JSON.stringify(userData),
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7
    });

    return response;

  } catch (error: any) {
    console.error('API error:', {
      message: error.message,
      stack: error.stack,
      requestBody: await request.text().catch(() => 'Unable to parse request body'),
    });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}