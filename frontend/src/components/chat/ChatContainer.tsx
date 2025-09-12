"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { MessageBubble } from "./MessageBubble";
import type { ChatContainerProps } from "@/types/chat";

export function ChatContainer({ messages, isLoading, onSendMessage }: ChatContainerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Example queries for the welcome cards
  const exampleQueries = [
    {
      title: "📊 Data Analysis",
      query: "Show me the top 5 creators by revenue"
    },
    {
      title: "📈 Visualizations",
      query: "Create a chart of sales trends over time"
    },
    {
      title: "🔍 Insights",
      query: "What are the key patterns in my data?"
    },
    {
      title: "💡 Questions",
      query: "Help me understand customer behavior"
    }
  ];

  const handleExampleClick = (query: string) => {
    if (onSendMessage) {
      onSendMessage(query);
    }
  };

  return (
    <div
      ref={scrollRef}
      className="h-full overflow-y-auto px-4 py-6"
    >
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full p-8">
          <div className="text-center space-y-6 max-w-2xl">
            <div className="w-16 h-16 mx-auto flex items-center justify-center">
              <Image
                src="/text2query.png"
                alt="Scout Agent Logo"
                width={64}
                height={64}
                className="w-16 h-16 object-contain"
              />
            </div>


            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
              {exampleQueries.map((example, index) => (
                <div
                  key={index}
                  onClick={() => handleExampleClick(example.query)}
                  className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors cursor-pointer"
                >
                  <div className="text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">
                    {example.title}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    "{example.query}"
                  </div>
                </div>
              ))}
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400">
              Click on an example above or type your own question below
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
