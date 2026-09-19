import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
});

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "post"
  );
}

export async function POST(req: Request) {
  const session = await requireAdmin("MANAGE_BLOG");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  const title = (parsed.success && parsed.data.title) ? parsed.data.title : "Untitled Post";

  let baseSlug = slugify(title);
  let slug = baseSlug;
  let suffix = 1;
  while (await prisma.blogPost.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${baseSlug}-${++suffix}`;
  }

  const post = await prisma.blogPost.create({
    data: {
      title,
      slug,
      excerpt: "",
      content: "<p>Start writing your post here…</p>",
      status: "DRAFT",
      isAiGen: false,
    },
  });

  return NextResponse.json({ post }, { status: 201 });
}
