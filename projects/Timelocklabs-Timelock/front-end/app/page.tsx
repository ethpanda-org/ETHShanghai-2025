import { redirect } from 'next/navigation';

export default async function Page() {
	// redirect to login page
	redirect(`/login`);
}
