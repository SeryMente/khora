import Link from "next/link";
import { Book } from "lucide-react";

export default function MainMenu() {
  return (
    <div className="flex flex-col min-h-[100vh] w-full bg-[#0B1F3B] font-ibm overflow-hidden">
      {/* Header */}
      <header className="flex-none pt-12 pb-6 flex justify-center items-center">
        <h1 className="text-[#FFFFFF] text-xl tracking-[0.2em] uppercase font-medium">
          ATHANOR
        </h1>
      </header>

      {/* Content */}
      <main className="flex-1 flex justify-center items-center px-6">
        <Link
          href="/bitacora"
          className="
            group
            flex flex-col items-center justify-center gap-4
            w-full max-w-sm aspect-square sm:aspect-video
            bg-[#112A4F]
            border border-[#1F3C6A]
            rounded-2xl
            transition-all duration-200 ease-in-out
            hover:bg-[#163666] hover:border-[#3FA7FF] hover:shadow-[0_0_15px_rgba(63,167,255,0.4)]
            focus:outline-none focus:ring-2 focus:ring-[#3FA7FF] focus:ring-offset-4 focus:ring-offset-[#0B1F3B] focus:bg-[#163666] focus:border-[#3FA7FF]
          "
        >
          <Book
            className="w-12 h-12 text-[#8BABC6] transition-colors duration-200 ease-in-out group-hover:text-[#3FA7FF] group-focus:text-[#3FA7FF]"
            strokeWidth={1.5}
          />
          <span className="text-[#FFFFFF] font-medium text-lg tracking-wide">
            Bitácora 24/365
          </span>
        </Link>
      </main>

      {/* Footer - Negative Space */}
      <footer className="flex-none h-24">
        {/* Espacio vacío para balance visual */}
      </footer>
    </div>
  );
}
