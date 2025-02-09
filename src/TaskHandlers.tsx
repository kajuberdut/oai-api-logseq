import type { IHookEvent } from "@logseq/libs/dist/LSPlugin.user";
import { logAndHandleErrorDecorator } from "./Decorators";
import { delay, getTreeContent } from "./Helpers";
import { promptLLM } from "./LLM";

const MESSAGES = {
  summarizingPage: "⌛ Summarizing Page....",
  summarizingBlock: "⌛Summarizing Block...",
  generating: "⌛Generating....",
  generatingQuestion: "⌛Generating question....",
  generatingAnswer: "⌛Generating answer....",
  generatingTodos: "✅ ⌛Generating todos ...",
};

export class TaskHandlers {
  @logAndHandleErrorDecorator("Failed to summarize page")
  async summarizePage() {
    await this.commonSummarize(
      async () => await logseq.Editor.getCurrentPageBlocksTree(),
      MESSAGES.summarizingPage
    );
  }

  @logAndHandleErrorDecorator("Failed to summarize block")
  async summarizeBlock() {
    await this.commonSummarize(
      async () => [await logseq.Editor.getCurrentBlock()],
      MESSAGES.summarizingBlock
    );
  }

  async commonSummarize(
    fetchBlocks: () => Promise<any>,
    initialMessage: string
  ) {
    await delay(300);
    const blocks = await fetchBlocks();
    let blocksContent = "";
    if (blocks) {
      let lastBlock = blocks[blocks.length - 1];
      for (const block of blocks) {
        blocksContent += block.content + "\n";
      }
      lastBlock = await logseq.Editor.insertBlock(
        lastBlock.uuid,
        initialMessage,
        { before: true }
      );
      const summary = await promptLLM(
        `Summarize the following, start with the word "Summary:":\n${blocksContent}`,
        undefined, // params
        2, // Debug level
        (current) => {
          logseq.Editor.updateBlock(lastBlock.uuid, `${current}`);
        }
      );

      await logseq.Editor.updateBlock(lastBlock.uuid, `${summary}`);
    }
  }

  @logAndHandleErrorDecorator("Failed to define word")
  async defineWord(word: string) {
    const prompt = `Define the word: ${word}`;
    await this.askAI(prompt, "");
  }

  @logAndHandleErrorDecorator("Failed to convert to flashcard")
  async convertToFlashCard(uuid: string, blockContent: string) {
    const questionBlock = await logseq.Editor.insertBlock(
      uuid,
      MESSAGES.generatingQuestion,
      { before: false }
    );
    const answerBlock = await logseq.Editor.insertBlock(
      questionBlock!.uuid,
      MESSAGES.generatingAnswer,
      { before: false }
    );
    const question = await promptLLM(
      `Create a question for a flashcard. Provide the question only. Here is the knowledge to check:\n${blockContent}`
    );
    const answer = await promptLLM(
      `Given the question ${question} and the context of ${blockContent}, what is the answer? Be as brief as possible and provide the answer only.`
    );
    await logseq.Editor.updateBlock(questionBlock!.uuid, `${question} #card`);
    await delay(300);
    await logseq.Editor.updateBlock(answerBlock!.uuid, answer);
  }

  @logAndHandleErrorDecorator("Failed to divide task into subtasks")
  async DivideTaskIntoSubTasks(uuid: string, content: string) {
    const block = await logseq.Editor.insertBlock(
      uuid,
      MESSAGES.generatingTodos,
      { before: false }
    );
    let i = 0;
    const response = await promptLLM(
      `Divide this task into subtasks with numbers:\n${content}`
    );
    for (const todo of response.split("\n")) {
      if (i == 0) {
        await logseq.Editor.updateBlock(block!.uuid, `TODO ${todo.slice(3)} `);
      } else {
        await logseq.Editor.insertBlock(uuid, `TODO ${todo.slice(3)} `, {
          before: false,
        });
      }
      i++;
    }
  }

  @logAndHandleErrorDecorator("Failed to ask with context")
  async askWithContext(prompt: string, contextType: string) {
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
    await this.askAI(prompt, `Context: ${blocksContent}`);
  }

  @logAndHandleErrorDecorator("Failed to ask AI")
  async askAI(prompt: string, context: string) {
    const currentBlock = await logseq.Editor.getCurrentBlock();
    let block = null;
    if (currentBlock?.content.trim() === "") {
      block = await logseq.Editor.insertBlock(
        currentBlock!.uuid,
        MESSAGES.generating,
        { before: true }
      );
    } else {
      block = await logseq.Editor.insertBlock(
        currentBlock!.uuid,
        MESSAGES.generating,
        { before: false }
      );
    }
    let response = "";
    if (context == "") {
      response = await promptLLM(prompt);
    } else {
      response = await promptLLM(`With the context of: ${context}, ${prompt}`);
    }
    await logseq.Editor.updateBlock(block!.uuid, `${prompt}\n${response}`);
  }

  @logAndHandleErrorDecorator("Failed to convert current block to flashcard")
  async convertToFlashCardCurrentBlock() {
    const currentBlock = await logseq.Editor.getCurrentBlock();
    await this.convertToFlashCard(currentBlock!.uuid, currentBlock!.content);
  }

  @logAndHandleErrorDecorator("Failed to convert flashcard from event")
  async convertToFlashCardFromEvent(b: IHookEvent) {
    const currentBlock = await logseq.Editor.getBlock(b.uuid);
    await this.convertToFlashCard(currentBlock!.uuid, currentBlock!.content);
  }

  @logAndHandleErrorDecorator("Failed to divide task from event")
  async DivideTaskIntoSubTasksFromEvent(b: IHookEvent) {
    const currentBlock = await logseq.Editor.getBlock(b.uuid);
    await this.DivideTaskIntoSubTasks(
      currentBlock!.uuid,
      currentBlock!.content
    );
  }

  @logAndHandleErrorDecorator("Failed to divide task in current block")
  async DivideTaskIntoSubTasksCurrentBlock() {
    const currentBlock = await logseq.Editor.getCurrentBlock();
    await this.DivideTaskIntoSubTasks(
      currentBlock!.uuid,
      currentBlock!.content
    );
  }

  @logAndHandleErrorDecorator("Failed to execute prompt from block event")
  promptFromBlockEventClosure(prefix?: string) {
    return async (event: IHookEvent) => {
      const currentBlock = await logseq.Editor.getBlock(event.uuid);
      const blockContent = await getTreeContent(currentBlock!);
      const prompt = prefix ? `${prefix}\n${blockContent}` : blockContent;
      const answerBlock = await logseq.Editor.insertBlock(
        currentBlock!.uuid,
        MESSAGES.generating,
        { before: false }
      );

      const response = await promptLLM(prompt);
      await logseq.Editor.updateBlock(answerBlock!.uuid, response);
    };
  }
}
