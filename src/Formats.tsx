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

    public toString(): string {
        return `AdvancedFormat(${JSON.stringify(this._dict)})`;
    }

    public keys(): string[] {
        return Object.keys(this._dict);
    }

    public values(): any[] {
        return Object.keys(this._dict).map(key => this._dict[key]);
    }

    public items(): [string, any][] {
        return Object.keys(this._dict).map(key => [key, this._dict[key]] as [string, any]);
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

function wrap(prompt: string, format: FormatDict | AdvancedFormat): string {
    if (typeof format === "object" && !(format instanceof AdvancedFormat)) {
        format = new AdvancedFormat(format);
    }

    return (
        `${format.getItem("system_prefix")}` +
        `${format.getItem("system_prompt")}` +
        `${format.getItem("system_suffix")}` +
        `${format.getItem("user_prefix")}` +
        prompt +
        `${format.getItem("user_suffix")}` +
        `${format.getItem("bot_prefix")}`
    );
}

function blank(): FormatDict {
    return {
        system_prefix: "",
        system_prompt: "",
        system_suffix: "",
        user_prefix: "",
        user_suffix: "",
        bot_prefix: "",
        bot_suffix: "",
        stops: [],
    };
}

function alpaca(systemPrompt: string | null = null): FormatDict {
    return {
        system_prefix: "",
        system_prompt:
            systemPrompt ??
            "Below is an instruction that describes a task. Write a response that appropriately completes the request.",
        system_suffix: "\n\n",
        user_prefix: "### Instruction:\n",
        user_suffix: "\n\n",
        bot_prefix: "### Response:\n",
        bot_suffix: "\n\n",
        stops: ["###", "Instruction:", "\n\n\n"],
    };
}

function mistralInstruct(): FormatDict {
    return {
        system_prefix: "",
        system_prompt: "",
        system_suffix: "",
        user_prefix: "[INST] ",
        user_suffix: " ",
        bot_prefix: "[/INST]",
        bot_suffix: "</s>",
        stops: []
    };
}

function chatml(systemPrompt: string | null = null): FormatDict {
    return {
        system_prefix: "<|im_start|>system\n",
        system_prompt: systemPrompt ?? "",
        system_suffix: "<|im_end|>\n",
        user_prefix: "<|im_start|>user\n",
        user_suffix: "<|im_end|>\n",
        bot_prefix: "<|im_start|>assistant\n",
        bot_suffix: "<|im_end|>\n",
        stops: ["<|im_end|>"]
    };
}

function llama2Chat(systemPrompt: string | null = null): FormatDict {
    return {
        system_prefix: "[INST] <<SYS>>\n",
        system_prompt: systemPrompt ?? "You are a helpful AI assistant.",
        system_suffix: "\n<</SYS>>\n\n",
        user_prefix: "",
        user_suffix: " [/INST]",
        bot_prefix: " ",
        bot_suffix: " [INST] ",
        stops: ["[INST]", "[/INST]"]
    };
}

function llama3(systemPrompt: string | null = null): FormatDict {
    return {
        system_prefix: "<|start_header_id|>system<|end_header_id|>\n\n",
        system_prompt: systemPrompt ?? 'You are a helpful AI assistant called "Llama 3".',
        system_suffix: "<|eot_id|>\n",
        user_prefix: "<|start_header_id|>user<|end_header_id|>\n\n",
        user_suffix: "<|eot_id|>\n",
        bot_prefix: "<|start_header_id|>assistant<|end_header_id|>\n\n",
        bot_suffix: "<|eot_id|>\n",
        stops: ["128001", "128008", "128009"]
    };
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

function command(systemPrompt: string | null = null): FormatDict {
    return {
        system_prefix: "<|START_OF_TURN_TOKEN|><|SYSTEM_TOKEN|>",
        system_prompt: systemPrompt ?? "You are a large language model called Command R built by the company Cohere. You act as a brilliant, sophisticated, AI-assistant chatbot trained to assist human users by providing thorough responses.",
        system_suffix: "<|END_OF_TURN_TOKEN|>",
        user_prefix: "<|START_OF_TURN_TOKEN|><|USER_TOKEN|>",
        user_suffix: "<|END_OF_TURN_TOKEN|>",
        bot_prefix: "<|START_OF_TURN_TOKEN|><|CHATBOT_TOKEN|>",
        bot_suffix: "<|END_OF_TURN_TOKEN|>",
        stops: []
    };
}

function gemma2(): FormatDict {
    return {
        system_prefix: "",
        system_prompt: "",
        system_suffix: "",
        user_prefix: "<start_of_turn>user\n",
        user_suffix: "<end_of_turn>\n",
        bot_prefix: "<start_of_turn>model\n",
        bot_suffix: "<end_of_turn>\n",
        stops: ["<end_of_turn>"]
    };
}

const formatRegistry: Record<string, () => FormatDict> = {
    blank,
    alpaca,
    mistralInstruct,
    chatml,
    llama2Chat,
    llama3,
    phi3,
    command,
    gemma2
};

export function getFormatDict(formatName: string): AdvancedFormat {
    const formatFunction = formatRegistry[formatName];
    if (!formatFunction) {
        throw new Error(`Format '${formatName}' is not defined.`);
    }
    return new AdvancedFormat(formatFunction());
}

// // Example usage
// const exampleFormat = getFormatDict("gemma2");
// console.log(exampleFormat.wrap("hi"));
