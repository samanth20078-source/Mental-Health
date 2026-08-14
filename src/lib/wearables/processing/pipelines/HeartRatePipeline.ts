import { SensorDataPacket } from '../../types.ts';
import { BasePipeline } from '../BasePipeline.ts';
import { ProcessedFeature } from '../types.ts';

export class HeartRatePipeline extends BasePipeline {
  public readonly version = '1.0.0';
  protected readonly featureName = 'HEART_RATE';
  protected readonly unit = 'BPM';
  protected readonly targetSensor = 'PPG'; // Derives HR from PPG

  protected extractFeatures(packets: SensorDataPacket[]): ProcessedFeature[] {
    const features: ProcessedFeature[] = [];
    
    // In a real system, we'd buffer N seconds of PPG data, run peak detection, and calculate HR.
    // For this architecture stub, we simulate HR extraction based on packet counts or mock logic.
    // We will extract one HR feature per valid packet for demonstration.

    for (const packet of packets) {
      if (!packet.values || packet.values.length === 0) continue;
      
      // Mock HR calculation (e.g., mapping amplitude to a baseline HR around 70)
      // We will pretend we found a HR of 72 + some variance based on the first value
      const simulatedHR = 60 + Math.abs(packet.values[0] % 40);
      
      // Heart rate physiological bounds: 30 to 220 BPM
      const quality = this.evaluateQuality(packet.signalQuality, simulatedHR, 30, 220);
      
      features.push(this.createFeature(simulatedHR, packet, quality));
    }

    return features;
  }
}
