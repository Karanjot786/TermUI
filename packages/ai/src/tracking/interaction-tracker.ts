/**
 * Interaction Tracker
 * Tracks user interactions with widgets for ML training
 */

import { EventEmitter } from 'events';
import { Interaction, WidgetUsage, LayoutPreferences } from '../types';

export class InteractionTracker extends EventEmitter {
  private interactions: Interaction[] = [];
  private widgetUsage: Map<string, WidgetUsage> = new Map();
  private sessionId: string;
  private startTime: number;
  private maxInteractions = 10000;
  private preferences: LayoutPreferences = {
    theme: 'auto',
    fontSize: 16,
    contrast: 1,
    density: 'comfortable',
    arrangement: 'default',
    customizations: {}
  };

  constructor() {
    super();
    this.sessionId = this.generateSessionId();
    this.startTime = Date.now();
  }

  /**
   * Track a widget interaction
   */
  trackInteraction(interaction: Interaction): void {
    // Add interaction to history
    this.interactions.push({
      ...interaction,
      timestamp: Date.now()
    });

    // Trim if too many interactions
    if (this.interactions.length > this.maxInteractions) {
      this.interactions.shift();
    }

    // Update widget usage
    this.updateWidgetUsage(interaction);

    // Emit event
    this.emit('interaction', interaction);

    // Check if we should learn
    if (this.interactions.length % 50 === 0) {
      this.emit('learningReady', this.getTrainingData());
    }
  }

  /**
   * Update widget usage statistics
   */
  private updateWidgetUsage(interaction: Interaction): void {
    let usage = this.widgetUsage.get(interaction.widgetId);

    if (!usage) {
      usage = {
        id: interaction.widgetId,
        type: 'unknown',
        frequency: 0,
        avgDuration: 0,
        lastUsed: Date.now(),
        priority: 1,
        position: { x: 0, y: 0 },
        size: { width: 20, height: 10 }
      };
    }

    // Update frequency
    usage.frequency++;

    // Update average duration
    if (interaction.duration) {
      usage.avgDuration = (usage.avgDuration * (usage.frequency - 1) + interaction.duration) / usage.frequency;
    }

    // Update position if available
    if (interaction.position) {
      usage.position = interaction.position;
    }

    // Update size if available
    if (interaction.size) {
      usage.size = interaction.size;
    }

    usage.lastUsed = Date.now();
    usage.priority = this.calculatePriority(usage);

    this.widgetUsage.set(interaction.widgetId, usage);
  }

  /**
   * Calculate widget priority based on usage
   */
  private calculatePriority(usage: WidgetUsage): number {
    const frequencyScore = Math.min(usage.frequency / 10, 1);
    const recencyScore = 1 - Math.min((Date.now() - usage.lastUsed) / (7 * 24 * 60 * 60 * 1000), 1);
    const durationScore = Math.min(usage.avgDuration / 60000, 1);
    
    return (frequencyScore * 0.4 + recencyScore * 0.3 + durationScore * 0.3);
  }

  /**
   * Get training data for ML model
   */
  getTrainingData(): TrainingData {
    const features: number[][] = [];
    const labels: number[][] = [];
    const widgetIds: string[] = [];
    const timestamps: number[] = [];

    for (const [id, usage] of this.widgetUsage) {
      const feature = [
        usage.frequency,
        usage.avgDuration,
        usage.position.x / 100,
        usage.position.y / 100,
        usage.size.width / 100,
        usage.size.height / 100,
        Date.now() - usage.lastUsed,
        usage.priority
      ];
      features.push(feature);
      labels.push([usage.position.x / 100, usage.position.y / 100]);
      widgetIds.push(id);
      timestamps.push(Date.now());
    }

    return {
      features,
      labels,
      widgetIds,
      timestamps
    };
  }

  /**
   * Get widget usage summary
   */
  getWidgetSummary(): WidgetUsage[] {
    return Array.from(this.widgetUsage.values())
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get usage patterns
   */
  getPatterns(): any {
    const usages = this.getWidgetSummary();
    const totalInteractions = this.interactions.length;
    const uniqueWidgets = usages.length;
    const mostUsed = usages.length > 0 ? usages[0] : null;

    return {
      totalInteractions,
      uniqueWidgets,
      mostUsed,
      sessionDuration: Date.now() - this.startTime,
      interactionsPerMinute: totalInteractions / ((Date.now() - this.startTime) / 60000)
    };
  }

  /**
   * Update user preferences
   */
  updatePreferences(preferences: Partial<LayoutPreferences>): void {
    this.preferences = { ...this.preferences, ...preferences };
    this.emit('preferencesUpdated', this.preferences);
  }

  /**
   * Get user preferences
   */
  getPreferences(): LayoutPreferences {
    return this.preferences;
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Export interaction data
   */
  exportData(): any {
    return {
      sessionId: this.sessionId,
      interactions: this.interactions,
      widgetUsage: Array.from(this.widgetUsage.entries()),
      preferences: this.preferences,
      startTime: this.startTime,
      endTime: Date.now()
    };
  }

  /**
   * Import interaction data
   */
  importData(data: any): void {
    this.sessionId = data.sessionId;
    this.interactions = data.interactions || [];
    this.startTime = data.startTime || Date.now();
    this.preferences = data.preferences || this.preferences;
    
    if (data.widgetUsage) {
      this.widgetUsage = new Map(data.widgetUsage);
    }
  }
}