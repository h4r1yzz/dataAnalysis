/**
 * TypeScript types for the Scout chat interface
 */

export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'tool_call' | 'error' | 'visualization';
  content: string;
  timestamp: Date;
  threadId?: string;
  toolName?: string; // For tool_call messages
  isStreaming?: boolean; // For assistant messages that are still being streamed
  visualizationData?: PlotlyFigure; // For visualization messages
}

export interface PlotlyFigure {
  data: any[];
  layout: any;
}

export interface ChatState {
  messages: ChatMessage[];
  threadId: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface StreamEvent {
  type: 'thread_id' | 'content' | 'complete' | 'error' | 'tool_call';
  thread_id?: string;
  content?: string;
  error?: string;
  tool_name?: string;
}

export interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export interface MessageProps {
  message: ChatMessage;
}

export interface ChatContainerProps {
  messages: ChatMessage[];
  isLoading?: boolean;
}
