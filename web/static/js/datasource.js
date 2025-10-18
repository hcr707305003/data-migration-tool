// 数据源管理页面功能

let dataSources = [];
let filteredDataSources = [];
let statusRefreshInterval;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    loadDataSources();
    
    // 启动状态自动刷新（每30秒）
    startStatusRefresh();
});

// 页面卸载时清理定时器
window.addEventListener('beforeunload', function() {
    stopStatusRefresh();
});

// 加载数据源列表
async function loadDataSources() {
    try {
        const result = await apiCall('/api/datasources');
        dataSources = result || [];
        filteredDataSources = [...dataSources];
        renderDataSources();
    } catch (error) {
        console.error('加载数据源失败:', error);
        showAlert('加载数据源失败: ' + error.message, 'danger');
    }
}

// 渲染数据源卡片
function renderDataSources() {
    const grid = document.getElementById('dataSourceGrid');
    const emptyState = document.getElementById('emptyDataSourceState');
    
    if (!grid) return;
    
    grid.innerHTML = '';
    
    if (filteredDataSources.length === 0) {
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    
    filteredDataSources.forEach(ds => {
        const col = document.createElement('div');
        col.className = 'col-md-6 col-lg-4';
        
        const typeIcon = ds.type === 'mysql' ? 'bi-database' : 'bi-server';
        const statusClass = ds.status || 'disconnected';
        
        col.innerHTML = `
            <div class="card datasource-card" onclick="editDataSource('${ds.id}')">
                <div class="datasource-status ${statusClass}"></div>
                <div class="card-header">
                    <div class="datasource-type-icon ${ds.type}">
                        <i class="${typeIcon}"></i>
                    </div>
                    <div class="datasource-header-info">
                        <h6>${ds.name} 
                            <span class="badge ${ds.enabled !== false ? 'bg-success' : 'bg-secondary'} ms-2">
                                ${ds.enabled !== false ? '已启用' : '已禁用'}
                            </span>
                            <button class="btn btn-sm btn-link p-0 ms-2 test-connection-btn" onclick="event.stopPropagation(); testDataSource('${ds.id}')" title="测试连接">
                                <i class="bi bi-wifi ${ds.status === 'checking' ? 'text-warning' : ds.status === 'connected' ? 'text-success' : 'text-muted'}"></i>
                            </button>
                        </h6>
                        <small>${ds.type.toUpperCase()}</small>
                    </div>
                </div>
                <div class="datasource-info">
                    <div class="info-item">
                        <span class="info-label">ID:</span>
                        <span class="info-value" style="font-family: monospace; font-size: 0.85em;">${ds.id}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">主机:</span>
                        <span class="info-value">${ds.host}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">端口:</span>
                        <span class="info-value">${ds.port}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">数据库:</span>
                        <span class="info-value">${ds.database}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">用户名:</span>
                        <span class="info-value">${ds.username}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">创建时间:</span>
                        <span class="info-value">${formatDate(ds.create_at)}</span>
                    </div>
                </div>
                <div class="datasource-actions" onclick="event.stopPropagation()">
                    <button class="btn btn-sm btn-outline-success" onclick="copyDataSource('${ds.id}')">
                        <i class="bi bi-copy"></i> 复制
                    </button>
                    <button class="btn btn-sm ${ds.enabled !== false ? 'btn-outline-warning' : 'btn-outline-success'}" onclick="toggleDataSourceStatus('${ds.id}')">
                        <i class="bi ${ds.enabled !== false ? 'bi-pause-circle' : 'bi-play-circle'}"></i> ${ds.enabled !== false ? '关闭' : '开启'}
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteDataSource('${ds.id}')">
                        <i class="bi bi-trash"></i> 删除
                    </button>
        `;
        
        grid.appendChild(col);
    });
}

// 过滤数据源
function filterDataSources() {
    const searchTerm = document.getElementById('dataSourceSearch').value.toLowerCase();
    const typeFilter = document.getElementById('dataSourceTypeFilter').value;
    const statusFilter = document.getElementById('dataSourceStatusFilter').value;
    const enabledFilter = document.getElementById('dataSourceEnabledFilter').value;
    
    filteredDataSources = dataSources.filter(ds => {
        const matchesSearch = !searchTerm || 
            ds.name.toLowerCase().includes(searchTerm) ||
            ds.host.toLowerCase().includes(searchTerm);
        
        const matchesType = !typeFilter || ds.type === typeFilter;
        const matchesStatus = !statusFilter || (ds.status || 'disconnected') === statusFilter;
        
        let matchesEnabled = true;
        if (enabledFilter === 'enabled') {
            matchesEnabled = ds.enabled !== false;
        } else if (enabledFilter === 'disabled') {
            matchesEnabled = ds.enabled === false;
        }
        
        return matchesSearch && matchesType && matchesStatus && matchesEnabled;
    });
    
    renderDataSources();
}

// 刷新数据源列表
async function refreshDataSources() {
    await loadDataSources();
    showAlert('数据源列表已刷新', 'success');
}

// 显示数据源模态框
function showDataSourceModal(id = null, dataSourceData = null) {
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
    } else if (dataSourceData) {
        // 复制模式
        title.textContent = '复制数据源';
        document.getElementById('dsName').value = dataSourceData.name;
        document.getElementById('dsType').value = dataSourceData.type;
        document.getElementById('dsHost').value = dataSourceData.host;
        document.getElementById('dsPort').value = dataSourceData.port;
        document.getElementById('dsDatabase').value = dataSourceData.database;
        document.getElementById('dsUsername').value = dataSourceData.username;
        document.getElementById('dsPassword').value = dataSourceData.password;
    } else {
        // 新增模式
        title.textContent = '添加数据源';
    }
    
    modal.show();
}

