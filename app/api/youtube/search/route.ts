import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  apiKey: z.string().min(10, "API key is required"),
  query: z.string().min(2, "Search query is required")
});

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { apiKey, query } = bodySchema.parse(payload);

    const url = new URL("https://www.googleapis.com/youtube/v3/search");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("maxResults", "10");
    url.searchParams.set("order", "date");
    url.searchParams.set("type", "video");
    url.searchParams.set("q", query);
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
        id?: { videoId?: string };
        snippet?: {
          title?: string;
          description?: string;
          thumbnails?: Record<string, { url?: string }>;
          publishedAt?: string;
          channelTitle?: string;
        };
      }>;
    };

    const data =
      result.items?.map((item) => ({
        id: item.id?.videoId ?? "",
        title: item.snippet?.title ?? "Untitled video",
        description: item.snippet?.description ?? "",
        thumbnail:
          item.snippet?.thumbnails?.high?.url ??
          item.snippet?.thumbnails?.medium?.url ??
          item.snippet?.thumbnails?.default?.url ??
          "",
        publishedAt: item.snippet?.publishedAt ?? "",
        channelTitle: item.snippet?.channelTitle ?? "Unknown channel"
      })) ?? [];

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
