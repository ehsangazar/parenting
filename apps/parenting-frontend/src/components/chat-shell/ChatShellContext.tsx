import { createContext, useContext } from 'react';

export type ChatShellContextValue = {
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  /** Bumped each time the user requests a fresh conversation from the shell. */
  requestNewConversation: () => void;
  newConversationNonce: number;
};

export const ChatShellContext = createContext<ChatShellContextValue | null>(null);

export const useChatShell = () => {
  const ctx = useContext(ChatShellContext);
  if (!ctx) {
    throw new Error('useChatShell must be used within ChatShell');
  }
  return ctx;
};
