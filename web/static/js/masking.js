// 脱敏规则页面功能

let maskingRules = [];
let filteredMaskingRules = [];
let maskingTypes = [];

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    loadMaskingTypes();
    loadMaskingRules();
});

// 加载脱敏类型列表
async function loadMaskingTypes() {
    try {
        const result = await apiCall('/api/masking-types');
        maskingTypes = result || [];
        updateMaskingTypeSelectors();
    } catch (error) {
        console.error('加载脱敏类型失败:', error);
        // 如果API失败，使用默认的脱敏类型
        maskingTypes = getDefaultMaskingTypes();
        updateMaskingTypeSelectors();
    }
}

// 更新脱敏类型选择器
function updateMaskingTypeSelectors() {
    const ruleTypeSelect = document.getElementById('ruleType');
    const filterSelect = document.getElementById('maskingRuleTypeFilter');
    
    if (ruleTypeSelect) {
        // 清空现有选项
        ruleTypeSelect.innerHTML = '<option value="">选择脱敏类型</option>';
        
        // 按分类分组
        const categories = {};
        maskingTypes.forEach(type => {
            if (!type.enabled) return;
            
            if (!categories[type.category]) {
                categories[type.category] = [];
            }
            categories[type.category].push(type);
        });
        
        // 添加分组选项
        Object.keys(categories).forEach(category => {
            const optgroup = document.createElement('optgroup');
            optgroup.label = category;
            
            categories[category].forEach(type => {
                const option = document.createElement('option');
                option.value = type.id;
                option.textContent = type.name;
                optgroup.appendChild(option);
            });
            
            ruleTypeSelect.appendChild(optgroup);
        });
    }
    
    if (filterSelect) {
        // 保留"所有类型"选项
        const allOption = filterSelect.querySelector('option[value=""]');
        filterSelect.innerHTML = '';
        if (allOption) {
            filterSelect.appendChild(allOption);
        }
        
        // 添加脱敏类型选项
        maskingTypes.forEach(type => {
            if (!type.enabled) return;
            
            const option = document.createElement('option');
            option.value = type.id;
            option.textContent = type.name;
            filterSelect.appendChild(option);
        });
    }
}

// 获取默认脱敏类型（当API不可用时使用）
function getDefaultMaskingTypes() {
    return [
        {
            id: "keep_head_tail",
            name: "保留首尾-通用",
            category: "通用模板",
            enabled: true,
            icon: "bi-arrow-left-right"
        },
        {
            id: "keep_head",
            name: "保留开头-通用", 
            category: "通用模板",
            enabled: true,
            icon: "bi-arrow-right"
        },
        {
            id: "keep_tail",
            name: "保留结尾-通用",
            category: "通用模板", 
            enabled: true,
            icon: "bi-arrow-left"
        },
        {
            id: "full_mask",
            name: "全部脱敏",
            category: "通用模板",
            enabled: true,
            icon: "bi-eye-slash"
        },
        {
            id: "phone",
            name: "手机号",
            category: "常用类型",
            enabled: true,
            icon: "bi-telephone"
        },
        {
            id: "email", 
            name: "邮箱",
            category: "常用类型",
            enabled: true,
            icon: "bi-envelope"
        },
        {
            id: "idcard",
            name: "身份证",
            category: "常用类型", 
            enabled: true,
            icon: "bi-person-badge"
        },
        {
            id: "bank_card",
            name: "银行卡号",
            category: "常用类型",
            enabled: true,
            icon: "bi-credit-card"
        },
        {
            id: "name",
            name: "姓名",
            category: "个人信息",
            enabled: true,
            icon: "bi-person"
        },
        {
            id: "chinese_name",
            name: "中文姓名", 
            category: "个人信息",
            enabled: true,
            icon: "bi-person-circle"
        },
        {
            id: "address",
            name: "地址",
            category: "个人信息",
            enabled: true,
            icon: "bi-geo-alt"
        },
        {
            id: "company",
            name: "企业信息",
            category: "企业信息",
            enabled: true,
            icon: "bi-building"
        },
        {
            id: "license",
            name: "车牌号",
            category: "企业信息",
            enabled: true,
            icon: "bi-car-front"
        },
        {
            id: "ip",
            name: "IP地址",
            category: "网络信息",
            enabled: true,
            icon: "bi-router"
        },
        {
            id: "passport",
            name: "护照",
            category: "个人信息",
            enabled: true,
            icon: "bi-passport"
        },
        {
            id: "custom",
            name: "自定义",
            category: "其他",
            enabled: true,
            icon: "bi-gear"
        }
    ];
}

