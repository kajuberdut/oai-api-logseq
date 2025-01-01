import { IHookEvent } from "@logseq/libs/dist/LSPlugin.user";
import { BlockEntity, BlockUUIDTuple } from "@logseq/libs/dist/LSPlugin.user";

const delay = (t = 100) => new Promise(r => setTimeout(r, t));

export async function llmUI() {
  logseq.showMainUI();
  setTimeout(() => {
    const element = document.querySelector(".ai-input") as HTMLInputElement | null;
    if (element) {
      element.focus();
    }
  }, 300);
}

function isBlockEntity(b: BlockEntity | BlockUUIDTuple): b is BlockEntity {
  return (b as BlockEntity).uuid !== undefined;
}

async function getTreeContent(b: BlockEntity) {
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
        content += "\n" + await getTreeContent(childBlock);
      }
    }
  }
  return content;
}

export async function getPageContentFromBlock(b: BlockEntity): Promise<string> {
  let blockContents = [];

  const currentBlock = await logseq.Editor.getBlock(b);
  if (!currentBlock) {
    throw new Error("Block not found");
  }

  const page = await logseq.Editor.getPage(currentBlock.page.id);
  if (!page) {
    throw new Error("Page not found");
  }

  const pageBlocks = await logseq.Editor.getPageBlocksTree(page.name);
  for (const pageBlock of pageBlocks) {
    const blockContent = await getTreeContent(pageBlock);
    if (blockContent.length > 0) {
      blockContents.push(blockContent);
    }
  }
  return blockContents.join(" ");
}

type LLMGenerateParameters = {
  model?: string;
  n_predict?: number;
  [key: string]: any;
};

