import {useState, useRef, useEffect} from 'react';
import {Platform, PermissionsAndroid} from 'react-native';
import RNFS from 'react-native-fs';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';

const audioRecorderPlayer = new AudioRecorderPlayer();

/**
 * Hook for real audio recording on Android using microphone
 * Records to device cache directory and returns file path for upload
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
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
      ]).catch(err => {
        console.log('[AudioRecorder] Permission request error:', err);
      });
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      // Stop recording if still active
      if (isRecording) {
        audioRecorderPlayer.stopRecorder();
      }
    };
  }, [isRecording]);

  const startRecording = async () => {
    try {
      setElapsedMs(0);
      if (timerRef.current) clearInterval(timerRef.current);

      // Create recording file path in cache directory
      const cacheDir = RNFS.CachesDirectoryPath;
      const filename = `recording-${Date.now()}.m4a`;
      const filePath = Platform.OS === 'android' 
        ? `${cacheDir}/${filename}` 
        : `${RNFS.DocumentDirectoryPath}/${filename}`;

      console.log('[AudioRecorder] Starting real audio recording to:', filePath);

      // Start actual audio recording from microphone
      const path = await audioRecorderPlayer.startRecorder(filePath);
      
      console.log('[AudioRecorder] Recording started, path:', path);

      recordPathRef.current = path;
      startTimeRef.current = Date.now();
      setIsRecording(true);
      setRecordPath(path);

      // Update timer every 100ms
      timerRef.current = setInterval(() => {
        setElapsedMs(Date.now() - startTimeRef.current);
      }, 100);

    } catch (err) {
      recordPathRef.current = null;
      setIsRecording(false);
      console.error('[AudioRecorder] Start recording error:', err);
      throw new Error(`Failed to start recording: ${err.message}`);
    }
  };

  const stopRecording = async () => {
    try {
      if (timerRef.current) clearInterval(timerRef.current);

      const path = recordPathRef.current || recordPath;
      if (!path) {
        throw new Error('No active recording - path not found');
      }

      console.log('[AudioRecorder] Stopping recording at:', path);

      // Stop the recorder and get final URI
      const result = await audioRecorderPlayer.stopRecorder();
      console.log('[AudioRecorder] Recording stopped, result:', result);

      // Verify file exists
      const fileExists = await RNFS.exists(path);
      if (!fileExists) {
        throw new Error('Recording file was not saved');
      }

      // Get file size to confirm it's real audio
      const stat = await RNFS.stat(path);
      console.log('[AudioRecorder] Recorded file size:', stat.size, 'bytes');

      if (stat.size < 2000) {
        console.warn('[AudioRecorder] Warning: recorded file is very small (<2KB), may not be valid audio');
      }

      setIsRecording(false);
      const recordedPath = result || path;
      
      console.log('[AudioRecorder] Recording stopped successfully, returning path:', recordedPath);
      return recordedPath;

    } catch (err) {
      setIsRecording(false);
      console.error('[AudioRecorder] Stop recording error:', err);
      throw new Error(`Failed to stop recording: ${err.message}`);
    }
  };

  const discardRecording = () => {
    try {
      if (timerRef.current) clearInterval(timerRef.current);

      // Stop recorder if active
      if (isRecording) {
        audioRecorderPlayer.stopRecorder().catch(err => {
          console.log('[AudioRecorder] Error stopping recorder on discard:', err);
        });
      }

      const path = recordPathRef.current || recordPath;
      if (path) {
        RNFS.unlink(path).catch(err => {
          console.log('[AudioRecorder] Error deleting recording on discard:', err);
        });
      }

      recordPathRef.current = null;
      setRecordPath(null);
      setElapsedMs(0);
      setIsRecording(false);
      
      console.log('[AudioRecorder] Recording discarded');
    } catch (err) {
      console.error('[AudioRecorder] Discard error:', err);
    }
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