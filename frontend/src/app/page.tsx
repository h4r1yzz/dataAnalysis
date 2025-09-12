"use client";

import Image from "next/image";
import { ChatInterface } from "@/components/chat/ChatInterface";

export default function Home() {
  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <header className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 flex h-16 items-center justify-between">
          <div className="flex items-center space-x-3">
            <Image
              src="/text2query.png"
              alt="Scout Agent Logo"
              width={32}
              height={32}
              className="w-8 h-8 object-contain"
            />
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Scout Agent</h1>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Data Analysis Assistant
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <ChatInterface />
      </main>
    </div>
  );
}
