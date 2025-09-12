"use client";

import React, { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import type { PlotlyChartProps, PlotlyData } from "@/types/chat";

// Dynamically import Plotly to avoid SSR issues
const Plot = dynamic(() => import("react-plotly.js"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center space-x-2">
        <div className="w-4 h-4 bg-blue-600 rounded-full animate-pulse"></div>
        <div className="w-4 h-4 bg-blue-600 rounded-full animate-pulse delay-75"></div>
        <div className="w-4 h-4 bg-blue-600 rounded-full animate-pulse delay-150"></div>
      </div>
    </div>
  ),
});

interface PlotlyChartState {
  isLoading: boolean;
  error: string | null;
  plotData: PlotlyData | null;
}

export function PlotlyChart({ data, className, onError }: PlotlyChartProps) {
  const [state, setState] = useState<PlotlyChartState>({
    isLoading: true,
    error: null,
    plotData: null,
  });

  useEffect(() => {
    try {
      // Validate the data structure
      if (!data || !data.data || !Array.isArray(data.data)) {
        throw new Error("Invalid Plotly data structure");
      }

      if (!data.layout || typeof data.layout !== "object") {
        throw new Error("Invalid Plotly layout structure");
      }

      setState({
        isLoading: false,
        error: null,
        plotData: data,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to load chart";
      setState({
        isLoading: false,
        error: errorMessage,
        plotData: null,
      });
      
      if (onError) {
        onError(error instanceof Error ? error : new Error(errorMessage));
      }
    }
  }, [data, onError]);

  const handlePlotlyError = useCallback((error: any) => {
    const errorMessage = "Failed to render chart";
    setState(prev => ({
      ...prev,
      error: errorMessage,
      isLoading: false,
    }));
    
    if (onError) {
      onError(new Error(errorMessage));
    }
  }, [onError]);

  if (state.isLoading) {
    return (
      <div className={cn(
        "flex items-center justify-center h-64 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700",
        className
      )}>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-blue-600 rounded-full animate-pulse"></div>
          <div className="w-4 h-4 bg-blue-600 rounded-full animate-pulse delay-75"></div>
          <div className="w-4 h-4 bg-blue-600 rounded-full animate-pulse delay-150"></div>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className={cn(
        "flex items-center justify-center h-64 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800",
        className
      )}>
        <div className="text-center space-y-2">
          <div className="text-red-600 dark:text-red-400">
            <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-sm text-red-900 dark:text-red-100 font-medium">
            Chart Error
          </div>
          <div className="text-xs text-red-700 dark:text-red-300">
            {state.error}
          </div>
        </div>
      </div>
    );
  }

  if (!state.plotData) {
    return null;
  }

  // Default configuration for responsive charts
  const defaultConfig = {
    responsive: true,
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToRemove: [
      'pan2d',
      'lasso2d',
      'select2d',
      'autoScale2d',
      'hoverClosestCartesian',
      'hoverCompareCartesian',
      'toggleSpikelines'
    ],
    ...state.plotData.config,
  };

  // Ensure layout is responsive and follows design system
  const enhancedLayout = {
    ...state.plotData.layout,
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: {
      family: 'var(--font-geist-sans), system-ui, sans-serif',
      size: 12,
      color: 'rgb(55, 65, 81)', // text-gray-700
      ...state.plotData.layout.font,
    },
    margin: {
      l: 60,
      r: 40,
      t: 60,
      b: 60,
      ...state.plotData.layout.margin,
    },
  };

  return (
    <div className={cn(
      "w-full bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden",
      className
    )}>
      <Plot
        data={state.plotData.data}
        layout={enhancedLayout}
        config={defaultConfig}
        style={{ width: '100%', height: '100%' }}
        useResizeHandler={true}
        onError={handlePlotlyError}
        className="min-h-[400px]"
      />
    </div>
  );
}