// 设置默认端口
function setDefaultPort() {
    const type = document.getElementById('dsType').value;
    const portField = document.getElementById('dsPort');
    
    if (type === 'mysql') {
        portField.value = '3306';
    } else if (type === 'postgresql') {
        portField.value = '5432';
    }
}

// 保存数据源
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
        password: document.getElementById('dsPassword').value,
        enabled: true  // 新数据源默认启用
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
        
    } catch (error) {
        showAlert('保存数据源失败: ' + error.message, 'danger');
    }
}

// 测试数据源连接
async function testDataSource(id) {
    // 先更新UI显示检查中状态
    const ds = dataSources.find(d => d.id === id);
    if (ds) {
        ds.status = 'checking';
        renderDataSources();
        
        // 显示测试开始提示
        showAlert(`正在测试数据源 "${ds.name}" 的连接...`, 'info', 2000);
    }
    
    try {
        const result = await apiCall(`/api/datasources/${id}/test`, { method: 'POST' });
        showAlert(`数据源 "${ds.name}" 连接测试成功！`, 'success');
        
        // 更新状态
        if (ds) {
            ds.status = result.status || 'connected';
            renderDataSources();
        }
    } catch (error) {
        showAlert(`数据源 "${ds.name}" 连接测试失败: ` + error.message, 'danger');
        
        // 更新状态
        if (ds) {
            ds.status = 'disconnected';
            renderDataSources();
        }
    }
}

// 测试连接（模态框中）
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
        // 直接测试连接，不创建数据源
        const result = await apiCall('/api/datasources/test-connection', {
            method: 'POST',
            body: JSON.stringify(dataSource)
        });
        
        showAlert('数据源连接测试成功！', 'success');
    } catch (error) {
        showAlert('数据源连接测试失败: ' + error.message, 'danger');
    }
}

// 复制数据源
function copyDataSource(id) {
    const ds = dataSources.find(d => d.id === id);
    if (!ds) {
        showAlert('数据源不存在', 'danger');
        return;
    }
    
    // 生成唯一的副本名称
    const copyNumber = getCopyNumber(ds.name);
    const copyName = copyNumber > 1 ? 
        `${ds.name} - 副本${copyNumber}` : 
        `${ds.name} - 副本`;
    
    // 创建复制的数据源数据
    const copiedDataSource = {
        name: copyName,
        type: ds.type,
        host: ds.host,
        port: ds.port,
        database: ds.database,
        username: ds.username,
        password: ds.password,
        enabled: true  // 复制的数据源默认启用
    };
    
    // 显示模态框并填入复制的数据
    showDataSourceModal(null, copiedDataSource);
    
    // 显示复制成功提示
    showAlert(`已复制数据源 "${ds.name}"，请修改名称后保存`, 'info', 4000);
}

// 获取副本编号
function getCopyNumber(originalName) {
    const existingNames = dataSources.map(ds => ds.name);
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

// 切换数据源启用状态
async function toggleDataSourceStatus(id) {
    const ds = dataSources.find(d => d.id === id);
    if (!ds) {
        showAlert('数据源不存在', 'danger');
        return;
    }
    
    // 切换状态（默认为启用）
    const newStatus = ds.enabled !== false ? false : true;
    const statusText = newStatus ? '启用' : '禁用';
    
    try {
        // 更新数据源状态
        const updatedDataSource = {
            ...ds,
            enabled: newStatus
        };
        
        await apiCall(`/api/datasources/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updatedDataSource)
        });
        
        showAlert(`数据源 "${ds.name}" 已${statusText}`, 'success');
        
        // 刷新数据
        await loadDataSources();
        
    } catch (error) {
        showAlert(`${statusText}数据源失败: ` + error.message, 'danger');
    }
}

// 编辑数据源
function editDataSource(id) {
    showDataSourceModal(id);
}

// 删除数据源
async function deleteDataSource(id) {
    if (!confirm('确定要删除这个数据源吗？此操作不可撤销。')) {
        return;
    }
    
    try {
        await apiCall(`/api/datasources/${id}`, { method: 'DELETE' });
        showAlert('数据源删除成功', 'success');
        
        // 刷新数据
        await loadDataSources();
    } catch (error) {
        showAlert('删除数据源失败: ' + error.message, 'danger');
    }
}

// 启动状态自动刷新
function startStatusRefresh() {
    // 每30秒刷新一次状态
    statusRefreshInterval = setInterval(async () => {
        try {
            await loadDataSources();
        } catch (error) {
            console.error('自动刷新数据源状态失败:', error);
        }
    }, 30000);
}

// 停止状态自动刷新
function stopStatusRefresh() {
    if (statusRefreshInterval) {
        clearInterval(statusRefreshInterval);
        statusRefreshInterval = null;
    }
}