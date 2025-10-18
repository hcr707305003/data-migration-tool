// 通用功能和弹框系统

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

// 格式化日期
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN');
}

// 获取状态徽章
function getStatusBadge(status) {
    const badges = {
        'pending': '<span class="badge bg-secondary">待执行</span>',
        'running': '<span class="badge bg-primary">运行中</span>',
        'completed': '<span class="badge bg-success">已完成</span>',
        'failed': '<span class="badge bg-danger">失败</span>',
        'stopped': '<span class="badge bg-warning">已停止</span>',
        'connected': '<span class="badge bg-success">已连接</span>',
        'disconnected': '<span class="badge bg-danger">未连接</span>'
    };
    return badges[status] || '<span class="badge bg-secondary">未知</span>';
}

// 生成UUID
function generateUUID() {
    return 'uuid_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// 防抖函数
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}