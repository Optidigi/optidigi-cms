'use client'

import { createContext, useContext } from 'react'
import type { AssistantMessage } from './protocol'

export const Conversation = createContext({
  messages: [] as AssistantMessage[],
  setMessages: (_messages: AssistantMessage[]) => {},
})

export const useAssistantConversation = () => useContext(Conversation)
