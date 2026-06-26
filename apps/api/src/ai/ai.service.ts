import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleGenAI } from '@google/genai';
import { Observable } from 'rxjs';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly ai: GoogleGenAI;

  constructor(private readonly prisma: PrismaService) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      this.logger.warn('GEMINI_API_KEY is missing from environment variables');
    }
    // Initialize the Gemini client
    this.ai = new GoogleGenAI({ apiKey: apiKey || 'dummy-key' });
  }

  /**
   * Retrieves or creates a chat session for a user on a specific document.
   */
  async getOrCreateSession(userId: string, documentId: string) {
    let session = await this.prisma.aIChatSession.findFirst({
      where: { userId, documentId },
    });

    if (!session) {
      session = await this.prisma.aIChatSession.create({
        data: { userId, documentId },
      });
    }

    return session;
  }

  /**
   * Get all messages for a session.
   */
  async getMessages(sessionId: string) {
    return this.prisma.aIMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Add a message to the session.
   */
  async addMessage(sessionId: string, role: string, content: string) {
    return this.prisma.aIMessage.create({
      data: { sessionId, role, content },
    });
  }

  /**
   * Stream a chat response using Gemini.
   */
  async streamChat(
    sessionId: string,
    userPrompt: string,
    context: any
  ): Promise<Observable<{ data: any }>> {
    const history = await this.getMessages(sessionId);
    
    // Construct the system context payload
    const systemInstruction = `You are a helpful coding assistant pair-programming with the user.
Current File Name: ${context.fileName || 'Unknown'}
Cursor Position: Line ${context.cursorLine}, Column ${context.cursorColumn}
Highlighted Code: ${context.selectionText || 'None'}

Current Document Content:
\`\`\`
${context.documentContent}
\`\`\`

If the user asks a general question, answer normally. If they ask about the code, use the context provided to give a highly relevant answer.`;

    const contents: any[] = [];
    for (const msg of history) {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      });
    }

    // Add current user prompt
    contents.push({
      role: 'user',
      parts: [{ text: userPrompt }]
    });

    try {
      const responseStream = await this.ai.models.generateContentStream({
        model: 'gemini-2.5-flash', // Default standard model
        contents,
        config: {
          systemInstruction: {
            role: 'system',
            parts: [{ text: systemInstruction }]
          }
        }
      });

      return new Observable((subscriber) => {
        let fullResponse = '';

        const consumeStream = async () => {
          try {
            for await (const chunk of responseStream) {
              const textChunk = chunk.text;
              fullResponse += textChunk;
              subscriber.next({ data: { text: textChunk } });
            }
            // Once finished, save the AI's response to the database
            await this.addMessage(sessionId, 'assistant', fullResponse);
            subscriber.next({ data: { text: '[DONE]' } });
            subscriber.complete();
          } catch (error) {
            this.logger.error('Error during streaming', error);
            subscriber.error(error);
          }
        };

        consumeStream();
      });
    } catch (error) {
      this.logger.error('Failed to initialize stream', error);
      throw error;
    }
  }

  /**
   * Generates a short summary of a file modification.
   */
  async generateSummary(diffText: string): Promise<string> {
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          { role: 'user', parts: [{ text: `Summarize this file modification concisely in 1 sentence:\n\n${diffText}` }] }
        ]
      });
      return response.text || 'File updated.';
    } catch (error) {
      this.logger.error('Failed to generate summary', error);
      return 'File updated.';
    }
  }
}
