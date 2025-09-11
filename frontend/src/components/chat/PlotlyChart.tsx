"use client";

import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import type { PlotlyFigure } from "@/types/chat";

// Dynamically import Plotly to avoid SSR issues
const Plot = dynamic(() => import("react-plotly.js"), { 
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-96 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="text-center space-y-2">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-sm text-gray-600 dark:text-gray-400">Loading visualization...</p>
      </div>
    </div>
  )
});

interface PlotlyChartProps {
  figure: PlotlyFigure;
  title?: string;
}

export function PlotlyChart({ figure, title }: PlotlyChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Ensure responsive layout
  const responsiveLayout = {
    ...figure.layout,
    autosize: true,
    responsive: true,
    margin: {
      l: 60,
      r: 40,
      t: title ? 60 : 40,
      b: 60,
      ...figure.layout.margin
    }
  };

  const config = {
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
    responsive: true
  };

  return (
    <div 
      ref={containerRef}
      className="w-full bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden"
    >
      {title && (
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h3>
        </div>
      )}
      <div className="p-4">
        <Plot
          data={figure.data}
          layout={responsiveLayout}
          config={config}
          style={{ width: '100%', height: '400px' }}
          useResizeHandler={true}
        />
      </div>
    </div>
  );
}
