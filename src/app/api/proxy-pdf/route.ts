/* eslint-disable no-console */
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');

  if (!url) {
    return new NextResponse('URL parameter required', { status: 400 });
  }

  if (!url.includes('cloudinary.com')) {
    return new NextResponse('Only Cloudinary URLs allowed', { status: 403 });
  }

  try {
    console.log('[PDF Proxy] Fetching:', url.substring(0, 80));

    const response = await fetch(url);

    if (!response.ok) {
      console.error('[PDF Proxy] Upstream error:', response.status);
      return new NextResponse(`Failed to fetch: ${response.status}`, { status: response.status });
    }

    const buffer = await response.arrayBuffer();
    console.log('[PDF Proxy] Success:', (buffer.byteLength / 1024).toFixed(0), 'KB');

    // Content-Disposition: inline tells the browser to DISPLAY the PDF, not download it
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline',
        'Content-Length': String(buffer.byteLength),
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (err) {
    console.error('[PDF Proxy] Error:', err instanceof Error ? err.message : err);
    return new NextResponse('Failed to fetch PDF', { status: 500 });
  }
}