async function modelGenerate(prompt: string, parameters?: LLMGenerateParameters) {
  if (!logseq.settings) {
    throw new Error("Couldn't find API settings");
  }

  let params = parameters || {};
  if (params.model === undefined) {
    params.model = logseq.settings.model;
  }
  params.prompt = prompt;
  params.n_predict = params.n_predict || 200;

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (logseq.settings.apiKey && logseq.settings.apiKey.trim()) {
      headers["Authorization"] = `Bearer ${logseq.settings.apiKey}`;
    }

    const response = await fetch(`http://${logseq.settings.host}/completion`, {
      method: "POST",
      headers,
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.content.trim();
  } catch (e: any) {
    console.error("Error during fetch request:", e);
    logseq.UI.showMsg(`Error: ${e.message}`, "error");
    throw e;
  }
}

async function promptLLM(prompt: string, parameters?: LLMGenerateParameters) {
  return await modelGenerate(prompt, parameters);
}

export async function defineWord(word: string) {
  askAI(`What's the definition of ${word}?`, "");
}

type ContextType = "block" | "page";

export async function askWithContext(prompt: string, contextType: ContextType) {
  try {
    let blocksContent = "";
    if (contextType === "page") {
      const currentBlocksTree = await logseq.Editor.getCurrentPageBlocksTree();
      for (const block of currentBlocksTree) {
        blocksContent += await getTreeContent(block);
      }
    } else {
      const currentBlock = await logseq.Editor.getCurrentBlock();
      blocksContent += await getTreeContent(currentBlock!);
    }
    askAI(prompt, `Context: ${blocksContent}`);
  } catch (e: any) {
    logseq.App.showMsg(e.toString(), "warning");
    console.error(e);
  }
}

export async function summarizePage() {
  await delay(300);
  try {
    const currentSelectedBlocks = await logseq.Editor.getCurrentPageBlocksTree();
    let blocksContent = "";
    if (currentSelectedBlocks) {
      let lastBlock: any = currentSelectedBlocks[currentSelectedBlocks.length - 1];
      for (const block of currentSelectedBlocks) {
        blocksContent += block.content + "\n";
      }
      lastBlock = await logseq.Editor.insertBlock(lastBlock.uuid, "⌛ Summarizing Page....", { before: true });
      const summary = await promptLLM(`Summarize the following:\n${blocksContent}`);
      await logseq.Editor.updateBlock(lastBlock.uuid, `Summary: ${summary}`);
    }
  } catch (e: any) {
    logseq.App.showMsg(e.toString(), "warning");
    console.error(e);
  }
}

export async function summarizeBlock() {
  try {
    const currentBlock = await logseq.Editor.getCurrentBlock();
    let summaryBlock = await logseq.Editor.insertBlock(currentBlock!.uuid, "⌛Summarizing Block...", { before: false });
    const summary = await promptLLM(`Summarize the following:\n${currentBlock!.content}`);

    await logseq.Editor.updateBlock(summaryBlock!.uuid, `Summary: ${summary}`);
  } catch (e: any) {
    logseq.App.showMsg(e.toString(), "warning");
    console.error(e);
  }
}

export async function askAI(prompt: string, context: string) {
  await delay(300);
  try {
    const currentBlock = await logseq.Editor.getCurrentBlock();
    let block = null;
    if (currentBlock?.content.trim() === "") {
      block = await logseq.Editor.insertBlock(currentBlock!.uuid, "⌛Generating....", { before: true });
    } else {
      block = await logseq.Editor.insertBlock(currentBlock!.uuid, "⌛Generating....", { before: false });
    }
    let response = "";
    if (context == "") {
      response = await promptLLM(prompt);
    } else {
      response = await promptLLM(`With the context of: ${context}, ${prompt}`);
    }
    await logseq.Editor.updateBlock(block!.uuid, `${prompt}\n${response}`);
  } catch (e: any) {
    logseq.App.showMsg(e.toString(), "warning");
    console.error(e);
  }
}

export async function convertToFlashCard(uuid: string, blockContent: string) {
  try {
    const questionBlock = await logseq.Editor.insertBlock(uuid, "⌛Generating question....", { before: false });
    const answerBlock = await logseq.Editor.insertBlock(questionBlock!.uuid, "⌛Generating answer....", { before: false });
    const question = await promptLLM(`Create a question for a flashcard. Provide the question only. Here is the knowledge to check:\n${blockContent}`);
    const answer = await promptLLM(`Given the question ${question} and the context of ${blockContent}, what is the answer? Be as brief as possible and provide the answer only.`);
    await logseq.Editor.updateBlock(questionBlock!.uuid, `${question} #card`);
    await delay(300);
    await logseq.Editor.updateBlock(answerBlock!.uuid, answer);
  } catch (e: any) {
    logseq.App.showMsg(e.toString(), "warning");
    console.error(e);
  }
}

export async function convertToFlashCardFromEvent(b: IHookEvent) {
  const currentBlock = await logseq.Editor.getBlock(b.uuid);
  await convertToFlashCard(currentBlock!.uuid, currentBlock!.content);
}

export async function convertToFlashCardCurrentBlock() {
  const currentBlock = await logseq.Editor.getCurrentBlock();
  await convertToFlashCard(currentBlock!.uuid, currentBlock!.content);
}

export async function DivideTaskIntoSubTasks(uuid: string, content: string) {
  try {
    const block = await logseq.Editor.insertBlock(uuid, "✅ ⌛Generating todos ...", { before: false });
    let i = 0;
    const response = await promptLLM(`Divide this task into subtasks with numbers:\n${content}`);
    for (const todo of response.split("\n")) {
      if (i == 0) {
        await logseq.Editor.updateBlock(block!.uuid, `TODO ${todo.slice(3)} `);
      } else {
        await logseq.Editor.insertBlock(uuid, `TODO ${todo.slice(3)} `, { before: false });
      }
      i++;
    }
  } catch (e: any) {
    logseq.App.showMsg(e.toString(), "warning");
    console.error(e);
  }
}

export async function DivideTaskIntoSubTasksFromEvent(b: IHookEvent) {
  const currentBlock = await logseq.Editor.getBlock(b.uuid);
  DivideTaskIntoSubTasks(currentBlock!.uuid, currentBlock!.content);
}

export async function DivideTaskIntoSubTasksCurrentBlock() {
  const currentBlock = await logseq.Editor.getCurrentBlock();
  DivideTaskIntoSubTasks(currentBlock!.uuid, currentBlock!.content);
}

export function promptFromBlockEventClosure(prefix?: string) {
  return async (event: IHookEvent) => {
    try {
      const currentBlock = await logseq.Editor.getBlock(event.uuid);
      const blockContent = await getTreeContent(currentBlock!);
      const prompt = prefix ? `${prefix}\n${blockContent}` : blockContent;
      const answerBlock = await logseq.Editor.insertBlock(currentBlock!.uuid, "⌛Generating...", { before: false });

      const response = await promptLLM(prompt);
      await logseq.Editor.updateBlock(answerBlock!.uuid, response);
    } catch (e: any) {
      logseq.App.showMsg(e.toString(), "warning");
      console.error(e);
    }
  };
}
