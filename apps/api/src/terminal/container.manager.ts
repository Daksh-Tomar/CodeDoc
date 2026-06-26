import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Docker from 'dockerode';
import { WorkspaceService } from '../workspace/workspace.service';

export interface ActivePort {
  port: number;
  workspaceId: string;
  protocol: string;
}

@Injectable()
export class ContainerManager implements OnModuleDestroy {
  private readonly logger = new Logger(ContainerManager.name);
  private docker: Docker;
  private activeContainers = new Map<string, Docker.Container>();
  private activePorts = new Map<string, Set<number>>();
  private portPoller: NodeJS.Timeout;

  constructor(private readonly workspaceService: WorkspaceService) {
    this.docker = new Docker();
    this.portPoller = setInterval(() => this.pollPorts(), 5000);
  }

  async onModuleDestroy() {
    clearInterval(this.portPoller);
    for (const [workspaceId, container] of this.activeContainers.entries()) {
      try {
        await container.stop();
        await container.remove();
        this.logger.log(`Cleaned up container for workspace ${workspaceId}`);
      } catch (e) {
        this.logger.error(`Error cleaning up container for workspace ${workspaceId}`, e);
      }
    }
  }

  async getOrCreateContainer(workspaceId: string): Promise<Docker.Container> {
    if (this.activeContainers.has(workspaceId)) {
      return this.activeContainers.get(workspaceId)!;
    }

    this.logger.log(`Creating container for workspace ${workspaceId}`);
    const workspacePath = this.workspaceService.getWorkspacePath(workspaceId);

    // Docker for Windows typically needs /c/Users/... format or just standard C:/Users/...
    // dockerode handles C:\Users\... well if we map it properly in Windows.
    // However, WSL/Docker Desktop Windows bind mounts need careful formatting.
    // Usually C:\Users\... works fine in Docker Desktop.
    
    // Convert path to use forward slashes for docker bind mount
    const bindPath = workspacePath.replace(/\\/g, '/');

    const container = await this.docker.createContainer({
      Image: 'node:22-bookworm-slim',
      Tty: true,
      Cmd: ['/bin/bash'],
      WorkingDir: '/workspace',
      HostConfig: {
        Binds: [`${bindPath}:/workspace`],
        // Required for fetching internal IP easily if we use bridge network
        NetworkMode: 'bridge'
      },
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
      OpenStdin: true,
      StdinOnce: false,
      Labels: {
        workspaceId,
      }
    });

    await container.start();
    
    // We can run apt-get update && apt-get install -y iproute2 to get `ss` command for port detection
    // Or just use /proc/net/tcp. Let's install iproute2 for reliability.
    try {
      const exec = await container.exec({
        Cmd: ['sh', '-c', 'apt-get update && apt-get install -y iproute2'],
        AttachStdout: true,
        AttachStderr: true
      });
      await exec.start({});
    } catch(e) {
      this.logger.warn(`Failed to install iproute2 in container: ${e.message}`);
    }

    this.activeContainers.set(workspaceId, container);
    this.activePorts.set(workspaceId, new Set());
    
    return container;
  }

  async getContainerIp(workspaceId: string): Promise<string | null> {
    const container = this.activeContainers.get(workspaceId);
    if (!container) return null;
    
    try {
      const info = await container.inspect();
      return (info as any).NetworkSettings.IPAddress || 
             (info as any).NetworkSettings.Networks['bridge']?.IPAddress || null;
    } catch (e) {
      return null;
    }
  }

  async getContainerStream(workspaceId: string, onData?: (chunk: Buffer) => void) {
    const container = await this.getOrCreateContainer(workspaceId);
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

  async stopContainer(workspaceId: string) {
    const container = this.activeContainers.get(workspaceId);
    if (container) {
      await container.stop();
      await container.remove();
      this.activeContainers.delete(workspaceId);
      this.activePorts.delete(workspaceId);
    }
  }

  private async pollPorts() {
    for (const [workspaceId, container] of this.activeContainers.entries()) {
      try {
        const exec = await container.exec({
          Cmd: ['ss', '-tlnH'],
          AttachStdout: true,
        });
        
        const stream = await exec.start({});
        
        let output = '';
        stream.on('data', (chunk) => {
          output += chunk.toString();
        });

        stream.on('end', () => {
          const newPorts = new Set<number>();
          const lines = output.split('\n');
          for (const line of lines) {
            // Example ss output line:
            // LISTEN 0 511 *:3000 *:*
            const match = line.match(/(?:\*|0\.0\.0\.0|127\.0\.0\.1|::):(\d+)/);
            if (match && match[1]) {
              const port = parseInt(match[1], 10);
              newPorts.add(port);
            }
          }
          
          const existingPorts = this.activePorts.get(workspaceId) || new Set();
          this.activePorts.set(workspaceId, newPorts);
          
          for (const port of newPorts) {
            if (!existingPorts.has(port)) {
              this.logger.log(`Detected new listening port ${port} in workspace ${workspaceId}`);
            }
          }
        });
      } catch (error) {
        this.logger.error(`Error polling ports for workspace ${workspaceId}: ${error.message}`);
      }
    }
  }

  getActivePorts(workspaceId: string): number[] {
    const ports = this.activePorts.get(workspaceId);
    return ports ? Array.from(ports) : [];
  }
}
