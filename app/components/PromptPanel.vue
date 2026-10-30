<script setup lang="ts">
import { mdiClose, mdiDelete, mdiMicrophone, mdiSend } from '@mdi/js'

type PromptSubmission =
  | { type: 'text'; text: string }
  | { type: 'audio'; file: File }

const props = defineProps<{
  busy: boolean
}>()
const emit = defineEmits<{
  submit: [submission: PromptSubmission]
}>()
const settingsOpen = defineModel<boolean>('settingsOpen', { default: false })

interface MicrophoneOption {
  title: string
  value: string
}

interface MicrophoneSettings {
  configured: boolean
  deviceId: string
}

const SETTINGS_KEY = 'gorkycode.microphone'
const text = ref('')
const configured = ref(false)
const selectedDeviceId = ref('')
const microphoneOptions = ref<MicrophoneOption[]>([])
const microphoneError = ref('')
const audioLevel = ref(0)
const recording = ref(false)
const settingsLoading = ref(false)
const audioAvailable = ref(false)
const meterStyle = computed(() => ({
  '--meter-glow': `${8 + audioLevel.value * 30}px`,
  '--meter-opacity': `${0.2 + audioLevel.value * 0.65}`,
}))

let stream: MediaStream | null = null
let audioContext: AudioContext | null = null
let source: MediaStreamAudioSourceNode | null = null
let analyser: AnalyserNode | null = null
let processor: ScriptProcessorNode | null = null
let animationFrame = 0
let generation = 0
let sampleRate = 0
let samples: Float32Array[] = []
let settingsReady = false

function stopTracks(mediaStream: MediaStream) {
  mediaStream.getTracks().forEach(track => track.stop())
}

async function stopCapture(clearSamples = true) {
  generation += 1
  cancelAnimationFrame(animationFrame)
  animationFrame = 0

  if (processor) {
    processor.onaudioprocess = null
    processor.disconnect()
    processor = null
  }
  source?.disconnect()
  source = null
  analyser?.disconnect()
  analyser = null

  if (stream) {
    stopTracks(stream)
    stream = null
  }

  if (audioContext) {
    const contextToClose = audioContext
    audioContext = null
    if (contextToClose.state !== 'closed') {
      try {
        await contextToClose.close()
      } catch {
        microphoneError.value = 'Не удалось корректно завершить аудиосессию'
      }
    }
  }

  recording.value = false
  audioLevel.value = 0
  if (clearSamples) samples = []
}

function updateMeter(currentAnalyser: AnalyserNode) {
  const buffer = new Float32Array(currentAnalyser.fftSize)

  const readLevel = () => {
    if (analyser !== currentAnalyser) return

    currentAnalyser.getFloatTimeDomainData(buffer)
    const sum = buffer.reduce((total, sample) => total + sample * sample, 0)
    const rms = Math.sqrt(sum / buffer.length)
    audioLevel.value = Math.min(1, rms * 5)
    animationFrame = requestAnimationFrame(readLevel)
  }

  readLevel()
}

async function startCapture(deviceId: string, shouldRecord: boolean) {
  await stopCapture()
  const currentGeneration = generation

  const captureStream = await navigator.mediaDevices.getUserMedia({
    audio: { deviceId: { exact: deviceId } },
  })

  if (currentGeneration !== generation) {
    stopTracks(captureStream)
    return
  }

  stream = captureStream
  audioContext = new AudioContext()
  await audioContext.resume()
  sampleRate = audioContext.sampleRate
  source = audioContext.createMediaStreamSource(captureStream)
  analyser = audioContext.createAnalyser()
  analyser.fftSize = 512
  source.connect(analyser)
  updateMeter(analyser)

  if (shouldRecord) {
    samples = []
    processor = audioContext.createScriptProcessor(4096, 1, 1)
    const silentOutput = audioContext.createGain()
    silentOutput.gain.value = 0
    processor.onaudioprocess = event => {
      samples.push(new Float32Array(event.inputBuffer.getChannelData(0)))
      event.outputBuffer.getChannelData(0).fill(0)
    }
    source.connect(processor)
    processor.connect(silentOutput)
    silentOutput.connect(audioContext.destination)
    recording.value = true
  }
}

