export const dynamic = "force-dynamic";

export default function ChatPage() {
  return (
    <main
      aria-label="Open WebUI"
      className="w-full overflow-hidden"
      style={{
        height: "calc(100dvh - 6rem - env(safe-area-inset-bottom))",
        background: "var(--khora-absolute)",
      }}
    >
      <iframe
        src="/chat/frame"
        title="Open WebUI"
        className="block h-full w-full border-0"
        allow="clipboard-read; clipboard-write"
        referrerPolicy="same-origin"
      />
    </main>
  );
}
