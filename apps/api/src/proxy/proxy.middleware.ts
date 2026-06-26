import { Injectable, NestMiddleware, UnauthorizedException, NotFoundException, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { ContainerManager } from '../terminal/container.manager';

@Injectable()
export class ProxyMiddleware implements NestMiddleware {
  private readonly logger = new Logger(ProxyMiddleware.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly containerManager: ContainerManager,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Expected path: /proxy/:workspaceId/:port/...
    const match = req.path.match(/^\/proxy\/([^\/]+)\/(\d+)(?:\/(.*))?$/);
    
    if (!match) {
      return res.status(404).send('Invalid proxy path format');
    }

    const [, workspaceId, portStr, targetPath = ''] = match;
    const port = parseInt(portStr, 10);

    // Authentication
    const token = this.extractToken(req);
    if (!token) {
      return res.status(401).send('Unauthorized: No token provided');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);
      
      // Verify workspace membership
      const member = await this.prisma.workspaceMember.findUnique({
        where: { userId_workspaceId: { userId: payload.sub, workspaceId } },
      });

      if (!member) {
        return res.status(403).send('Forbidden: Not a member of this workspace');
      }
    } catch (e) {
      return res.status(401).send('Unauthorized: Invalid token');
    }

    // Check if port is active
    const activePorts = this.containerManager.getActivePorts(workspaceId);
    if (!activePorts.includes(port)) {
      return res.status(502).send(`Bad Gateway: Port ${port} is not listening in workspace ${workspaceId}`);
    }

    // Get container IP
    const containerIp = await this.containerManager.getContainerIp(workspaceId);
    if (!containerIp) {
      return res.status(502).send(`Bad Gateway: Could not resolve container IP for workspace ${workspaceId}`);
    }

    const targetUrl = `http://${containerIp}:${port}`;
    this.logger.debug(`Proxying request for workspace ${workspaceId} port ${port} to ${targetUrl}/${targetPath}`);

    // Create and execute proxy
    const proxy = createProxyMiddleware({
      target: targetUrl,
      changeOrigin: true,
      ws: true,
      pathRewrite: (path, req) => {
        const url = req.url || '';
        return `/${targetPath}` + (url.includes('?') ? '?' + url.split('?')[1] : '');
      },
    });

    proxy(req, res, next);
  }

  private extractToken(req: Request): string | undefined {
    // 1. From Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.split(' ')[1];
    }
    // 2. From query string (useful for iframes, EventSource, etc.)
    if (req.query.token && typeof req.query.token === 'string') {
      return req.query.token;
    }
    // 3. From cookies (if we had cookie-parser)
    return undefined;
  }
}
