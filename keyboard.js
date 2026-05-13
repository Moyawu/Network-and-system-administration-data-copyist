window.DeKeyboard = {
    charMap: {
        '<': { shiftKey: true, keyCode: 188 }, '>': { shiftKey: true, keyCode: 190 },
        '|': { shiftKey: true, keyCode: 220 }, '\\': { shiftKey: false, keyCode: 220 },
        '/': { shiftKey: false, keyCode: 191 }, '?': { shiftKey: true, keyCode: 191 },
        '-': { shiftKey: false, keyCode: 189 }, '_': { shiftKey: true, keyCode: 189 },
        '=': { shiftKey: false, keyCode: 187 }, '+': { shiftKey: true, keyCode: 187 },
        '[': { shiftKey: false, keyCode: 219 }, '{': { shiftKey: true, keyCode: 219 },
        ']': { shiftKey: false, keyCode: 221 }, '}': { shiftKey: true, keyCode: 221 },
        ';': { shiftKey: false, keyCode: 186 }, ':': { shiftKey: true, keyCode: 186 },
        "'": { shiftKey: false, keyCode: 222 }, '"': { shiftKey: true, keyCode: 222 },
        ',': { shiftKey: false, keyCode: 188 }, '.': { shiftKey: false, keyCode: 190 },
        '`': { shiftKey: false, keyCode: 192 }, '~': { shiftKey: true, keyCode: 192 },
        '!': { shiftKey: true, keyCode: 49 }, '@': { shiftKey: true, keyCode: 50 },
        '#': { shiftKey: true, keyCode: 51 }, '$': { shiftKey: true, keyCode: 52 },
        '%': { shiftKey: true, keyCode: 53 }, '^': { shiftKey: true, keyCode: 54 },
        '&': { shiftKey: true, keyCode: 55 }, '*': { shiftKey: true, keyCode: 56 },
        '(': { shiftKey: true, keyCode: 57 }, ')': { shiftKey: true, keyCode: 48 },
        ' ': { shiftKey: false, keyCode: 32 }
    },

    typeSingleCharacter: function(char, isCtrl = false, isAlt = false) {
        let target = document.activeElement;
        if (!target || target === document.body || target.tagName === 'IFRAME') {
            target = document.querySelector('textarea.xterm-helper-textarea') || document.querySelector('.xterm-helper-textarea') || document.querySelector('canvas') || document.body;
        }
        if (target) { target.focus(); if (typeof target.click === 'function') target.click(); }

        const isXterm = target.classList && target.classList.contains('xterm-helper-textarea');
        const isCanvas = target.tagName === 'CANVAS';

        let key = char, code = '', keyCode = char.charCodeAt ? char.charCodeAt(0) : 0, shiftKey = false;

        const specialKeys = {
            '\n': { key: 'Enter', code: 'Enter', keyCode: 13 },
            'Escape': { key: 'Escape', code: 'Escape', keyCode: 27 },
            'ArrowDown': { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40 },
            'ArrowUp': { key: 'ArrowUp', code: 'ArrowUp', keyCode: 38 },
            'PageDown': { key: 'PageDown', code: 'PageDown', keyCode: 34 },
            'Backspace': { key: 'Backspace', code: 'Backspace', keyCode: 8 },
            'Tab': { key: 'Tab', code: 'Tab', keyCode: 9 }
        };

        if (specialKeys[char]) {
            key = specialKeys[char].key; code = specialKeys[char].code; keyCode = specialKeys[char].keyCode;
        } else if (/[a-zA-Z]/.test(char) && char.length === 1) {
            code = 'Key' + char.toUpperCase(); shiftKey = char === char.toUpperCase(); keyCode = char.toUpperCase().charCodeAt(0);
        } else if (/[0-9]/.test(char) && char.length === 1) {
            code = 'Digit' + char; keyCode = char.charCodeAt(0);
        } else if (this.charMap[char]) {
            // КЛЮЧЕВОЙ МОМЕНТ: Оставляем code пустым. 
            // Это заставит noVNC отправить чистый символ (Keysym), игнорируя настройки раскладки!
            code = ''; 
            shiftKey = this.charMap[char].shiftKey;
            keyCode = this.charMap[char].keyCode;
        }

        if (isCtrl && char.length === 1) keyCode = char.toUpperCase().charCodeAt(0);

        // 1. Физическое зажатие клавиши Shift (если символ требует шифта)
        if (shiftKey) {
            const shiftOpts = { key: 'Shift', code: 'ShiftLeft', keyCode: 16, which: 16, bubbles: true, cancelable: true, composed: true, shiftKey: true };
            target.dispatchEvent(new KeyboardEvent('keydown', shiftOpts));
        }

        // 2. Отправка самого символа
        const opts = { key, keyCode, which: keyCode, bubbles: true, cancelable: true, composed: true, ctrlKey: isCtrl, altKey: isAlt, shiftKey };
        if (code) opts.code = code; // Добавляем code только если он есть (для букв и цифр)

        target.dispatchEvent(new KeyboardEvent('keydown', opts));
        target.dispatchEvent(new KeyboardEvent('keypress', opts));

        if (isXterm) {
            let val = char;
            if (char === '\n') val = '\r';
            else if (char === 'Escape') val = '\x1b';
            else if (char === 'ArrowDown') val = '\x1b[B';
            else if (char === 'ArrowUp') val = '\x1b[A';
            else if (char === 'PageDown') val = '\x1b[6~';
            else if (char === 'Tab') val = '\t';
            else if (['Backspace', 'Delete'].includes(char)) val = '\x7f';
            else if (isCtrl && char.length === 1) val = String.fromCharCode(char.toUpperCase().charCodeAt(0) - 64);
            else if (char.length > 1) val = ''; 

            if (val) {
                target.value = val; target.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
            }
        } else if (!isCanvas) {
            if (char.length === 1 && char !== '\n' && char !== 'Escape' && !isCtrl && !isAlt && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
                target.value += char; target.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
            }
        }

        target.dispatchEvent(new KeyboardEvent('keyup', opts));

        // 3. Отпускание клавиши Shift
        if (shiftKey) {
            const shiftOpts = { key: 'Shift', code: 'ShiftLeft', keyCode: 16, which: 16, bubbles: true, cancelable: true, composed: true, shiftKey: false };
            target.dispatchEvent(new KeyboardEvent('keyup', shiftOpts));
        }
    }
};