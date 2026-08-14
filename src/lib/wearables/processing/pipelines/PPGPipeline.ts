import { SensorDataPacket } from '../../types.ts';
import { BasePipeline } from '../BasePipeline.ts';
import { ProcessedFeature } from '../types.ts';

export class PPGPipeline extends BasePipeline {
  public readonly version = '1.0.0';
  protected readonly featureName = 'PPG_RAW_FILTERED';
  protected readonly unit = 'mV';
  protected readonly targetSensor = 'PPG';

  protected extractFeatures(packets: SensorDataPacket[]): ProcessedFeature[] {
    const features: ProcessedFeature[] = [];

    // Conceptually applies bandpass filter to raw PPG values to remove baseline wander
    for (const packet of packets) {
      if (!packet.values || packet.values.length === 0) continue;
      
      // Since this is a raw signal pipeline, we might output the first value or an average
      // For architecture, we'll output the mean of the packet's window as a placeholder for
      // actual high-frequency signal pass-through.
      const meanAmplitude = packet.values.reduce((a, b) => a + b, 0) / packet.values.length;
      
      const quality = packet.signalQuality === 'POOR' ? 'UNRELIABLE' : 'GOOD';
      
      features.push(this.createFeature(meanAmplitude, packet, quality));
    }

    return features;
  }
}
