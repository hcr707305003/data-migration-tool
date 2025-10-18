// 全局变量
let dataSources = [];
let filterTemplates = [];
let maskingRules = [];
let tableMigrations = [];
let migrationTasks = [];
let selectedTables = [];

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    loadInitialData();
});

// 加载初始数据
async function loadInitialData() {
    try {
        await Promise.all([
            loadDataSources(),
            loadFilterTemplates(),
            loadMaskingRules(),
            loadTableMigrations(),
            loadMigrationTasks()
        ]);
        
        // 渲染初始界面
        renderDataSources();
        renderFilterTemplates();
        renderMaskingRules();
        renderMigrationTasks();
        updateDatabaseSelects();
        updateFilterTemplateSelect();
    } catch (error) {
        console.error('加载初始数据失败:', error);
        showAlert('加载数据失败: ' + error.message, 'danger');
    }
}

// 显示不同的页面部分
function showSection(sectionName) {
    // 隐藏所有部分
    document.querySelectorAll('.section').forEach(section => {
        section.style.display = 'none';
    });
    
    // 移除所有导航链接的active类
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // 显示选中的部分
    document.getElementById(sectionName + '-section').style.display = 'block';
    
    // 添加active类到对应的导航链接
    event.target.classList.add('active');
}

// 显示科技感弹框消息
function showAlert(message, type = 'info', duration = 5000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toastId = 'toast_' + Date.now();
    const toast = document.createElement('div');
    toast.className = `tech-toast ${type}`;
    toast.id = toastId;
    
    const icons = {
        success: 'bi-check-circle-fill',
        warning: 'bi-exclamation-triangle-fill',
        danger: 'bi-x-circle-fill',
        info: 'bi-info-circle-fill'
    };
    
    const titles = {
        success: '成功',
        warning: '警告',
        danger: '错误',
        info: '信息'
    };
    
    toast.innerHTML = `
        <div class="toast-header">
            <div class="toast-icon ${type}">
                <i class="${icons[type] || icons.info}"></i>
            </div>
            <div class="toast-title">${titles[type] || titles.info}</div>
            <button class="toast-close" onclick="removeToast('${toastId}')">
                <i class="bi bi-x"></i>
            </button>
        </div>
        <div class="toast-body">${message}</div>
        <div class="toast-progress ${type}"></div>
    `;
    
    container.appendChild(toast);
    
    // 进度条动画
    const progressBar = toast.querySelector('.toast-progress');
    let progress = 100;
    const interval = setInterval(() => {
        progress -= (100 / (duration / 100));
        progressBar.style.width = progress + '%';
        
        if (progress <= 0) {
            clearInterval(interval);
            removeToast(toastId);
        }
    }, 100);
    
    // 点击关闭
    toast.addEventListener('click', () => {
        clearInterval(interval);
        removeToast(toastId);
    });
    
    return toastId;
}

function removeToast(toastId) {
    const toast = document.getElementById(toastId);
    if (toast) {
        toast.classList.add('removing');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 300);
    }
}

// API 调用函数
async function apiCall(url, options = {}) {
    try {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '请求失败');
        }
        
        return await response.json();
    } catch (error) {
        console.error('API调用失败:', error);
        throw error;
    }
}

// 数据源管理
async function loadDataSources() {
    const result = await apiCall('/api/datasources');
    dataSources = result || [];
}

async function loadFilterTemplates() {
    const result = await apiCall('/api/filter-templates');
    filterTemplates = result || [];
}

async function loadMaskingRules() {
    const result = await apiCall('/api/masking-rules');
    maskingRules = result || [];
}

async function loadTableMigrations() {
    const result = await apiCall('/api/table-migrations');
    tableMigrations = result || [];
}

async function loadMigrationTasks() {
    const result = await apiCall('/api/migration-tasks');
    migrationTasks = result || [];
}

