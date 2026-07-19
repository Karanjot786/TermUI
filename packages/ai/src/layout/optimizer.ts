/**
 * Layout Optimizer
 * Uses ML predictions to optimize widget layouts
 */

import { EventEmitter } from 'events';
import { InteractionTracker } from '../tracking/interaction-tracker';
import { LayoutModel } from '../models/layout-model';
import { PredictionResult, AdaptiveLayoutOptions, WidgetUsage } from '../types';

export interface LayoutScore {
  widgetId: string;
  score: number;
  position: { x: number; y: number };
  size: { width: number; height: number };
  reasons: string[];
}

export class LayoutOptimizer extends EventEmitter {
  private tracker: InteractionTracker;
  private model: LayoutModel;
  private options: AdaptiveLayoutOptions;
  private layoutScores: Map<string, LayoutScore> = new Map();
  private optimizationHistory: any[] = [];

  constructor(
    tracker: InteractionTracker,
    model: LayoutModel,
    options: AdaptiveLayoutOptions
  ) {
    super();
    this.tracker = tracker;
    this.model = model;
    this.options = options;
    
    // Listen to tracker events
    this.tracker.on('learningReady', async (data) => {
      await this.optimize(data);
    });
  }

  /**
   * Optimize layout based on usage data
   */
  async optimize(data?: any): Promise<LayoutScore[]> {
    if (!data) {
      data = this.tracker.getTrainingData();
    }

    if (data.features.length < 5) {
      return [];
    }

    // Get predictions
    const predictions = await this.model.predict(data.features[0]);

    // Score each widget
    const scores = this.scoreWidgets(predictions);

    // Update layout
    this.applyOptimizations(scores);

    this.emit('layoutOptimized', {
      scores,
      timestamp: Date.now(),
      metrics: this.getMetrics()
    });

    return scores;
  }

  /**
   * Score widgets based on predictions
   */
  private scoreWidgets(predictions: PredictionResult[]): LayoutScore[] {
    const scores: LayoutScore[] = [];
    const usages = this.tracker.getWidgetSummary();

    for (const usage of usages) {
      const prediction = predictions.find(p => p.widgetId === usage.id);
      if (!prediction) continue;

      const score = this.calculateScore(usage, prediction);
      scores.push({
        widgetId: usage.id,
        score: score,
        position: prediction.suggestedPosition,
        size: prediction.suggestedSize,
        reasons: [
          `Usage frequency: ${usage.frequency}`,
          `Priority: ${(usage.priority * 100).toFixed(1)}%`,
          `Confidence: ${(prediction.confidence * 100).toFixed(1)}%`
        ]
      });
    }

    return scores.sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate score for a widget
   */
  private calculateScore(usage: WidgetUsage, prediction: PredictionResult): number {
    // Base score from usage
    const usageScore = usage.priority * 0.6;
    
    // Confidence score from prediction
    const confidenceScore = prediction.confidence * 0.3;
    
    // Position score (prefer positions with less overlap)
    const positionScore = this.scorePosition(prediction.suggestedPosition) * 0.1;
    
    return usageScore + confidenceScore + positionScore;
  }

  /**
   * Score a position based on overlap and screen space
   */
  private scorePosition(position: { x: number; y: number }): number {
    // Simulate position scoring
    const screenCenter = { x: 50, y: 50 };
    const distance = Math.sqrt(
      Math.pow(position.x - screenCenter.x, 2) +
      Math.pow(position.y - screenCenter.y, 2)
    );
    
    return Math.max(0, 1 - distance / 100);
  }

  /**
   * Apply layout optimizations
   */
  private applyOptimizations(scores: LayoutScore[]): void {
    const topScores = scores.slice(0, 5);
    
    for (const score of topScores) {
      // Update layout
      this.layoutScores.set(score.widgetId, score);
      
      // Emit widget update event
      this.emit('widgetOptimized', {
        widgetId: score.widgetId,
        position: score.position,
        size: score.size,
        score: score.score
      });
    }
  }

  /**
   * Get layout metrics
   */
  getMetrics(): any {
    const scores = Array.from(this.layoutScores.values());
    const avgScore = scores.reduce((sum, s) => sum + s.score, 0) / scores.length;

    return {
      totalWidgets: this.layoutScores.size,
      averageScore: avgScore,
      highPriorityWidgets: scores.filter(s => s.score > 0.7).length,
      optimizationCount: this.optimizationHistory.length
    };
  }

  /**
   * Get recommended layout
   */
  getRecommendedLayout(): any {
    const scores = Array.from(this.layoutScores.values())
      .sort((a, b) => b.score - a.score);

    return {
      widgets: scores.map(score => ({
        id: score.widgetId,
        position: score.position,
        size: score.size,
        priority: score.score > 0.7 ? 'high' : 
                 score.score > 0.4 ? 'medium' : 'low'
      })),
      totalScore: scores.reduce((sum, s) => sum + s.score, 0),
      suggestions: this.generateSuggestions(scores)
    };
  }

  /**
   * Generate optimization suggestions
   */
  private generateSuggestions(scores: LayoutScore[]): string[] {
    const suggestions: string[] = [];
    
    if (scores.length === 0) {
      suggestions.push('No widgets to optimize yet. Use the app more to gather data.');
      return suggestions;
    }

    const topWidget = scores[0];
    suggestions.push(`⭐ Suggested moving "${topWidget.widgetId}" to top priority position`);

    const lowScoreWidgets = scores.filter(s => s.score < 0.3);
    if (lowScoreWidgets.length > 0) {
      suggestions.push(`📉 ${lowScoreWidgets.length} widgets have low usage. Consider removing or minimizing them.`);
    }

    suggestions.push(`🎯 Confidence in predictions: ${(this.model.getSummary().accuracy * 100).toFixed(1)}%`);

    return suggestions;
  }

  /**
   * Reset optimization history
   */
  reset(): void {
    this.layoutScores.clear();
    this.optimizationHistory = [];
    this.emit('reset');
  }
}