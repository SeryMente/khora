import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">CoMind</h1>
        <p className="text-gray-400 text-sm">Tu segundo cerebro</p>
      </div>

      <Link
        href="/capturar"
        className="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold text-center hover:bg-indigo-700 transition-colors"
      >
        Nueva captura
      </Link>
    </div>
  );
}
