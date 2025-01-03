# 🦙 oai-api-logseq plugin

This plugin forks [ollama-logseq plugin](https://github.com/omagdy7/ollama-logseq). The only intentional change of this fork is to suppor the use of Open AI (henceforth OAI) compatible API instead of Ollama.

### Isn't Ollama good enough?
Ollama's use of `.model` files -- instead of seamlessly supporting the `.GGUF` model files of it's underlying inference engine -- and it's API variance from other projects is enough to make forking worthwhile.

# Get Started
- First you will need to setup an openAI compatible API.
  - [LLaMA.cpp](https://github.com/ggerganov/llama.cpp/blob/master/examples/server/README.md)
  - [tabbyAPI](https://github.com/theroyallab/tabbyAPI)

  **NOTE:** Do not open issues if with oai-api-logseq plugin github if you cannot host an OAI compatible API, assistance with that is outside of the scope of this work.

# Features
- The plugin currently has 6 commands
  - Ask Ai -> which is a prompt the AI freely without any context
  - Ask Ai with page context -> This is the same as Ask Ai but it gives the model the context of the current page
  - Ask Ai with block context -> This is the same as Ask Ai but it gives the model the context of the current block
  - Summarize Page
  - Summarize Block
  - Create a flash card
  - Divide a todo task into subtasks
- Respects theming
- Context menu commands
  - Summarize Block
  - Make a flash card
  - Divide task into subtasks
  - Prompt from block (uses the block as a prompt)
  - Custom prompt on block (uses the custom prompt defined in settings on the block)
  - Expand block
- A slash command via /ollama
- Button in tool bar
- Settings for changing the host of the model, the model itself and a shortcut to open the plugin command palette
- Block properties to select model
- Use configuration page `oai-api-logseq-config` to add more context manual commands

## Block Properties
Ollama offers many different models to choose from for various of tasks. This feature configures model on the per block base and the attribute is also used by its immediate children while using context menu commands for blocks. The properties are named after the [Ollama's generate API](https://github.com/jmorganca/ollama/blob/main/docs/api.md#generate-a-completion) and currently, only the `model` is used. Add the `oai-api-generate-model:: model_name` at the end of the block to specify the model to use for the block and its immediate children. 
```
Write a SciFi story of Shanghai 2050. 
oai-api-generate-model:: deepseek-llm:7b-chat
```
Currently, three context menu commands would be affected by this properties.
- LLM: Prompt from Block
- LLM: Summarize Block
- LLM: Expand Block 

![block-properties](./docs/block-properties.png)

## Configuration Page `oai-api-logseq-config`
The plugin also reads the page `oai-api-logseq-config` to add more context commands. The page should be a markdown page with the following format.

```
oai-api-context-menu-title:: Ollama: Extract Keywords
oai-api-prompt-prefix:: Extract 10 keywords from the following:
```

![config-page](./docs/config-page.png)

Each one of the block with these two properties will create a new context menu command after restarting logseq. The prefix is added in front of the text of the block when the command is invokved on the block. 
![contxt-menu](./docs/block-contxt-menu.gif)

# Demo
![demo](./docs/demo.gif)
![summary](./docs/summary.gif)
![context](./docs/context.gif)

# Contribution
If you have any features suggestions please check the [upstream project](https://github.com/omagdy7/ollama-logseq)

>If this plugin helps you, please go ahead and support the upstream creator of the ollama-logseq plugin. You can [buy them a coffee here. ](https://www.buymeacoffee.com/omagdy)
