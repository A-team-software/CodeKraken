import { Sparkles } from "lucide-react";
import Link from "next/link";

export default function Header() {
  return (
    <header className="border-b border-gray-200 py-4 px-6 glass">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold text-blue-600">OliverAI</span>
        </Link>
      </div>
    </header>
  );
}
