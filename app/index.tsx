import { router } from 'expo-router';
import { useEffect } from 'react';

export default function Index() {
  useEffect(() => {
    // Redirect to spendings screen on app launch
    router.replace('/spendings');
  }, []);

  // Return null since we're redirecting immediately
  return null;
}
