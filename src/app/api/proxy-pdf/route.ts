/* eslint-disable no-console */
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL parameter required' }, { status: 400 });
  }

  // Only allow Cloudinary URLs
  if (!url.includes('cloudinary.com')) {
    return NextResponse.json({ error: 'Only Cloudinary URLs allowed' }, { status: 403 });
  }

  try {
    console.log('[PDF Proxy] Fetching:', url.substring(0, 80));

    const response = await fetch(url, {
      headers: { 'Accept': '*/*' },
    });

    if (!response.ok) {
      console.error('[PDF Proxy] Upstream error:', response.status);
      return NextResponse.json(
        { error: `Upstream returned ${response.status}` },
        { status: response.status }
      );
    }

    const buffer = await response.arrayBuffer();
    console.log('[PDF Proxy] Success:', (buffer.byteLength / 1024).toFixed(0), 'KB');

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': String(buffer.byteLength),
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (err: any) {
    console.error('[PDF Proxy] Error:', err.message);
    return NextResponse.json({ error: 'Failed to fetch PDF' }, { status: 500 });
  }
}
