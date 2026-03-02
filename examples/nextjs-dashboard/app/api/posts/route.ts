import { VercelClient } from '@heylol/adapter-vercel';
import type { PostId } from '@heylol/sdk';
import type { NextRequest } from 'next/server';

export const runtime = 'edge';

/**
 * POST /api/posts
 *
 * Creates a new post on hey.lol using VercelClient.
 * HEYLOL_PRIVATE_KEY must be set in Vercel environment variables.
 *
 * Request body: { content: string }
 */
export async function POST(request: NextRequest) {
  const client = new VercelClient();
  const body = (await request.json()) as { content: string };

  const post = await client.posts.create({ content: body.content });

  return Response.json(post, { status: 201 });
}

/**
 * GET /api/posts?id=<postId>
 *
 * Fetches a single post by ID from hey.lol.
 */
export async function GET(request: NextRequest) {
  const client = new VercelClient();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id') ?? 'example-post-id';

  const post = await client.posts.get(id as PostId);

  return Response.json(post);
}
