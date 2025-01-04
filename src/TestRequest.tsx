import { json } from "stream/consumers";

type ValueType = string | string[] | (() => any);

interface FormatDict {
  [key: string]: ValueType;
}

class AdvancedFormat {
  private _dict: FormatDict;

  constructor(_dict: FormatDict) {
    this.assertType(_dict, "object", "_dict", "AdvancedFormat");
    const _dictKeys = Object.keys(_dict);

    this._dict = _dict;
  }

  public getItem(key: string): any {
    if (key in this._dict) {
      const value = this._dict[key];
      if (typeof value === "function") {
        return value();
      }
      return value;
    } else {
      throw new Error(`AdvancedFormat: the specified key ${key} was not found`);
    }
  }

  public keys(): string[] {
    return Object.keys(this._dict);
  }

  public wrap(prompt: string): string {
    this.assertType(prompt, "string", "prompt", "AdvancedFormat.wrap");
    return (
      `${this.getItem("system_prefix")}` +
      `${this.getItem("system_prompt")}` +
      `${this.getItem("system_suffix")}` +
      `${this.getItem("user_prefix")}` +
      prompt +
      `${this.getItem("user_suffix")}` +
      `${this.getItem("bot_prefix")}`
    );
  }

  private assertType(
    value: any,
    type: string,
    paramName: string,
    functionName: string
  ) {
    if (typeof value !== type) {
      throw new Error(
        `${functionName}: Expected parameter ${paramName} to be of type ${type}, but got ${typeof value}`
      );
    }
  }
}

function phi3(systemPrompt: string | null = null): FormatDict {
  return {
    system_prefix: "<|system|>\n",
    system_prompt: systemPrompt ?? "",
    system_suffix: "<|end|>\n",
    user_prefix: "<|user|>\n",
    user_suffix: "<|end|>\n",
    bot_prefix: "<|assistant|>\n",
    bot_suffix: "<|end|>\n",
    stops: [],
  };
}

const formatRegistry: Record<string, () => FormatDict> = {
  phi3,
};

export function getFormatDict(formatName: string): AdvancedFormat {
  const formatFunction = formatRegistry[formatName];
  if (!formatFunction) {
    throw new Error(`Format '${formatName}' is not defined.`);
  }
  return new AdvancedFormat(formatFunction());
}

const logseq = {
  settings: {
    model: "phi3",
    apiKey: null,
    host: "192.168.0.105:8080",
  },
  UI: {
    showMsg: (message: string, type: "info" | "error" | "success") => {
      console.log(`UI Message [${type}]: ${message}`);
    },
  },
};

type LLMGenerateParameters = {
  model?: string;
  n_predict?: number;
  stream?: boolean;
  temperature?: number;
  [key: string]: any;
};

async function* modelGenerate(
  prompt: string,
  parameters?: LLMGenerateParameters,
  debugLevel: number = 0 // 0 for none, 1 for basic, > 1 for full
) {
  if (!logseq.settings) {
    throw new Error("Couldn't find API settings");
  }

  let params = parameters || {};
  if (params.model === undefined) {
    params.model = logseq.settings.model;
  }
  params.prompt = prompt;
  params.n_predict = params.n_predict || 200;
  params.stream = true;

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (debugLevel >= 0) {
      console.debug("Parameters sent to API:", params);
    }

    const response = await fetch(
      `http://${logseq.settings.host}/v1/completions`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(params),
      }
    );

    if (debugLevel >= 1) {
      console.debug("Response:", response);
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (!response.body) {
      throw new Error("Response body is null. Unable to read the stream.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let result = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      let chunk = decoder.decode(value, { stream: true });

      if (debugLevel > 1) {
        console.debug("Raw Chunk:", chunk);
      }

      if (chunk.startsWith("data: {") && chunk.trim().endsWith("}")) {
        try {
          const trimmedChunk = chunk.slice(5).trim();
          const jsonChunk = JSON.parse(trimmedChunk);

          // Only yield content if it's a valid JSON object and has the desired structure
          if (jsonChunk.choices) {
            yield jsonChunk.choices[0].text;
          }
        } catch (error) {
          if (debugLevel >= 1) {
            if (error instanceof Error) {
              console.error("JSON deserialization failed!");
              console.error("Chunk content:", chunk);
              console.error("Error message:", error.message);
              console.error("Error stack:", error.stack);
            } else {
              console.error("Caught an unknown error:", error);
            }
          }
        }
      } else if (chunk.trim() === "data: [DONE]") {
        if (debugLevel >= 1) {
          console.log("Ignoring termination chunk: data: [DONE]");
        }
        // Ignore and move to the next chunk
      } else {
        if (debugLevel >= 1) {
          console.warn("Skipping unexpected non-JSON chunk:", chunk);
        }
        // Ignore and move to the next chunk
      }
    }
  } catch (e: any) {
    console.error("Error during fetch request:", e);

    logseq.UI.showMsg(`Error: ${e.message}`, "error");
    throw e;
  }
}

async function promptLLM(
  prompt: string,
  parameters?: LLMGenerateParameters,
  debugLevel: number = 0, // 0 for none, 1 for basic, > 1 for full
  callback?: (result: string) => void // Callable invoked with each result chunk
) {
  let result = "";
  for await (const chunk of modelGenerate(prompt, parameters, debugLevel)) {
    if (chunk) {
      result += chunk;
      if (callback) {
        callback(chunk); // Invoke the callback with the current chunk
      }
    }
  }
  return result;
}

// Creating an instance of the type
const params: LLMGenerateParameters = {
  model: "phi3",
  n_predict: 20,
  temperature: 0.7,
};

(async () => {
  const exampleFormat = getFormatDict("phi3");
  let prompt = exampleFormat.wrap("Please define luddite");

  try {
    const result = await promptLLM(prompt, params, 2, (chunk) => {
      console.log("Chunk received:", chunk); // Log each chunk
    });
    console.log("LLM Response:", result);
  } catch (e) {
    console.error("Failed to get LLM response:", e);
  }
})();

// clear && tsc ./src/TestRequest.tsx --skipLibCheck && node ./src/TestRequest.js
