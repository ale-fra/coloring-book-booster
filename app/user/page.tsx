import { auth } from '@/auth';
import { logout } from '@/app/actions';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function UserPage() {
    const session = await auth();

    if (!session?.user) {
        redirect('/login');
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
            <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-6 shadow-md">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
                        User Profile
                    </h2>
                </div>
                <div className="mt-8 space-y-6">
                    <div className="rounded-md bg-gray-50 p-4">
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="text-lg font-medium text-gray-900">{session.user.email}</p>
                    </div>

                    <div className="flex flex-col space-y-4">
                        <Link
                            href="/"
                            className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                        >
                            Go to App
                        </Link>

                        <form action={logout}>
                            <button
                                type="submit"
                                className="flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                            >
                                Sign out
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
