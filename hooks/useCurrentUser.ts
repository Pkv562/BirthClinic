import { useState, useEffect } from 'react';

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
    const storedUser = sessionStorage.getItem('user');
    if (storedUser) {
      setUserData(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  return { userData, loading };
} 