"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { PlotlyChart } from "@/components/ui/plotly-chart";
import type { MessageProps, PlotlyData, VisualizationMetadata } from "@/types/chat";

// Helper function to extract visualization names from message content
function extractVisualizationNames(content: string): string[] {
  const patterns = [
    /Visualization '([^']+)' created successfully/g,
    /Visualization "([^"]+)" created successfully/g,
    /saved to output\/([^.]+)\.json/g,
  ];

  const names: string[] = [];
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      names.push(match[1]);
    }
  });

  // Enhanced detection for common visualization scenarios
  const lowerContent = content.toLowerCase();

  // Look for specific visualization indicators and map to likely filenames
  if (lowerContent.includes('revenue over time') || lowerContent.includes('cumulative revenue')) {
    names.push('top_creators_revenue_over_time');
  }
  if (lowerContent.includes('top creators by revenue') || lowerContent.includes('creators by total revenue')) {
    names.push('top_creators_revenue');
  }
  if (lowerContent.includes('line plot') && lowerContent.includes('creator')) {
    names.push('top_creators_revenue_over_time');
  }

  // Generic patterns for when Scout mentions creating visualizations
  if (lowerContent.includes('created a') && (lowerContent.includes('plot') || lowerContent.includes('chart') || lowerContent.includes('visualization'))) {
    // Try common naming patterns
    if (lowerContent.includes('creator') && lowerContent.includes('revenue')) {
      if (lowerContent.includes('time') || lowerContent.includes('over')) {
        names.push('top_creators_revenue_over_time');
      } else {
        names.push('top_creators_revenue');
      }
    }
  }

  // Add debug logging
  if (names.length > 0) {
    console.log('Detected visualization names from content:', names);
    console.log('Content snippet:', content.substring(0, 200) + '...');
  }

  return [...new Set(names)]; // Remove duplicates
}

// Component for displaying a single visualization
function VisualizationDisplay({ name }: { name: string }) {
  const [plotData, setPlotData] = useState<PlotlyData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVisualization = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log(`Attempting to fetch visualization: ${name}`);
      const response = await fetch(`http://localhost:8000/visualizations/${name}`);

      if (!response.ok) {
        throw new Error(`Failed to load visualization: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`Successfully loaded visualization data for: ${name}`, data);
      setPlotData(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load visualization';
      setError(errorMessage);
      console.error('Error fetching visualization:', err);
    } finally {
      setIsLoading(false);
    }
  }, [name]);

  useEffect(() => {
    fetchVisualization();
  }, [fetchVisualization]);

  if (isLoading) {
    return (
      <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-blue-600 rounded-full animate-pulse"></div>
          <span className="text-sm text-gray-600 dark:text-gray-400">Loading visualization...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-3 p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <span className="text-yellow-600 dark:text-yellow-400">📊</span>
            <span className="text-sm text-yellow-900 dark:text-yellow-100 font-medium">
              Visualization Not Available
            </span>
          </div>
          <div className="text-xs text-yellow-700 dark:text-yellow-300">
            The chart "{name}" was mentioned but the file is not accessible. This might happen if:
          </div>
          <ul className="text-xs text-yellow-700 dark:text-yellow-300 ml-4 space-y-1">
            <li>• The visualization generation failed</li>
            <li>• The backend server is not running</li>
            <li>• The file was created with a different name</li>
          </ul>
          <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
            Error: {error}
          </div>
        </div>
      </div>
    );
  }

  if (!plotData) {
    return null;
  }

  return (
    <div className="mt-3">
      <div className="mb-2">
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
          📊 {name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </span>
      </div>
      <PlotlyChart
        data={plotData}
        className="max-w-full"
        onError={(err) => setError(err.message)}
      />
    </div>
  );
}

export function MessageBubble({ message }: MessageProps) {
  const isUser = message.type === "user";
  const isError = message.type === "error";
  const isToolCall = message.type === "tool_call";

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

  // Extract visualization names from assistant messages
  const visualizationNames = !isUser && !isError && !message.isStreaming
    ? extractVisualizationNames(message.content)
    : [];

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

            {/* Render visualizations if any are detected */}
            {visualizationNames.length > 0 && (
              <div className="space-y-3">
                {visualizationNames.map((name, index) => (
                  <VisualizationDisplay key={`${name}-${index}`} name={name} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
