import {useState, useRef, useEffect} from 'react';
import {Platform, PermissionsAndroid} from 'react-native';
import RNFS from 'react-native-fs';

/**
 * Hook for audio recording - currently uses test/placeholder files
 * TODO: Replace with native Android audio recording implementation
 * 
 * For now, this creates small test files that:
 * 1. Trigger the upload flow
 * 2. Get processed by Whisper (returns mock transcript)
 * 3. Get processed by Gemini (real API call with mock data)
 * 
 * To enable real audio:
 * - Add react-native-permissions + native MediaRecorder
 * - Or use expo-audio with managed workflow
 */
export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [recordPath, setRecordPath] = useState(null);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const recordPathRef = useRef(null);

  // Request permissions on Android
  useEffect(() => {
    if (Platform.OS === 'android') {
      PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      ]).catch(err => {
        console.log('[AudioRecorder] Permission request error:', err);
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

      console.log('[AudioRecorder] Creating test recording file at:', filePath);

      // Create directory if needed
      try {
        await RNFS.mkdir(tempDir);
      } catch (e) {
        console.log('[AudioRecorder] Directory already exists:', e);
      }

      // Write minimal MP4 audio data (test file)
      // This will be detected by Whisper as a placeholder and return mock transcript
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

      console.log('[AudioRecorder] Test recording started (placeholder mode)');
    } catch (err) {
      setIsRecording(false);
      recordPathRef.current = null;
      console.error('[AudioRecorder] Start recording error:', err);
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

      console.log('[AudioRecorder] Stopping recording at:', path);

      // Verify file exists before stopping
      const fileExists = await RNFS.exists(path);
      console.log('[AudioRecorder] File exists check:', fileExists);
      
      if (!fileExists) {
        throw new Error('Recording file was not created');
      }

      setIsRecording(false);
      console.log('[AudioRecorder] Recording stopped successfully');
      
      return path;
    } catch (err) {
      setIsRecording(false);
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