import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import argon2 from "argon2";
import { JwtService } from "@nestjs/jwt";
import type { User } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { UsersService } from "../users/users.service.js";
import { SignupDto } from "./dto/signup.dto.js";
import { LoginDto } from "./dto/login.dto.js";

type AuthPayload = {
  token: string;
  user: {
    id: string;
    email: string;
    name?: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  walletAddress?: string | null;
  walletPrivateKeyEncrypted?: string | null;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService
  ) {}

  async signup(dto: SignupDto): Promise<AuthPayload> {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      throw new ConflictException("Email is already registered.");
    }

    const passwordHash = await argon2.hash(dto.password);
    const walletAddress = dto.walletAddress.trim();
    const walletPrivateKeyEncrypted = dto.walletPrivateKeyEncrypted.trim();
    const createInput = {
      email,
      passwordHash,
      name: dto.name?.trim() || undefined,
      walletAddress,
      walletPrivateKeyEncrypted,
    };

    let created: User;
    try {
      created = await this.usersService.create(createInput);
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException("Email is already registered.");
      }
      throw error;
    }

    return this.createAuthPayload(created);
  }

  async login(dto: LoginDto): Promise<AuthPayload> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException("Invalid email or password.");
    }

    const isValidPassword = await argon2.verify(user.passwordHash, dto.password);
    if (!isValidPassword) {
      throw new UnauthorizedException("Invalid email or password.");
    }

    return this.createAuthPayload(user);
  }

  private async createAuthPayload(user: User): Promise<AuthPayload> {
    const token = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
    });

    return {
      token,
      user: this.sanitizeUser(user),
      walletAddress: user.walletAddress,
      walletPrivateKeyEncrypted: user.walletPrivateKeyEncrypted,
    };
  }

  private sanitizeUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
