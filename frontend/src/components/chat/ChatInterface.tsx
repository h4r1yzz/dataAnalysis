"use client";

import { useState, useCallback } from "react";
import { ChatContainer } from "./ChatContainer";
import { ChatInput } from "./ChatInput";
import { useChatState } from "@/hooks/useChatState";
import type { ChatMessage } from "@/types/chat";

export function ChatInterface() {
  const { messages, isLoading, error, sendMessage } = useChatState();

  const handleSendMessage = useCallback(async (content: string) => {
    await sendMessage(content);
  }, [sendMessage]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-hidden">
        <ChatContainer
          messages={messages}
          isLoading={isLoading}
          onSendMessage={handleSendMessage}
        />
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <ChatInput
            onSendMessage={handleSendMessage}
            disabled={isLoading}
            placeholder="Ask Scout anything about your data..."
          />
          {error && (
            <div className="mt-3 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="text-sm text-red-900 dark:text-red-100">
                {error}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
