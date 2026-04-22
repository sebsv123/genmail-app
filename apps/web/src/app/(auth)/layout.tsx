export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  );
}
