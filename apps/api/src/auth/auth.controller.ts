import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { createZodDto } from "nestjs-zod";
import { loginRequestSchema, type LoginResponse } from "@cleandrop/shared";
import { AuthService } from "./auth.service";

class LoginDto extends createZodDto(loginRequestSchema) {}

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("login")
  @HttpCode(200)
  async login(@Body() body: LoginDto): Promise<LoginResponse> {
    return this.auth.login(body.email, body.password);
  }
}
