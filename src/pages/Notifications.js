export default function Notifications() {
  return (
    <div className="flex flex-col items-center justify-center text-center min-h-[60dvh] gap-2 px-6">
      <div className="text-4xl">🔔</div>
      <h1 className="text-[18px] font-bold">No notifications yet</h1>
      <p className="text-sm text-muted max-w-[280px]">
        We'll let you know when someone likes, comments, follows, or messages you.
      </p>
    </div>
  );
}
