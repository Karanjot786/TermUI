/**
 * AI-Powered Layout Optimizer Types
 */

export interface Interaction {
  widgetId: string;
  type: 'focus' | 'click' | 'resize' | 'move';
  timestamp: number;
  duration?: number;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
}

export interface WidgetUsage {
  id: string;
  type: string;
  frequency: number;
  avgDuration: number;
  lastUsed: number;
  priority: number;
  position: { x: number; y: number };
  size: { width: number; height: number };
}

export interface LayoutPreferences {
  theme: 'dark' | 'light' | 'auto';
  fontSize: number;
  contrast: number;
  density: 'compact' | 'comfortable' | 'spacious';
  arrangement: string;
  customizations: Record<string, any>;
}

export interface PredictionResult {
  widgetId: string;
  confidence: number;
  suggestedPosition: { x: number; y: number };
  suggestedSize: { width: number; height: number };
  reason: string;
  alternatives: Array<{
    position: { x: number; y: number };
    score: number;
  }>;
}

export interface AdaptiveLayoutOptions {
  learningRate?: number;
  personalization?: 'light' | 'moderate' | 'aggressive';
  accessibility?: {
    contrast?: 'auto' | 'high' | 'low';
    textSize?: 'adaptive' | 'fixed';
  };
  predictions?: {
    show?: number;
    confidence?: number;
    preload?: boolean;
  };
  privacy?: {
    anonymize?: boolean;
    localOnly?: boolean;
    retention?: number;
  };
}

export interface MLModelConfig {
  type: 'regression' | 'classification' | 'reinforcement';
  features: string[];
  learningRate: number;
  epochs: number;
  batchSize: number;
  validationSplit: number;
}

export interface TrainingData {
  features: number[][];
  labels: number[][];
  widgetIds: string[];
  timestamps: number[];
}