import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  apiKey: z.string().min(10, "API key is required"),
  videoId: z.string().min(3, "Video ID is required")
});

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { apiKey, videoId } = bodySchema.parse(payload);

    const url = new URL("https://www.googleapis.com/youtube/v3/commentThreads");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("maxResults", "50");
    url.searchParams.set("videoId", videoId);
    url.searchParams.set("textFormat", "plainText");
    url.searchParams.set("order", "relevance");
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
        id?: string;
        snippet?: {
          topLevelComment?: {
            id?: string;
            snippet?: {
              authorDisplayName?: string;
              textDisplay?: string;
              likeCount?: number;
              publishedAt?: string;
            };
          };
        };
      }>;
    };

    const data =
      result.items
        ?.map((item) => {
          const topLevel = item.snippet?.topLevelComment;
          if (!topLevel) return null;
          return {
            id: topLevel.id ?? item.id ?? "",
            author: topLevel.snippet?.authorDisplayName ?? "Unknown author",
            text: topLevel.snippet?.textDisplay ?? "",
            likeCount: topLevel.snippet?.likeCount ?? 0,
            publishedAt: topLevel.snippet?.publishedAt ?? ""
          };
        })
        .filter(Boolean) ?? [];

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
