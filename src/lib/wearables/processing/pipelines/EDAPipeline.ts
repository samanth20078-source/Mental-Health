import { SensorDataPacket } from '../../types.ts';
import { BasePipeline } from '../BasePipeline.ts';
import { ProcessedFeature } from '../types.ts';

export class EDAPipeline extends BasePipeline {
  public readonly version = '1.0.0';
  protected readonly featureName = 'EDA_SCL';
  protected readonly unit = 'uS';
  protected readonly targetSensor = 'EDA_GSR';

  protected extractFeatures(packets: SensorDataPacket[]): ProcessedFeature[] {
    const features: ProcessedFeature[] = [];

    for (const packet of packets) {
      if (!packet.values || packet.values.length === 0) continue;
      
      // Skin Conductance Level (SCL) is roughly the mean of the EDA window
      const scl = packet.values.reduce((a, b) => a + b, 0) / packet.values.length;
      
      // EDA should be > 0 and typically < 100 uS. Artifacts often drop it below 0.
      const quality = this.evaluateQuality(packet.signalQuality, scl, 0.01, 100);
      
      features.push(this.createFeature(scl, packet, quality));
    }

    return features;
  }
}
