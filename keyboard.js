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
        '(': { shiftKey: true, keyCode: 57 }, ')': { shiftKey: true, keyCode: 48 }
    },

    typeSingleCharacter: function(char, isCtrl = false, isAlt = false) {
        const target = document.activeElement;
        if (!target) return;

        let keyCode = 0;
        let shiftKey = false;
        let key = char;
        let code = '';

        // Определение кодов клавиш
        if (this.charMap[char]) {
            keyCode = this.charMap[char].keyCode;
            shiftKey = this.charMap[char].shiftKey;
        } else if (char === ' ') { // Фикс пробела
            code = 'Space';
            key = ' ';
            keyCode = 32;
        } else if (/[a-zA-Z]/.test(char) && char.length === 1) {
            keyCode = char.toUpperCase().charCodeAt(0);
            shiftKey = char === char.toUpperCase();
            code = 'Key' + char.toUpperCase();
        } else if (/[0-9]/.test(char) && char.length === 1) {
            keyCode = char.charCodeAt(0);
            shiftKey = false;
            code = 'Digit' + char;
        } else if (char === '\n') {
            keyCode = 13; key = 'Enter'; code = 'Enter';
        } else if (char === 'Escape') {
            keyCode = 27; key = 'Escape'; code = 'Escape';
	} else if (char === 'ArrowDown') {
            keyCode = 40; key = 'ArrowDown'; code = 'ArrowDown';
        } else if (char === 'ArrowUp') {
            keyCode = 38; key = 'ArrowUp'; code = 'ArrowUp';
        } else if (char === 'ArrowLeft') { // Добавлено
            keyCode = 37; key = 'ArrowLeft'; code = 'ArrowLeft';
        } else if (char === 'ArrowRight') { // Добавлено
            keyCode = 39; key = 'ArrowRight'; code = 'ArrowRight';
        } else if (char === 'PageDown') {
            keyCode = 34; key = 'PageDown'; code = 'PageDown';
        } else if (char === 'Tab') {
            keyCode = 9; key = 'Tab'; code = 'Tab';
        } else if (['Backspace', 'Delete'].includes(char)) {
            keyCode = char === 'Backspace' ? 8 : 46; key = char; code = char;
        }

        const isXterm = target.classList.contains('xterm-helper-textarea');
        const isCanvas = target.tagName === 'CANVAS';

        // 1. Нажатие клавиши Shift
        if (shiftKey) {
            const shiftOpts = { key: 'Shift', code: 'ShiftLeft', keyCode: 16, which: 16, bubbles: true, cancelable: true, composed: true, shiftKey: true };
            target.dispatchEvent(new KeyboardEvent('keydown', shiftOpts));
        }

        const opts = {
            key: key,
            code: code || '',
            keyCode: keyCode,
            which: keyCode,
            bubbles: true,
            cancelable: true,
            composed: true,
            shiftKey: shiftKey,
            ctrlKey: isCtrl,
            altKey: isAlt
        };

        // 2. Отправляем keydown ОДИН раз (как в реальном браузере)
        const kdEvent = new KeyboardEvent('keydown', opts);
        target.dispatchEvent(kdEvent);

        // 3. Отправляем beforeinput и input ТОЛЬКО если это печатаемый символ и терминал не перехватил keydown
        if (isXterm) {
            let val = char;
            // Исключаем спец-клавиши (Enter, Escape, Tab и др.), они уже обработаны Xterm-ом через keydown
            if (char === '\n' || char.length > 1 || isCtrl || isAlt) {
                val = '';
            }

            // Если это текст и Xterm не вызвал preventDefault() на событии keydown
            if (val && !kdEvent.defaultPrevented) {
                target.dispatchEvent(new InputEvent('beforeinput', {
                    inputType: 'insertText',
                    data: val,
                    bubbles: true,
                    cancelable: true,
                    composed: true
                }));

                target.dispatchEvent(new InputEvent('input', {
                    inputType: 'insertText',
                    data: val,
                    bubbles: true,
                    composed: true
                }));
            }
        } else {
            // Логика для обычных input и textarea (не xterm)
            if (!isCanvas) {
                if (char.length === 1 && char !== '\n' && char !== 'Escape' && !isCtrl && !isAlt && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
                    if (!kdEvent.defaultPrevented) {
                        target.value += char; 
                        target.dispatchEvent(new InputEvent('input', { data: char, inputType: 'insertText', bubbles: true, composed: true }));
                    }
                }

                const start = target.selectionStart;
                const end = target.selectionEnd;
                
                if (start !== undefined && end !== undefined) {
                    if (['HOME', 'Home'].includes(char)) {
                        target.setSelectionRange(0, 0);
                    } else if (['END', 'End'].includes(char)) {
                        target.setSelectionRange(target.value.length, target.value.length);
                    } else if (char === 'DEL_LEFT') {
                        target.value = target.value.substring(end);
                        target.setSelectionRange(0, 0);
                    } else if (char === 'DEL_RIGHT') {
                        target.value = target.value.substring(0, start);
                        target.setSelectionRange(start, start);
                    } else if (['BACKSPACE', 'Backspace'].includes(char)) {
                        if (start > 0) {
                            target.value = target.value.substring(0, start - 1) + target.value.substring(end);
                            target.setSelectionRange(start - 1, start - 1);
                        }
                    } else if (['DEL', 'Delete'].includes(char)) {
                        if (start < target.value.length) {
                            target.value = target.value.substring(0, start) + target.value.substring(start + 1);
                            target.setSelectionRange(start, start);
                        }
                    }
                }
            }
        }

        // 4. Отпускание клавиш
        target.dispatchEvent(new KeyboardEvent('keyup', opts));

        if (shiftKey) {
            const shiftOpts = { key: 'Shift', code: 'ShiftLeft', keyCode: 16, which: 16, bubbles: true, cancelable: true, composed: true, shiftKey: false };
            target.dispatchEvent(new KeyboardEvent('keyup', shiftOpts));
        }
    }
};