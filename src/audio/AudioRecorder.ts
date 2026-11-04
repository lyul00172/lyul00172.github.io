/**
 * Microphone & Live Audio Sampler for AKAI MPC Live II
 * Records audio from user's microphone/line-in and converts to AudioBuffer
 */

export class AudioRecorder {
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  public isRecording: boolean = false;
  private ctx: AudioContext;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
  }

  public async startRecording(): Promise<void> {
    if (this.isRecording) return;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Microphone recording is not supported in this browser.');
    }

    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });

    this.audioChunks = [];
    this.mediaRecorder = new MediaRecorder(this.mediaStream);

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.start();
    this.isRecording = true;
  }

  public async stopRecording(): Promise<AudioBuffer> {
    if (!this.mediaRecorder || !this.isRecording) {
      throw new Error('Recorder is not active');
    }

    return new Promise((resolve, reject) => {
      this.mediaRecorder!.onstop = async () => {
        try {
          const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm;codecs=opus' });
          const arrayBuffer = await audioBlob.arrayBuffer();
          const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);

          // Stop all mic tracks
          if (this.mediaStream) {
            this.mediaStream.getTracks().forEach((track) => track.stop());
            this.mediaStream = null;
          }

          this.isRecording = false;
          resolve(audioBuffer);
        } catch (err) {
          reject(err);
        }
      };

      this.mediaRecorder!.stop();
    });
  }

  public cancelRecording(): void {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    this.isRecording = false;
  }
}
