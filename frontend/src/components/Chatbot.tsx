"use client"

import React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { motion } from "framer-motion"
import {
  Trash2,
  X,
  Minimize2,
  Maximize2,
  Send,
  Bot,
  Tractor,
  Sprout,
  Bot as RobotIcon,
  Smartphone,
  Loader,
  Mic,
  Square
} from "lucide-react"
import { FaRocketchat } from "react-icons/fa"
import aiService, { cancelActiveRequest } from "../ai/aiService"
import { transcribeAudio, detectLanguage } from "../ai/voiceTranscribeService"
import { useNavigate } from "react-router-dom"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { vs } from "react-syntax-highlighter/dist/esm/styles/prism"
import { useAuth } from "../context/AuthContext"
import { getDbContext } from "../hooks/useDbChatContext"

interface Message {
  text: string
  sender: "user" | "ai"
  animate?: boolean
  timestamp: number
  status?: "sending" | "sent" | "error"
  thinking?: string
}

interface AgriTechChatbotProps {
  characterLimit?: number
  cooldownDuration?: number
  language?: "en" | "es" | "fr"
  showTimer?: boolean
  showCharacterCount?: boolean
  userLocation?: string
  defaultExpanded?: boolean
  allowExpansion?: boolean
}

const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" }
>(({ className = "", variant = "primary", children, ...props }, ref) => {
  const baseStyle = "inline-flex items-center justify-center text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none rounded-lg"
  const variantStyles = {
    primary: "bg-green-600 hover:bg-green-700 text-white focus:ring-green-500",
    secondary: "bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 focus:ring-gray-500",
  }

  return (
    <button ref={ref} className={`${baseStyle} ${variantStyles[variant]} ${className}`} {...props}>
      {children}
    </button>
  )
})

Button.displayName = "Button"

const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className = "", ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={`flex px-3 py-2 w-full text-sm text-gray-900 bg-white rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder:text-gray-500 ${className}`}
      {...props}
    />
  )
})

Input.displayName = "Input"

const ThinkingIndicator: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
    className="flex justify-start"
  >
    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
      <motion.div
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
        className="flex gap-2 items-center text-sm text-gray-600"
      >
        <Loader className="w-4 h-4 animate-spin" />
        <span>Thinking</span>
      </motion.div>
    </div>
  </motion.div>
)

const ThinkingDropdown: React.FC<{ thinking: string }> = ({ thinking }) => {
  const [open, setOpen] = useState<boolean>(false)
  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex justify-between items-center px-3 py-2 w-full text-sm font-medium text-left text-gray-700 rounded-lg hover:bg-gray-100"
      >
        <span>Thinking</span>
        <span className="ml-2">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="px-3 pb-3 text-sm text-gray-600 whitespace-pre-wrap">
          {thinking}
        </div>
      )}
    </div>
  )
}

const translations = {
  en: {
    placeholder: "How can I help you?",
    remainingChars: "characters remaining",
    cooldownMessage: "You can send another message in",
    seconds: "seconds",
    errorEmpty: "Message cannot be empty",
    errorLimit: "Character limit exceeded",
    errorCooldown: "Please wait before sending another message",
    recording: "Recording...",
    transcribing: "Transcribing...",
    tapToRecord: "Tap to record",
    tapToStop: "Tap to stop",
  },
  es: {
    placeholder: "Pregunta sobre tus necesidades agrícolas...",
    remainingChars: "caracteres restantes",
    cooldownMessage: "Puedes enviar otro mensaje en",
    seconds: "segundos",
    errorEmpty: "El mensaje no puede estar vacío",
    errorLimit: "Límite de caracteres excedido",
    errorCooldown: "Por favor espera antes de enviar otro mensaje",
    recording: "Grabando...",
    transcribing: "Transcribiendo...",
    tapToRecord: "Toca para grabar",
    tapToStop: "Toca para parar",
  },
  fr: {
    placeholder: "Comment puis-je aider avec vos besoins agricoles ?",
    remainingChars: "caractères restants",
    cooldownMessage: "Vous pouvez envoyer un autre message dans",
    seconds: "secondes",
    errorEmpty: "Le message ne peut pas être vide",
    errorLimit: "Limite de caractères dépassée",
    errorCooldown: "Veuillez patienter avant d'envoyer un autre message",
    recording: "Enregistrement...",
    transcribing: "Transcription...",
    tapToRecord: "Appuyez pour enregistrer",
    tapToStop: "Appuyez pour arrêter",
  },
}

