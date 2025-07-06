import { useState, useEffect } from 'react';
import { getUserDataFromCookie } from '@/lib/utils';

export function useIsAdmin() {
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // First try to get user data from sessionStorage (for current tab)
        const storedUser = sessionStorage.getItem('user');
        if (storedUser) {
            const userData = JSON.parse(storedUser);
            setIsAdmin(userData.isAdmin || false);
            setLoading(false);
            return;
        }

        // If not in sessionStorage, try to get from cookie (for new tabs)
        const cookieUserData = getUserDataFromCookie();
        if (cookieUserData) {
            setIsAdmin(cookieUserData.isAdmin || false);
            // Also store in sessionStorage for this tab
            sessionStorage.setItem('user', JSON.stringify(cookieUserData));
        }
        
        setLoading(false);
    }, []);

    return { isAdmin, loading };
} 