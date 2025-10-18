// 过滤模板页面功能

let filterTemplates = [];
let filteredTemplates = [];

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    loadFilterTemplates();
});

// 加载过滤模板列表
async function loadFilterTemplates() {
    try {
        const result = await apiCall('/api/filter-templates');
        filterTemplates = result || [];
        filteredTemplates = [...filterTemplates];
        renderFilterTemplates();
    } catch (error) {
        console.error('加载过滤模板失败:', error);
        showAlert('加载过滤模板失败: ' + error.message, 'danger');
    }
}

// 渲染过滤模板卡片
function renderFilterTemplates() {
    const grid = document.getElementById('templateGrid');
    const emptyState = document.getElementById('emptyTemplateState');
    
    if (!grid) return;
    
    grid.innerHTML = '';
    
    if (filteredTemplates.length === 0) {
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    
    filteredTemplates.forEach(template => {
        const col = document.createElement('div');
        col.className = 'col-md-6 col-lg-4';
        
        const conditionsCount = template.conditions ? template.conditions.length : 0;
        const conditionsPreview = getConditionsPreview(template.conditions);
        
        col.innerHTML = `
            <div class="card template-card" onclick="copyFilterTemplate('${template.id}')">
                <div class="card-header">
                    <div class="template-icon">
                        <i class="bi bi-funnel-fill"></i>
                    </div>
                    <div class="template-header-info">
                        <h6>${template.name} 
                            <span class="badge ${template.enabled !== false ? 'bg-success' : 'bg-secondary'} ms-2">
                                ${template.enabled !== false ? '已启用' : '已禁用'}
                            </span>
                        </h6>
                        <small>${conditionsCount} 个条件</small>
                    </div>
                </div>
                <div class="template-info">
                    <div class="template-description">
                        <p>${template.description || '暂无描述'}</p>
                    </div>
                    <div class="template-conditions-preview">
                        <h6>条件预览:</h6>
                        <div class="conditions-list">
                            ${conditionsPreview}
                        </div>
                    </div>
                    <div class="template-meta">
                        <small class="text-muted">创建时间: ${formatDate(template.create_at)}</small>
                    </div>
                </div>
                <div class="template-actions" onclick="event.stopPropagation()">
                    <div class="action-row">
                        <button class="btn btn-sm btn-outline-primary" onclick="previewTemplate('${template.id}')">
                            <i class="bi bi-eye"></i> 预览
                        </button>
                        <button class="btn btn-sm btn-outline-success" onclick="copyFilterTemplate('${template.id}')">
                            <i class="bi bi-copy"></i> 复制
                        </button>
                    </div>
                    <div class="action-row">
                        <button class="btn btn-sm ${template.enabled !== false ? 'btn-outline-warning' : 'btn-outline-success'}" onclick="toggleTemplateStatus('${template.id}')">
                            <i class="bi ${template.enabled !== false ? 'bi-pause-circle' : 'bi-play-circle'}"></i> ${template.enabled !== false ? '关闭' : '开启'}
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteFilterTemplate('${template.id}')">
                            <i class="bi bi-trash"></i> 删除
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        grid.appendChild(col);
    });
}

// 获取条件预览
function getConditionsPreview(conditions) {
    if (!conditions || conditions.length === 0) {
        return '<span class="text-muted">暂无条件</span>';
    }
    
    const preview = conditions.slice(0, 3).map(condition => {
        const operatorSymbol = getOperatorSymbol(condition.operator);
        return `<div class="condition-preview">
            <code>${condition.field} ${operatorSymbol} ${condition.value}</code>
        </div>`;
    }).join('');
    
    if (conditions.length > 3) {
        return preview + `<div class="text-muted">... 还有 ${conditions.length - 3} 个条件</div>`;
    }
    
    return preview;
}

// 获取操作符符号
function getOperatorSymbol(operator) {
    const symbols = {
        '=': '=',
        '!=': '!=',
        '>': '>',
        '<': '<',
        '>=': '>=',
        '<=': '<=',
        'LIKE': 'LIKE',
        'IN': 'IN',
        'NOT IN': 'NOT IN',
        'IS NULL': 'IS NULL',
        'IS NOT NULL': 'IS NOT NULL'
    };
    return symbols[operator] || operator;
}

// 显示过滤模板模态框
function showFilterTemplateModal(id = null, templateData = null) {
    const modal = new bootstrap.Modal(document.getElementById('filterTemplateModal'));
    const form = document.getElementById('filterTemplateForm');
    const title = document.getElementById('filterTemplateModalTitle');
    
    // 重置表单
    form.reset();
    document.getElementById('filterTemplateId').value = '';
    document.getElementById('templateConditions').innerHTML = '';
    
    if (id) {
        // 编辑模式
        title.textContent = '编辑过滤模板';
        const template = filterTemplates.find(t => t.id === id);
        if (template) {
            document.getElementById('filterTemplateId').value = template.id;
            document.getElementById('templateName').value = template.name;
            document.getElementById('templateDescription').value = template.description || '';
            
            // 加载条件
            if (template.conditions && template.conditions.length > 0) {
                template.conditions.forEach(condition => {
                    addTemplateCondition(condition);
                });
            }
        }
    } else if (templateData) {
        // 复制模式
        title.textContent = '复制过滤模板';
        document.getElementById('templateName').value = templateData.name;
        document.getElementById('templateDescription').value = templateData.description || '';
        
        // 加载条件
        if (templateData.conditions && templateData.conditions.length > 0) {
            templateData.conditions.forEach(condition => {
                addTemplateCondition(condition);
            });
        }
    } else {
        // 新增模式
        title.textContent = '添加过滤模板';
    }
    
    modal.show();
}

// 添加模板条件
function addTemplateCondition(condition = null) {
    const container = document.getElementById('templateConditions');
    const conditionDiv = document.createElement('div');
    conditionDiv.className = 'row mb-2 condition-row';
    
    conditionDiv.innerHTML = `
        <div class="col-md-3">
            <input type="text" class="form-control" placeholder="字段名" 
                   value="${condition ? condition.field : ''}" data-field="field">
        </div>
        <div class="col-md-2">
            <select class="form-select" data-field="operator">
                <option value="=" ${condition && condition.operator === '=' ? 'selected' : ''}>=</option>
                <option value="!=" ${condition && condition.operator === '!=' ? 'selected' : ''}>!=</option>
                <option value=">" ${condition && condition.operator === '>' ? 'selected' : ''}>&gt;</option>
                <option value="<" ${condition && condition.operator === '<' ? 'selected' : ''}>&lt;</option>
                <option value=">=" ${condition && condition.operator === '>=' ? 'selected' : ''}>&gt;=</option>
                <option value="<=" ${condition && condition.operator === '<=' ? 'selected' : ''}>&lt;=</option>
                <option value="LIKE" ${condition && condition.operator === 'LIKE' ? 'selected' : ''}>LIKE</option>
                <option value="IN" ${condition && condition.operator === 'IN' ? 'selected' : ''}>IN</option>
                <option value="NOT IN" ${condition && condition.operator === 'NOT IN' ? 'selected' : ''}>NOT IN</option>
                <option value="IS NULL" ${condition && condition.operator === 'IS NULL' ? 'selected' : ''}>IS NULL</option>
                <option value="IS NOT NULL" ${condition && condition.operator === 'IS NOT NULL' ? 'selected' : ''}>IS NOT NULL</option>
            </select>
        </div>
        <div class="col-md-3">
            <input type="text" class="form-control mysql-autocomplete" placeholder="值" 
                   value="${condition ? condition.value : ''}" data-field="value">
        </div>
        <div class="col-md-2">
            <select class="form-select" data-field="logic">
                <option value="AND" ${condition && condition.logic === 'AND' ? 'selected' : ''}>AND</option>
                <option value="OR" ${condition && condition.logic === 'OR' ? 'selected' : ''}>OR</option>
            </select>
        </div>
        <div class="col-md-2">
            <button type="button" class="btn btn-outline-danger btn-sm" onclick="removeTemplateCondition(this)">
                <i class="bi bi-trash"></i>
            </button>
        </div>
    `;
    
    container.appendChild(conditionDiv);
    
    // 为新添加的值输入框启用MySQL智能提示
    const valueInput = conditionDiv.querySelector('.mysql-autocomplete');
    if (valueInput) {
        new MySQLAutocomplete(valueInput);
    }
}

// 移除模板条件
function removeTemplateCondition(button) {
    button.closest('.condition-row').remove();
}

// 保存过滤模板
async function saveFilterTemplate() {
    const form = document.getElementById('filterTemplateForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const id = document.getElementById('filterTemplateId').value;
    
    // 收集条件
    const conditions = [];
    document.querySelectorAll('#templateConditions .condition-row').forEach(row => {
        const field = row.querySelector('[data-field="field"]').value;
        const operator = row.querySelector('[data-field="operator"]').value;
        const value = row.querySelector('[data-field="value"]').value;
        const logic = row.querySelector('[data-field="logic"]').value;
        
        if (field && operator && value) {
            conditions.push({ field, operator, value, logic });
        }
    });
    
    const template = {
        name: document.getElementById('templateName').value,
        description: document.getElementById('templateDescription').value,
        conditions: conditions,
        enabled: true  // 新模板默认启用
    };
    
    try {
        let result;
        if (id) {
            // 更新
            result = await apiCall(`/api/filter-templates/${id}`, {
                method: 'PUT',
                body: JSON.stringify(template)
            });
        } else {
            // 创建
            result = await apiCall('/api/filter-templates', {
                method: 'POST',
                body: JSON.stringify(template)
            });
        }
        
        showAlert(id ? '过滤模板更新成功' : '过滤模板创建成功', 'success');
        
        // 关闭模态框
        const modal = bootstrap.Modal.getInstance(document.getElementById('filterTemplateModal'));
        modal.hide();
        
        // 刷新数据
        await loadFilterTemplates();
        
    } catch (error) {
        showAlert('保存过滤模板失败: ' + error.message, 'danger');
    }
}

// 复制过滤模板
function copyFilterTemplate(id) {
    const template = filterTemplates.find(t => t.id === id);
    if (!template) {
        showAlert('模板不存在', 'danger');
        return;
    }
    
    // 生成唯一的副本名称
    const copyNumber = getCopyNumber(template.name);
    const copyName = copyNumber > 1 ? 
        `${template.name} - 副本${copyNumber}` : 
        `${template.name} - 副本`;
    
    // 创建复制的模板数据
    const copiedTemplate = {
        name: copyName,
        description: template.description ? 
            `${template.description} (复制自: ${template.name})` : 
            `复制自模板: ${template.name}`,
        conditions: template.conditions ? 
            template.conditions.map(condition => ({...condition})) : [],
        enabled: true  // 复制的模板默认启用
    };
    
    // 显示模态框并填入复制的数据
    showFilterTemplateModal(null, copiedTemplate);
    
    // 显示复制成功提示
    showAlert(`已复制模板 "${template.name}"，请修改名称后保存`, 'info', 4000);
}

// 获取副本编号
function getCopyNumber(originalName) {
    const existingNames = filterTemplates.map(t => t.name);
    let copyNumber = 1;
    
    while (true) {
        const testName = copyNumber === 1 ? 
            `${originalName} - 副本` : 
            `${originalName} - 副本${copyNumber}`;
        
        if (!existingNames.includes(testName)) {
            return copyNumber;
        }
        copyNumber++;
    }
}

// 切换模板启用状态
async function toggleTemplateStatus(id) {
    const template = filterTemplates.find(t => t.id === id);
    if (!template) {
        showAlert('模板不存在', 'danger');
        return;
    }
    
    // 切换状态（默认为启用）
    const newStatus = template.enabled !== false ? false : true;
    const statusText = newStatus ? '启用' : '禁用';
    
    try {
        // 更新模板状态
        const updatedTemplate = {
            ...template,
            enabled: newStatus
        };
        
        await apiCall(`/api/filter-templates/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updatedTemplate)
        });
        
        showAlert(`模板 "${template.name}" 已${statusText}`, 'success');
        
        // 刷新数据
        await loadFilterTemplates();
        
    } catch (error) {
        showAlert(`${statusText}模板失败: ` + error.message, 'danger');
    }
}

