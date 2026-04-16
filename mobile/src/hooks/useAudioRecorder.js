import {useState, useRef, useEffect} from 'react';
import {Platform, PermissionsAndroid} from 'react-native';
import RNFS from 'react-native-fs';

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [recordPath, setRecordPath] = useState(null);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);

  // Request permissions on Android
  useEffect(() => {
    if (Platform.OS === 'android') {
      PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      ]).catch(err => {
        console.log('Permission request error:', err);
      });
    }
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    try {
      // Reset timer
      setElapsedMs(0);
      if (timerRef.current) clearInterval(timerRef.current);

      // Create temp recording file path
      const tempDir = Platform.OS === 'android' ? RNFS.CachesDirectoryPath : RNFS.DocumentDirectoryPath;
      const filename = `recording-${Date.now()}.m4a`;
      const filePath = `${tempDir}/${filename}`;

      // Create directory if needed
      await RNFS.mkdir(tempDir).catch(() => {});

      // Create a mock audio file (placeholder content)
      await RNFS.writeFile(filePath, 'RECORDING_PLACEHOLDER', 'utf8');

      startTimeRef.current = Date.now();
      setIsRecording(true);
      setRecordPath(filePath);

      // Start timer
      timerRef.current = setInterval(() => {
        setElapsedMs(Date.now() - startTimeRef.current);
      }, 100);

      console.log('Recording started at:', filePath);
    } catch (err) {
      setIsRecording(false);
      throw new Error(`Failed to start recording: ${err.message}`);
    }
  };

  const stopRecording = async () => {
    try {
      if (timerRef.current) clearInterval(timerRef.current);

      if (!isRecording || !recordPath) {
        throw new Error('No active recording');
      }

      setIsRecording(false);

      // Verify file exists
      const fileExists = await RNFS.exists(recordPath);
      if (!fileExists) {
        throw new Error('Recording file not created');
      }

      console.log('Recording stopped:', recordPath);
      return recordPath;
    } catch (err) {
      setIsRecording(false);
      throw new Error(`Failed to stop recording: ${err.message}`);
    }
  };

  const discardRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (recordPath) {
      RNFS.unlink(recordPath).catch(() => {});
    }
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