// 加载脱敏规则列表
async function loadMaskingRules() {
    try {
        const result = await apiCall('/api/masking-rules');
        maskingRules = result || [];
        filteredMaskingRules = [...maskingRules];
        renderMaskingRules();
    } catch (error) {
        console.error('加载脱敏规则失败:', error);
        showAlert('加载脱敏规则失败: ' + error.message, 'danger');
    }
}

// 渲染脱敏规则卡片
function renderMaskingRules() {
    const grid = document.getElementById('maskingRuleGrid');
    const emptyState = document.getElementById('emptyMaskingRuleState');
    
    if (!grid) return;
    
    grid.innerHTML = '';
    
    if (filteredMaskingRules.length === 0) {
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    
    filteredMaskingRules.forEach(rule => {
        const col = document.createElement('div');
        col.className = 'col-md-6 col-lg-4';
        
        const typeIcon = getTypeIcon(rule.type);
        const typeLabel = getTypeLabel(rule.type);
        
        col.innerHTML = `
            <div class="card masking-rule-card" onclick="editMaskingRule('${rule.id}')">
                <div class="card-header">
                    <div class="masking-rule-icon ${rule.type}">
                        <i class="${typeIcon}"></i>
                    </div>
                    <div class="masking-rule-header-info">
                        <h6>${rule.name} 
                            <span class="badge ${rule.enabled !== false ? 'bg-success' : 'bg-secondary'} ms-2">
                                ${rule.enabled !== false ? '已启用' : '已禁用'}
                            </span>
                        </h6>
                        <small>${typeLabel}</small>
                    </div>
                </div>
                <div class="masking-rule-info">
                    <div class="info-item">
                        <span class="info-label">正则模式:</span>
                        <span class="info-value"><code>${rule.pattern || '无'}</code></span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">替换模式:</span>
                        <span class="info-value"><code>${rule.replace || '无'}</code></span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">创建时间:</span>
                        <span class="info-value">${formatDate(rule.create_at)}</span>
                    </div>
                    ${rule.pattern && rule.replace ? `
                    <div class="info-item">
                        <span class="info-label">示例:</span>
                        <span class="info-value">${getMaskingExample(rule.type, rule.pattern, rule.replace)}</span>
                    </div>
                    ` : ''}
                </div>
                <div class="masking-rule-actions" onclick="event.stopPropagation()">
                    <button class="btn btn-sm btn-outline-success" onclick="copyMaskingRule('${rule.id}')">
                        <i class="bi bi-copy"></i> 复制
                    </button>
                    <button class="btn btn-sm ${rule.enabled !== false ? 'btn-outline-warning' : 'btn-outline-success'}" onclick="toggleMaskingRuleStatus('${rule.id}')">
                        <i class="bi ${rule.enabled !== false ? 'bi-pause-circle' : 'bi-play-circle'}"></i> ${rule.enabled !== false ? '关闭' : '开启'}
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteMaskingRule('${rule.id}')">
                        <i class="bi bi-trash"></i> 删除
                    </button>
                </div>
            </div>
        `;
        
        grid.appendChild(col);
    });
}

// 脱敏规则模板定义
const MASKING_TEMPLATES = {
    'phone': [
        {
            name: '标准脱敏',
            description: '保留前3位和后4位',
            detail: '适用于大多数场景，保留运营商信息和部分号码',
            pattern: '(\\d{3})\\d{4}(\\d{4})',
            replace: '$1****$2',
            example: '138****5678',
            regex: '(\\d{3})\\d{4}(\\d{4})',
            usage: '匹配11位手机号，保留前3位和后4位'
        },
        {
            name: '保留前3位',
            description: '只保留前3位数字',
            detail: '高安全级别，只显示运营商信息',
            pattern: '(\\d{3})\\d{8}',
            replace: '$1********',
            example: '138********',
            regex: '(\\d{3})\\d{8}',
            usage: '匹配11位手机号，只保留前3位'
        },
        {
            name: '完全隐藏',
            description: '全部替换为星号',
            detail: '最高安全级别，完全隐藏手机号',
            pattern: '\\d{11}',
            replace: '***********',
            example: '***********',
            regex: '\\d{11}',
            usage: '匹配11位数字，全部替换为*'
        }
    ],
    'email': [
        {
            name: '标准脱敏',
            description: '保留首字符和域名',
            detail: '保留用户名首字符，完整显示域名',
            pattern: '([^@]{1})[^@]*(@.*)',
            replace: '$1***$2',
            example: 'u***@example.com',
            regex: '([^@]{1})[^@]*(@.*)',
            usage: '保留@前首字符，@后完整保留'
        },
        {
            name: '保留前缀',
            description: '保留前3个字符',
            detail: '保留用户名前3个字符，显示完整域名',
            pattern: '([^@]{1,3})[^@]*(@.*)',
            replace: '$1***$2',
            example: 'use***@example.com',
            regex: '([^@]{1,3})[^@]*(@.*)',
            usage: '保留@前1-3个字符，@后完整保留'
        },
        {
            name: '域名脱敏',
            description: '用户名和域名都脱敏',
            detail: '高安全级别，用户名和域名都进行脱敏',
            pattern: '([^@]{1})[^@]*@([^.]+)\\.(.*)',
            replace: '$1***@***.***',
            example: 'u***@***.***',
            regex: '([^@]{1})[^@]*@([^.]+)\\.(.*)',
            usage: '保留用户名首字符，域名用***替换'
        }
    ],
    'idcard': [
        {
            name: '标准脱敏',
            description: '保留前6位和后4位',
            detail: '保留地区码和校验码，隐藏生日和顺序码',
            pattern: '(\\d{6})\\d{8}(\\d{4})',
            replace: '$1********$2',
            example: '110101********1234',
            regex: '(\\d{6})\\d{8}(\\d{4})',
            usage: '保留前6位地区码和后4位'
        },
        {
            name: '保留年份',
            description: '保留前6位和年份',
            detail: '保留地区码和出生年份，隐藏月日和后4位',
            pattern: '(\\d{6})(\\d{4})\\d{4}(\\d{4})',
            replace: '$1$2****$3',
            example: '1101011990****1234',
            regex: '(\\d{6})(\\d{4})\\d{4}(\\d{4})',
            usage: '保留地区码、年份和后4位'
        },
        {
            name: '完全隐藏',
            description: '全部替换为星号',
            detail: '最高安全级别，完全隐藏身份证号',
            pattern: '\\d{15}|\\d{17}[\\dX]',
            replace: '******************',
            example: '******************',
            regex: '\\d{15}|\\d{17}[\\dX]',
            usage: '匹配15位或18位身份证，全部替换'
        }
    ],
    'bankcard': [
        {
            name: '标准脱敏',
            description: '保留前4位和后4位',
            detail: '保留银行标识和卡号尾数，符合银行业标准',
            pattern: '(\\d{4})\\d{8,12}(\\d{4})',
            replace: '$1********$2',
            example: '6222********1234',
            regex: '(\\d{4})\\d{8,12}(\\d{4})',
            usage: '适用于16-20位银行卡号'
        },
        {
            name: '保留前6位',
            description: '保留银行标识码',
            detail: '保留完整的银行标识码(BIN码)，便于识别发卡行',
            pattern: '(\\d{6})\\d{6,10}(\\d{4})',
            replace: '$1******$2',
            example: '622202******1234',
            regex: '(\\d{6})\\d{6,10}(\\d{4})',
            usage: '保留前6位BIN码和后4位'
        }
    ],
    'name': [
        {
            name: '姓氏脱敏',
            description: '保留姓氏，名字用星号',
            detail: '适用于中文姓名，保留姓氏便于称呼',
            pattern: '([\\u4e00-\\u9fa5])([\\u4e00-\\u9fa5]+)',
            replace: '$1*',
            example: '张*',
            regex: '([\\u4e00-\\u9fa5])([\\u4e00-\\u9fa5]+)',
            usage: '匹配中文字符，保留首字符'
        },
        {
            name: '中间脱敏',
            description: '保留首尾字符',
            detail: '适用于三字姓名，保留姓氏和名字最后一字',
            pattern: '([\\u4e00-\\u9fa5])([\\u4e00-\\u9fa5]+)([\\u4e00-\\u9fa5])',
            replace: '$1*$3',
            example: '张*三',
            regex: '([\\u4e00-\\u9fa5])([\\u4e00-\\u9fa5]+)([\\u4e00-\\u9fa5])',
            usage: '保留首尾字符，中间用*替换'
        }
    ],
    'address': [
        {
            name: '详细地址脱敏',
            description: '保留省市，详细地址脱敏',
            detail: '保留省市信息，隐藏具体街道门牌号',
            pattern: '([\\u4e00-\\u9fa5]{2,4}[省市])[\\u4e00-\\u9fa5区县]*(.{4,})',
            replace: '$1***',
            example: '北京市***',
            regex: '([\\u4e00-\\u9fa5]{2,4}[省市])[\\u4e00-\\u9fa5区县]*(.{4,})',
            usage: '保留省市，详细地址用***替换'
        }
    ],
    'ip': [
        {
            name: '标准脱敏',
            description: '保留前两段IP',
            detail: '保留网络段信息，隐藏具体主机地址',
            pattern: '(\\d{1,3}\\.\\d{1,3})\\.(\\d{1,3})\\.(\\d{1,3})',
            replace: '$1.*.*',
            example: '192.168.*.*',
            regex: '(\\d{1,3}\\.\\d{1,3})\\.(\\d{1,3})\\.(\\d{1,3})',
            usage: '保留前两段，后两段用*替换'
        },
        {
            name: '完全隐藏',
            description: '全部替换为星号',
            detail: '完全隐藏IP地址，适用于高安全要求场景',
            pattern: '\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}',
            replace: '*.*.*.*',
            example: '*.*.*.*',
            regex: '\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}',
            usage: '匹配IPv4地址，全部用*替换'
        }
    ],
    'company': [
        {
            name: '统一社会信用代码脱敏',
            description: '保留前6位和后4位',
            detail: '保留登记管理部门代码和校验码，隐藏机构类别和登记管理机关行政区划',
            pattern: '([0-9A-HJ-NPQRTUWXY]{2}\\d{6})\\d{8}([0-9A-HJ-NPQRTUWXY]{2})',
            replace: '$1********$2',
            example: '91110000********1X',
            regex: '([0-9A-HJ-NPQRTUWXY]{2}\\d{6})\\d{8}([0-9A-HJ-NPQRTUWXY]{2})',
            usage: '适用于18位统一社会信用代码'
        },
        {
            name: '企业名称脱敏',
            description: '保留前缀，隐藏具体名称',
            detail: '保留企业类型和地区信息，隐藏具体企业名称',
            pattern: '([\\u4e00-\\u9fa5]{2,4})(.*?)(有限公司|股份有限公司|集团|科技|贸易)',
            replace: '$1***$3',
            example: '北京***科技',
            regex: '([\\u4e00-\\u9fa5]{2,4})(.*?)(有限公司|股份有限公司|集团|科技|贸易)',
            usage: '保留地区和企业类型，隐藏具体名称'
        },
        {
            name: '税号脱敏',
            description: '保留前4位和后4位',
            detail: '保留地区代码和校验位，隐藏中间组织机构代码',
            pattern: '(\\d{4})\\d{10}(\\d{4})',
            replace: '$1**********$2',
            example: '1101**********1234',
            regex: '(\\d{4})\\d{10}(\\d{4})',
            usage: '适用于18位纳税人识别号'
        }
    ],
    'license': [
        {
            name: '标准车牌脱敏',
            description: '保留省份和车牌类型',
            detail: '保留省份简称和最后一位，隐藏中间字符',
            pattern: '([\\u4e00-\\u9fa5][A-Z])\\w{4}([A-Z0-9])',
            replace: '$1***$2',
            example: '京A***1',
            regex: '([\\u4e00-\\u9fa5][A-Z])\\w{4}([A-Z0-9])',
            usage: '适用于标准7位车牌号'
        },
        {
            name: '新能源车牌脱敏',
            description: '保留省份和能源标识',
            detail: '保留省份简称和新能源标识，隐藏中间数字',
            pattern: '([\\u4e00-\\u9fa5][A-Z])\\d{4}([DF])',
            replace: '$1****$2',
            example: '京A****D',
            regex: '([\\u4e00-\\u9fa5][A-Z])\\d{4}([DF])',
            usage: '适用于新能源车牌(D/F结尾)'
        },
        {
            name: '完全隐藏',
            description: '全部替换为星号',
            detail: '完全隐藏车牌号，适用于高隐私要求',
            pattern: '[\\u4e00-\\u9fa5][A-Z][A-Z0-9]{5}',
            replace: '*******',
            example: '*******',
            regex: '[\\u4e00-\\u9fa5][A-Z][A-Z0-9]{5}',
            usage: '匹配所有类型车牌，全部替换'
        }
    ],
    'passport': [
        {
            name: '标准护照脱敏',
            description: '保留前2位和后2位',
            detail: '保留护照类型和部分号码，隐藏中间敏感信息',
            pattern: '([A-Z]{1,2})\\d{6}(\\d{1,2})',
            replace: '$1******$2',
            example: 'E******01',
            regex: '([A-Z]{1,2})\\d{6}(\\d{1,2})',
            usage: '适用于中国护照号码格式'
        },
        {
            name: '保留类型',
            description: '只保留护照类型',
            detail: '只显示护照类型字母，完全隐藏号码部分',
            pattern: '([A-Z]{1,2})\\d{7,8}',
            replace: '$1*******',
            example: 'E*******',
            regex: '([A-Z]{1,2})\\d{7,8}',
            usage: '保留护照类型，号码全部隐藏'
        },
        {
            name: '完全隐藏',
            description: '全部替换为星号',
            detail: '完全隐藏护照号码，最高安全级别',
            pattern: '[A-Z]{1,2}\\d{7,8}',
            replace: '*********',
            example: '*********',
            regex: '[A-Z]{1,2}\\d{7,8}',
            usage: '匹配护照格式，全部替换为*'
        }
    ]
};

// 获取类型图标
function getTypeIcon(type) {
    const maskingType = maskingTypes.find(t => t.id === type);
    if (maskingType) {
        return maskingType.icon;
    }
    
    // 后备图标映射
    const icons = {
        'keep_head_tail': 'bi-arrow-left-right',
        'keep_head': 'bi-arrow-right',
        'keep_tail': 'bi-arrow-left',
        'full_mask': 'bi-eye-slash',
        'phone': 'bi-telephone',
        'email': 'bi-envelope',
        'idcard': 'bi-person-badge',
        'bank_card': 'bi-credit-card',
        'bankcard': 'bi-credit-card',
        'name': 'bi-person',
        'chinese_name': 'bi-person-circle',
        'address': 'bi-geo-alt',
        'ip': 'bi-router',
        'company': 'bi-building',
        'license': 'bi-car-front',
        'passport': 'bi-passport',
        'custom': 'bi-gear'
    };
    return icons[type] || 'bi-shield-check';
}

// 获取类型标签
function getTypeLabel(type) {
    const maskingType = maskingTypes.find(t => t.id === type);
    if (maskingType) {
        return maskingType.name;
    }
    
    // 后备标签映射
    const labels = {
        'keep_head_tail': '保留首尾-通用',
        'keep_head': '保留开头-通用',
        'keep_tail': '保留结尾-通用',
        'full_mask': '全部脱敏',
        'phone': '手机号',
        'email': '邮箱',
        'idcard': '身份证',
        'bank_card': '银行卡号',
        'bankcard': '银行卡号',
        'name': '姓名',
        'chinese_name': '中文姓名',
        'address': '地址',
        'ip': 'IP地址',
        'company': '企业信息',
        'license': '车牌号',
        'passport': '护照',
        'custom': '自定义'
    };
    return labels[type] || type;
}

// 获取脱敏示例
function getMaskingExample(type, pattern, replace) {
    const examples = {
        'phone': '138****5678',
        'email': 'u***@example.com',
        'idcard': '110***********1234',
        'custom': '根据规则脱敏'
    };
    
    // 如果有具体的模式，尝试生成示例
    if (pattern && replace) {
        try {
            const testData = getTestData(type);
            if (testData) {
                const regex = new RegExp(pattern);
                if (regex.test(testData)) {
                    return testData.replace(regex, replace);
                }
            }
        } catch (e) {
            // 正则表达式错误，返回默认示例
        }
    }
    
    return examples[type] || '示例数据';
}

// 获取测试数据
function getTestData(type) {
    const testData = {
        'phone': '13812345678',
        'email': 'user@example.com',
        'idcard': '11010119900101123X',
        'bankcard': '6222021234567890',
        'name': '张三丰',
        'address': '北京市朝阳区建国门外大街1号',
        'ip': '192.168.1.100',
        'company': '91110000123456789X',
        'license': '京A12345',
        'passport': 'E12345678',
        'custom': '测试数据'
    };
    return testData[type] || '';
}

// 过滤脱敏规则
function filterMaskingRules() {
    const searchTerm = document.getElementById('maskingRuleSearch').value.toLowerCase();
    const typeFilter = document.getElementById('maskingRuleTypeFilter').value;
    const statusFilter = document.getElementById('maskingRuleStatusFilter').value;
    
    filteredMaskingRules = maskingRules.filter(rule => {
        const matchesSearch = !searchTerm || 
            rule.name.toLowerCase().includes(searchTerm);
        
        const matchesType = !typeFilter || rule.type === typeFilter;
        
        let matchesStatus = true;
        if (statusFilter === 'enabled') {
            matchesStatus = rule.enabled !== false;
        } else if (statusFilter === 'disabled') {
            matchesStatus = rule.enabled === false;
        }
        
        return matchesSearch && matchesType && matchesStatus;
    });
    
    renderMaskingRules();
}

// 刷新脱敏规则
async function refreshMaskingRules() {
    try {
        await loadMaskingRules();
        showAlert('脱敏规则列表已刷新', 'success');
    } catch (error) {
        showAlert('刷新脱敏规则失败: ' + error.message, 'danger');
    }
}

// 显示脱敏规则模态框
function showMaskingRuleModal(id = null, ruleData = null) {
    const modal = new bootstrap.Modal(document.getElementById('maskingRuleModal'));
    const form = document.getElementById('maskingRuleForm');
    const title = document.getElementById('maskingRuleModalTitle');
    
    // 重置表单
    form.reset();
    document.getElementById('maskingRuleId').value = '';
    document.getElementById('testResult').style.display = 'none';
    
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
        }
    } else if (ruleData) {
        // 复制模式
        title.textContent = '复制脱敏规则';
        document.getElementById('ruleName').value = ruleData.name;
        document.getElementById('ruleType').value = ruleData.type;
        document.getElementById('rulePattern').value = ruleData.pattern || '';
        document.getElementById('ruleReplace').value = ruleData.replace || '';
    } else {
        // 新增模式
        title.textContent = '添加脱敏规则';
    }
    
    modal.show();
}

