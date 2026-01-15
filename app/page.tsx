import { redirect } from 'next/navigation';

/**
 * Redirects root / to canonical /bridge
 */
export default function Home() {
  redirect('/bridge');
}
