// =============================================================================
// Auth Controller
// =============================================================================
// Controller REST pour l'authentification
//
// Endpoints:
// - POST /api/v1/auth/register : Inscription
// - POST /api/v1/auth/login    : Connexion
// - GET  /api/v1/auth/me       : Profil utilisateur (protégé)
// =============================================================================

import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CommandBus } from '@nestjs/cqrs';
import { RegisterUserCommand } from '../../application/commands';
import { AuthService } from '../../infrastructure/services/auth.service';
import {
  RegisterDto,
  LoginDto,
  AuthResponseDto,
  RegisterResponseDto,
  UserResponseDto,
} from '../dtos';
import { Public } from '../decorators/public.decorator';
import { CurrentUser, AuthenticatedUser } from '../decorators/current-user.decorator';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@ApiTags('Identity')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly authService: AuthService,
  ) {}

  // ===========================================================================
  // POST /auth/register
  // ===========================================================================
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new user',
    description:
      'Creates a new user account. Available roles: GARAGE (garagiste) or SUPPLIER (fournisseur)',
  })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    type: RegisterResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async register(@Body() dto: RegisterDto): Promise<RegisterResponseDto> {
    const command = new RegisterUserCommand(
      dto.email,
      dto.password,
      dto.companyName,
      dto.role,
    );

    const result = await this.commandBus.execute(command);

    return {
      message: 'User registered successfully',
      user: {
        id: result.id,
        email: result.email,
        companyName: result.companyName,
        role: result.role,
        isActive: result.isActive,
      },
    };
  }

  // ===========================================================================
  // POST /auth/login
  // ===========================================================================
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login',
    description: 'Authenticates a user and returns a JWT token',
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto.email, dto.password);
  }

  // ===========================================================================
  // GET /auth/me
  // ===========================================================================
  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current user profile',
    description: 'Returns the profile of the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'User profile',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@CurrentUser() user: AuthenticatedUser): Promise<UserResponseDto> {
    return {
      id: user.id,
      email: user.email,
      companyName: user.companyName,
      role: user.role,
      isActive: true,
    };
  }
}
