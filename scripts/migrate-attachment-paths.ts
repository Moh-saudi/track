import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { getUploadRoot } from "../src/lib/storage";

const prisma = new PrismaClient();

async function main() {
  const legacyRoot = path.resolve(process.env.LEGACY_UPLOAD_ROOT || path.join(process.cwd(), "uploads"));
  const newRoot = getUploadRoot();

  const attachments = await prisma.attachment.findMany({
    select: { id: true, filePath: true },
  });

  let updated = 0;
  for (const attachment of attachments) {
    if (!path.isAbsolute(attachment.filePath)) continue;

    const resolved = path.resolve(attachment.filePath);
    const relative = path.relative(legacyRoot, resolved);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      throw new Error(
        `Attachment ${attachment.id} points outside LEGACY_UPLOAD_ROOT. Manual review required: ${attachment.filePath}`
      );
    }

    await prisma.attachment.update({
      where: { id: attachment.id },
      data: { filePath: relative },
    });
    updated++;
  }

  console.log(`Attachment path migration complete: ${updated} row(s) converted to portable relative paths.`);
  console.log(`Copy legacy files from ${legacyRoot} to ${newRoot} preserving relative paths before go-live.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
