// 智能提示组件

class MySQLAutocomplete {
    constructor(inputElement, options = {}) {
        this.input = inputElement;
        this.options = {
            maxSuggestions: 10,
            minLength: 1,
            ...options
        };
        
        this.suggestionBox = null;
        this.currentSuggestions = [];
        this.selectedIndex = -1;
        
        this.init();
    }
    
    init() {
        // 创建建议框
        this.createSuggestionBox();
        
        // 绑定事件
        this.input.addEventListener('input', this.handleInput.bind(this));
        this.input.addEventListener('keydown', this.handleKeydown.bind(this));
        this.input.addEventListener('blur', this.handleBlur.bind(this));
        this.input.addEventListener('focus', this.handleFocus.bind(this));
        
        // 点击外部关闭建议框
        document.addEventListener('click', (e) => {
            if (!this.input.contains(e.target) && !this.suggestionBox.contains(e.target)) {
                this.hideSuggestions();
            }
        });
    }
    
    createSuggestionBox() {
        this.suggestionBox = document.createElement('div');
        this.suggestionBox.className = 'mysql-autocomplete-suggestions';
        this.suggestionBox.style.cssText = `
            position: absolute;
            z-index: 9999;
            background: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            box-shadow: var(--shadow-card);
            max-height: 300px;
            overflow-y: auto;
            display: none;
            min-width: 300px;
        `;
        
        document.body.appendChild(this.suggestionBox);
    }
    
    handleInput(e) {
        const value = e.target.value;
        const cursorPos = e.target.selectionStart;
        
        // 检查光标位置的单词
        const word = this.getWordAtCursor(value, cursorPos);
        
        if (word && word.length >= this.options.minLength) {
            this.showSuggestions(word, cursorPos);
        } else {
            this.hideSuggestions();
        }
    }
    
    handleKeydown(e) {
        if (!this.suggestionBox.style.display || this.suggestionBox.style.display === 'none') {
            return;
        }
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.selectNext();
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.selectPrevious();
                break;
            case 'Enter':
                e.preventDefault();
                this.applySuggestion();
                break;
            case 'Escape':
                this.hideSuggestions();
                break;
        }
    }
    
    handleBlur(e) {
        // 延迟隐藏，允许点击建议项
        setTimeout(() => {
            if (!this.suggestionBox.matches(':hover')) {
                this.hideSuggestions();
            }
        }, 150);
    }
    
    handleFocus(e) {
        const value = e.target.value;
        const cursorPos = e.target.selectionStart;
        const word = this.getWordAtCursor(value, cursorPos);
        
        if (word && word.length >= this.options.minLength) {
            this.showSuggestions(word, cursorPos);
        }
    }
    
    getWordAtCursor(text, cursorPos) {
        // 找到光标位置的单词边界
        let start = cursorPos;
        let end = cursorPos;
        
        // 向前查找单词开始 - 支持字母、数字、下划线
        while (start > 0 && /[A-Za-z0-9_]/.test(text[start - 1])) {
            start--;
        }
        
        // 向后查找单词结束 - 支持字母、数字、下划线
        while (end < text.length && /[A-Za-z0-9_]/.test(text[end])) {
            end++;
        }
        
        return text.substring(start, end);
    }
    
    showSuggestions(word, cursorPos) {
        const suggestions = getMySQLFunctionSuggestions(word);
        
        if (suggestions.length === 0) {
            this.hideSuggestions();
            return;
        }
        
        this.currentSuggestions = suggestions;
        this.selectedIndex = -1;
        
        // 渲染建议列表
        this.renderSuggestions(suggestions);
        
        // 定位建议框
        this.positionSuggestionBox();
        
        this.suggestionBox.style.display = 'block';
    }
    
    renderSuggestions(suggestions) {
        this.suggestionBox.innerHTML = '';
        
        suggestions.forEach((suggestion, index) => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.style.cssText = `
                padding: 12px 16px;
                cursor: pointer;
                border-bottom: 1px solid var(--border-color);
                transition: background-color 0.2s;
            `;
            
            item.innerHTML = `
                <div class="suggestion-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                    <strong style="color: var(--primary-color); font-size: 14px;">${suggestion.name}()</strong>
                    <span style="color: var(--text-secondary); font-size: 12px;">函数</span>
                </div>
                <div class="suggestion-description" style="color: var(--text-secondary); font-size: 12px; margin-bottom: 8px;">
                    ${suggestion.description}
                </div>
                <div class="suggestion-example" style="background: rgba(0, 212, 255, 0.1); padding: 4px 8px; border-radius: 4px; font-family: monospace; font-size: 11px; color: var(--primary-color);">
                    ${suggestion.examples[0]}
                </div>
            `;
            
            // 悬停效果
            item.addEventListener('mouseenter', () => {
                this.selectItem(index);
            });
            
            // 点击选择
            item.addEventListener('click', () => {
                this.selectedIndex = index;
                this.applySuggestion();
            });
            
            this.suggestionBox.appendChild(item);
        });
    }
    
    positionSuggestionBox() {
        const inputRect = this.input.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        
        this.suggestionBox.style.left = (inputRect.left + scrollLeft) + 'px';
        this.suggestionBox.style.top = (inputRect.bottom + scrollTop + 5) + 'px';
    }
    
    selectNext() {
        this.selectedIndex = Math.min(this.selectedIndex + 1, this.currentSuggestions.length - 1);
        this.updateSelection();
    }
    
    selectPrevious() {
        this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
        this.updateSelection();
    }
    
    selectItem(index) {
        this.selectedIndex = index;
        this.updateSelection();
    }
    
    updateSelection() {
        const items = this.suggestionBox.querySelectorAll('.suggestion-item');
        items.forEach((item, index) => {
            if (index === this.selectedIndex) {
                item.style.backgroundColor = 'rgba(0, 212, 255, 0.2)';
            } else {
                item.style.backgroundColor = 'transparent';
            }
        });
    }
    
    applySuggestion() {
        if (this.selectedIndex >= 0 && this.selectedIndex < this.currentSuggestions.length) {
            const suggestion = this.currentSuggestions[this.selectedIndex];
            this.insertFunction(suggestion);
        }
        this.hideSuggestions();
    }
    
    insertFunction(suggestion) {
        const cursorPos = this.input.selectionStart;
        const value = this.input.value;
        
        // 找到要替换的单词范围
        const word = this.getWordAtCursor(value, cursorPos);
        const wordStart = value.lastIndexOf(word, cursorPos);
        const wordEnd = wordStart + word.length;
        
        // 使用第一个示例作为插入内容
        const insertText = suggestion.examples[0];
        
        // 替换文本
        const newValue = value.substring(0, wordStart) + insertText + value.substring(wordEnd);
        this.input.value = newValue;
        
        // 设置光标位置到函数参数位置
        const newCursorPos = wordStart + insertText.length;
        this.input.setSelectionRange(newCursorPos, newCursorPos);
        
        // 触发input事件
        this.input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    hideSuggestions() {
        this.suggestionBox.style.display = 'none';
        this.currentSuggestions = [];
        this.selectedIndex = -1;
    }
    
    destroy() {
        if (this.suggestionBox && this.suggestionBox.parentNode) {
            this.suggestionBox.parentNode.removeChild(this.suggestionBox);
        }
    }
}

// 初始化自动完成功能
function initMySQLAutocomplete(selector) {
    const inputs = document.querySelectorAll(selector);
    const autocompletes = [];
    
    inputs.forEach(input => {
        const autocomplete = new MySQLAutocomplete(input);
        autocompletes.push(autocomplete);
    });
    
    return autocompletes;
}