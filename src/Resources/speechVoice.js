// Shared browser-native speech helpers for Epsilon's voice input/output.
// Both speech-to-text (SpeechRecognition) and text-to-speech
// (speechSynthesis) are 100% client-side — no audio is ever sent to our own
// backend, only the resulting text (exactly like a typed message) or the
// gender/accent *preference* (a tenant Settings value, not a specific
// voice). Which actual voices exist is entirely up to each listener's own
// browser/OS, so matching is always best-effort with a safe fallback.

export const VOICE_ACCENTS = [
    { value: 'en-US', label: 'American' },
    { value: 'en-GB', label: 'British' },
    { value: 'en-AU', label: 'Australian' },
    { value: 'en-IN', label: 'Indian' },
    { value: 'en-ZA', label: 'South African' },
    { value: 'en-NG', label: 'Nigerian' },
]

const FEMALE_NAME_HINTS = ['female', 'zira', 'samantha', 'victoria', 'susan', 'karen', 'tessa', 'moira', 'fiona', 'joanna', 'salli', 'kimberly', 'amy', 'emma', 'ivy', 'kendra', 'kathy', 'hazel', 'serena', 'allison', 'ava', 'siri', 'nicky', 'shelley']
const MALE_NAME_HINTS = ['male', 'david', 'mark', 'daniel', 'alex', 'fred', 'george', 'james', 'ryan', 'guy', 'justin', 'matthew', 'oliver', 'arthur', 'eric', 'tom', 'aaron', 'gordon', 'rishi']

export const getSpeechSupport = () => ({
    sttSupported: typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition),
    ttsSupported: typeof window !== 'undefined' && !!window.speechSynthesis,
})

// speechSynthesis.getVoices() is frequently empty on the very first call —
// the real list loads asynchronously and Chrome fires 'voiceschanged' once
// it's ready (Safari/Firefox sometimes have it populated immediately).
// Cached across calls within a page load since the list never changes.
let cachedVoicesPromise = null
export const loadVoices = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return Promise.resolve([])
    if (cachedVoicesPromise) return cachedVoicesPromise
    cachedVoicesPromise = new Promise((resolve) => {
        const existing = window.speechSynthesis.getVoices()
        if (existing.length) { resolve(existing); return }
        const handler = () => {
            const voices = window.speechSynthesis.getVoices()
            if (voices.length) {
                window.speechSynthesis.removeEventListener('voiceschanged', handler)
                resolve(voices)
            }
        }
        window.speechSynthesis.addEventListener('voiceschanged', handler)
        // Safety net — some browsers never fire the event at all.
        setTimeout(() => resolve(window.speechSynthesis.getVoices()), 1500)
    })
    return cachedVoicesPromise
}

const guessGender = (voiceName) => {
    const lower = String(voiceName || '').toLowerCase()
    if (FEMALE_NAME_HINTS.some((hint) => lower.includes(hint))) return 'female'
    if (MALE_NAME_HINTS.some((hint) => lower.includes(hint))) return 'male'
    return null
}

// Best-effort match, most specific first: exact accent + gender, exact
// accent alone, same base language (any 'en-*') + gender, same base
// language alone, the browser's own default voice, then just the first
// voice it has. Never returns null when at least one voice exists.
export const pickVoice = (voices, gender, accentLang) => {
    if (!voices || !voices.length) return null
    const wantAccent = String(accentLang || 'en-US').toLowerCase()
    const baseLang = wantAccent.split('-')[0]
    const byAccent = voices.filter((v) => v.lang?.toLowerCase() === wantAccent)
    const byBaseLang = voices.filter((v) => v.lang?.toLowerCase().startsWith(baseLang))
    const withGender = (pool) => pool.find((v) => guessGender(v.name) === gender)
    return withGender(byAccent) || byAccent[0]
        || withGender(byBaseLang) || byBaseLang[0]
        || voices.find((v) => v.default) || voices[0]
}

// Strips markdown syntax that would otherwise be read aloud literally
// ("asterisk asterisk Total asterisk asterisk") and drops content that
// makes no sense spoken (fenced code, raw table pipes) instead of trying
// to narrate it character by character.
export const stripForSpeech = (text) => {
    if (!text) return ''
    return String(text)
        .replace(/```[\s\S]*?```/g, ' (code omitted) ')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/^\s{0,3}\|.*\|\s*$/gm, '')
        .replace(/^\s*-{3,}\s*$/gm, '')
        .replace(/!\[[^\]]*]\([^)]*\)/g, '')
        .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
        .replace(/^#{1,6}\s*/gm, '')
        .replace(/[*_~]{1,3}/g, '')
        .replace(/^\s*[-•]\s+/gm, '')
        .replace(/\n{2,}/g, '. ')
        .replace(/\n/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim()
}

export const stopSpeaking = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel()
}

// Fire-and-forget: speaks `text` using the best-matching voice for
// {gender, accent}, calling onStart/onEnd/onError as the utterance
// progresses. Cancels anything already speaking first — only one Epsilon
// reply should ever be audible at a time.
export const speak = async (text, { gender = 'female', accent = 'en-US', onStart, onEnd, onError, onBoundary } = {}) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    const spoken = stripForSpeech(text)
    if (!spoken) return
    stopSpeaking()
    const voices = await loadVoices()
    const voice = pickVoice(voices, gender, accent)
    const utterance = new window.SpeechSynthesisUtterance(spoken)
    if (voice) utterance.voice = voice
    utterance.lang = voice?.lang || accent || 'en-US'
    utterance.onstart = () => onStart?.()
    utterance.onend = () => onEnd?.()
    utterance.onerror = (e) => { onError?.(e); onEnd?.() }
    // Fires roughly per word/sentence on most Chrome/Edge voices (not all —
    // some platform voices never fire it) — the closest browser-native
    // signal to "reacting to what's actually being said" without access to
    // the synthesized audio's real waveform, which speechSynthesis never
    // exposes. Callers should have their own fallback for voices that never
    // fire this at all.
    utterance.onboundary = (e) => onBoundary?.(e)
    window.speechSynthesis.speak(utterance)
}
