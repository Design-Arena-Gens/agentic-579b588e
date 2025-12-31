import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  apiKey: z.string().min(10, "API key is required"),
  channelId: z.string().min(3, "Channel ID is required")
});

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { apiKey, channelId } = bodySchema.parse(payload);

    const url = new URL("https://www.googleapis.com/youtube/v3/channels");
    url.searchParams.set("part", "snippet,statistics");
    url.searchParams.set("id", channelId);
    url.searchParams.set("key", apiKey);

    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => ({}));
      const message =
        errorPayload?.error?.message ?? `YouTube API responded with ${response.status}`;
      return NextResponse.json({ error: message }, { status: response.status });
    }

    const result = (await response.json()) as {
      items?: Array<{
        snippet?: {
          title?: string;
          description?: string;
          thumbnails?: Record<string, { url?: string }>;
        };
        statistics?: {
          subscriberCount?: string;
          viewCount?: string;
          videoCount?: string;
        };
      }>;
    };

    const channel = result.items?.[0];

    if (!channel) {
      return NextResponse.json(
        { error: "Channel not found. Double-check the channel ID." },
        { status: 404 }
      );
    }

    const thumbnail =
      channel.snippet?.thumbnails?.high?.url ??
      channel.snippet?.thumbnails?.medium?.url ??
      channel.snippet?.thumbnails?.default?.url ??
      "";

    const data = {
      title: channel.snippet?.title ?? "Unknown channel",
      description: channel.snippet?.description ?? "",
      thumbnail,
      subscriberCount: Number(channel.statistics?.subscriberCount ?? 0),
      viewCount: Number(channel.statistics?.viewCount ?? 0),
      videoCount: Number(channel.statistics?.videoCount ?? 0)
    };

    return NextResponse.json({ data });
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? error.errors[0]?.message ?? "Invalid payload"
        : error instanceof Error
        ? error.message
        : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