async function loadMicrophones() {
  settingsLoading.value = true
  microphoneError.value = ''

  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Браузер не поддерживает доступ к микрофону')
    }

    const permissionStream = await navigator.mediaDevices.getUserMedia({ audio: true })
    stopTracks(permissionStream)
    if (!settingsOpen.value) return

    const devices = await navigator.mediaDevices.enumerateDevices()
    microphoneOptions.value = devices
      .filter(device => device.kind === 'audioinput')
      .map((device, index) => ({
        title: device.label || `Микрофон ${index + 1}`,
        value: device.deviceId,
      }))

    if (!microphoneOptions.value.length) {
      throw new Error('Микрофоны не найдены')
    }

    if (!microphoneOptions.value.some(option => option.value === selectedDeviceId.value)) {
      selectedDeviceId.value = (microphoneOptions.value[0] as any).value
      configured.value = false
    }
    settingsReady = true
    if (!settingsOpen.value) return
    await startCapture(selectedDeviceId.value, false)
  } catch (error) {
    microphoneError.value = error instanceof Error
      ? error.message
      : 'Не удалось получить доступ к микрофону'
  } finally {
    settingsLoading.value = false
  }
}

function openSettings() {
  if (recording.value) {
    microphoneError.value = 'Сначала отправьте или удалите голосовую запись'
    return
  }

  microphoneError.value = ''
  settingsOpen.value = true
}

function saveSettings() {
  if (!selectedDeviceId.value) {
    microphoneError.value = 'Выберите микрофон'
    return
  }

  try {
    const settings: MicrophoneSettings = {
      configured: true,
      deviceId: selectedDeviceId.value,
    }
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    configured.value = true
    settingsOpen.value = false
  } catch {
    microphoneError.value = 'Не удалось сохранить настройки микрофона'
  }
}

function clearSettings() {
  try {
    localStorage.removeItem(SETTINGS_KEY)
    configured.value = false
    selectedDeviceId.value = ''
    microphoneError.value = ''
    settingsOpen.value = false
    void stopCapture()
  } catch {
    microphoneError.value = 'Не удалось удалить настройки микрофона'
  }
}

async function startRecording() {
  if (props.busy) return
  microphoneError.value = ''

  if (!configured.value || !selectedDeviceId.value) {
    openSettings()
    return
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    if (!devices.some(device => device.kind === 'audioinput' && device.deviceId === selectedDeviceId.value)) {
      configured.value = false
      openSettings()
      return
    }

    await startCapture(selectedDeviceId.value, true)
  } catch (error) {
    microphoneError.value = error instanceof Error
      ? error.message
      : 'Не удалось начать запись'
    openSettings()
  }
}

function encodeWav(chunks: Float32Array[], rate: number): Blob {
  const sampleCount = chunks.reduce((total, chunk) => total + chunk.length, 0)
  const buffer = new ArrayBuffer(44 + sampleCount * 2)
  const view = new DataView(buffer)
  const writeText = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index))
    }
  }

  writeText(0, 'RIFF')
  view.setUint32(4, 36 + sampleCount * 2, true)
  writeText(8, 'WAVE')
  writeText(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, rate, true)
  view.setUint32(28, rate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeText(36, 'data')
  view.setUint32(40, sampleCount * 2, true)

  let offset = 44
  for (const chunk of chunks) {
    for (const sample of chunk) {
      const clamped = Math.max(-1, Math.min(1, sample))
      view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true)
      offset += 2
    }
  }

  return new Blob([buffer], { type: 'audio/wav' })
}

async function submit() {
  if (props.busy) return

  if (recording.value) {
    const recordedSamples = samples
    const recordedSampleRate = sampleRate
    await stopCapture(false)
    if (!recordedSamples.length) {
      microphoneError.value = 'Не удалось записать звук. Проверьте микрофон и попробуйте ещё раз.'
      samples = []
      return
    }

    emit('submit', {
      type: 'audio',
      file: new File([encodeWav(recordedSamples, recordedSampleRate)], 'voice-message.wav', {
        type: 'audio/wav',
      }),
    })
    samples = []
    return
  }

  const message = text.value.trim()
  if (!message) return

  emit('submit', { type: 'text', text: message })
  text.value = ''
}

