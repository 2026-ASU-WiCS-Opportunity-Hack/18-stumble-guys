/**
 * ElevenLabs wrappers:
 * - speechToText(): Scribe v1 STT — transcribes audio blobs
 * - textToSpeech(): Multilingual v2 TTS — returns audio ArrayBuffer
 */

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY!
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID ?? '21m00Tcm4TlvDq8ikWAM'
const BASE = 'https://api.elevenlabs.io/v1'

/**
 * Transcribe audio using ElevenLabs Scribe v1.
 * @param audioBuffer - Raw audio bytes (webm/ogg from MediaRecorder)
 * @param mimeType - MIME type of the audio, e.g. 'audio/webm'
 * @param languageCode - Optional ISO language code hint, e.g. 'es' for Spanish
 */
export async function speechToText(
  audioBuffer: ArrayBuffer,
  mimeType = 'audio/webm',
  languageCode?: string
): Promise<{ text: string; language_detected?: string }> {
  const formData = new FormData()
  formData.append('file', new Blob([audioBuffer], { type: mimeType }), 'recording.webm')
  formData.append('model_id', 'scribe_v1')
  if (languageCode) formData.append('language_code', languageCode)

  const res = await fetch(`${BASE}/speech-to-text`, {
    method: 'POST',
    headers: { 'xi-api-key': ELEVENLABS_API_KEY },
    body: formData,
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`ElevenLabs STT error ${res.status}: ${err}`)
  }

  const data = await res.json()
  return {
    text: data.text ?? '',
    language_detected: data.language_code,
  }
}

/**
 * Convert text to speech using ElevenLabs Multilingual v2.
 * Returns an ArrayBuffer of MP3 audio.
 */
export async function textToSpeech(
  text: string,
  voiceId = ELEVENLABS_VOICE_ID,
): Promise<ArrayBuffer> {
  const res = await fetch(`${BASE}/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.0,
        use_speaker_boost: true,
      },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`ElevenLabs TTS error ${res.status}: ${err}`)
  }

  return res.arrayBuffer()
}
