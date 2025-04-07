"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { SearchIcon, DownloadIcon, PlayIcon } from "lucide-react";

type VideoFormat = {
  itag: string;
  quality: string;
  container: string;
  codecs: string;
  url: string;
};

type VideoDetails = {
  title: string;
  author: string;
  lengthSeconds: string;
  viewCount: string;
  thumbnail: string;
};

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [formatType, setFormatType] = useState<"video" | "audio">("video");
  const [videoDetails, setVideoDetails] = useState<VideoDetails | null>(null);
  const [formats, setFormats] = useState<VideoFormat[]>([]);
  const [downloadOpen, setDownloadOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!url) {
      toast.error("Please enter a YouTube URL");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url,
          format: formatType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "An error occurred");
      }

      setVideoDetails(data.videoDetails);
      setFormats(data.formats);
      setDownloadOpen(true);
    } catch (error) {
      console.error("Error:", error);
      toast.error((error as Error).message || "Failed to fetch video");
    } finally {
      setLoading(false);
    }
  }

  function formatDuration(seconds: string) {
    const sec = Number.parseInt(seconds);
    const hours = Math.floor(sec / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    const remainingSeconds = sec % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
    }

    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  }

  function formatViewCount(count: string) {
    const num = Number.parseInt(count);
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M views`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K views`;
    }
    return `${num} views`;
  }

  function handleDownload(format: VideoFormat) {
    const filename = videoDetails ?
      `${videoDetails.title.replace(/[^a-z0-9]/gi, '_')}.${format.container}` :
      `video.${format.container}`;

    const downloadUrl = `/api/download?url=${encodeURIComponent(url)}&itag=${format.itag}&filename=${encodeURIComponent(filename)}`;

    // Create a temporary link and click it to start the download
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Download started!");
    setDownloadOpen(false);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-b from-blue-50 to-white">
      <div className="w-full max-w-4xl mx-auto">
        <Card className="w-full shadow-xl border-none">
          <CardHeader className="text-center bg-blue-600 text-white rounded-t-lg">
            <CardTitle className="text-3xl font-bold">VidGrab</CardTitle>
            <CardDescription className="text-blue-100 text-lg">
              Download YouTube videos to MP3 and MP4 online for free
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6 pb-4 px-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex flex-col space-y-2">
                <Label htmlFor="url" className="text-lg font-medium">
                  Enter YouTube URL
                </Label>
                <div className="relative">
                  <Input
                    id="url"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="pl-10 h-14 text-base"
                  />
                  <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                </div>
              </div>

              <div className="flex justify-center space-x-4">
                <Button
                  type="button"
                  variant={formatType === "video" ? "default" : "outline"}
                  onClick={() => setFormatType("video")}
                  className="w-40 h-12 text-base font-medium"
                >
                  <PlayIcon className="mr-2 h-5 w-5" />
                  MP4 (Video)
                </Button>
                <Button
                  type="button"
                  variant={formatType === "audio" ? "default" : "outline"}
                  onClick={() => setFormatType("audio")}
                  className="w-40 h-12 text-base font-medium"
                >
                  <PlayIcon className="mr-2 h-5 w-5" />
                  MP3 (Audio)
                </Button>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-14 text-lg font-bold"
              >
                {loading ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Processing...
                  </div>
                ) : (
                  <>
                    <DownloadIcon className="mr-2 h-6 w-6" />
                    Download
                  </>
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="text-center text-sm text-gray-500 pb-6">
            By using our service you accept our Terms of Service
          </CardFooter>
        </Card>

        {/* Download Dialog */}
        <Dialog open={downloadOpen} onOpenChange={setDownloadOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="text-2xl">Download Options</DialogTitle>
              <DialogDescription>
                Select your preferred format and quality
              </DialogDescription>
            </DialogHeader>

            {videoDetails && (
              <div className="grid grid-cols-1 md:grid-cols-[1fr,2fr] gap-4 py-4">
                <div className="aspect-video relative rounded-lg overflow-hidden">
                  {videoDetails.thumbnail && (
                    <img
                      src={videoDetails.thumbnail}
                      alt={videoDetails.title}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="flex flex-col">
                  <h3 className="text-xl font-semibold mb-2">{videoDetails.title}</h3>
                  <p className="text-gray-500 mb-1">{videoDetails.author}</p>
                  <div className="flex space-x-3 text-sm text-gray-500 mb-4">
                    <span>{formatDuration(videoDetails.lengthSeconds)}</span>
                    <span>•</span>
                    <span>{formatViewCount(videoDetails.viewCount)}</span>
                  </div>

                  <div className="mt-auto">
                    <h4 className="font-medium mb-2">Available {formatType === "video" ? "Video" : "Audio"} Formats:</h4>
                    <div className="space-y-3">
                      {formats.map((format) => (
                        <Button
                          key={format.itag}
                          onClick={() => handleDownload(format)}
                          className="w-full justify-between"
                        >
                          <span>{format.quality} - {format.container.toUpperCase()}</span>
                          <DownloadIcon className="h-5 w-5" />
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <div className="mt-8 text-center text-gray-700 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold mb-4">YouTube Video Downloader</h2>
          <p className="mb-4">
            VidGrab is a free online tool that allows you to download YouTube videos as MP4 or convert them to MP3 files with the highest quality available.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Easy to Use</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Just paste the YouTube URL and select your preferred format - no registration required.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">High Quality</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Download videos in HD quality or extract audio in high bitrate MP3 format.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Fast Downloads</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Our servers process your request quickly to save you time.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
