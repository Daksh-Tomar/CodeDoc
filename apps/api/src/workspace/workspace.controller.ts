import { Controller, Get, Post, Delete, Patch, Param, Body, UseGuards, Request } from '@nestjs/common';
import { WorkspaceService } from './workspace.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { WorkspaceRole } from '@prisma/client';

@Controller('workspaces')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Get()
  async getWorkspaces(@Request() req: any) {
    return this.workspaceService.getUserWorkspaces(req.user.id);
  }

  @Post()
  async createWorkspace(@Request() req: any, @Body() data: { name: string }) {
    return this.workspaceService.createWorkspace(req.user.id, data.name);
  }

  @Roles(WorkspaceRole.VIEWER)
  @Get(':id')
  async getWorkspaceDetails(@Param('id') id: string) {
    return this.workspaceService.getWorkspaceDetails(id);
  }

  @Roles(WorkspaceRole.OWNER)
  @Delete(':id')
  async deleteWorkspace(@Param('id') id: string) {
    return this.workspaceService.deleteWorkspace(id);
  }

  @Roles(WorkspaceRole.ADMIN)
  @Post(':id/invite')
  async inviteUser(@Param('id') id: string, @Body() data: { email: string; role?: WorkspaceRole }) {
    return this.workspaceService.inviteUser(id, data.email, data.role || WorkspaceRole.VIEWER);
  }

  @Roles(WorkspaceRole.VIEWER)
  @Post(':id/request-access')
  async requestAccess(@Request() req: any, @Param('id') id: string, @Body() data: { requestedRole: WorkspaceRole }) {
    return this.workspaceService.createRoleRequest(id, req.user.id, data.requestedRole);
  }

  @Roles(WorkspaceRole.ADMIN)
  @Get(':id/role-requests')
  async getRoleRequests(@Param('id') id: string) {
    return this.workspaceService.getRoleRequests(id);
  }

  @Roles(WorkspaceRole.ADMIN)
  @Post(':id/approve-request')
  async approveRequest(@Request() req: any, @Param('id') id: string, @Body() data: { requestId: string; approve: boolean }) {
    return this.workspaceService.reviewRoleRequest(data.requestId, req.user.id, data.approve);
  }

  @Roles(WorkspaceRole.ADMIN)
  @Patch(':id/member-role')
  async updateMemberRole(@Param('id') id: string, @Body() data: { memberId: string; role: WorkspaceRole }) {
    return this.workspaceService.updateMemberRole(id, data.memberId, data.role);
  }

  @Roles(WorkspaceRole.ADMIN)
  @Delete(':id/member/:memberId')
  async removeMember(@Param('id') id: string, @Param('memberId') memberId: string) {
    return this.workspaceService.removeMember(id, memberId);
  }
}