// 设置默认模式
function setDefaultPattern() {
    const type = document.getElementById('ruleType').value;
    const templateSelection = document.getElementById('templateSelection');
    const templateButtons = document.getElementById('templateButtons');
    
    // 查找对应的脱敏类型
    const maskingType = maskingTypes.find(t => t.id === type);
    
    if (maskingType && maskingType.templates && maskingType.templates.length > 0) {
        // 显示模板选择区域
        templateSelection.style.display = 'block';
        
        // 生成模板按钮
        templateButtons.innerHTML = '';
        maskingType.templates.forEach((template, index) => {
            const button = document.createElement('div');
            button.className = 'template-btn';
            button.onclick = () => selectTemplate(type, index);
            button.innerHTML = `
                <div class="template-header">
                    <div class="template-name">${template.name}</div>
                    <div class="template-example"><code>${template.example}</code></div>
                </div>
                <div class="template-description">${template.description}</div>
            `;
            templateButtons.appendChild(button);
        });
        
        // 默认选择第一个模板
        selectTemplate(type, 0);
    } else if (type && type !== 'custom' && MASKING_TEMPLATES[type]) {
        // 后备：使用硬编码的模板
        templateSelection.style.display = 'block';
        
        templateButtons.innerHTML = '';
        MASKING_TEMPLATES[type].forEach((template, index) => {
            const button = document.createElement('div');
            button.className = 'template-btn';
            button.onclick = () => selectTemplate(type, index);
            button.innerHTML = `
                <div class="template-header">
                    <div class="template-name">${template.name}</div>
                    <div class="template-example"><code>${template.example}</code></div>
                </div>
                <div class="template-description">${template.description}</div>
            `;
            templateButtons.appendChild(button);
        });
        
        selectTemplate(type, 0);
    } else {
        // 隐藏模板选择区域
        templateSelection.style.display = 'none';
        document.getElementById('rulePattern').value = '';
        document.getElementById('ruleReplace').value = '';
    }
}

