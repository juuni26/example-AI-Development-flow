import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import bcrypt from "bcryptjs";
import type { AccessTokenPayload, LoginResponse } from "@cleandrop/shared";
import { UsersService } from "../users/users.service";
import { loadEnv } from "../config/env";

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string): Promise<LoginResponse> {
    const user = await this.users.findByEmail(email);

    // bcrypt.compare against a placeholder hash when the user does not exist
    // gives a constant-time-ish path that does not leak which input was wrong.
    const passwordOk = user
      ? await bcrypt.compare(password, user.passwordHash)
      : await bcrypt.compare(password, "$2b$10$invalidsaltforthrowawaycompare......................");

    if (!user || !passwordOk) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const env = loadEnv();
    const payload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: env.JWT_SECRET,
      expiresIn: env.ACCESS_TOKEN_TTL,
    });

    return {
      accessToken,
      user: { id: user.id, email: user.email, role: user.role },
    };
  }
}
