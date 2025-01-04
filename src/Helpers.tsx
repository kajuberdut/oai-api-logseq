import { BlockEntity, BlockUUIDTuple } from "@logseq/libs/dist/LSPlugin.user";

export const delay = (t = 100) => new Promise((r) => setTimeout(r, t));

export function isBlockEntity(b: BlockEntity | BlockUUIDTuple): b is BlockEntity {
  return (b as BlockEntity).uuid !== undefined;
}

export async function getTreeContent(b: BlockEntity) {
  let content = "";
  const trimmedBlockContent = b.content.trim();
  if (trimmedBlockContent.length > 0) {
    content += trimmedBlockContent;
  }

  if (!b.children) {
    return content;
  }

  for (const child of b.children) {
    if (isBlockEntity(child)) {
      content += await getTreeContent(child);
    } else {
      const childBlock = await logseq.Editor.getBlock(child[1], {
        includeChildren: true,
      });
      if (childBlock) {
        content += "\n" + (await getTreeContent(childBlock));
      }
    }
  }
  return content;
}