const CustomLink: React.FC<{ href: string; children: React.ReactNode }> = ({ href, children }) => {
  const navigate = useNavigate()
  const isInternalLink = href.startsWith('/')

  const handleClick = (e: React.MouseEvent) => {
    if (isInternalLink) {
      e.preventDefault()
      navigate(href)
    }
  }

  return (
    <a
      href={href}
      onClick={handleClick}
      className="text-blue-600 underline hover:text-blue-700 decoration-dotted underline-offset-4"
      target={isInternalLink ? undefined : "_blank"}
      rel={isInternalLink ? undefined : "noopener noreferrer"}
    >
      {children}
    </a>
  )
}

const MarkdownMessage: React.FC<{ content: string }> = ({ content }) => (
  <ReactMarkdown
    remarkPlugins={[remarkGfm]}
    components={{
      code({ className, children, ...props }) {
        const match = /language-(\w+)/.exec(className || '')
        return match ? (
          <SyntaxHighlighter
            // @ts-expect-error: SyntaxHighlighter style prop expects specific type but we're using vs theme
            style={vs}
            language={match[1]}
            PreTag="div"
            {...props}
          >
            {String(children).replace(/\n$/, '')}
          </SyntaxHighlighter>
        ) : (
          <code className={className} {...props}>
            {children}
          </code>
        )
      },
      // @ts-expect-error: CustomLink expects href but ReactMarkdown passes different props
      a: ({ ...props }) => <CustomLink href={props.href || ''} {...props} />,
      h1: ({ children }) => <h1 className="mb-2 text-xl font-bold">{children}</h1>,
      h2: ({ children }) => <h2 className="mb-2 text-lg font-bold">{children}</h2>,
      ul: ({ children }) => <ul className="mb-2 list-disc list-inside">{children}</ul>,
      ol: ({ children }) => <ol className="mb-2 list-decimal list-inside">{children}</ol>,
      blockquote: ({ children }) => (
        <blockquote className="pl-4 my-2 italic border-l-4 border-green-500">{children}</blockquote>
      ),
    }}
  >
    {content}
  </ReactMarkdown>
)

const MessageComponent: React.FC<{ message: Message }> = ({ message }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, ease: "easeOut" }}
    className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
  >
    <div className={`max-w-[90%] sm:max-w-[80%] p-4 rounded-xl backdrop-blur-sm shadow-lg
      ${message.sender === "user"
        ? "bg-[#63A361] text-white"
        : "bg-white/90 text-gray-800 border border-gray-200/20"
      }`}>
      {message.sender === "ai" ? (
        <div className="space-y-2">
          <MarkdownMessage content={message.text} />
          {message.thinking && message.thinking.trim().length > 0 && (
            <ThinkingDropdown thinking={message.thinking} />
          )}
        </div>
      ) : (
        <div className="whitespace-pre-wrap">{message.text}</div>
      )}
    </div>
  </motion.div>
)

