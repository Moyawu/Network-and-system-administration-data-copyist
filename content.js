// Функция для загрузки содержимого .md файла
async function loadMarkdownFile(filename) {
    const url = chrome.runtime.getURL(filename);
    try {
        const response = await fetch(url);
        return await response.text();
    } catch (error) {
        console.error("Ошибка при загрузке файла:", filename, error);
        return "Не удалось загрузить модуль: " + filename;
    }
}

// Добавляем стили для скрытых блоков и кнопок копирования
function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
        /* Блоки полностью скрыты по умолчанию */
        .de-stealth-module {
            display: none;
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px dashed transparent; /* Прозрачная граница для отбивки */
            animation: fadeIn 0.2s ease-in-out;
        }
        
        /* Класс для отображения блока */
        .de-stealth-module.active {
            display: block;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(5px); }
            to { opacity: 1; transform: translateY(0); }
        }

        /* Стилизация текста, чтобы он сливался с вики-разметкой ALT Linux */
        .de-stealth-module p, .de-stealth-module li {
            line-height: 1.6;
            color: #202122;
        }

        /* Контейнер для блоков кода (для позиционирования кнопки) */
        .code-wrapper {
            position: relative;
            margin: 1em 0;
        }

        .de-stealth-module pre {
            background-color: #f8f9fa !important;
            border: 1px solid #eaecf0 !important;
            padding: 1em !important;
            color: #202122 !important;
            white-space: pre-wrap !important;
            font-family: monospace, monospace !important;
            line-height: 1.3 !important;
            border-radius: 2px;
            margin: 0 !important;
        }

        /* Кнопка копирования (появляется только при наведении на блок кода) */
        .copy-btn {
            position: absolute;
            top: 5px;
            right: 5px;
            background: #ffffff;
            border: 1px solid #a2a9b1;
            color: #202122;
            padding: 4px 8px;
            font-size: 12px;
            border-radius: 3px;
            cursor: pointer;
            opacity: 0;
            transition: opacity 0.2s, background-color 0.2s;
            box-shadow: 0 1px 2px rgba(0,0,0,0.1);
        }

        .code-wrapper:hover .copy-btn {
            opacity: 1;
        }

        .copy-btn:hover {
            background: #eaecf0;
        }
        
        .copy-btn.copied {
            background: #d5fdf4;
            border-color: #00af89;
            color: #00664f;
        }
    `;
    document.head.appendChild(style);
}

// Функция для добавления кнопок копирования ко всем <pre>
function addCopyButtons(container) {
    const preBlocks = container.querySelectorAll('pre');
    
    preBlocks.forEach(pre => {
        // Создаем обертку для позиционирования
        const wrapper = document.createElement('div');
        wrapper.className = 'code-wrapper';
        
        // Вставляем обертку перед pre, затем помещаем pre внутрь
        pre.parentNode.insertBefore(wrapper, pre);
        wrapper.appendChild(pre);

        // Создаем кнопку
        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-btn';
        copyBtn.textContent = 'Копировать';
        
        copyBtn.addEventListener('click', () => {
            // Копируем текст из блока (без лишних HTML тегов)
            navigator.clipboard.writeText(pre.innerText).then(() => {
                copyBtn.textContent = 'Скопировано!';
                copyBtn.classList.add('copied');
                
                // Возвращаем исходный вид через 2 секунды
                setTimeout(() => {
                    copyBtn.textContent = 'Копировать';
                    copyBtn.classList.remove('copied');
                }, 2000);
            }).catch(err => console.error('Ошибка копирования:', err));
        });

        wrapper.appendChild(copyBtn);
    });
}

async function injectModules() {
    const contentContainer = document.getElementById('mw-content-text');
    if (!contentContainer) return;

    injectStyles();

    let rawModul1 = await loadMarkdownFile('modul_1.md');
    let rawModul2 = await loadMarkdownFile('modul_2.md');

    const isMarkedAvailable = typeof marked !== 'undefined';
    const html1 = isMarkedAvailable ? marked.parse(rawModul1) : `<pre>${rawModul1}</pre>`;
    const html2 = isMarkedAvailable ? marked.parse(rawModul2) : `<pre>${rawModul2}</pre>`;

    // Создаем контейнер, но без видимых заголовков
    const modulesDiv = document.createElement('div');
    modulesDiv.className = 'mw-parser-output de-modules-container';
    
    // Внедряем модули как полностью невидимые блоки
    modulesDiv.innerHTML = `
        <div id="module-app-1" class="de-stealth-module">${html1}</div>
        <div id="module-app-2" class="de-stealth-module">${html2}</div>
    `;

    contentContainer.appendChild(modulesDiv);

    // Добавляем магию кнопок копирования
    addCopyButtons(modulesDiv);

    // Логика управления горячими клавишами
    document.addEventListener('keydown', (event) => {
        const mod1 = document.getElementById('module-app-1');
        const mod2 = document.getElementById('module-app-2');

        if (!mod1 || !mod2) return;

        // Alt + 1: Переключить Приложение 1
        if (event.altKey && event.code === 'Digit1') {
            event.preventDefault();
            mod1.classList.toggle('active');
            if (mod1.classList.contains('active')) {
                mod1.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
        
        // Alt + 2: Переключить Приложение 2
        if (event.altKey && event.code === 'Digit2') {
            event.preventDefault();
            mod2.classList.toggle('active');
            if (mod2.classList.contains('active')) {
                mod2.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }

        // Escape: Быстро скрыть всё (Panic Button)
        if (event.code === 'Escape') {
            mod1.classList.remove('active');
            mod2.classList.remove('active');
        }
    });
}

injectModules();