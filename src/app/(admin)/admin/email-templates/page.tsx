import { prisma } from "@/lib/db";
import { EmailTemplateEditor } from "@/components/admin/EmailTemplateEditor";

export default async function EmailTemplatesPage() {
  const templates = await prisma.emailTemplate.findMany({ orderBy: { slug: "asc" } });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Email Templates</h1>
      <EmailTemplateEditor initialTemplates={templates} />
    </div>
  );
}
