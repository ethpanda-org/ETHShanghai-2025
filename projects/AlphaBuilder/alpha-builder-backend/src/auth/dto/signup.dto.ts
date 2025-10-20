import { IsEmail, IsOptional, IsString, MinLength } from "class-validator";

export class SignupDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsString()
  @MinLength(1)
  walletAddress!: string;

  @IsString()
  @MinLength(1)
  walletPrivateKeyEncrypted!: string;
}
