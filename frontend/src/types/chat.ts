/**
 * TypeScript types for the Scout chat interface
 */

export interface PlotlyData {
  data: any[];
  layout: any;
  config?: any;
}

export interface VisualizationMetadata {
  filename: string;
  name: string;
  created: Date;
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'tool_call' | 'error';
  content: string;
  timestamp: Date;
  threadId?: string;
  toolName?: string; // For tool_call messages
  isStreaming?: boolean; // For assistant messages that are still being streamed
  visualizations?: VisualizationMetadata[]; // For messages that contain visualizations
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
  onSendMessage?: (message: string) => void;
}

export interface PlotlyChartProps {
  data: PlotlyData;
  className?: string;
  onError?: (error: Error) => void;
}