// 选择模板
function selectTemplate(type, index) {
    // 首先尝试从动态加载的脱敏类型中获取模板
    const maskingType = maskingTypes.find(t => t.id === type);
    let template = null;
    
    if (maskingType && maskingType.templates && maskingType.templates[index]) {
        template = maskingType.templates[index];
    } else if (MASKING_TEMPLATES[type] && MASKING_TEMPLATES[type][index]) {
        // 后备：使用硬编码的模板
        template = MASKING_TEMPLATES[type][index];
    }
    
    if (!template) return;
    
    // 更新表单字段
    document.getElementById('rulePattern').value = template.pattern;
    document.getElementById('ruleReplace').value = template.replace;
    
    // 更新按钮状态
    document.querySelectorAll('.template-btn').forEach((btn, i) => {
        btn.classList.toggle('active', i === index);
    });
    
    // 自动填充测试数据
    const testInput = document.getElementById('testInput');
    if (!testInput.value) {
        testInput.value = getTestData(type);
    }
}



// 测试脱敏规则
function testMaskingRule() {
    const pattern = document.getElementById('rulePattern').value;
    const replace = document.getElementById('ruleReplace').value;
    const testInput = document.getElementById('testInput').value;
    const testResult = document.getElementById('testResult');
    const testOutput = document.getElementById('testOutput');
    
    if (!pattern || !replace || !testInput) {
        showAlert('请填写正则表达式、替换模式和测试输入', 'warning');
        return;
    }
    
    try {
        const regex = new RegExp(pattern);
        const result = testInput.replace(regex, replace);
        
        testOutput.innerHTML = `
            <strong>原始数据:</strong> ${testInput}<br>
            <strong>脱敏结果:</strong> ${result}
        `;
        testResult.style.display = 'block';
        
        if (result === testInput) {
            showAlert('正则表达式未匹配到数据，请检查模式', 'warning');
        }
    } catch (error) {
        showAlert('正则表达式错误: ' + error.message, 'danger');
        testResult.style.display = 'none';
    }
}

