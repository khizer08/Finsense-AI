package com.tempfix.audio

import android.media.MediaRecorder
import android.os.Build
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.module.annotations.ReactModule
import java.io.File

@ReactModule(name = AudioRecorderModule.NAME)
class AudioRecorderModule(
  reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

  companion object {
    const val NAME = "AudioRecorder"
  }

  private var recorder: MediaRecorder? = null
  private var outputPath: String? = null

  override fun getName(): String = NAME

  @ReactMethod
  fun start(fileName: String, promise: Promise) {
    try {
      releaseRecorder()

      val safeFileName = if (fileName.endsWith(".m4a")) fileName else "$fileName.m4a"
      val targetFile = File(reactApplicationContext.cacheDir, safeFileName)
      targetFile.parentFile?.mkdirs()

      if (targetFile.exists()) {
        targetFile.delete()
      }

      val mediaRecorder =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
          MediaRecorder(reactApplicationContext)
        } else {
          MediaRecorder()
        }

      mediaRecorder.setAudioSource(MediaRecorder.AudioSource.MIC)
      mediaRecorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
      mediaRecorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
      mediaRecorder.setOutputFile(targetFile.absolutePath)
      mediaRecorder.prepare()
      mediaRecorder.start()

      recorder = mediaRecorder
      outputPath = targetFile.absolutePath
      promise.resolve(targetFile.absolutePath)
    } catch (err: Exception) {
      releaseRecorder()
      promise.reject("E_RECORD_START", err.message ?: "Failed to start recording", err)
    }
  }

  @ReactMethod
  fun stop(promise: Promise) {
    val activeRecorder = recorder
    val activeOutputPath = outputPath

    if (activeRecorder == null || activeOutputPath.isNullOrBlank()) {
      promise.reject("E_RECORD_STOP", "No active recording")
      return
    }

    try {
      activeRecorder.stop()
      promise.resolve(activeOutputPath)
    } catch (err: RuntimeException) {
      File(activeOutputPath).delete()
      promise.reject(
        "E_RECORD_STOP",
        "Recording was too short or invalid. Please record for at least a second.",
        err,
      )
    } catch (err: Exception) {
      promise.reject("E_RECORD_STOP", err.message ?: "Failed to stop recording", err)
    } finally {
      releaseRecorder()
    }
  }

  override fun invalidate() {
    releaseRecorder()
    super.invalidate()
  }

  private fun releaseRecorder() {
    try {
      recorder?.reset()
    } catch (_: Exception) {
    }

    try {
      recorder?.release()
    } catch (_: Exception) {
    }

    recorder = null
    outputPath = null
  }
}
