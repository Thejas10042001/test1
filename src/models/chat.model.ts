export interface ChatMessage {
  role: 'user' | 'model'; // 'model' represents the CIO
  content: string;
}
