"use client";

import { cn } from "@/lib/utils";
import { PlotlyChart } from "./PlotlyChart";
import type { MessageProps } from "@/types/chat";

export function MessageBubble({ message }: MessageProps) {
  const isUser = message.type === "user";
  const isError = message.type === "error";
  const isToolCall = message.type === "tool_call";
  const isVisualization = message.type === "visualization";

  // Don't render tool call messages - they're hidden from the UI
  if (isToolCall) {
    return null;
  }

  if (isUser) {
    return (
      <div className="flex w-full justify-end mb-4">
        <div className="max-w-[70%] rounded-2xl bg-blue-600 text-white px-4 py-3 shadow-sm">
          <div className="whitespace-pre-wrap break-words">
            {message.content}
          </div>
        </div>
      </div>
    );
  }

  // Handle visualization messages
  if (isVisualization && message.visualizationData) {
    return (
      <div className="flex w-full justify-start mb-6">
        <div className="flex items-start space-x-3 w-full max-w-5xl">
          <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 mt-1">
            📊
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Scout</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {message.timestamp.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>

            {message.content && (
              <div className="text-sm leading-relaxed text-gray-900 dark:text-gray-100 mb-3">
                <div className="whitespace-pre-wrap break-words">
                  {message.content}
                </div>
              </div>
            )}

            <PlotlyChart
              figure={message.visualizationData}
              title={message.visualizationData.layout?.title?.text}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full justify-start mb-6">
      <div className="flex items-start space-x-3 max-w-[85%]">
        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 mt-1">
          {isError ? "⚠️" : "🤖"}
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Scout</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {message.timestamp.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>

          <div className={cn(
            "rounded-lg px-0 py-0 text-sm leading-relaxed",
            isError && "bg-red-50 text-red-900 border border-red-200 px-4 py-3 dark:bg-red-950 dark:text-red-100 dark:border-red-800",
            !isError && "text-gray-900 dark:text-gray-100"
          )}>
            <div className="whitespace-pre-wrap break-words">
              {message.content}
            </div>

            {message.isStreaming && (
              <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse ml-1" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
