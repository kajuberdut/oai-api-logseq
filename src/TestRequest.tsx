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

    private assertType(value: any, type: string, paramName: string, functionName: string) {
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
        stops: []
    };
}

const formatRegistry: Record<string, () => FormatDict> = {
    phi3
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
    [key: string]: any;
};

async function modelGenerate(
    prompt: string,
    parameters?: LLMGenerateParameters,
    debugLevel: "none" | "basic" | "full" = "none" // Add a debug level parameter
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





// Creating an instance of the type
const params: LLMGenerateParameters = {
    model: "text-davinci-003",
    n_predict: 22,
    temperature: 0.7
};

(async () => {
    const exampleFormat = getFormatDict("phi3");
    let prompt = exampleFormat.wrap("Hi");

    try {
        const result = await promptLLM(prompt, params);
        console.log("LLM Response:", result);
    } catch (e) {
        console.error("Failed to get LLM response:", e);
    }
})();

// clear && tsc ./src/TestRequest.tsx --skipLibCheck && node ./src/TestRequest.js