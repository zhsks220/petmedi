import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto, ChangePasswordDto, AdminUpdateUserDto, UserResponseDto } from './dto/user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('사용자')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: '사용자 목록 (관리자)', description: '모든 사용자 목록을 조회합니다' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: '사용자 목록 조회 성공' })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.usersService.findAll(page || 1, limit || 20);
  }

  @Get(':id')
  @ApiOperation({ summary: '사용자 상세', description: '특정 사용자의 상세 정보를 조회합니다' })
  @ApiResponse({ status: 200, description: '사용자 조회 성공', type: UserResponseDto })
  @ApiResponse({ status: 404, description: '사용자 없음' })
  async findById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: '사용자 수정', description: '사용자 정보를 수정합니다 (본인만 가능)' })
  @ApiResponse({ status: 200, description: '사용자 수정 성공', type: UserResponseDto })
  @ApiResponse({ status: 403, description: '권한 없음' })
  @ApiResponse({ status: 404, description: '사용자 없음' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser('id') currentUserId: string,
  ) {
    return this.usersService.update(id, dto, currentUserId);
  }

  @Post(':id/change-password')
  @ApiOperation({ summary: '비밀번호 변경', description: '비밀번호를 변경합니다 (본인만 가능)' })
  @ApiResponse({ status: 200, description: '비밀번호 변경 성공' })
  @ApiResponse({ status: 400, description: '현재 비밀번호 불일치' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  async changePassword(
    @Param('id') id: string,
    @Body() dto: ChangePasswordDto,
    @CurrentUser('id') currentUserId: string,
  ) {
    return this.usersService.changePassword(id, dto, currentUserId);
  }

  @Put(':id/admin')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: '사용자 수정 (관리자)', description: '관리자가 사용자 정보를 수정합니다' })
  @ApiResponse({ status: 200, description: '사용자 수정 성공', type: UserResponseDto })
  @ApiResponse({ status: 404, description: '사용자 없음' })
  async adminUpdate(@Param('id') id: string, @Body() dto: AdminUpdateUserDto) {
    return this.usersService.adminUpdate(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: '사용자 삭제 (관리자)', description: '사용자를 비활성화합니다' })
  @ApiResponse({ status: 200, description: '사용자 삭제 성공' })
  @ApiResponse({ status: 404, description: '사용자 없음' })
  async delete(@Param('id') id: string) {
    return this.usersService.delete(id);
  }
}
