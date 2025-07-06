import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Utility function to get user data from cookies
export function getUserDataFromCookie(): any {
  if (typeof document === 'undefined') return null;
  
  const cookies = document.cookie.split(';');
  const userDataCookie = cookies.find(cookie => cookie.trim().startsWith('user_data='));
  
  if (userDataCookie) {
    try {
      const userDataValue = userDataCookie.split('=')[1];
      return JSON.parse(decodeURIComponent(userDataValue));
    } catch (error) {
      console.error('Error parsing user data cookie:', error);
      return null;
    }
  }
  
  return null;
}
