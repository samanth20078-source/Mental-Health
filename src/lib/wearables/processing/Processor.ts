import { SensorDataPacket } from '../types.ts';
import { ProcessedFeature } from './types.ts';
import { PPGPipeline } from './pipelines/PPGPipeline.ts';
import { HeartRatePipeline } from './pipelines/HeartRatePipeline.ts';
import { HRVPipeline } from './pipelines/HRVPipeline.ts';
import { EDAPipeline } from './pipelines/EDAPipeline.ts';
import { TemperaturePipeline } from './pipelines/TemperaturePipeline.ts';

export class SignalProcessor {
  private pipelines = {
    ppg: new PPGPipeline(),
    hr: new HeartRatePipeline(),
    hrv: new HRVPipeline(),
    eda: new EDAPipeline(),
    temp: new TemperaturePipeline()
  };

  /**
   * Main entry point for physiological processing.
   * Takes raw buffered packets and routes them to appropriate analysis pipelines.
   */
  public processBuffer(buffer: SensorDataPacket[]): ProcessedFeature[] {
    if (!buffer || buffer.length === 0) return [];

    let allFeatures: ProcessedFeature[] = [];

    // Route based on sensor type. Note that a single sensor (e.g. PPG) 
    // can drive multiple pipelines (PPG, HR, HRV).
    
    const ppgPackets = buffer.filter(p => p.sensorType === 'PPG');
    if (ppgPackets.length > 0) {
      allFeatures = allFeatures.concat(this.pipelines.ppg.process(ppgPackets));
      allFeatures = allFeatures.concat(this.pipelines.hr.process(ppgPackets));
      allFeatures = allFeatures.concat(this.pipelines.hrv.process(ppgPackets));
    }

    const edaPackets = buffer.filter(p => p.sensorType === 'EDA_GSR');
    if (edaPackets.length > 0) {
      allFeatures = allFeatures.concat(this.pipelines.eda.process(edaPackets));
    }

    const tempPackets = buffer.filter(p => p.sensorType === 'SKIN_TEMPERATURE');
    if (tempPackets.length > 0) {
      allFeatures = allFeatures.concat(this.pipelines.temp.process(tempPackets));
    }

    return allFeatures;
  }
}

export const signalProcessor = new SignalProcessor();
