import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { type User as UserType, ROLE } from '@prisma/client';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor() {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const user: UserType | null = context.switchToHttp().getRequest().user;

    if (!user) throw new UnauthorizedException();

    try {
      if (!user.role.includes(ROLE.ADMIN)) {
        throw new ForbiddenException('Permission denied');
      }
    } catch {
      throw new UnauthorizedException();
    }
    return true;
  }
}
