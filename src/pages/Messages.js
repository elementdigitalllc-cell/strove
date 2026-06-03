export default function Messages() {
  return (
    <div className="flex flex-col items-center justify-center text-center min-h-[60dvh] gap-2 px-6">
      <div className="text-4xl">💬</div>
      <h1 className="text-[18px] font-bold">No messages yet</h1>
      <p className="text-sm text-muted max-w-[280px]">
        Direct messages are coming soon. Hang tight.
      </p>
    </div>
  );
}
