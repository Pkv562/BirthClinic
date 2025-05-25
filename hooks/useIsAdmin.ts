import { useState, useEffect } from 'react';

export function useIsAdmin() {
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Get user data from session storage
        const storedUser = sessionStorage.getItem('user');
        if (storedUser) {
            const userData = JSON.parse(storedUser);
            setIsAdmin(userData.isAdmin || false);
        }
        setLoading(false);
    }, []);

    return { isAdmin, loading };
} 