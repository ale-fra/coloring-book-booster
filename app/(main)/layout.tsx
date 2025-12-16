import { auth } from "@/auth";
import { SidebarLayout } from "@/components/SidebarLayout";
import { AdminDebugPanel } from "@/components/admin/AdminDebugPanel";

export default async function MainLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const session = await auth();

    // Fetch fresh user data from DB to ensure role is up to date (bypassing stale JWT)
    let isAdmin = false;
    if (session?.user?.email) {
        try {
            const { db } = await import("@/lib/db/drizzle");
            const { users } = await import("@/lib/db/schema");
            const { eq } = await import("drizzle-orm");

            const user = await db.query.users.findFirst({
                where: eq(users.email, session.user.email),
                columns: { role: true, isAdmin: true }
            });

            if (user) {
                isAdmin = user.role === 'admin' || user.isAdmin === true;
            }
        } catch (e) {
            console.error("Failed to fetch user role in layout:", e);
            // Fallback to session
            isAdmin = session?.user?.role === 'admin' || session?.user?.isAdmin === true;
        }
    }

    return (
        <SidebarLayout>
            {children}
            {isAdmin && <AdminDebugPanel />}
        </SidebarLayout>
    );
}
