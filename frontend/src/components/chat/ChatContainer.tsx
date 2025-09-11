"use client";

import { useEffect, useRef } from "react";
import { MessageBubble } from "./MessageBubble";
import type { ChatContainerProps } from "@/types/chat";

export function ChatContainer({ messages, isLoading }: ChatContainerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div
      ref={scrollRef}
      className="h-full overflow-y-auto px-4 py-6"
    >
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full p-8">
          <div className="text-center space-y-6 max-w-2xl">
            <div className="w-16 h-16 mx-auto rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
              <span className="text-2xl">🤖</span>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Welcome to Scout Agent</h2>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                Your intelligent data analysis assistant
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
              <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors cursor-pointer">
                <div className="text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">📊 Data Analysis</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  "Show me the top 5 creators by revenue"
                </div>
              </div>
              <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors cursor-pointer">
                <div className="text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">📈 Visualizations</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  "Create a chart of sales trends over time"
                </div>
              </div>
              <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors cursor-pointer">
                <div className="text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">🔍 Insights</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  "What are the key patterns in my data?"
                </div>
              </div>
              <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors cursor-pointer">
                <div className="text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">💡 Questions</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  "Help me understand customer behavior"
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400">
              Start by typing a question or click on one of the examples above
            </p>
          </div>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          {isLoading && (
            <div className="flex items-start space-x-3 mb-6">
              <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Scout</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">is thinking...</span>
                </div>
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
