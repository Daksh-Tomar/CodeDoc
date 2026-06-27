import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { WorkspaceRole } from '@prisma/client';
import { ROLES_KEY } from './roles.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<WorkspaceRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const workspaceId = request.params.id || request.body.workspaceId;

    if (!user || !workspaceId) {
      return false;
    }

    const member = await this.prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: user.id,
          workspaceId: workspaceId,
        },
      },
    });

    if (!member) {
      return false;
    }

    // Role Hierarchy
    const roleHierarchy: Record<WorkspaceRole, number> = {
      OWNER: 4,
      ADMIN: 3,
      EDITOR: 2,
      VIEWER: 1,
    };

    const userRoleLevel = roleHierarchy[member.role];
    const hasRequiredRole = requiredRoles.some((role) => userRoleLevel >= roleHierarchy[role]);

    // Attach member object to request for downstream use
    request.workspaceMember = member;

    return hasRequiredRole;
  }
}
