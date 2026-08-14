import { SensorDataPacket } from '../../types.ts';
import { BasePipeline } from '../BasePipeline.ts';
import { ProcessedFeature } from '../types.ts';

export class TemperaturePipeline extends BasePipeline {
  public readonly version = '1.0.0';
  protected readonly featureName = 'SKIN_TEMPERATURE_MEAN';
  protected readonly unit = 'C';
  protected readonly targetSensor = 'SKIN_TEMPERATURE';

  protected extractFeatures(packets: SensorDataPacket[]): ProcessedFeature[] {
    const features: ProcessedFeature[] = [];

    for (const packet of packets) {
      if (!packet.values || packet.values.length === 0) continue;
      
      const meanValue = packet.values.reduce((a, b) => a + b, 0) / packet.values.length;
      
      // Clinical/physiological bounds for skin temp (approx 20C to 45C)
      const quality = this.evaluateQuality(packet.signalQuality, meanValue, 20, 45);
      
      features.push(this.createFeature(meanValue, packet, quality));
    }

    return features;
  }
}
