import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'secret';

export async function POST(req: Request) {
  const { username, password } = await req.json();

  // 验证账号密码（简单写死）
  if (username === 'beavernail' && password === 'DylanBee23!') {
    const accessToken = jwt.sign({ username }, SECRET, { expiresIn: '5s' });
    const refreshToken = jwt.sign({ username }, SECRET, { expiresIn: '5s' });

    return NextResponse.json({ accessToken, refreshToken });
  }

  return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
}