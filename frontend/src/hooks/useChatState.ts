"use client";

import { useState, useCallback, useRef } from "react";
import type { ChatMessage, ChatState, StreamEvent } from "@/types/chat";

const API_BASE_URL = "http://localhost:8000";

export function useChatState() {
  const [state, setState] = useState<ChatState>({
    messages: [],
    threadId: null,
    isLoading: false,
    error: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const addMessage = useCallback((message: Omit<ChatMessage, "id" | "timestamp">) => {
    const newMessage: ChatMessage = {
      ...message,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, newMessage],
    }));

    return newMessage.id;
  }, []);

  const updateMessage = useCallback((id: string, updates: Partial<ChatMessage>) => {
    setState(prev => ({
      ...prev,
      messages: prev.messages.map(msg => 
        msg.id === id ? { ...msg, ...updates } : msg
      ),
    }));
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (state.isLoading) return;

    // Add user message
    addMessage({
      type: "user",
      content,
      threadId: state.threadId,
    });

    // Set loading state
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    // Create assistant message placeholder
    const assistantMessageId = addMessage({
      type: "assistant",
      content: "",
      threadId: state.threadId,
      isStreaming: true,
    });

    try {
      // Cancel any existing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: content,
          thread_id: state.threadId,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let assistantContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const eventData: StreamEvent = JSON.parse(line.slice(6));
              
              switch (eventData.type) {
                case 'thread_id':
                  setState(prev => ({ ...prev, threadId: eventData.thread_id || null }));
                  break;
                
                case 'content':
                  if (eventData.content) {
                    assistantContent += eventData.content;
                    updateMessage(assistantMessageId, { content: assistantContent });
                  }
                  break;

                case 'tool_call':
                  // Tool calls are now hidden from the UI - just log for debugging
                  if (eventData.tool_name) {
                    console.log(`Scout is using tool: ${eventData.tool_name}`);
                  }
                  break;
                
                case 'complete':
                  updateMessage(assistantMessageId, { isStreaming: false });
                  setState(prev => ({ ...prev, isLoading: false }));
                  break;
                
                case 'error':
                  setState(prev => ({ 
                    ...prev, 
                    error: eventData.error || "An error occurred",
                    isLoading: false 
                  }));
                  updateMessage(assistantMessageId, { 
                    type: "error", 
                    content: eventData.error || "An error occurred",
                    isStreaming: false 
                  });
                  break;
              }
            } catch (e) {
              console.error("Error parsing SSE data:", e);
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Request was aborted, ignore
        return;
      }
      
      const errorMessage = error instanceof Error ? error.message : "An error occurred";
      setState(prev => ({ 
        ...prev, 
        error: errorMessage,
        isLoading: false 
      }));
      
      updateMessage(assistantMessageId, { 
        type: "error", 
        content: errorMessage,
        isStreaming: false 
      });
    }
  }, [state.isLoading, state.threadId, addMessage, updateMessage]);

  return {
    messages: state.messages,
    threadId: state.threadId,
    isLoading: state.isLoading,
    error: state.error,
    sendMessage,
  };
}
