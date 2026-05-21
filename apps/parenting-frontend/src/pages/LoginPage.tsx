import { AuthChat } from '../components/chat-shell/AuthChat.js';

export const LoginPage = ({ initialMode = 'login' }: { initialMode?: 'login' | 'signup' }) => (
  <AuthChat initialMode={initialMode} />
);