// 渲染数据源表格
function renderDataSources() {
    const tbody = document.getElementById('dataSourceTable');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (!dataSources || !Array.isArray(dataSources)) {
        dataSources = [];
        return;
    }
    
    dataSources.forEach(ds => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${ds.name}</td>
            <td>${ds.type}</td>
            <td>${ds.host}</td>
            <td>${ds.port}</td>
            <td>${ds.database}</td>
            <td>${ds.username}</td>
            <td>${new Date(ds.create_at).toLocaleString()}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="testDataSource('${ds.id}')">
                    <i class="bi bi-check-circle"></i> 测试
                </button>
                <button class="btn btn-sm btn-outline-secondary" onclick="editDataSource('${ds.id}')">
                    <i class="bi bi-pencil"></i> 编辑
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteDataSource('${ds.id}')">
                    <i class="bi bi-trash"></i> 删除
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// 渲染过滤模板表格
function renderFilterTemplates() {
    const tbody = document.getElementById('filterTemplateTable');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (!filterTemplates || !Array.isArray(filterTemplates)) {
        filterTemplates = [];
        return;
    }
    
    filterTemplates.forEach(template => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${template.name}</td>
            <td>${template.description}</td>
            <td>${template.conditions ? template.conditions.length : 0}</td>
            <td>${new Date(template.create_at).toLocaleString()}</td>
            <td>
                <button class="btn btn-sm btn-outline-secondary" onclick="editFilterTemplate('${template.id}')">
                    <i class="bi bi-pencil"></i> 编辑
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteFilterTemplate('${template.id}')">
                    <i class="bi bi-trash"></i> 删除
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// 渲染脱敏规则表格
function renderMaskingRules() {
    const tbody = document.getElementById('maskingRuleTable');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (!maskingRules || !Array.isArray(maskingRules)) {
        maskingRules = [];
        return;
    }
    
    maskingRules.forEach(rule => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${rule.name}</td>
            <td>${rule.type}</td>
            <td>${rule.pattern || '-'}</td>
            <td>${rule.replace || '-'}</td>
            <td>${new Date(rule.create_at).toLocaleString()}</td>
            <td>
                <button class="btn btn-sm btn-outline-secondary" onclick="editMaskingRule('${rule.id}')">
                    <i class="bi bi-pencil"></i> 编辑
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteMaskingRule('${rule.id}')">
                    <i class="bi bi-trash"></i> 删除
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// 渲染迁移任务表格
function renderMigrationTasks() {
    const tbody = document.getElementById('executionRecordsTable');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (!migrationTasks || !Array.isArray(migrationTasks)) {
        migrationTasks = [];
        return;
    }
    
    migrationTasks.forEach(task => {
        const row = document.createElement('tr');
        const statusBadge = getStatusBadge(task.status);
        const progressBar = `
            <div class="progress" style="width: 100px;">
                <div class="progress-bar" role="progressbar" style="width: ${task.progress}%">
                    ${task.progress}%
                </div>
            </div>
        `;
        
        row.innerHTML = `
            <td>${task.name}</td>
            <td>${statusBadge}</td>
            <td>${progressBar}</td>
            <td>${task.total_records || 0}</td>
            <td>${task.processed_records || 0}</td>
            <td>${task.start_at ? new Date(task.start_at).toLocaleString() : '-'}</td>
            <td>${task.end_at ? new Date(task.end_at).toLocaleString() : '-'}</td>
            <td>
                ${task.status === 'pending' ? `<button class="btn btn-sm btn-success" onclick="startTask('${task.id}')"><i class="bi bi-play"></i> 启动</button>` : ''}
                ${task.status === 'running' ? `<button class="btn btn-sm btn-warning" onclick="stopTask('${task.id}')"><i class="bi bi-stop"></i> 停止</button>` : ''}
                <button class="btn btn-sm btn-outline-info" onclick="viewTaskDetails('${task.id}')">
                    <i class="bi bi-eye"></i> 详情
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function getStatusBadge(status) {
    const badges = {
        'pending': '<span class="badge bg-secondary">待执行</span>',
        'running': '<span class="badge bg-primary">运行中</span>',
        'completed': '<span class="badge bg-success">已完成</span>',
        'failed': '<span class="badge bg-danger">失败</span>',
        'stopped': '<span class="badge bg-warning">已停止</span>'
    };
    return badges[status] || '<span class="badge bg-secondary">未知</span>';
}

// 更新数据库选择框
function updateDatabaseSelects() {
    const sourceSelect = document.getElementById('sourceDatabase');
    const targetSelect = document.getElementById('targetDatabase');
    
    if (!sourceSelect || !targetSelect) return;
    
    [sourceSelect, targetSelect].forEach(select => {
        select.innerHTML = '<option value="">选择数据库</option>';
        if (dataSources && Array.isArray(dataSources)) {
            dataSources.forEach(ds => {
                const option = document.createElement('option');
                option.value = ds.id;
                option.textContent = `${ds.name} (${ds.type})`;
                select.appendChild(option);
            });
        }
    });
}

// 更新过滤模板选择框
function updateFilterTemplateSelect() {
    const select = document.getElementById('filterTemplate');
    if (!select) return;
    
    select.innerHTML = '<option value="">选择过滤模板</option>';
    
    if (filterTemplates && Array.isArray(filterTemplates)) {
        filterTemplates.forEach(template => {
            const option = document.createElement('option');
            option.value = template.id;
            option.textContent = template.name;
            select.appendChild(option);
        });
    }
}

// 刷新数据库列表
async function refreshDatabases() {
    try {
        await loadDataSources();
        updateDatabaseSelects();
        showAlert('数据库列表已刷新', 'success');
    } catch (error) {
        showAlert('刷新数据库列表失败: ' + error.message, 'danger');
    }
}

// 测试数据源连接
async function testDataSource(id) {
    try {
        await apiCall(`/api/datasources/${id}/test`, { method: 'POST' });
        showAlert('数据源连接测试成功', 'success');
    } catch (error) {
        showAlert('数据源连接测试失败: ' + error.message, 'danger');
    }
}

// 启动迁移任务
async function startTask(id) {
    try {
        await apiCall(`/api/migration-tasks/${id}/start`, { method: 'POST' });
        showAlert('任务启动成功', 'success');
        await loadMigrationTasks();
        renderMigrationTasks();
    } catch (error) {
        showAlert('启动任务失败: ' + error.message, 'danger');
    }
}

// 停止迁移任务
async function stopTask(id) {
    try {
        await apiCall(`/api/migration-tasks/${id}/stop`, { method: 'POST' });
        showAlert('任务停止成功', 'success');
        await loadMigrationTasks();
        renderMigrationTasks();
    } catch (error) {
        showAlert('停止任务失败: ' + error.message, 'danger');
    }
}

// 刷新执行记录
async function refreshExecutionRecords() {
    try {
        await loadMigrationTasks();
        renderMigrationTasks();
        showAlert('执行记录已刷新', 'success');
    } catch (error) {
        showAlert('刷新执行记录失败: ' + error.message, 'danger');
    }
}

// 数据源管理功能
function showDataSourceModal(id = null) {
    const modal = new bootstrap.Modal(document.getElementById('dataSourceModal'));
    const form = document.getElementById('dataSourceForm');
    const title = document.getElementById('dataSourceModalTitle');
    
    // 重置表单
    form.reset();
    document.getElementById('dataSourceId').value = '';
    
    if (id) {
        // 编辑模式
        title.textContent = '编辑数据源';
        const ds = dataSources.find(d => d.id === id);
        if (ds) {
            document.getElementById('dataSourceId').value = ds.id;
            document.getElementById('dsName').value = ds.name;
            document.getElementById('dsType').value = ds.type;
            document.getElementById('dsHost').value = ds.host;
            document.getElementById('dsPort').value = ds.port;
            document.getElementById('dsDatabase').value = ds.database;
            document.getElementById('dsUsername').value = ds.username;
            document.getElementById('dsPassword').value = ds.password;
        }
    } else {
        // 新增模式
        title.textContent = '添加数据源';
        // 设置默认端口
        document.getElementById('dsType').addEventListener('change', function() {
            const portField = document.getElementById('dsPort');
            if (this.value === 'mysql') {
                portField.value = '3306';
            } else if (this.value === 'postgresql') {
                portField.value = '5432';
            }
        });
    }
    
    modal.show();
}

async function saveDataSource() {
    const form = document.getElementById('dataSourceForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const id = document.getElementById('dataSourceId').value;
    const dataSource = {
        name: document.getElementById('dsName').value,
        type: document.getElementById('dsType').value,
        host: document.getElementById('dsHost').value,
        port: parseInt(document.getElementById('dsPort').value),
        database: document.getElementById('dsDatabase').value,
        username: document.getElementById('dsUsername').value,
        password: document.getElementById('dsPassword').value
    };
    
    try {
        let result;
        if (id) {
            // 更新
            result = await apiCall(`/api/datasources/${id}`, {
                method: 'PUT',
                body: JSON.stringify(dataSource)
            });
        } else {
            // 创建
            result = await apiCall('/api/datasources', {
                method: 'POST',
                body: JSON.stringify(dataSource)
            });
        }
        
        showAlert(id ? '数据源更新成功' : '数据源创建成功', 'success');
        
        // 关闭模态框
        const modal = bootstrap.Modal.getInstance(document.getElementById('dataSourceModal'));
        modal.hide();
        
        // 刷新数据
        await loadDataSources();
        renderDataSources();
        updateDatabaseSelects();
        
    } catch (error) {
        showAlert('保存数据源失败: ' + error.message, 'danger');
    }
}

async function testDataSourceConnection() {
    const form = document.getElementById('dataSourceForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const dataSource = {
        name: document.getElementById('dsName').value,
        type: document.getElementById('dsType').value,
        host: document.getElementById('dsHost').value,
        port: parseInt(document.getElementById('dsPort').value),
        database: document.getElementById('dsDatabase').value,
        username: document.getElementById('dsUsername').value,
        password: document.getElementById('dsPassword').value
    };
    
    try {
        // 先创建一个临时数据源用于测试
        const tempDs = await apiCall('/api/datasources', {
            method: 'POST',
            body: JSON.stringify({...dataSource, name: 'temp_test_' + Date.now()})
        });
        
        // 测试连接
        await apiCall(`/api/datasources/${tempDs.id}/test`, { method: 'POST' });
        
        // 删除临时数据源
        await apiCall(`/api/datasources/${tempDs.id}`, { method: 'DELETE' });
        
        showAlert('数据源连接测试成功！', 'success');
    } catch (error) {
        showAlert('数据源连接测试失败: ' + error.message, 'danger');
    }
}

// 过滤模板管理功能
function showFilterTemplateModal(id = null) {
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
    } else {
        // 新增模式
        title.textContent = '添加过滤模板';
    }
    
    modal.show();
}

function addTemplateCondition(condition = null) {
    const container = document.getElementById('templateConditions');
    const conditionDiv = document.createElement('div');
    conditionDiv.className = 'row mb-2 condition-row';
    
    const conditionId = 'condition_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    conditionDiv.innerHTML = `
        <div class="col-md-3">
            <input type="text" class="form-control" placeholder="字段名" 
                   value="${condition ? condition.field : ''}" data-field="field">
        </div>
        <div class="col-md-2">
            <select class="form-select" data-field="operator">
                <option value="=" ${condition && condition.operator === '=' ? 'selected' : ''}>等于</option>
                <option value="!=" ${condition && condition.operator === '!=' ? 'selected' : ''}>不等于</option>
                <option value=">" ${condition && condition.operator === '>' ? 'selected' : ''}>大于</option>
                <option value="<" ${condition && condition.operator === '<' ? 'selected' : ''}>小于</option>
                <option value=">=" ${condition && condition.operator === '>=' ? 'selected' : ''}>大于等于</option>
                <option value="<=" ${condition && condition.operator === '<=' ? 'selected' : ''}>小于等于</option>
                <option value="LIKE" ${condition && condition.operator === 'LIKE' ? 'selected' : ''}>包含</option>
                <option value="IN" ${condition && condition.operator === 'IN' ? 'selected' : ''}>在列表中</option>
            </select>
        </div>
        <div class="col-md-3">
            <input type="text" class="form-control" placeholder="值" 
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
}

function removeTemplateCondition(button) {
    button.closest('.condition-row').remove();
}

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
        conditions: conditions
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
        renderFilterTemplates();
        updateFilterTemplateSelect();
        
    } catch (error) {
        showAlert('保存过滤模板失败: ' + error.message, 'danger');
    }
}

// 脱敏规则管理功能
function showMaskingRuleModal(id = null) {
    const modal = new bootstrap.Modal(document.getElementById('maskingRuleModal'));
    const form = document.getElementById('maskingRuleForm');
    const title = document.getElementById('maskingRuleModalTitle');
    
    // 重置表单
    form.reset();
    document.getElementById('maskingRuleId').value = '';
    document.getElementById('customFields').style.display = 'none';
    
    if (id) {
        // 编辑模式
        title.textContent = '编辑脱敏规则';
        const rule = maskingRules.find(r => r.id === id);
        if (rule) {
            document.getElementById('maskingRuleId').value = rule.id;
            document.getElementById('ruleName').value = rule.name;
            document.getElementById('ruleType').value = rule.type;
            document.getElementById('rulePattern').value = rule.pattern || '';
            document.getElementById('ruleReplace').value = rule.replace || '';
            
            // 显示自定义字段
            if (rule.type === 'custom') {
                document.getElementById('customFields').style.display = 'block';
            }
        }
    } else {
        // 新增模式
        title.textContent = '添加脱敏规则';
    }
    
    modal.show();
}

function toggleCustomFields() {
    const type = document.getElementById('ruleType').value;
    const customFields = document.getElementById('customFields');
    
    if (type === 'custom') {
        customFields.style.display = 'block';
        document.getElementById('rulePattern').required = true;
        document.getElementById('ruleReplace').required = true;
    } else {
        customFields.style.display = 'none';
        document.getElementById('rulePattern').required = false;
        document.getElementById('ruleReplace').required = false;
    }
}

async function saveMaskingRule() {
    const form = document.getElementById('maskingRuleForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const id = document.getElementById('maskingRuleId').value;
    const rule = {
        name: document.getElementById('ruleName').value,
        type: document.getElementById('ruleType').value,
        pattern: document.getElementById('rulePattern').value,
        replace: document.getElementById('ruleReplace').value
    };
    
    try {
        let result;
        if (id) {
            // 更新
            result = await apiCall(`/api/masking-rules/${id}`, {
                method: 'PUT',
                body: JSON.stringify(rule)
            });
        } else {
            // 创建
            result = await apiCall('/api/masking-rules', {
                method: 'POST',
                body: JSON.stringify(rule)
            });
        }
        
        showAlert(id ? '脱敏规则更新成功' : '脱敏规则创建成功', 'success');
        
        // 关闭模态框
        const modal = bootstrap.Modal.getInstance(document.getElementById('maskingRuleModal'));
        modal.hide();
        
        // 刷新数据
        await loadMaskingRules();
        renderMaskingRules();
        
    } catch (error) {
        showAlert('保存脱敏规则失败: ' + error.message, 'danger');
    }
}

function showMigrationTaskModal() {
    showAlert('迁移任务配置功能开发中...', 'info');
}

function editDataSource(id) {
    showDataSourceModal(id);
}

async function deleteDataSource(id) {
    if (!confirm('确定要删除这个数据源吗？此操作不可撤销。')) {
        return;
    }
    
    try {
        await apiCall(`/api/datasources/${id}`, { method: 'DELETE' });
        showAlert('数据源删除成功', 'success');
        
        // 刷新数据
        await loadDataSources();
        renderDataSources();
        updateDatabaseSelects();
    } catch (error) {
        showAlert('删除数据源失败: ' + error.message, 'danger');
    }
}

function editFilterTemplate(id) {
    showFilterTemplateModal(id);
}

async function deleteFilterTemplate(id) {
    if (!confirm('确定要删除这个过滤模板吗？此操作不可撤销。')) {
        return;
    }
    
    try {
        await apiCall(`/api/filter-templates/${id}`, { method: 'DELETE' });
        showAlert('过滤模板删除成功', 'success');
        
        // 刷新数据
        await loadFilterTemplates();
        renderFilterTemplates();
        updateFilterTemplateSelect();
    } catch (error) {
        showAlert('删除过滤模板失败: ' + error.message, 'danger');
    }
}

function editMaskingRule(id) {
    showMaskingRuleModal(id);
}

async function deleteMaskingRule(id) {
    if (!confirm('确定要删除这个脱敏规则吗？此操作不可撤销。')) {
        return;
    }
    
    try {
        await apiCall(`/api/masking-rules/${id}`, { method: 'DELETE' });
        showAlert('脱敏规则删除成功', 'success');
        
        // 刷新数据
        await loadMaskingRules();
        renderMaskingRules();
    } catch (error) {
        showAlert('删除脱敏规则失败: ' + error.message, 'danger');
    }
}

function addFilterTemplate() {
    showAlert('添加过滤模板功能开发中...', 'info');
}

function startMigration() {
    showAlert('启动迁移功能开发中...', 'info');
}

function viewTaskDetails(id) {
    showAlert('查看任务详情功能开发中...', 'info');
}

function exportRecords() {
    showAlert('导出记录功能开发中...', 'info');
}