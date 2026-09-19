import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

const schema = z.object({
  title:       z.string().trim().min(3).optional(),
  slug:        z.string().trim().min(1).max(100).regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers and hyphens only").optional(),
  excerpt:     z.string().trim().optional(),
  content:     z.string().trim().optional(),
  tags:        z.string().optional(),
  status:      z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  coverImage:  z.string().max(2048).optional().or(z.literal("")),
});

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await requireAdmin("MANAGE_BLOG");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const post = await prisma.blogPost.findUnique({ where: { id: params.id } });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ post });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await requireAdmin("MANAGE_BLOG");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.status === "PUBLISHED") {
    const existing = await prisma.blogPost.findUnique({ where: { id: params.id }, select: { publishedAt: true } });
    if (!existing?.publishedAt) data.publishedAt = new Date();
  }

  let post;
  try {
    post = await prisma.blogPost.update({ where: { id: params.id }, data });
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === "P2025") return NextResponse.json({ error: "Post not found" }, { status: 404 });
    return NextResponse.json({ error: "Failed to update post" }, { status: 500 });
  }
  return NextResponse.json({ post });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await requireAdmin("MANAGE_BLOG");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    await prisma.blogPost.delete({ where: { id: params.id } });
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === "P2025") return NextResponse.json({ error: "Post not found" }, { status: 404 });
    return NextResponse.json({ error: "Failed to delete post" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
