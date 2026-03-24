export default function AccessDeniedPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="border border-border bg-surface p-8 text-center">
        <h1 className="text-2xl tracking-[0.22em]">ACCESS_DENIED</h1>
        <p className="text-zinc-400 mt-2 text-sm">Unauthorized operator.</p>
      </div>
    </main>
  );
}
