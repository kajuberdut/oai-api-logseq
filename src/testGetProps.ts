import nunjucks from 'nunjucks';

// Install Jinja compatibility for Nunjucks
nunjucks.installJinjaCompat();


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

async function fetchChatTemplate(debugLevel = 0) {
  const url = `http://${logseq.settings.host}/props`;

  try {
    if (debugLevel >= 1) {
      console.debug(`Fetching chat template from: ${url}`);
    }

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.chat_template) {
      throw new Error("Response does not contain 'chat_template'");
    }

    if (debugLevel >= 1) {
      console.debug("Retrieved chat template:", data.chat_template);
    }

    return data.chat_template;
  } catch (error) {
    console.error("Error fetching chat template:", error);
    throw error;
  }
}

(async () => {
  try {
    const chatTemplate = await fetchChatTemplate(1);
    console.log("Chat Template:", chatTemplate);
  } catch (e) {
    console.error("Failed to retrieve chat template:", e);
  }
})();
