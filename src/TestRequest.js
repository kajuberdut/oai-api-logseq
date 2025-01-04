"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFormatDict = getFormatDict;
var AdvancedFormat = /** @class */ (function () {
    function AdvancedFormat(_dict) {
        this.assertType(_dict, "object", "_dict", "AdvancedFormat");
        var _dictKeys = Object.keys(_dict);
        this._dict = _dict;
    }
    AdvancedFormat.prototype.getItem = function (key) {
        if (key in this._dict) {
            var value = this._dict[key];
            if (typeof value === "function") {
                return value();
            }
            return value;
        }
        else {
            throw new Error("AdvancedFormat: the specified key ".concat(key, " was not found"));
        }
    };
    AdvancedFormat.prototype.keys = function () {
        return Object.keys(this._dict);
    };
    AdvancedFormat.prototype.wrap = function (prompt) {
        this.assertType(prompt, "string", "prompt", "AdvancedFormat.wrap");
        return ("".concat(this.getItem("system_prefix")) +
            "".concat(this.getItem("system_prompt")) +
            "".concat(this.getItem("system_suffix")) +
            "".concat(this.getItem("user_prefix")) +
            prompt +
            "".concat(this.getItem("user_suffix")) +
            "".concat(this.getItem("bot_prefix")));
    };
    AdvancedFormat.prototype.assertType = function (value, type, paramName, functionName) {
        if (typeof value !== type) {
            throw new Error("".concat(functionName, ": Expected parameter ").concat(paramName, " to be of type ").concat(type, ", but got ").concat(typeof value));
        }
    };
    return AdvancedFormat;
}());
function phi3(systemPrompt) {
    if (systemPrompt === void 0) { systemPrompt = null; }
    return {
        system_prefix: "<|system|>\n",
        system_prompt: systemPrompt !== null && systemPrompt !== void 0 ? systemPrompt : "",
        system_suffix: "<|end|>\n",
        user_prefix: "<|user|>\n",
        user_suffix: "<|end|>\n",
        bot_prefix: "<|assistant|>\n",
        bot_suffix: "<|end|>\n",
        stops: []
    };
}
var formatRegistry = {
    phi3: phi3
};
function getFormatDict(formatName) {
    var formatFunction = formatRegistry[formatName];
    if (!formatFunction) {
        throw new Error("Format '".concat(formatName, "' is not defined."));
    }
    return new AdvancedFormat(formatFunction());
}
var logseq = {
    settings: {
        model: "phi3",
        apiKey: null,
        host: "localhost:8080",
    },
    UI: {
        showMsg: function (message, type) {
            console.log("UI Message [".concat(type, "]: ").concat(message));
        },
    },
};
function modelGenerate(prompt, parameters) {
    return __awaiter(this, void 0, void 0, function () {
        var params, headers, response, data, e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!logseq.settings) {
                        throw new Error("Couldn't find API settings");
                    }
                    params = parameters || {};
                    if (params.model === undefined) {
                        params.model = logseq.settings.model;
                    }
                    params.prompt = prompt;
                    params.n_predict = params.n_predict || 200;
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    headers = {
                        "Content-Type": "application/json",
                    };
                    if (logseq.settings.apiKey && logseq.settings.apiKey.trim()) {
                        headers["Authorization"] = "Bearer ".concat(logseq.settings.apiKey);
                    }
                    return [4 /*yield*/, fetch("http://".concat(logseq.settings.host, "/completion"), {
                            method: "POST",
                            headers: headers,
                            body: JSON.stringify(params),
                        })];
                case 2:
                    response = _a.sent();
                    if (!response.ok) {
                        throw new Error("HTTP error! status: ".concat(response.status));
                    }
                    return [4 /*yield*/, response.json()];
                case 3:
                    data = _a.sent();
                    return [2 /*return*/, data.content.trim()];
                case 4:
                    e_1 = _a.sent();
                    console.error("Error during fetch request:", e_1);
                    logseq.UI.showMsg("Error: ".concat(e_1.message), "error");
                    throw e_1;
                case 5: return [2 /*return*/];
            }
        });
    });
}
function promptLLM(prompt, parameters) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, modelGenerate(prompt, parameters)];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
// Creating an instance of the type
var params = {
    model: "text-davinci-003",
    n_predict: 22,
    temperature: 0.7
};
(function () { return __awaiter(void 0, void 0, void 0, function () {
    var exampleFormat, prompt, result, e_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                exampleFormat = getFormatDict("phi3");
                prompt = exampleFormat.wrap("Hi");
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, promptLLM(prompt, params)];
            case 2:
                result = _a.sent();
                console.log("LLM Response:", result);
                return [3 /*break*/, 4];
            case 3:
                e_2 = _a.sent();
                console.error("Failed to get LLM response:", e_2);
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); })();
