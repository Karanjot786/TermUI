/**
 * ML Model for Layout Optimization
 * Uses TensorFlow.js for on-device learning
 */

import * as tf from '@tensorflow/tfjs';
import { TrainingData, PredictionResult, MLModelConfig } from '../types';
import { EventEmitter } from 'events';

export class LayoutModel extends EventEmitter {
  private model: tf.LayersModel | null = null;
  private isTraining = false;
  private config: MLModelConfig;
  private trainingData: TrainingData[] = [];
  private accuracy = 0;

  constructor(config: Partial<MLModelConfig> = {}) {
    super();
    this.config = {
      type: 'regression',
      features: ['frequency', 'duration', 'position_x', 'position_y', 'width', 'height', 'recency', 'priority'],
      learningRate: 0.01,
      epochs: 50,
      batchSize: 32,
      validationSplit: 0.2,
      ...config
    };
  }

  /**
   * Initialize the model
   */
  async initialize(): Promise<void> {
    if (this.model) return;

    const inputShape = this.config.features.length;

    this.model = tf.sequential({
      layers: [
        tf.layers.dense({
          units: 64,
          activation: 'relu',
          inputShape: [inputShape]
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({
          units: 32,
          activation: 'relu'
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({
          units: 16,
          activation: 'relu'
        }),
        tf.layers.dense({
          units: 2, // x, y position
          activation: 'sigmoid'
        })
      ]
    });

    const optimizer = tf.train.adam(this.config.learningRate);
    this.model.compile({
      optimizer,
      loss: 'meanSquaredError',
      metrics: ['mae']
    });

    console.log('✅ AI Model initialized');
  }

  /**
   * Train the model
   */
  async train(data: TrainingData): Promise<any> {
    if (this.isTraining) return;
    if (data.features.length < 10) {
      throw new Error('Not enough training data. Need at least 10 samples.');
    }

    this.isTraining = true;
    this.emit('trainingStart');

    try {
      const xs = tf.tensor2d(data.features);
      const ys = tf.tensor2d(data.labels);

      const result = await this.model!.fit(xs, ys, {
        epochs: this.config.epochs,
        batchSize: this.config.batchSize,
        validationSplit: this.config.validationSplit,
        shuffle: true,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            this.emit('trainingProgress', { epoch, logs });
            if (epoch % 10 === 0) {
              console.log(`Epoch ${epoch}: loss = ${logs?.loss?.toFixed(4)}`);
            }
          }
        }
      });

      this.trainingData.push(data);
      this.accuracy = this.calculateAccuracy(result);

      this.emit('trainingComplete', {
        accuracy: this.accuracy,
        history: result.history
      });

      // Clean up tensors
      xs.dispose();
      ys.dispose();

      return result;
    } catch (error) {
      this.emit('trainingError', error);
      throw error;
    } finally {
      this.isTraining = false;
    }
  }

  /**
   * Predict optimal layout
   */
  async predict(features: number[]): Promise<PredictionResult[]> {
    if (!this.model) {
      throw new Error('Model not initialized. Call initialize() first.');
    }

    if (this.trainingData.length === 0) {
      return [];
    }

    try {
      const input = tf.tensor2d([features]);
      const prediction = this.model.predict(input) as tf.Tensor;
      const result = await prediction.data();
      
      // Convert to prediction results
      const predictions: PredictionResult[] = [];
      const numPredictions = Math.min(result.length / 2, 5);
      
      for (let i = 0; i < numPredictions; i++) {
        const x = result[i * 2] * 100;
        const y = result[i * 2 + 1] * 100;
        
        predictions.push({
          widgetId: `widget_${i}`,
          confidence: this.accuracy || 0.7,
          suggestedPosition: { x, y },
          suggestedSize: { width: 20, height: 10 },
          reason: `Predicted optimal position based on usage patterns`,
          alternatives: this.generateAlternatives({ x, y })
        });
      }

      // Clean up tensors
      input.dispose();
      prediction.dispose();

      return predictions;
    } catch (error) {
      console.error('Prediction error:', error);
      return [];
    }
  }

  /**
   * Generate alternatives for a position
   */
  private generateAlternatives(position: { x: number; y: number }): Array<{ position: { x: number; y: number }; score: number }> {
    const alternatives = [
      { x: position.x - 10, y: position.y },
      { x: position.x + 10, y: position.y },
      { x: position.x, y: position.y - 10 },
      { x: position.x, y: position.y + 10 }
    ];

    return alternatives.map(pos => ({
      position: pos,
      score: Math.random() * 0.5 + 0.5 // Simulated score
    }));
  }

  /**
   * Calculate accuracy
   */
  private calculateAccuracy(result: any): number {
    const loss = result.history?.loss?.[result.history.loss.length - 1] || 1;
    return Math.max(0, Math.min(1, 1 - loss));
  }

  /**
   * Get model summary
   */
  getSummary(): any {
    if (!this.model) {
      return { initialized: false };
    }

    return {
      initialized: true,
      layers: this.model.layers.length,
      trainingSamples: this.trainingData.reduce((sum, d) => sum + d.features.length, 0),
      accuracy: this.accuracy,
      config: this.config
    };
  }

  /**
   * Save model
   */
  async save(path: string): Promise<void> {
    if (!this.model) return;
    await this.model.save(`file://${path}`);
  }

  /**
   * Load model
   */
  async load(path: string): Promise<void> {
    this.model = await tf.loadLayersModel(`file://${path}`);
  }

  /**
   * Dispose model
   */
  dispose(): void {
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
  }
}