// 删除过滤模板
async function deleteFilterTemplate(id) {
    if (!confirm('确定要删除这个过滤模板吗？此操作不可撤销。')) {
        return;
    }
    
    try {
        await apiCall(`/api/filter-templates/${id}`, { method: 'DELETE' });
        showAlert('过滤模板删除成功', 'success');
        
        // 刷新数据
        await loadFilterTemplates();
    } catch (error) {
        showAlert('删除过滤模板失败: ' + error.message, 'danger');
    }
}

// 过滤模板
function filterTemplateList() {
    const searchTerm = document.getElementById('templateSearch').value.toLowerCase();
    const conditionFilter = document.getElementById('templateConditionFilter').value;
    const statusFilter = document.getElementById('templateStatusFilter').value;
    
    filteredTemplates = filterTemplates.filter(template => {
        const matchesSearch = !searchTerm || 
            template.name.toLowerCase().includes(searchTerm) ||
            (template.description && template.description.toLowerCase().includes(searchTerm));
        
        let matchesCondition = true;
        if (conditionFilter === 'has-conditions') {
            matchesCondition = template.conditions && template.conditions.length > 0;
        } else if (conditionFilter === 'no-conditions') {
            matchesCondition = !template.conditions || template.conditions.length === 0;
        }
        
        let matchesStatus = true;
        if (statusFilter === 'enabled') {
            matchesStatus = template.enabled !== false;
        } else if (statusFilter === 'disabled') {
            matchesStatus = template.enabled === false;
        }
        
        return matchesSearch && matchesCondition && matchesStatus;
    });
    
    renderFilterTemplates();
}

// 刷新过滤模板
async function refreshFilterTemplates() {
    try {
        await loadFilterTemplates();
    } catch (error) {
        showAlert('刷新过滤模板失败: ' + error.message, 'danger');
    }
}

// 预览模板
function previewTemplate(id) {
    const template = filterTemplates.find(t => t.id === id);
    if (!template) return;
    
    let conditionsText = '暂无条件';
    if (template.conditions && template.conditions.length > 0) {
        conditionsText = template.conditions.map(condition => {
            const operatorSymbol = getOperatorSymbol(condition.operator);
            return `${condition.field} ${operatorSymbol} ${condition.value}`;
        }).join(` ${template.conditions[0]?.logic || 'AND'} `);
    }
    
    showAlert(`模板: ${template.name}\n描述: ${template.description || '无'}\n条件: ${conditionsText}`, 'info', 8000);
}