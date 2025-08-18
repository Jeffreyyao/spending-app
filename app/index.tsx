import { Redirect } from 'expo-router';

export default function Index() {
  return (
    // Redirect to spendings screen on app launch
    <Redirect href="/spendings" />
  );
}
