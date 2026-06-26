import { Controller, Post, Body, Req, Res, UseGuards, UnauthorizedException } from '@nestjs/common';
import { AiService } from './ai.service';
import { Observable } from 'rxjs';
import type { Request } from 'express';
import { JwtService } from '@nestjs/jwt';

interface ChatRequestDto {
  documentId: string;
  prompt: string;
  context: {
    fileName: string;
    documentContent: string;
    cursorLine: number;
    cursorColumn: number;
    selectionText: string;
  };
}

@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly jwtService: JwtService
  ) {}

  private extractUserIdFromRequest(req: Request): string {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authHeader.split(' ')[1];
    try {
      const payload = this.jwtService.verify(token);
      return payload.sub; // The user ID
    } catch (e) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  @Post('chat')
  async streamChat(
    @Req() req: Request,
    @Res() res: any,
    @Body() body: ChatRequestDto
  ) {
    const userId = this.extractUserIdFromRequest(req);
    const { documentId, prompt, context } = body;

    // 1. Get or create session
    const session = await this.aiService.getOrCreateSession(userId, documentId);

    // 2. Save user prompt
    await this.aiService.addMessage(session.id, 'user', prompt);

    // 3. Set headers for streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // 4. Stream response
    const stream = await this.aiService.streamChat(session.id, prompt, context);
    
    stream.subscribe({
      next: (val) => {
        res.write(`data: ${JSON.stringify(val.data)}\n\n`);
      },
      error: (err) => {
        res.end();
      },
      complete: () => {
        res.end();
      }
    });
  }

  @Post('history')
  async getHistory(
    @Req() req: Request,
    @Body() body: { documentId: string }
  ) {
    const userId = this.extractUserIdFromRequest(req);
    const session = await this.aiService.getOrCreateSession(userId, body.documentId);
    const messages = await this.aiService.getMessages(session.id);
    return messages;
  }
}
