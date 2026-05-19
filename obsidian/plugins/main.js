var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => AiContextPlugin
});
module.exports = __toCommonJS(main_exports);
var import_child_process = require("child_process");
var import_obsidian = require("obsidian");
var AskAiModal = class extends import_obsidian.Modal {
  onSubmit;
  constructor(app, onSubmit) {
    super(app);
    this.onSubmit = onSubmit;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: "\u0421\u043F\u0440\u043E\u0441\u0438\u0442\u044C Claude \u0441 \u043A\u043E\u043D\u0442\u0435\u043A\u0441\u0442\u043E\u043C RAG" });
    const inputEl = contentEl.createEl("input", {
      type: "text",
      placeholder: "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0432\u0430\u0448 \u0437\u0430\u043F\u0440\u043E\u0441 \u0434\u043B\u044F Claude..."
    });
    inputEl.style.width = "100%";
    inputEl.style.marginBottom = "1rem";
    inputEl.style.padding = "0.5rem";
    const submitBtn = contentEl.createEl("button", { text: "\u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C" });
    submitBtn.style.float = "right";
    submitBtn.addEventListener("click", () => {
      if (inputEl.value.trim()) {
        this.onSubmit(inputEl.value.trim());
        this.close();
      } else {
        new import_obsidian.Notice("\u041F\u0440\u043E\u043C\u043F\u0442 \u043D\u0435 \u043C\u043E\u0436\u0435\u0442 \u0431\u044B\u0442\u044C \u043F\u0443\u0441\u0442\u044B\u043C!");
      }
    });
    inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        submitBtn.click();
      }
    });
  }
  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
};
var AiContextPlugin = class extends import_obsidian.Plugin {
  async onload() {
    console.log("\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u043F\u043B\u0430\u0433\u0438\u043D\u0430 \u0418\u0418 \u041A\u043E\u043D\u0442\u0435\u043A\u0441\u0442 \u0441 \u043F\u043E\u043B\u043D\u043E\u0439 \u043B\u043E\u0433\u0438\u043A\u043E\u0439");
    const intervalInMinutes = 60;
    this.startCronJob(intervalInMinutes);
    this.addRibbonIcon("links-going-out", "\u0421\u0432\u044F\u0437\u0430\u0442\u044C \u0437\u0430\u043C\u0435\u0442\u043A\u0438 \u0447\u0435\u0440\u0435\u0437 Claude (Cron \u043D\u043E\u0434\u044B)", async () => {
      new import_obsidian.Notice("\u0417\u0430\u043F\u0443\u0441\u043A \u0440\u0443\u0447\u043D\u043E\u0433\u043E \u0441\u043A\u0430\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044F \u0441\u0432\u044F\u0437\u0435\u0439 \u043D\u043E\u0434...");
      await this.scanAndLinkNotes();
    });
    this.addRibbonIcon("bot", "\u0421\u043F\u0440\u043E\u0441\u0438\u0442\u044C Claude \u0441 \u043A\u043E\u043D\u0442\u0435\u043A\u0441\u0442\u043E\u043C RAG", () => {
      new AskAiModal(this.app, async (userPrompt) => {
        await this.handleAiWorkflow(userPrompt);
      }).open();
    });
    this.addCommand({
      id: "send-to-claude-with-rag-context",
      name: "\u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C \u0432\u044B\u0434\u0435\u043B\u0435\u043D\u043D\u044B\u0439 \u0442\u0435\u043A\u0441\u0442 \u0432 Claude \u0441 RAG \u043A\u043E\u043D\u0442\u0435\u043A\u0441\u0442\u043E\u043C",
      editorCallback: async (editor, view) => {
        const selectedText = editor.getSelection();
        if (!selectedText) {
          new import_obsidian.Notice("\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0432\u044B\u0434\u0435\u043B\u0438\u0442\u0435 \u0442\u0435\u043A\u0441\u0442 \u0432 \u0437\u0430\u043C\u0435\u0442\u043A\u0435, \u043A\u043E\u0442\u043E\u0440\u044B\u0439 \u043F\u043E\u0441\u043B\u0443\u0436\u0438\u0442 \u043F\u0440\u043E\u043C\u043F\u0442\u043E\u043C!");
          return;
        }
        await this.handleAiWorkflow(selectedText);
      }
    });
  }
  // Симуляция Cron-планировщика для нод
  startCronJob(minutes) {
    const intervalMs = minutes * 60 * 1e3;
    this.registerInterval(
      setInterval(async () => {
        console.log("Cron: \u0417\u0430\u043F\u0443\u0441\u043A \u043F\u043B\u0430\u043D\u043E\u0432\u043E\u0433\u043E \u0441\u043A\u0430\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044F \u0437\u0430\u043C\u0435\u0442\u043E\u043A...");
        await this.scanAndLinkNotes();
      }, intervalMs)
    );
    console.log(`Cron \u0437\u0430\u0434\u0430\u0447\u0430 \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u0437\u0430\u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u043E\u0432\u0430\u043D\u0430. \u0418\u043D\u0442\u0435\u0440\u0432\u0430\u043B: \u043A\u0430\u0436\u0434\u044B\u0435 ${minutes} \u043C\u0438\u043D.`);
  }
  // Логика ОДИНОЧНОГО запроса (Векторный поиск на бэкенде -> Claude Code)
  async handleAiWorkflow(userPrompt) {
    try {
      new import_obsidian.Notice("\u041F\u043E\u043B\u0443\u0447\u0435\u043D\u0438\u0435 \u043A\u043E\u043D\u0442\u0435\u043A\u0441\u0442\u0430 \u0438\u0437 \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u043E\u0433\u043E \u0431\u044D\u043A\u0435\u043D\u0434\u0430...");
      const contextResponse = await (0, import_obsidian.requestUrl)({
        url: "http://127.0.0.1:8000/get-context",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userPrompt })
      });
      const retrievedContext = contextResponse.json.context || "";
      new import_obsidian.Notice("\u041A\u043E\u043D\u0442\u0435\u043A\u0441\u0442 \u043F\u043E\u043B\u0443\u0447\u0435\u043D. \u041F\u0435\u0440\u0435\u0434\u0430\u044E \u0432 Claude Code...");
      const fullPrompt = `\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439 \u044D\u0442\u043E\u0442 \u043A\u043E\u043D\u0442\u0435\u043A\u0441\u0442: ${retrievedContext}. \u0417\u0430\u043F\u0440\u043E\u0441: ${userPrompt}`;
      const escapedPrompt = fullPrompt.replace(/"/g, '\\"').replace(/`/g, "\\`");
      (0, import_child_process.exec)(`claude -p "${escapedPrompt}"`, (error, stdout, stderr) => {
        if (error) {
          console.error(`\u041E\u0448\u0438\u0431\u043A\u0430 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u044F Claude: ${error}`);
          new import_obsidian.Notice("\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u0432\u044B\u0437\u043E\u0432\u0435 Claude \u0432 \u0442\u0435\u0440\u043C\u0438\u043D\u0430\u043B\u0435");
          return;
        }
        this.createNewNote(`\u041E\u0442\u0432\u0435\u0442 \u043D\u0430 \u043F\u0440\u043E\u043C\u043F\u0442 - ${userPrompt.slice(0, 15)}`, stdout);
        new import_obsidian.Notice("\u041E\u0442\u0432\u0435\u0442 \u043E\u0442 Claude Code \u043F\u043E\u043B\u0443\u0447\u0435\u043D!");
      });
    } catch (error) {
      console.error(error);
      new import_obsidian.Notice(`\u041E\u0448\u0438\u0431\u043A\u0430 RAG-\u0446\u0435\u043F\u043E\u0447\u043A\u0438: ${error.message}`);
    }
  }
  // Логика сканирования ВСЕХ .md файлов для связи нод
  async scanAndLinkNotes() {
    try {
      const files = this.app.vault.getMarkdownFiles();
      if (files.length === 0) {
        console.log("\u0421\u043A\u0430\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435 \u043E\u0442\u043C\u0435\u043D\u0435\u043D\u043E: \u043D\u0435\u0442 .md \u0444\u0430\u0439\u043B\u043E\u0432.");
        return;
      }
      let vaultSummary = "\u0421\u043F\u0438\u0441\u043E\u043A \u0437\u0430\u043C\u0435\u0442\u043E\u043A \u0438 \u0438\u0445 \u0441\u043E\u0434\u0435\u0440\u0436\u0438\u043C\u043E\u0435 \u0434\u043B\u044F \u0430\u043D\u0430\u043B\u0438\u0437\u0430 \u0441\u0432\u044F\u0437\u0435\u0439:\n\n";
      const maxFilesToScan = Math.min(files.length, 20);
      for (let i = 0; i < maxFilesToScan; i++) {
        const file = files[i];
        const content = await this.app.vault.read(file);
        vaultSummary += `--- \u041D\u0410\u0427\u0410\u041B\u041E \u0417\u0410\u041C\u0415\u0422\u041A\u0418: ${file.path} ---
`;
        vaultSummary += content.slice(0, 1e3);
        vaultSummary += `
--- \u041A\u041E\u041D\u0415\u0426 \u0417\u0410\u041C\u0415\u0422\u041A\u0418: ${file.path} ---

`;
      }
      const systemPrompt = `\u041F\u0440\u043E\u0430\u043D\u0430\u043B\u0438\u0437\u0438\u0440\u0443\u0439 \u044D\u0442\u0438 \u0437\u0430\u043C\u0435\u0442\u043A\u0438 \u0438\u0437 Obsidian. \u041D\u0430\u0439\u0434\u0438 \u043C\u0435\u0436\u0434\u0443 \u043D\u0438\u043C\u0438 \u0441\u043A\u0440\u044B\u0442\u044B\u0435 \u0441\u043C\u044B\u0441\u043B\u043E\u0432\u044B\u0435 \u0441\u0432\u044F\u0437\u0438. \u041D\u0430\u043F\u0438\u0448\u0438, \u043A\u0430\u043A\u0438\u0435 \u0437\u0430\u043C\u0435\u0442\u043A\u0438 (\u0443\u043A\u0430\u0437\u044B\u0432\u0430\u0439 \u0442\u043E\u0447\u043D\u044B\u0435 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u044F \u0444\u0430\u0439\u043B\u043E\u0432) \u0441\u0442\u043E\u0438\u0442 \u0441\u0432\u044F\u0437\u0430\u0442\u044C \u0434\u0440\u0443\u0433 \u0441 \u0434\u0440\u0443\u0433\u043E\u043C \u0447\u0435\u0440\u0435\u0437 [[\u0432\u0438\u043A\u0438-\u0441\u0441\u044B\u043B\u043A\u0438]] \u0438 \u043F\u043E\u0447\u0435\u043C\u0443. \u0412\u043E\u0442 \u0434\u0430\u043D\u043D\u044B\u0435:
${vaultSummary}`;
      const escapedPrompt = systemPrompt.replace(/"/g, '\\"').replace(/`/g, "\\`");
      new import_obsidian.Notice("Cron: \u0410\u043D\u0430\u043B\u0438\u0437 \u0441\u0432\u044F\u0437\u0435\u0439 \u0432 Claude Code...");
      (0, import_child_process.exec)(`claude -p "${escapedPrompt}"`, (error, stdout, stderr) => {
        if (error) {
          console.error(`\u041E\u0448\u0438\u0431\u043A\u0430 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u044F Cron: ${error}`);
          return;
        }
        this.createNewNote("\u041E\u0442\u0447\u0435\u0442 \u043E\u0431 \u0418\u0418 \u0441\u0432\u044F\u0437\u044F\u0445 \u0437\u0430\u043C\u0435\u0442\u043E\u043A", stdout);
        new import_obsidian.Notice("Claude \u0437\u0430\u043A\u043E\u043D\u0447\u0438\u043B \u0430\u043D\u0430\u043B\u0438\u0437 \u043D\u043E\u0434!");
      });
    } catch (error) {
      console.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u0432 \u043F\u0440\u043E\u0446\u0435\u0441\u0441\u0435 \u0440\u0430\u0431\u043E\u0442\u044B Cron-\u0441\u043A\u0430\u043D\u0435\u0440\u0430:", error);
    }
  }
  // Хелпер создания файлов
  async createNewNote(title, content) {
    const cleanTitle = title.replace(/[/\\?%*:|"<>]/g, "").slice(0, 30);
    const fileName = `${cleanTitle}-${Date.now().toString().slice(-4)}.md`;
    try {
      await this.app.vault.create(fileName, content);
    } catch (e) {
      console.error("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u043E\u0437\u0434\u0430\u0442\u044C \u0437\u0430\u043C\u0435\u0442\u043A\u0443", e);
    }
  }
  onunload() {
    console.log("\u041F\u043B\u0430\u0433\u0438\u043D \u0418\u0418 \u041A\u043E\u043D\u0442\u0435\u043A\u0441\u0442 \u0432\u044B\u0433\u0440\u0443\u0436\u0435\u043D");
  }
};
