// /app/(dashboard)/layout.tsx
import Sidebar from "@/components/layout/Sidebar";
import NavigationBar from "@/components/layout/NavigationBar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <NavigationBar />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}