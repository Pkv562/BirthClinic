import { useState, useEffect } from 'react';
import { getUserDataFromCookie } from '@/lib/utils';

type UserData = {
  name: string;
  firstName: string;
  role: string;
  avatar: string | null;
  userType: 'admin' | 'clinician';
  isAdmin: boolean;
  isDoctor: boolean;
  clinicianId?: string;
};

export function useCurrentUser() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // First try to get user data from sessionStorage (for current tab)
    const storedUser = sessionStorage.getItem('user');
    if (storedUser) {
      setUserData(JSON.parse(storedUser));
      setLoading(false);
      return;
    }

    // If not in sessionStorage, try to get from cookie (for new tabs)
    const cookieUserData = getUserDataFromCookie();
    if (cookieUserData) {
      setUserData(cookieUserData);
      // Also store in sessionStorage for this tab
      sessionStorage.setItem('user', JSON.stringify(cookieUserData));
    }
    
    setLoading(false);
  }, []);

  return { userData, loading };
} 