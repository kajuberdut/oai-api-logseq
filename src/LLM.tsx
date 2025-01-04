import { apiConfig, getHeaders } from "./Config";

export async function promptLLM(
  prompt: string,
  parameters?: LLMGenerateParameters,
  debugLevel: number = 0, // 0 for none, 1 for basic, > 1 for full
  callback?: (result: string) => void // Callable invoked with the current state after each chunk
) {
  let result = "";
  for await (const chunk of modelGenerate(prompt, parameters, debugLevel)) {
    if (chunk) {
      result += chunk;
      if (callback) {
        callback(result);
      }
    }
  }
  return result;
}

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
    params.model = apiConfig.model();
  }
  params.prompt = prompt;
  params.n_predict = params.n_predict || 200;
  params.stream = true;

  try {
    if (debugLevel >= 0) {
      console.debug("Parameters sent to API:", params);
    }

    const response = await fetch(`http://${apiConfig.host()}/v1/completions`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(params),
    });

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
