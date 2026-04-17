import {useState, useRef, useEffect} from 'react';
import {NativeModules, Platform, PermissionsAndroid} from 'react-native';
import RNFS from 'react-native-fs';

const {AudioRecorder} = NativeModules;

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [recordPath, setRecordPath] = useState(null);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const recordPathRef = useRef(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    try {
      if (Platform.OS !== 'android') {
        throw new Error('Audio recording is currently supported on Android only.');
      }

      if (!AudioRecorder?.start || !AudioRecorder?.stop) {
        throw new Error('Native audio recorder module is not available. Rebuild the Android app.');
      }

      const permissionGranted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone permission',
          message:
            'FinSense AI needs microphone access to record conversations for Gemini analysis.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        },
      );

      if (permissionGranted !== PermissionsAndroid.RESULTS.GRANTED) {
        throw new Error('Microphone permission was denied.');
      }

      // Reset timer
      setElapsedMs(0);
      if (timerRef.current) clearInterval(timerRef.current);

      const filename = `recording-${Date.now()}.m4a`;
      const filePath = await AudioRecorder.start(filename);

      recordPathRef.current = filePath;
      startTimeRef.current = Date.now();
      setIsRecording(true);
      setRecordPath(filePath);

      // Start timer
      timerRef.current = setInterval(() => {
        setElapsedMs(Date.now() - startTimeRef.current);
      }, 100);

      console.log('[AudioRecorder] Recording started at:', filePath);
    } catch (err) {
      if (timerRef.current) clearInterval(timerRef.current);
      startTimeRef.current = null;
      setIsRecording(false);
      recordPathRef.current = null;
      setRecordPath(null);
      setElapsedMs(0);
      console.error('[AudioRecorder] Start recording error:', err);
      throw new Error(`Failed to start recording: ${err.message}`);
    }
  };

  const stopRecording = async () => {
    try {
      if (timerRef.current) clearInterval(timerRef.current);

      // Use ref to get the actual path (more reliable than state)
      const activePath = recordPathRef.current || recordPath;

      if (!activePath) {
        throw new Error('No active recording found');
      }

      const stoppedPath = await AudioRecorder.stop();
      const path = stoppedPath || activePath;

      // Verify file exists before stopping
      const fileExists = await RNFS.exists(path);
      console.log('[AudioRecorder] File exists check:', fileExists);
      
      if (!fileExists) {
        throw new Error('Recording file was not saved');
      }

      setElapsedMs(startTimeRef.current ? Date.now() - startTimeRef.current : elapsedMs);
      startTimeRef.current = null;
      setIsRecording(false);
      recordPathRef.current = path;
      setRecordPath(path);
      console.log('[AudioRecorder] Recording stopped successfully');
      
      return path;
    } catch (err) {
      startTimeRef.current = null;
      setIsRecording(false);
      recordPathRef.current = null;
      setRecordPath(null);
      setElapsedMs(0);
      console.error('[AudioRecorder] Stop recording error:', err);
      throw new Error(`Failed to stop recording: ${err.message}`);
    }
  };

  const discardRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    const path = recordPathRef.current || recordPath;
    if (path) {
      RNFS.unlink(path).catch(err => {
        console.log('[AudioRecorder] Error deleting recording:', err);
      });
    }
    
    recordPathRef.current = null;
    startTimeRef.current = null;
    setRecordPath(null);
    setElapsedMs(0);
    setIsRecording(false);
  };

  return {
    isRecording,
    elapsedMs,
    recordPath,
    startRecording,
    stopRecording,
    discardRecording,
  };
}
