import { SensorDataPacket } from '../../types.ts';
import { BasePipeline } from '../BasePipeline.ts';
import { ProcessedFeature } from '../types.ts';

export class HRVPipeline extends BasePipeline {
  public readonly version = '1.0.0';
  protected readonly featureName = 'HRV_RMSSD';
  protected readonly unit = 'ms';
  protected readonly targetSensor = 'PPG'; // Derives HRV from PPG peak intervals

  protected extractFeatures(packets: SensorDataPacket[]): ProcessedFeature[] {
    const features: ProcessedFeature[] = [];
    
    // In a real system, we'd calculate RMSSD over a 30s-5min window.
    for (const packet of packets) {
      if (!packet.values || packet.values.length === 0) continue;
      
      // Mock HRV (RMSSD) calculation
      const simulatedRMSSD = 20 + Math.abs(packet.values[0] % 60);
      
      // HRV RMSSD physiological bounds: 5ms to 200ms
      const quality = this.evaluateQuality(packet.signalQuality, simulatedRMSSD, 5, 200);
      
      features.push(this.createFeature(simulatedRMSSD, packet, quality));
    }

    return features;
  }
}
