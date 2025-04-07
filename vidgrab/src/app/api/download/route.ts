import { type NextRequest, NextResponse } from 'next/server';
import ytdl from 'ytdl-core';

export async function POST(req: NextRequest) {
  try {
    const { url, format } = await req.json();

    if (!url) {
      return NextResponse.json(
        { error: 'YouTube URL is required' },
        { status: 400 }
      );
    }

    if (!ytdl.validateURL(url)) {
      return NextResponse.json(
        { error: 'Invalid YouTube URL' },
        { status: 400 }
      );
    }

    const info = await ytdl.getInfo(url);
    const videoDetails = {
      title: info.videoDetails.title,
      author: info.videoDetails.author.name,
      lengthSeconds: info.videoDetails.lengthSeconds,
      viewCount: info.videoDetails.viewCount,
      thumbnail: info.videoDetails.thumbnails[0].url,
    };

    let formats = [];

    if (format === 'video') {
      // For video formats (mp4)
      formats = ytdl.filterFormats(info.formats, 'videoandaudio');
      // Sort by quality
      formats.sort((a, b) => {
        const aQuality = a.qualityLabel ? Number.parseInt(a.qualityLabel) : 0;
        const bQuality = b.qualityLabel ? Number.parseInt(b.qualityLabel) : 0;
        return bQuality - aQuality;
      });
    } else if (format === 'audio') {
      // For audio formats (mp3)
      formats = ytdl.filterFormats(info.formats, 'audioonly');
      // Sort by audio quality
      formats.sort((a, b) => {
        return b.audioBitrate - a.audioBitrate;
      });
    }

    // Return the top 3 quality options or less if fewer are available
    const topFormats = formats.slice(0, 3).map(format => ({
      itag: format.itag,
      quality: format.qualityLabel || `${format.audioBitrate}kbps`,
      container: format.container,
      codecs: format.codecs,
      url: format.url,
    }));

    return NextResponse.json({
      videoDetails,
      formats: topFormats,
    });
  } catch (error) {
    console.error('Error fetching video:', error);
    return NextResponse.json(
      { error: 'Failed to fetch video information' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const videoUrl = url.searchParams.get('url');
  const itag = url.searchParams.get('itag');
  const filename = url.searchParams.get('filename');

  if (!videoUrl || !itag) {
    return NextResponse.json(
      { error: 'URL and itag are required' },
      { status: 400 }
    );
  }

  try {
    const options = {
      quality: itag,
    };

    const videoStream = ytdl(videoUrl, options);

    // Create headers for streaming response
    const headers = new Headers();
    headers.set('Content-Disposition', `attachment; filename="${filename || 'video.mp4'}"`);
    headers.set('Content-Type', 'application/octet-stream');

    // Create a TransformStream to pipe the ytdl stream to the response
    const { readable, writable } = new TransformStream();

    // Pipe the ytdl stream to the TransformStream's writable end
    videoStream.on('data', (chunk) => {
      const writer = writable.getWriter();
      writer.write(chunk).then(() => {
        writer.releaseLock();
      });
    });

    videoStream.on('end', () => {
      const writer = writable.getWriter();
      writer.close();
    });

    videoStream.on('error', (err) => {
      console.error('Error streaming video:', err);
      const writer = writable.getWriter();
      writer.abort(err);
    });

    // Return a streaming response
    return new NextResponse(readable, {
      headers,
    });
  } catch (error) {
    console.error('Error downloading video:', error);
    return NextResponse.json(
      { error: 'Failed to download video' },
      { status: 500 }
    );
  }
}
