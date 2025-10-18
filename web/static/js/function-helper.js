// MySQL函数帮助面板

class MySQLFunctionHelper {
    constructor() {
        this.panel = null;
        this.isVisible = false;
        this.init();
    }
    
    init() {
        this.createPanel();
        this.bindEvents();
    }
    
    createPanel() {
        this.panel = document.createElement('div');
        this.panel.id = 'mysql-function-helper';
        this.panel.className = 'mysql-function-helper';
        this.panel.style.cssText = `
            position: fixed;
            top: 50%;
            right: 20px;
            transform: translateY(-50%);
            width: 350px;
            max-height: 80vh;
            background: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            box-shadow: var(--shadow-card);
            z-index: 10000;
            display: none;
            overflow: hidden;
        `;
        
        this.panel.innerHTML = `
            <div class="helper-header" style="padding: 16px; border-bottom: 1px solid var(--border-color); background: rgba(0, 212, 255, 0.1);">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h6 style="margin: 0; color: var(--primary-color); font-weight: 600;">
                        <i class="bi bi-code-square"></i> MySQL函数助手
                    </h6>
                    <button class="btn btn-sm btn-outline-secondary" onclick="mysqlHelper.toggle()">
                        <i class="bi bi-x"></i>
                    </button>
                </div>
            </div>
            <div class="helper-content" style="padding: 16px; max-height: calc(80vh - 80px); overflow-y: auto;">
                <div class="function-categories">
                    <div class="category-tabs" style="display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap;">
                        <button class="category-tab active" data-category="date" style="padding: 6px 12px; border: 1px solid var(--border-color); background: var(--primary-color); color: white; border-radius: 6px; font-size: 12px;">日期时间</button>
                        <button class="category-tab" data-category="string" style="padding: 6px 12px; border: 1px solid var(--border-color); background: transparent; color: var(--text-secondary); border-radius: 6px; font-size: 12px;">字符串</button>
                        <button class="category-tab" data-category="math" style="padding: 6px 12px; border: 1px solid var(--border-color); background: transparent; color: var(--text-secondary); border-radius: 6px; font-size: 12px;">数学</button>
                        <button class="category-tab" data-category="aggregate" style="padding: 6px 12px; border: 1px solid var(--border-color); background: transparent; color: var(--text-secondary); border-radius: 6px; font-size: 12px;">聚合</button>
                        <button class="category-tab" data-category="condition" style="padding: 6px 12px; border: 1px solid var(--border-color); background: transparent; color: var(--text-secondary); border-radius: 6px; font-size: 12px;">条件</button>
                    </div>
                    <div class="function-list" id="function-list">
                        <!-- 函数列表将在这里生成 -->
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.panel);
    }
    
    bindEvents() {
        // 分类标签点击事件
        this.panel.addEventListener('click', (e) => {
            if (e.target.classList.contains('category-tab')) {
                this.switchCategory(e.target.dataset.category);
                
                // 更新标签样式
                this.panel.querySelectorAll('.category-tab').forEach(tab => {
                    tab.style.background = 'transparent';
                    tab.style.color = 'var(--text-secondary)';
                });
                e.target.style.background = 'var(--primary-color)';
                e.target.style.color = 'white';
            }
        });
    }
    
    switchCategory(category) {
        const categories = {
            date: ['DATE_SUB', 'DATE_ADD', 'NOW', 'CURDATE', 'CURTIME', 'DATE_FORMAT', 'DATEDIFF'],
            string: ['CONCAT', 'SUBSTRING', 'LENGTH', 'UPPER', 'LOWER'],
            math: ['ABS', 'ROUND', 'CEIL', 'FLOOR'],
            aggregate: ['COUNT', 'SUM', 'AVG', 'MAX', 'MIN'],
            condition: ['IF', 'CASE', 'COALESCE']
        };
        
        const functions = categories[category] || [];
        this.renderFunctions(functions);
    }
    
    renderFunctions(functionNames) {
        const listContainer = document.getElementById('function-list');
        listContainer.innerHTML = '';
        
        functionNames.forEach(funcName => {
            const funcInfo = MYSQL_FUNCTIONS[funcName];
            if (!funcInfo) return;
            
            const item = document.createElement('div');
            item.className = 'function-item';
            item.style.cssText = `
                margin-bottom: 12px;
                padding: 12px;
                border: 1px solid var(--border-color);
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s;
            `;
            
            item.innerHTML = `
                <div class="function-name" style="font-weight: 600; color: var(--primary-color); margin-bottom: 4px;">
                    ${funcName}()
                </div>
                <div class="function-desc" style="font-size: 12px; color: var(--text-secondary); margin-bottom: 8px;">
                    ${funcInfo.description}
                </div>
                <div class="function-examples">
                    ${funcInfo.examples.slice(0, 2).map(example => 
                        `<div class="example" style="background: rgba(0, 212, 255, 0.1); padding: 4px 8px; margin: 2px 0; border-radius: 4px; font-family: monospace; font-size: 11px; color: var(--primary-color);">${example}</div>`
                    ).join('')}
                </div>
            `;
            
            // 点击复制到剪贴板
            item.addEventListener('click', () => {
                const example = funcInfo.examples[0];
                navigator.clipboard.writeText(example).then(() => {
                    showAlert(`已复制: ${example}`, 'success', 2000);
                });
            });
            
            // 悬停效果
            item.addEventListener('mouseenter', () => {
                item.style.borderColor = 'var(--primary-color)';
                item.style.transform = 'translateY(-2px)';
            });
            
            item.addEventListener('mouseleave', () => {
                item.style.borderColor = 'var(--border-color)';
                item.style.transform = 'translateY(0)';
            });
            
            listContainer.appendChild(item);
        });
    }
    
    show() {
        this.panel.style.display = 'block';
        this.isVisible = true;
        
        // 默认显示日期时间函数
        this.switchCategory('date');
    }
    
    hide() {
        this.panel.style.display = 'none';
        this.isVisible = false;
    }
    
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }
}

// 全局实例
let mysqlHelper = null;

// 初始化函数助手
function initMySQLFunctionHelper() {
    if (!mysqlHelper) {
        mysqlHelper = new MySQLFunctionHelper();
    }
    return mysqlHelper;
}