import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { IUser } from '@jpham-f61e989b-0ab4-475a-a70a-b3362a243b9d/data';

export const CurrentUser = createParamDecorator(
  (data: keyof IUser | undefined, ctx: ExecutionContext): IUser | IUser[keyof IUser] => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as IUser | undefined;

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    return data ? user[data] : user;
  },
);
