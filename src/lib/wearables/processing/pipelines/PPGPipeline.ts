import { SensorDataPacket } from '../../types.ts';
import { BasePipeline } from '../BasePipeline.ts';
import { ProcessedFeature, ValidityStatus } from '../types.ts';

export class PPGPipeline extends BasePipeline {
  public readonly version = '2.0.0';
  protected readonly featureName = 'PPG_RAW_FILTERED';
  protected readonly unit = 'mV';
  protected readonly targetSensor = 'PPG';

  protected extractFeatures(packets: SensorDataPacket[]): ProcessedFeature[] {
    if (packets.length === 0) return [];
    
    let rawSignal: number[] = [];
    for (const p of packets) {
      if (p.values) rawSignal = rawSignal.concat(p.values);
    }
    
    // Check for clipped signal (assuming 16-bit ADC, typical max is 65535 or similar)
    // For simplicity we flag if too many values are perfectly flat
    let flatlineCount = 0;
    for (let i = 1; i < rawSignal.length; i++) {
      if (rawSignal[i] === rawSignal[i-1]) flatlineCount++;
    }
    
    if (flatlineCount > rawSignal.length * 0.5) {
      return [this.createFeature(0, packets[packets.length - 1], 'UNRELIABLE', { reason: 'Signal clipped or flatlined', isSimulated: packets[0].isSimulated })];
    }
    
    const meanAmplitude = rawSignal.reduce((a, b) => a + b, 0) / rawSignal.length;
    
    const quality = packets[0].signalQuality === 'POOR' ? 'UNRELIABLE' : 'GOOD';
    const validity: ValidityStatus = quality === 'GOOD' ? 'VALID' : 'INVALID';
    const confidence = quality === 'GOOD' ? 100 : 50;

    return [this.createFeature(meanAmplitude, packets[packets.length - 1], quality, { samplesProcessed: rawSignal.length, isSimulated: packets[0].isSimulated })];
  }
}
