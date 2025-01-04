import React, { useEffect, useRef, useState } from "react";
import { LLMCommandPallete } from "./components/LLMCommandPallete";
import { TaskHandlers } from "./TaskHandlers";
import { llmUI } from "./UI";
import { useAppVisible } from "./utils";

const options = [
  "Ask ai",
  "Ask with page context",
  "Ask with block context",
  "Define",
  "Divide into subtasks",
  "Summarize Page",
  "Summarize Block",
  "Convert to flash card",
];

const taskHandlers = new TaskHandlers(); // Create an instance of TaskHandlers

async function getTheme() {
  const theme = await logseq.App.getUserInfo();
  if (!theme) {
    return "dark";
  }
  return theme.preferredThemeMode;
}

function App() {
  const innerRef = useRef<HTMLDivElement>(null);
  const visible = useAppVisible();
  const [theme, setTheme] = useState<string>("");

  useEffect(() => {
    const getTheme = async () => {
      const theme = await logseq.App.getUserConfigs();
      if (!theme) {
        setTheme("dark");
      } else {
        setTheme(theme.preferredThemeMode);
      }
    };
    getTheme();
    if (!logseq.settings) {
      return;
    }

    logseq.Editor.getPageBlocksTree("oai-api-logseq-config")
      .then((blocks) => {
        blocks!.forEach((block) => {
          logseq.Editor.getBlockProperty(
            block.uuid,
            "oai-api-context-menu-title"
          )
            .then((title) => {
              logseq.Editor.getBlockProperty(
                block.uuid,
                "oai-api-prompt-prefix"
              ).then((prompt_prefix) => {
                logseq.Editor.registerBlockContextMenuItem(
                  title,
                  taskHandlers.promptFromBlockEventClosure(prompt_prefix)
                );
              });
            })
            .catch((reason) => {});
        });
      })
      .catch((reason) => {
        console.error(
          "Can not find the configuration page named 'oai-api-logseq-config'",
          reason
        );
      });

    logseq.Editor.registerSlashCommand("LLM", llmUI);
    logseq.Editor.registerBlockContextMenuItem(
      "LLM: Create a flash card",
      taskHandlers.convertToFlashCardFromEvent
    );
    logseq.Editor.registerBlockContextMenuItem(
      "LLM: Divide into subtasks",
      taskHandlers.DivideTaskIntoSubTasksFromEvent
    );
    logseq.Editor.registerBlockContextMenuItem(
      "LLM: Prompt from Block",
      taskHandlers.promptFromBlockEventClosure()
    );
    logseq.Editor.registerBlockContextMenuItem(
      "LLM: Custom prompt on Block",
      taskHandlers.promptFromBlockEventClosure(logseq.settings.custom_prompt_block)
    );
    logseq.Editor.registerBlockContextMenuItem(
      "LLM: Summarize block",
      taskHandlers.promptFromBlockEventClosure("Summarize: ")
    );
    logseq.Editor.registerBlockContextMenuItem(
      "LLM: Expand Block",
      taskHandlers.promptFromBlockEventClosure("Expand: ")
    );

    logseq.App.registerCommandShortcut(
      { binding: logseq.settings.shortcut },
      llmUI
    );
  }, []);

  if (visible) {
    return (
      <main
        className="fixed inset-0 flex items-center justify-center"
        onClick={(e) => {
          if (!innerRef.current?.contains(e.target as any)) {
            window.logseq.hideMainUI();
          }
        }}
      >
        <div
          ref={innerRef}
          className="flex items-center justify-center w-screen"
        >
          <LLMCommandPallete options={options} theme={theme} />
        </div>
      </main>
    );
  }
  return null;
}

export default App;
