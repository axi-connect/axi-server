import jwt, { SignOptions, Secret } from 'jsonwebtoken';

export interface JwtPayload {
  id: number;
  email: string;
  role_id: number;
  company_id: number;
  token_type: 'access' | 'refresh';
  jti?: string;
}

export class TokenService {
  private readonly jwtSecret: Secret;
  private readonly accessTtlSeconds: number;
  private readonly refreshTtlSeconds: number;

  constructor() {
    if (!process.env.JWT_SECRET_KEY) {
      throw new Error('JWT_SECRET_KEY no está definido');
    }
    this.jwtSecret = process.env.JWT_SECRET_KEY as Secret;
    const accessTtlRaw = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
    const refreshTtlRaw = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
    this.accessTtlSeconds = parseTtlToSeconds(accessTtlRaw);
    this.refreshTtlSeconds = parseTtlToSeconds(refreshTtlRaw);
  }

  signAccessToken(payload: Omit<JwtPayload, 'token_type'>): string {
    const fullPayload: JwtPayload = { ...payload, token_type: 'access' };
    const options: SignOptions = { expiresIn: this.accessTtlSeconds };
    return jwt.sign(fullPayload, this.jwtSecret, options);
  }

  signRefreshToken(payload: Omit<JwtPayload, 'token_type'>): string {
    const fullPayload: JwtPayload = { ...payload, token_type: 'refresh' };
    const options: SignOptions = { expiresIn: this.refreshTtlSeconds };
    return jwt.sign(fullPayload, this.jwtSecret, options);
  }

  verifyToken<T extends object = JwtPayload>(token: string): T {
    return jwt.verify(token, this.jwtSecret) as T;
  }
}

function parseTtlToSeconds(input: string): number {
  const trimmed = input.trim();
  const suffix = trimmed.slice(-1);
  const num = Number.parseInt(trimmed.slice(0, -1), 10);
  if (Number.isFinite(Number(trimmed))) return Number(trimmed);
  if (!Number.isFinite(num)) return 900; // default 15m
  switch (suffix) {
    case 's': return num;
    case 'm': return num * 60;
    case 'h': return num * 60 * 60;
    case 'd': return num * 60 * 60 * 24;
    default: return 900;
  }
}


