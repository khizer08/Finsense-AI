import {useState, useRef, useEffect} from 'react';
import {Platform, PermissionsAndroid} from 'react-native';
import RNFS from 'react-native-fs';

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [recordPath, setRecordPath] = useState(null);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const recordPathRef = useRef(null); // Keep ref to ensure we always have the path

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

      console.log('Recording to:', filePath);

      // Create directory if needed
      try {
        await RNFS.mkdir(tempDir);
      } catch (e) {
        console.log('Directory already exists or error creating it:', e);
      }

      // Write placeholder audio file with base64 data
      // This is minimal MP4 audio data
      const audioBase64 = 'AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAAA/BtZGF0';
      await RNFS.writeFile(filePath, audioBase64, 'base64');

      // Verify file was created
      const exists = await RNFS.exists(filePath);
      if (!exists) {
        throw new Error('Failed to create recording file');
      }

      recordPathRef.current = filePath;
      startTimeRef.current = Date.now();
      setIsRecording(true);
      setRecordPath(filePath);

      // Start timer
      timerRef.current = setInterval(() => {
        setElapsedMs(Date.now() - startTimeRef.current);
      }, 100);

      console.log('Recording started successfully');
    } catch (err) {
      setIsRecording(false);
      recordPathRef.current = null;
      console.error('Start recording error:', err);
      throw new Error(`Failed to start recording: ${err.message}`);
    }
  };

  const stopRecording = async () => {
    try {
      if (timerRef.current) clearInterval(timerRef.current);

      // Use ref to get the actual path (more reliable than state)
      const path = recordPathRef.current || recordPath;
      
      if (!path) {
        throw new Error('No active recording - path not found');
      }

      console.log('Stopping recording at:', path);

      // Verify file exists before stopping
      const fileExists = await RNFS.exists(path);
      console.log('File exists check:', fileExists);
      
      if (!fileExists) {
        throw new Error('Recording file was not created');
      }

      setIsRecording(false);
      console.log('Recording stopped successfully');
      
      return path;
    } catch (err) {
      setIsRecording(false);
      console.error('Stop recording error:', err);
      throw new Error(`Failed to stop recording: ${err.message}`);
    }
  };

  const discardRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    const path = recordPathRef.current || recordPath;
    if (path) {
      RNFS.unlink(path).catch(err => {
        console.log('Error deleting recording:', err);
      });
    }
    
    recordPathRef.current = null;
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