const QuickActions: React.FC<{ onSelect: (action: string) => void; isLoggedIn: boolean }> = ({ onSelect, isLoggedIn }) => {
  const actions = [
    {
      icon: <Tractor className="w-5 h-5" />,
      label: "Precision Farming",
      action: "What is precision agriculture and how can it benefit my farm?",
    },
    {
      icon: <Sprout className="w-5 h-5" />,
      label: "Smart Solutions",
      action: "Tell me about smart farming technologies for small farms",
    },
    {
      icon: <RobotIcon className="w-5 h-5" />,
      label: "Agri-Robotics",
      action: "How can I start using agricultural robots on my farm?",
    },
    {
      icon: <Smartphone className="w-5 h-5" />,
      label: "Digital Tools",
      action: "What are the essential digital farming tools for beginners?",
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 mb-6">
      {actions.map(({ icon, label, action }) => (
        <button
          key={label}
          onClick={() => onSelect(action)}
          className="flex overflow-hidden relative items-center p-4 rounded-xl border transition-all duration-300 group bg-white/90 border-primary-200/30 hover:border-primary-300/50"
        >
          <span className="mr-3 text-[#63A361]">{icon}</span>
          <span className="text-sm font-medium">{label}</span>
        </button>
      ))}
      {/* DB-aware actions (show for logged-in users) */}
      {isLoggedIn && (
        <>
          <button
            onClick={() => onSelect("Show me all my stored produce lots")}
            className="flex overflow-hidden relative items-center p-4 rounded-xl border transition-all duration-300 group bg-[#FDE7B3]/20 border-[#FFC50F]/30 hover:border-[#FFC50F]/60"
          >
            <span className="mr-3 text-[#63A361]">🌾</span>
            <span className="text-sm font-medium">My Stored Crops</span>
          </button>
          <button
            onClick={() => onSelect("Give me a summary of my warehouse and alerts")}
            className="flex overflow-hidden relative items-center p-4 rounded-xl border transition-all duration-300 group bg-[#FDE7B3]/20 border-[#FFC50F]/30 hover:border-[#FFC50F]/60"
          >
            <span className="mr-3 text-[#63A361]">🏭</span>
            <span className="text-sm font-medium">Storage Summary</span>
          </button>
        </>
      )}
    </div>
  )
}

const AgriTechChatbot: React.FC<AgriTechChatbotProps> = ({
  characterLimit = 100,
  cooldownDuration = 15,
  language = "en",
  showTimer = true,
  showCharacterCount = true,
  userLocation,
  defaultExpanded = false,
  allowExpansion = true,
}) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState<string>("")
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded)
  const [error, setError] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState<number>(0)
  const [lastMessageTime, setLastMessageTime] = useState<number>(0)
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState<string>("")
  const [currentThinking, setCurrentThinking] = useState<string>("")
  const [isRecording, setIsRecording] = useState<boolean>(false)
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false)
  const [recordingDuration, setRecordingDuration] = useState<number>(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)

  const t = translations[language]
  const { user, token } = useAuth()

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [scrollToBottom])

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => Math.max(0, prev - 1))
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [cooldown])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newInput = e.target.value
    if (newInput.length <= characterLimit) {
      setInput(newInput)
      setError(null)
    } else {
      setError(t.errorLimit)
    }
  }

  const getInputColor = () => {
    const ratio = input.length / characterLimit
    if (ratio < 0.8) return "text-gray-600"
    if (ratio < 1) return "text-yellow-500"
    return "text-red-500"
  }

  const handleSendMessage = useCallback(async () => {
    if (input.trim() === "") {
      setError(t.errorEmpty)
      return
    }

    if (input.length > characterLimit) {
      setError(t.errorLimit)
      return
    }

    const currentTime = Date.now()
    if (currentTime - lastMessageTime < cooldownDuration * 1000) {
      setError(t.errorCooldown)
      return
    }

    setIsLoading(true)
    setError(null)
    // Remove voice indicator if present
    const userMessage = input.replace(/^🎤\s*/, '')
    setMessages((prev) => [...prev, { text: userMessage, sender: "user", timestamp: currentTime, status: "sending" }])
    setInput("")
    setLastMessageTime(currentTime)
    setCooldown(cooldownDuration)

    try {
      let accumulatedResponse = ""
      let accumulatedThinking = ""

      // Fetch DB context / handle mutations via backend
      let dbContext: string | undefined
      if (user && token) {
        try {
          const result = await getDbContext(userMessage, token)

          // Mutation responses (consent prompt, confirm, reject) come back as directReply
          // Skip the AI call entirely — show the reply directly
          if (result.directReply) {
            setMessages(prev => [
              ...prev.slice(0, -1),
              { text: userMessage, sender: "user", timestamp: currentTime, status: "sent" },
              { text: result.directReply!, sender: "ai", timestamp: Date.now() }
            ])
            setIsLoading(false)
            return
          }

          dbContext = result.context ?? undefined
        } catch { /* DB context is optional — fall through to normal AI */ }
      }


      const finalText = await aiService.getAIResponse(
        input, // Use original input with voice indicator for AI context
        {
          userLanguage: language,
          userLocation,
          dbContext,
          previousMessages: messages.map(msg => ({
            role: msg.sender === "user" ? "user" : "assistant",
            content: msg.text
          }))
        },
        ({ text, done, thinking }) => {
          if (!done) {
            if (text) {
              accumulatedResponse += text
              setCurrentStreamingMessage(accumulatedResponse)
            }
            if (thinking) {
              accumulatedThinking += thinking
              setCurrentThinking(accumulatedThinking)
            }
          }
        }
      )

      const answer = (finalText && finalText.trim().length > 0)
        ? finalText.trim()
        : (accumulatedResponse && accumulatedResponse.trim().length > 0
          ? accumulatedResponse.trim()
          : "Sorry, I couldn't generate a response just now. Please try again.")

      setMessages(prev => [
        ...prev.slice(0, -1),
        { text: userMessage, sender: "user", timestamp: currentTime, status: "sent" },
        { text: answer, sender: "ai", timestamp: Date.now(), thinking: accumulatedThinking }
      ])
      setCurrentStreamingMessage("")
      setCurrentThinking("")
    } catch (error) {
      console.error("Error getting AI response:", error)
      setError(error instanceof Error ? error.message : "An error occurred")
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { text: userMessage, sender: "user", timestamp: currentTime, status: "error" },
        {
          text: "I apologize, but I'm having trouble responding right now. Please try again.",
          sender: "ai",
          timestamp: Date.now()
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }, [input, characterLimit, cooldownDuration, lastMessageTime, t, language, userLocation, messages])

  const handleClearChat = useCallback(() => {
    setMessages([])
    setError(null)
  }, [])

  const handleQuickAction = (action: string) => {
    setInput(action)
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  const startRecording = useCallback(async () => {
    try {
      // Check if MediaRecorder is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Voice recording is not supported in this browser. Please use a modern browser.')
        return
      }

      if (!window.MediaRecorder) {
        setError('Voice recording is not supported in this browser. Please use a modern browser.')
        return
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })

      // Check for supported MIME types
      let mimeType = 'audio/webm;codecs=opus'
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm'
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/mp4'
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = '' // Let browser choose
          }
        }
      }

      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)

      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/webm' })
        await processAudioRecording(audioBlob)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event)
        setError('Recording error occurred. Please try again.')
        setIsRecording(false)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start(100) // Collect data every 100ms
      setIsRecording(true)
      setRecordingDuration(0)

      // Start recording timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => {
          const newDuration = prev + 1
          // Auto-stop recording after 60 seconds
          if (newDuration >= 60) {
            stopRecording()
          }
          return newDuration
        })
      }, 1000)

    } catch (error) {
      console.error('Error starting recording:', error)
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          setError('Microphone access denied. Please allow microphone access to use voice input.')
        } else if (error.name === 'NotFoundError') {
          setError('No microphone found. Please connect a microphone to use voice input.')
        } else if (error.name === 'NotSupportedError') {
          setError('Voice recording is not supported in this browser.')
        } else {
          setError(`Recording error: ${error.message}`)
        }
      } else {
        setError('Failed to start recording. Please try again.')
      }
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
        recordingTimerRef.current = null
      }
    }
  }, [isRecording])

  const processAudioRecording = useCallback(async (audioBlob: Blob) => {
    setIsTranscribing(true)
    setError(null)

    try {
      // Detect language first
      const detectedLanguage = await detectLanguage(audioBlob)

      // Transcribe audio
      const transcription = await transcribeAudio(audioBlob, {
        language: detectedLanguage,
        prompt: "Agricultural and farming related conversation. Include technical terms, crop names, and farming practices.",
        response_format: "verbose_json"
      })

      if (transcription.text && transcription.text.trim().length > 0) {
        // Add voice indicator to the input
        const voiceInput = `🎤 ${transcription.text.trim()}`
        setInput(voiceInput)

        // Auto-send the transcribed message after a short delay
        setTimeout(() => {
          // Use the current input state directly to avoid dependency issues
          const currentInput = voiceInput
          if (currentInput.trim() === "") {
            setError(t.errorEmpty)
            return
          }

          if (currentInput.length > characterLimit) {
            setError(t.errorLimit)
            return
          }

          const currentTime = Date.now()
          if (currentTime - lastMessageTime < cooldownDuration * 1000) {
            setError(t.errorCooldown)
            return
          }

          setIsLoading(true)
          setError(null)
          // Remove voice indicator if present
          const userMessage = currentInput.replace(/^🎤\s*/, '')
          setMessages((prev) => [...prev, { text: userMessage, sender: "user", timestamp: currentTime, status: "sending" }])
          setInput("")
          setLastMessageTime(currentTime)
          setCooldown(cooldownDuration)

          // Process the AI response
          aiService.getAIResponse(
            currentInput, // Use original input with voice indicator for AI context
            {
              userLanguage: language,
              userLocation,
              previousMessages: messages.map(msg => ({
                role: msg.sender === "user" ? "user" : "assistant",
                content: msg.text
              }))
            },
            ({ text, done, thinking }) => {
              if (!done) {
                if (text) {
                  setCurrentStreamingMessage(prev => prev + text)
                }
                if (thinking) {
                  setCurrentThinking(prev => prev + thinking)
                }
              }
            }
          ).then(finalText => {
            const answer = (finalText && finalText.trim().length > 0)
              ? finalText.trim()
              : "Sorry, I couldn't generate a response just now. Please try again."

            setMessages(prev => [
              ...prev.slice(0, -1),
              { text: userMessage, sender: "user", timestamp: currentTime, status: "sent" },
              { text: answer, sender: "ai", timestamp: Date.now(), thinking: currentThinking }
            ])
            setCurrentStreamingMessage("")
            setCurrentThinking("")
            setIsLoading(false)
          }).catch(error => {
            console.error("Error getting AI response:", error)
            setError(error instanceof Error ? error.message : "An error occurred")
            setMessages((prev) => [
              ...prev.slice(0, -1),
              { text: userMessage, sender: "user", timestamp: currentTime, status: "error" },
              {
                text: "I apologize, but I'm having trouble responding right now. Please try again.",
                sender: "ai",
                timestamp: Date.now()
              },
            ])
            setIsLoading(false)
          })
        }, 500)
      } else {
        setError('No speech detected. Please try speaking more clearly.')
      }
    } catch (error) {
      console.error('Error processing audio:', error)
      setError('Failed to process voice input. Please try again.')
    } finally {
      setIsTranscribing(false)
      setRecordingDuration(0)
    }
  }, [characterLimit, cooldownDuration, lastMessageTime, t, language, userLocation, messages])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
      }
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop()
      }
    }
  }, [isRecording])

  return (
    <div className="fixed right-4 bottom-4 z-50 md:right-8 md:bottom-8">
      {isOpen && (
        <div
          className="flex overflow-hidden flex-col rounded-2xl shadow-2xl backdrop-blur-sm bg-white/95"
          style={{
            width: isExpanded ? "min(90vw, 800px)" : "min(90vw, 400px)",
            height: isExpanded ? "min(90vh, 800px)" : "min(90vh, 600px)"
          }}
        >
          <div className="flex justify-between items-center p-6 text-white bg-[#63A361] rounded-t-2xl">
            <div className="flex items-center space-x-4">
              <div className="flex justify-center items-center w-12 h-12 text-[#63A361] rounded-xl shadow-inner backdrop-blur-sm bg-white/90">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Kisan AI</h3>
                <p className="text-sm opacity-90">Your Personal AI Assistant</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="secondary"
                onClick={handleClearChat}
                className="p-2"
              >
                <Trash2 className="w-5 h-5" />
              </Button>
              {isLoading && (
                <Button
                  variant="secondary"
                  onClick={() => cancelActiveRequest()}
                  className="px-3 py-2"
                >
                  Stop
                </Button>
              )}
              {allowExpansion && (
                <Button
                  variant="secondary"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-2"
                >
                  {isExpanded ? (
                    <Minimize2 className="w-5 h-5" />
                  ) : (
                    <Maximize2 className="w-5 h-5" />
                  )}
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={() => setIsOpen(false)}
                className="p-2"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <div className="overflow-hidden relative flex-1">
            <div className="absolute inset-0 bg-[#FDE7B3]/5" />
            <div ref={chatContainerRef} className="overflow-y-auto relative p-6 space-y-6 h-full scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
              {error && (
                <div className="p-4 text-sm text-red-600 rounded-xl shadow-lg bg-red-50/90">
                  {error}
                </div>
              )}
              {messages.length === 0 && (
                <QuickActions onSelect={handleQuickAction} isLoggedIn={!!user} />
              )}
              {messages.map((message, index) => (
                <MessageComponent key={index} message={message} />
              ))}
              {(currentStreamingMessage || currentThinking) && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="p-4 rounded-xl max-w-[80%] shadow-lg bg-white/90 text-gray-800 border border-gray-200/20"
                >
                  <div className="space-y-2">
                    {currentStreamingMessage ? (
                      <MarkdownMessage content={currentStreamingMessage} />
                    ) : (
                      <div className="text-sm opacity-80">Drafting response…</div>
                    )}
                    {currentThinking && (
                      <ThinkingDropdown thinking={currentThinking} />
                    )}
                  </div>
                </motion.div>
              )}
              {isLoading && !(currentStreamingMessage || currentThinking) && <ThinkingIndicator />}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="relative p-6 bg-white">
            {showCharacterCount && (
              <div className={`mb-2 text-xs ${getInputColor()}`}>
                {characterLimit - input.length} {t.remainingChars}
              </div>
            )}
            <div className="flex mb-4 space-x-3">
              <div className="relative flex-grow">
                <Input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                  placeholder={t.placeholder}
                  className={`flex-grow ${input.startsWith('🎤') ? 'border-blue-400 bg-blue-50' : ''}`}
                  disabled={cooldown > 0 || isTranscribing}
                />
                {input.startsWith('🎤') && (
                  <div className="absolute right-3 top-1/2 text-sm text-blue-600 transform -translate-y-1/2">
                    🎤 Voice
                  </div>
                )}
              </div>
              <Button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isTranscribing || isLoading}
                className={`p-3 ${isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                variant="primary"
                title={isRecording ? t.tapToStop : t.tapToRecord}
              >
                {isRecording ? (
                  <Square className="w-5 h-5" />
                ) : (
                  <Mic className="w-5 h-5" />
                )}
              </Button>
              <Button
                onClick={handleSendMessage}
                disabled={isLoading || cooldown > 0 || input.length > characterLimit || isTranscribing}
                className="p-3"
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
            {showTimer && cooldown > 0 && (
              <div className="mb-4 text-xs text-center text-gray-600">
                {t.cooldownMessage} {cooldown} {t.seconds}
              </div>
            )}
            {(isRecording || isTranscribing) && (
              <div className="mb-4 text-xs text-center">
                {isRecording && (
                  <div className="flex justify-center items-center space-x-2 text-red-600">
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 1 }}
                      className="w-2 h-2 bg-red-600 rounded-full"
                    />
                    <span>{t.recording} {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}</span>
                  </div>
                )}
                {isTranscribing && (
                  <div className="flex justify-center items-center space-x-2 text-blue-600">
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>{t.transcribing}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="p-4 text-white bg-[#63A361] rounded-xl shadow-lg transition-all duration-300 hover:bg-[#5B532C]"
        >
          <FaRocketchat className="w-6 h-6" />
        </button>
      )}
    </div>
  )
}

export default AgriTechChatbot