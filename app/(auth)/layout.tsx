export const dynamic = "force-dynamic";

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // 🚫 No auth()
    // 🚫 No env assertions
    // 🚫 No imports with side effects
    return <>{children}</>;
}
