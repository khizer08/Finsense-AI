export function useAudioRecorder() {
  return {
    isRecording: false,
    elapsedMs: 0,
    recordPath: null,
    startRecording: async () => {},
    stopRecording: async () => null,
    discardRecording: () => {},
  };
}