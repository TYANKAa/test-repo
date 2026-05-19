import { exec } from 'child_process';
import { Plugin, Notice, requestUrl, Editor, MarkdownView, Modal } from 'obsidian';

// 1. Создаем класс модального окна для ввода промпта
class AskAiModal extends Modal {
    onSubmit: (result: string) => void;

    constructor(app: any, onSubmit: (result: string) => void) {
        super(app);
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: 'Спросить Claude с контекстом RAG' });

        // Инпут для ввода вопроса
        const inputEl = contentEl.createEl('input', {
            type: 'text',
            placeholder: 'Введите ваш запрос для Claude...'
        });
        inputEl.style.width = '100%';
        inputEl.style.marginBottom = '1rem';
        inputEl.style.padding = '0.5rem';

        // Кнопка отправки
        const submitBtn = contentEl.createEl('button', { text: 'Отправить' });
        submitBtn.style.float = 'right';

        submitBtn.addEventListener('click', () => {
            if (inputEl.value.trim()) {
                this.onSubmit(inputEl.value.trim());
                this.close();
            } else {
                new Notice('Промпт не может быть пустым!');
            }
        });

        // Позволяем отправлять по нажатию Enter
        inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                submitBtn.click();
            }
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

// 2. Основной класс плагина
export default class AiContextPlugin extends Plugin {
    async onload() {
        console.log('Загрузка плагина ИИ Контекст с полной логикой');

        // ==========================================
        // 1. НАСТРОЙКА ФОНОВОГО КРОНА (Связи нод)
        // ==========================================
        const intervalInMinutes = 60;
        this.startCronJob(intervalInMinutes);

        this.addRibbonIcon('links-going-out', 'Связать заметки через Claude (Cron ноды)', async () => {
            new Notice('Запуск ручного сканирования связей нод...');
            await this.scanAndLinkNotes();
        });

        // ==========================================
        // 2. НАСТРОЙКА ОДИНОЧНОГО ЗАПРОСА (Ваш RAG + Claude)
        // ==========================================

        // Кнопка на панели: Заменяем prompt() на наш Modal
        this.addRibbonIcon('bot', 'Спросить Claude с контекстом RAG', () => {
            new AskAiModal(this.app, async (userPrompt) => {
                await this.handleAiWorkflow(userPrompt);
            }).open();
        });

        // Команда в палитру команд (Cmd/Ctrl + P): отправка выделенного текста
        this.addCommand({
            id: 'send-to-claude-with-rag-context',
            name: 'Отправить выделенный текст в Claude с RAG контекстом',
            editorCallback: async (editor: Editor, view: MarkdownView) => {
                const selectedText = editor.getSelection();
                if (!selectedText) {
                    new Notice('Сначала выделите текст в заметке, который послужит промптом!');
                    return;
                }
                await this.handleAiWorkflow(selectedText);
            }
        });
    }

    // Симуляция Cron-планировщика для нод
    startCronJob(minutes: number) {
        const intervalMs = minutes * 60 * 1000;
        this.registerInterval(
            setInterval(async () => {
                console.log('Cron: Запуск планового сканирования заметок...');
                await this.scanAndLinkNotes();
            }, intervalMs)
        );
        console.log(`Cron задача успешно зарегистрирована. Интервал: каждые ${minutes} мин.`);
    }

    // Логика ОДИНОЧНОГО запроса (Векторный поиск на бэкенде -> Claude Code)
    async handleAiWorkflow(userPrompt: string) {
        try {
            new Notice('Получение контекста из локального бэкенда...');

            const contextResponse = await requestUrl({
                url: 'http://127.0.0.1:8000/get-context',
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: userPrompt })
            });

            const retrievedContext = contextResponse.json.context || '';
            new Notice('Контекст получен. Передаю в Claude Code...');

            const fullPrompt = `Используй этот контекст: ${retrievedContext}. Запрос: ${userPrompt}`;
            const escapedPrompt = fullPrompt.replace(/"/g, '\\"').replace(/`/g, '\\`');

            exec(`claude -p "${escapedPrompt}"`, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Ошибка выполнения Claude: ${error}`);
                    new Notice('Ошибка при вызове Claude в терминале');
                    return;
                }

                this.createNewNote(`Ответ на промпт - ${userPrompt.slice(0, 15)}`, stdout);
                new Notice('Ответ от Claude Code получен!');
            });

        } catch (error: any) {
            console.error(error);
            new Notice(`Ошибка RAG-цепочки: ${error.message}`);
        }
    }

    // Логика сканирования ВСЕХ .md файлов для связи нод
    async scanAndLinkNotes() {
        try {
            const files = this.app.vault.getMarkdownFiles();
            if (files.length === 0) {
                console.log('Сканирование отменено: нет .md файлов.');
                return;
            }

            let vaultSummary = "Список заметок и их содержимое для анализа связей:\n\n";
            const maxFilesToScan = Math.min(files.length, 20);

            for (let i = 0; i < maxFilesToScan; i++) {
                const file = files[i];
                const content = await this.app.vault.read(file);

                vaultSummary += `--- НАЧАЛО ЗАМЕТКИ: ${file.path} ---\n`;
                vaultSummary += content.slice(0, 1000);
                vaultSummary += `\n--- КОНЕЦ ЗАМЕТКИ: ${file.path} ---\n\n`;
            }

            const systemPrompt = `Проанализируй эти заметки из Obsidian. Найди между ними скрытые смысловые связи. Напиши, какие заметки (указывай точные названия файлов) стоит связать друг с другом через [[вики-ссылки]] и почему. Вот данные:\n${vaultSummary}`;
            const escapedPrompt = systemPrompt.replace(/"/g, '\\"').replace(/`/g, '\\`');

            new Notice('Cron: Анализ связей в Claude Code...');

            exec(`claude -p "${escapedPrompt}"`, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Ошибка выполнения Cron: ${error}`);
                    return;
                }
                this.createNewNote('Отчет об ИИ связях заметок', stdout);
                new Notice('Claude закончил анализ нод!');
            });

        } catch (error) {
            console.error('Ошибка в процессе работы Cron-сканера:', error);
        }
    }

    // Хелпер создания файлов
    async createNewNote(title: string, content: string) {
        const cleanTitle = title.replace(/[/\\?%*:|"<>]/g, '').slice(0, 30);
        const fileName = `${cleanTitle}-${Date.now().toString().slice(-4)}.md`;
        try {
            await this.app.vault.create(fileName, content);
        } catch (e) {
            console.error('Не удалось создать заметку', e);
        }
    }

    onunload() {
        console.log('Плагин ИИ Контекст выгружен');
    }
}