// 保存脱敏规则
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
        replace: document.getElementById('ruleReplace').value,
        enabled: true  // 新规则默认启用
    };
    
    // 验证正则表达式
    try {
        new RegExp(rule.pattern);
    } catch (error) {
        showAlert('正则表达式格式错误: ' + error.message, 'danger');
        return;
    }
    
    try {
        if (id) {
            // 更新
            await apiCall(`/api/masking-rules/${id}`, {
                method: 'PUT',
                body: JSON.stringify(rule)
            });
        } else {
            // 创建
            await apiCall('/api/masking-rules', {
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
        
    } catch (error) {
        showAlert('保存脱敏规则失败: ' + error.message, 'danger');
    }
}

// 复制脱敏规则
function copyMaskingRule(id) {
    const rule = maskingRules.find(r => r.id === id);
    if (!rule) {
        showAlert('脱敏规则不存在', 'danger');
        return;
    }
    
    // 生成唯一的副本名称
    const copyNumber = getCopyNumber(rule.name);
    const copyName = copyNumber > 1 ? 
        `${rule.name} - 副本${copyNumber}` : 
        `${rule.name} - 副本`;
    
    // 创建复制的规则数据
    const copiedRule = {
        name: copyName,
        type: rule.type,
        pattern: rule.pattern,
        replace: rule.replace,
        enabled: true  // 复制的规则默认启用
    };
    
    // 显示模态框并填入复制的数据
    showMaskingRuleModal(null, copiedRule);
    
    // 显示复制成功提示
    showAlert(`已复制脱敏规则 "${rule.name}"，请修改名称后保存`, 'info', 4000);
}

// 获取副本编号
function getCopyNumber(originalName) {
    const existingNames = maskingRules.map(rule => rule.name);
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

// 切换脱敏规则启用状态
async function toggleMaskingRuleStatus(id) {
    const rule = maskingRules.find(r => r.id === id);
    if (!rule) {
        showAlert('脱敏规则不存在', 'danger');
        return;
    }
    
    // 切换状态（默认为启用）
    const newStatus = rule.enabled !== false ? false : true;
    const statusText = newStatus ? '启用' : '禁用';
    
    try {
        // 更新规则状态
        const updatedRule = {
            ...rule,
            enabled: newStatus
        };
        
        await apiCall(`/api/masking-rules/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updatedRule)
        });
        
        showAlert(`脱敏规则 "${rule.name}" 已${statusText}`, 'success');
        
        // 刷新数据
        await loadMaskingRules();
        
    } catch (error) {
        showAlert(`${statusText}脱敏规则失败: ` + error.message, 'danger');
    }
}

// 编辑脱敏规则
function editMaskingRule(id) {
    showMaskingRuleModal(id);
}

// 删除脱敏规则
async function deleteMaskingRule(id) {
    if (!confirm('确定要删除这个脱敏规则吗？此操作不可撤销。')) {
        return;
    }
    
    try {
        await apiCall(`/api/masking-rules/${id}`, { method: 'DELETE' });
        showAlert('脱敏规则删除成功', 'success');
        
        // 刷新数据
        await loadMaskingRules();
    } catch (error) {
        showAlert('删除脱敏规则失败: ' + error.message, 'danger');
    }
}