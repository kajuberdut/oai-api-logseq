export async function llmUI() {
  logseq.showMainUI();
  setTimeout(() => {
    const element = document.querySelector(
      ".ai-input"
    ) as HTMLInputElement | null;
    if (element) {
      element.focus();
    }
  }, 300);
}
