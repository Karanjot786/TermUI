/**
 * Adaptive Container Component
 * Applies AI-optimized layout to children
 */

import React, { useState, useEffect, useRef } from 'react';
import { useAdaptiveLayout } from '../hooks/useAdaptiveLayout';
import { LayoutOptimizer } from '../layout/optimizer';
import { AdaptiveLayoutOptions } from '../types';

interface AdaptiveContainerProps {
  children: React.ReactNode;
  strategy?: 'optimize' | 'balanced' | 'conservative';
  options?: AdaptiveLayoutOptions;
  onLayoutChange?: (layout: any) => void;
}

export function AdaptiveContainer({
  children,
  strategy = 'optimize',
  options = {},
  onLayoutChange
}: AdaptiveContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<any>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  
  const layoutConfig = useAdaptiveLayout(options);

  useEffect(() => {
    if (!containerRef.current) return;

    // Track container dimensions
    const resizeObserver = new ResizeObserver(() => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        layoutConfig.updateDimensions(rect.width, rect.height);
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [layoutConfig]);

  useEffect(() => {
    // Apply layout when it changes
    if (layout) {
      onLayoutChange?.(layout);
    }
  }, [layout, onLayoutChange]);

  /**
   * Optimize layout
   */
  const optimizeLayout = async () => {
    setIsOptimizing(true);
    try {
      const result = await layoutConfig.optimizer.optimize();
      setLayout(result);
    } catch (error) {
      console.error('Layout optimization failed:', error);
    } finally {
      setIsOptimizing(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`adaptive-container strategy-${strategy}`}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden'
      }}
    >
      {/* Layout statistics overlay */}
      {layoutConfig.showStats && (
        <div className="layout-stats" style={{
          position: 'absolute',
          top: 10,
          right: 10,
          background: 'rgba(0,0,0,0.7)',
          color: '#fff',
          padding: 8,
          borderRadius: 4,
          fontSize: 12,
          zIndex: 9999,
          pointerEvents: 'none'
        }}>
          <div>Widgets: {layoutConfig.widgetCount}</div>
          <div>FPS: {layoutConfig.fps.toFixed(1)}</div>
          <div>Confidence: {layoutConfig.confidence}%</div>
        </div>
      )}

      {/* Optimize button */}
      <button
        onClick={optimizeLayout}
        disabled={isOptimizing}
        style={{
          position: 'absolute',
          bottom: 10,
          right: 10,
          padding: '8px 16px',
          background: isOptimizing ? '#666' : '#007bff',
          color: '#fff',
          border: 'none',
          borderRadius: 4,
          cursor: isOptimizing ? 'default' : 'pointer',
          zIndex: 9999
        }}
      >
        {isOptimizing ? 'Optimizing...' : '✨ Optimize Layout'}
      </button>

      {/* Children with layout */}
      <div className="layout-content" style={{
        position: 'relative',
        width: '100%',
        height: '100%'
      }}>
        {React.Children.map(children, (child, index) => {
          const childId = `widget_${index}`;
          const position = layoutConfig.getWidgetPosition(childId);
          
          return (
            <div
              key={childId}
              className="adaptive-widget"
              style={{
                position: 'absolute',
                left: position?.x || 0,
                top: position?.y || 0,
                width: position?.width || 'auto',
                height: position?.height || 'auto',
                transition: layoutConfig.animationEnabled ? 'all 0.3s ease' : 'none'
              }}
            >
              {child}
            </div>
          );
        })}
      </div>
    </div>
  );
}