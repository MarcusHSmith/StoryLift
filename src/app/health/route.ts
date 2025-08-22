import { NextResponse } from 'next/server';

export async function GET() {
  const buildTime = new Date().toISOString();
  const version = process.env.npm_package_version || '1.0.0';

  return NextResponse.json({
    status: 'healthy',
    version,
    buildTime,
    timestamp: new Date().toISOString(),
  });
}
