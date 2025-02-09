export {}

const logseq = {
  settings: {
    apiKey: null,
    host: "localhost:8080",
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

  params.prompt = prompt;
  params.n_predict = params.n_predict || 200;
  params.stream = true;

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (debugLevel >= 1) {
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

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      let chunk = decoder.decode(value, { stream: true });

      if (debugLevel > 1) {
        console.debug("Raw Chunk:", chunk);
      }

      const lines = chunk.split('\n');

      for (let line of lines) {
        if (line.startsWith('data:')) {
          const jsonData = line.slice(5).trim();

          if (jsonData === '[DONE]') {
            if (debugLevel >= 1) {
              console.log("Ignoring termination chunk: data: [DONE]");
            }
            break;
          }

          try {
            const jsonChunk = JSON.parse(jsonData);

            if (jsonChunk.choices) {
              yield jsonChunk.choices[0].text;
            } else if (jsonChunk.content) {
              yield jsonChunk.content;
            }
          } catch (error) {
            if (debugLevel >= 1) {
              console.error("JSON deserialization failed!");
              console.error("Chunk content:", jsonData);
              console.error("Error:", error);
            }
          }
        } else if (line.trim()) {
          if (debugLevel >= 1) {
            console.warn("Skipping unexpected non-JSON chunk:", line);
          }
        }
      }
    }
  } catch (e) {
    console.error("Error during fetch request:", e);
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

/**
 * Renders the provided template with the given context.
 * @param context - The context object containing variables for the template.
 * @returns The rendered template output.
 */
export function renderTemplate(context: Record<string, any>): string {
  try {
      // Render the template with the provided context
      return nunjucks.renderString(template, context);
  } catch (error) {
      if (typeof error === 'object' && error !== null && 'message' in error) {
          return `Error: ${(error as Error).message}`;
      } else {
          return 'An unknown error occurred.';
      }
  }
}

// Example usage
const context = {
  bos_token: '<BOS>',
  messages: [
      { role: 'user', content: 'Hello!' },
      { role: 'assistant', content: 'Hi there!' },
  ],
  add_generation_prompt: true,
};

console.log(renderTemplate(context));


// Creating an instance of the type
const params: LLMGenerateParameters = {
  n_predict: 20,
  temperature: 0.7,
};

(async () => {

  let prompt = "Please say 'yellow'";

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
