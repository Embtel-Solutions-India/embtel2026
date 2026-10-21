import { redirect } from 'next/navigation';

// The proxy gates /admin; authenticated users land on the dashboard.
export default function AdminIndex() {
  redirect('/admin/dashboard');
}
