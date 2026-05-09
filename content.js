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

// Добавляем стили для скрытых блоков (максимальная мимикрия)
function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .de-stealth-module {
            display: none;
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px dashed transparent;
        }
        
        .de-stealth-module.active {
            display: block;
            animation: fadeIn 0.2s ease-in-out;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(5px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .de-stealth-module p, .de-stealth-module li {
            line-height: 1.6;
            color: #202122;
        }

        /* Блоки кода мимикрируют под обычные, но кликабельны */
        .de-stealth-module pre {
            background-color: #f8f9fa !important;
            border: 1px solid #eaecf0 !important;
            padding: 1em !important;
            color: #202122 !important;
            white-space: pre-wrap !important;
            font-family: monospace, monospace !important;
            line-height: 1.3 !important;
            border-radius: 2px;
            margin: 0 0 1em 0 !important;
            cursor: text; /* Выглядит как обычный текст */
            transition: background-color 0.4s ease, border-color 0.4s ease;
        }

        /* Мягкая вспышка при успешном скрытом копировании */
        .de-stealth-module pre.copied-success {
            background-color: #e8f9ee !important;
            border-color: #a3d9b8 !important;
            transition: none; /* Резко зеленеет, плавно остывает */
        }
    `;
    document.head.appendChild(style);
}

// Скрытое копирование по клику на блок
function addInvisibleCopy(container) {
    const preBlocks = container.querySelectorAll('pre');
    
    preBlocks.forEach(pre => {
        pre.addEventListener('click', function(e) {
            // Если студент выделил кусок текста мышкой - не вмешиваемся, пусть копирует сам
            if (window.getSelection().toString().length > 0) return;

            // Берем текст и убираем лишние пустые переносы по краям
            const textToCopy = this.innerText.trim();
            
            navigator.clipboard.writeText(textToCopy).then(() => {
                // Визуальная микро-отдача
                this.classList.add('copied-success');
                setTimeout(() => {
                    this.classList.remove('copied-success');
                }, 400); // Через 400мс цвет начинает плавно возвращаться к серому
            }).catch(err => console.error('Ошибка скрытого копирования:', err));
        });
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

    const modulesDiv = document.createElement('div');
    modulesDiv.className = 'mw-parser-output de-modules-container';
    
    modulesDiv.innerHTML = `
        <div id="module-app-1" class="de-stealth-module">${html1}</div>
        <div id="module-app-2" class="de-stealth-module">${html2}</div>
    `;

    contentContainer.appendChild(modulesDiv);
    addInvisibleCopy(modulesDiv);

    const mod1 = document.getElementById('module-app-1');
    const mod2 = document.getElementById('module-app-2');

    // Функция экстренного скрытия
    function panicHide() {
        if (mod1) mod1.classList.remove('active');
        if (mod2) mod2.classList.remove('active');
    }

    // Горячие клавиши
    document.addEventListener('keydown', (event) => {
        if (!mod1 || !mod2) return;

        if (event.altKey && event.code === 'Digit1') {
            event.preventDefault();
            mod1.classList.toggle('active');
            if (mod1.classList.contains('active')) mod1.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        
        if (event.altKey && event.code === 'Digit2') {
            event.preventDefault();
            mod2.classList.toggle('active');
            if (mod2.classList.contains('active')) mod2.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        if (event.code === 'Escape') panicHide();
    });

    // PARANOIA MODE: Автоматически прятать при потере фокуса браузером (Alt+Tab) или переключении вкладки
    window.addEventListener('blur', panicHide);
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) panicHide();
    });
}

injectModules();