async function discardRecording() {
  await stopCapture()
  microphoneError.value = ''
}

watch(settingsOpen, async isOpen => {
  if (isOpen) {
    if (recording.value) {
      settingsOpen.value = false
      microphoneError.value = 'Сначала отправьте или удалите голосовую запись'
      return
    }
    settingsReady = false
    await loadMicrophones()
  } else if (!recording.value) {
    await stopCapture()
  }
})

watch(selectedDeviceId, async deviceId => {
  if (!settingsOpen.value || !settingsReady || !deviceId) return

  try {
    await startCapture(deviceId, false)
    microphoneError.value = ''
  } catch (error) {
    microphoneError.value = error instanceof Error
      ? error.message
      : 'Не удалось подключить выбранный микрофон'
  }
})

onMounted(() => {
  audioAvailable.value = !!navigator.mediaDevices?.getUserMedia

  try {
    const stored = localStorage.getItem(SETTINGS_KEY)
    if (!stored) return

    const settings: unknown = JSON.parse(stored)
    if (
      settings
      && typeof settings === 'object'
      && 'configured' in settings
      && settings.configured === true
      && 'deviceId' in settings
      && typeof settings.deviceId === 'string'
    ) {
      configured.value = true
      selectedDeviceId.value = settings.deviceId
    }
  } catch {
    microphoneError.value = 'Не удалось загрузить настройки микрофона'
  }
})

onBeforeUnmount(() => {
  void stopCapture()
})

defineExpose({ openSettings })
</script>

<template>
  <v-container class="prompt-panel">
    <v-alert
      v-if="microphoneError && !settingsOpen"
      type="error"
      variant="tonal"
      density="compact"
      class="mb-2"
      closable
      @click:close="microphoneError = ''"
    >
      {{ microphoneError }}
    </v-alert>

    <div v-if="!recording" class="prompt-composer prompt-composer--text">
      <v-btn
        :icon="mdiMicrophone"
        class="bg-primary prompt-action"
        color="white"
        size="small"
        rounded="circle"
        :disabled="props.busy || !!text.trim()"
        aria-label="Записать голосовое сообщение"
        @click="startRecording"
      />
      <div class="prompt-input-shell rounded-lg bg-surface">
        <v-textarea
          v-model="text"
          variant="solo"
          bg-color="transparent"
          density="compact"
          class="prompt-input"
          placeholder="Назначь встречу…"
          rows="1"
          auto-grow
          max-rows="6"
          hide-details
          flat
          :disabled="props.busy"
          @keydown.enter.exact.prevent="submit"
        />
      </div>
      <v-btn
        :icon="mdiSend"
        class="bg-primary prompt-action"
        color="white"
        rounded="circle"
        :disabled="props.busy || !text.trim()"
        aria-label="Отправить сообщение"
        @click="submit"
      />
    </div>

    <div v-else class="prompt-composer">
      <v-btn
        :icon="mdiDelete"
        class="recording-delete prompt-action"
        color="on-surface"
        variant="text"
        size="small"
        rounded="circle"
        aria-label="Удалить запись"
        @click="discardRecording"
      />
      <div class="recording-panel rounded-lg bg-surface" :style="meterStyle">
        <div class="recording-meter">
          <span>Запись голосового сообщения</span>
          <v-progress-linear
            :model-value="audioLevel * 100"
            color="primary"
            rounded
            height="8"
          />
        </div>
      </div>
      <v-btn
        :icon="mdiSend"
        class="bg-primary prompt-action"
        color="white"
        size="small"
        rounded="circle"
        :disabled="props.busy"
        aria-label="Отправить голосовое сообщение"
        @click="submit"
      />
    </div>

    <v-dialog v-model="settingsOpen" :max-width="450">
      <template #default="{ isActive }">
        <v-card class="rounded-lg bg-surface microphone-settings">
          <div class="d-flex justify-space-between align-center mb-4">
            <div style="font-size: 20px; font-weight: 500;">Настройки</div>
            <v-btn
              :icon="mdiClose"
              aria-label="Закрыть настройки"
              variant="text"
              size="small"
              @click="isActive.value = false"
            />
          </div>

          <v-select
            v-model="selectedDeviceId"
            :items="microphoneOptions"
            item-title="title"
            item-value="value"
            label="Микрофон"
            variant="outlined"
            density="comfortable"
            class="mb-4"
            hide-details
            :loading="settingsLoading"
            :disabled="!audioAvailable || settingsLoading"
            no-data-text="Микрофоны не найдены"
          />

          <div class="microphone-meter mb-4" :style="meterStyle">
            <span class="text-body-2">Уровень громкости</span>
            <v-progress-linear
              :model-value="audioLevel * 100"
              color="primary"
              rounded
              height="10"
            />
          </div>

          <v-alert
            v-if="microphoneError"
            type="error"
            variant="tonal"
            density="compact"
            class="mb-4"
          >
            {{ microphoneError }}
          </v-alert>

          <v-btn
            block
            color="primary"
            :disabled="!selectedDeviceId || settingsLoading"
            @click="saveSettings"
          >
            Сохранить
          </v-btn>
        </v-card>
      </template>
    </v-dialog>
  </v-container>
