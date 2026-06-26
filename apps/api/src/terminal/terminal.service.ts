import { Injectable, Logger } from '@nestjs/common';
import Docker from 'dockerode';

@Injectable()
export class TerminalService {
  private readonly logger = new Logger(TerminalService.name);
  private docker: Docker;
  private activeContainers = new Map<string, Docker.Container>();
  
  constructor() {
    this.docker = new Docker(); // connects to local docker socket by default
  }

  async getContainerStream(workspaceId: string, onData?: (chunk: Buffer) => void) {
    if (this.activeContainers.has(workspaceId)) {
      const container = this.activeContainers.get(workspaceId)!;
      const stream = await container.attach({
        stream: true,
        stdin: true,
        stdout: true,
        stderr: true,
        hijack: true
      });
      if (onData) {
        stream.on('data', onData);
      }
      return stream;
    }

    this.logger.log(`Starting terminal for workspace ${workspaceId}`);
    
    // Create a container with a TTY
    const container = await this.docker.createContainer({
      Image: 'node:22-bookworm-slim',
      Tty: true,
      Cmd: ['/bin/bash'],
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
      OpenStdin: true,
      StdinOnce: false,
      Labels: {
        workspaceId,
      }
    });

    const stream = await container.attach({
      stream: true,
      stdin: true,
      stdout: true,
      stderr: true,
      hijack: true
    });

    if (onData) {
      stream.on('data', onData);
    }

    await container.start();
    this.activeContainers.set(workspaceId, container);
    
    return stream;
  }

  async stopTerminal(workspaceId: string) {
    const container = this.activeContainers.get(workspaceId);
    if (container) {
      await container.stop();
      await container.remove();
      this.activeContainers.delete(workspaceId);
    }
  }
}
