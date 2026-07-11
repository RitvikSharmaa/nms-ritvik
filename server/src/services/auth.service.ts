import bcrypt from "bcrypt";
import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env";
import { userRepository } from "../repositories/user.repository";
import { unauthorized } from "../utils/http-error";
import type { AuthUser } from "../domain/types";

export const authService = {
  async login(username: string, password: string): Promise<{ token: string; user: AuthUser }> {
    const user = await userRepository.findByUsername(username);
    if (!user || !user.active) throw unauthorized("Invalid credentials");
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) throw unauthorized("Invalid credentials");

    const permissions = await userRepository.permissionsForRole(user.role);
    const payload: AuthUser = {
      id: user.id,
      username: user.username,
      role: user.role,
      permissions,
    };
    const token = jwt.sign(payload, env.jwtSecret, {
      expiresIn: env.jwtExpiresIn,
    } as SignOptions);
    await userRepository.touchLogin(user.id);
    return { token, user: payload };
  },

  async hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, env.bcryptRounds);
  },
};