</template>

<style scoped>
.prompt-panel {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 2;
  padding: 12px 16px max(12px, env(safe-area-inset-bottom));
  background: linear-gradient(transparent, rgb(var(--v-theme-background)) 22%);
}

.prompt-composer {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) 42px;
  align-items: end;
  gap: 12px;
}

.prompt-input-shell {
  min-width: 0;
  min-height: 42px;
  margin-bottom: 4px;
  overflow: hidden;
  border-radius: 21px !important;
}

.prompt-input {
  width: 100%;
}

.prompt-input :deep(.v-field) {
  --v-input-control-height: 34px !important;
  min-height: 34px;

  background: transparent;
  box-shadow: none !important;
}

.prompt-input :deep(.v-field__overlay),
.prompt-input :deep(.v-field__loader) {
  display: none;
}

.prompt-input :deep(textarea) {
  -webkit-user-select: text;
  user-select: text;
  scrollbar-color: color-mix(in srgb, rgb(var(--v-theme-surface)) 65%, white) rgb(var(--v-theme-surface));
}

.prompt-input :deep(textarea::-webkit-scrollbar-track) {
  background-color: rgb(var(--v-theme-surface));
}

.prompt-input :deep(textarea::-webkit-scrollbar-thumb) {
  background-color: color-mix(in srgb, rgb(var(--v-theme-surface)) 65%, white);
}

.prompt-action {
  width: 40px !important;
  height: 40px !important;
  min-width: 40px !important;
  border-radius: 50% !important;
}

.prompt-action :deep(.v-icon) {
  font-size: 24px;
}

.prompt-composer--text > .prompt-action {
  margin-bottom: 4px;
}

.recording-panel {
  display: flex;
  align-items: center;
  min-height: 58px;
  padding: 10px 14px;
  box-shadow: 0 0 var(--meter-glow) rgba(var(--v-theme-primary), var(--meter-opacity));
  animation: microphone-glow 1.2s ease-in-out infinite alternate;
}

.recording-delete {
  background-color: rgb(var(--v-theme-surface)) !important;
}

.recording-meter {
  width: 100%;
  display: grid;
  gap: 8px;
  font-size: 0.875rem;
}

.microphone-settings {
  padding: 10px 18px 18px;
}

.microphone-meter {
  display: grid;
  gap: 10px;
  padding: 10px 14px 14px 14px;
  border-radius: 8px;
  background: rgb(var(--v-theme-background));
  box-shadow: 0 0 var(--meter-glow) rgba(var(--v-theme-primary), var(--meter-opacity));
  animation: microphone-glow 1.2s ease-in-out infinite alternate;
}

@keyframes microphone-glow {
  from {
    box-shadow: 0 0 5px rgba(var(--v-theme-primary), 0.2);
  }

  to {
    box-shadow: 0 0 var(--meter-glow) rgba(var(--v-theme-primary), var(--meter-opacity));
  }
}
</style>
