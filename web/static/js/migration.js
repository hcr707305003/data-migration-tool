// 迁移任务配置页面功能

let dataSources = [];
let filterTemplates = [];
let maskingRules = [];
let selectedTables = [];
let availableTables = [];
let currentSourceDatabase = null;
let migrationTasks = [];
let filteredTasks = [];
let currentEditingTask = null;
let savedTaskConfig = null; // 保存的任务配置状态

// 页面加载完成后初始化
document.addEventListener("DOMContentLoaded", function () {
  loadInitialData();
});

// 加载初始数据
async function loadInitialData() {
  try {
    await Promise.all([
      loadDataSources(),
      loadFilterTemplates(),
      loadMaskingRules(),
      loadMigrationTasks(),
    ]);

    updateDatabaseSelects();
    updateFilterTemplateSelect();
    updateMaskingRuleSelect();
    setupTableSearch();

    // 显示资源统计信息
    showResourceStats();

    // 设置标签页切换事件
    setupTabEvents();
  } catch (error) {
    console.error("加载初始数据失败:", error);
    showAlert("加载数据失败: " + error.message, "danger");
  }
}

// 显示资源统计信息
function showResourceStats() {
  const enabledCount =
    dataSources.length + filterTemplates.length + maskingRules.length;
  if (enabledCount === 0) {
    showAlert(
      "当前没有已启用的资源，请先启用数据源、过滤模板或脱敏规则",
      "warning",
      5000
    );
  } else {
    const stats = [];
    if (dataSources.length > 0) stats.push(`${dataSources.length}个数据源`);
    if (filterTemplates.length > 0)
      stats.push(`${filterTemplates.length}个过滤模板`);
    if (maskingRules.length > 0) stats.push(`${maskingRules.length}个脱敏规则`);

    showAlert(`已加载 ${stats.join("、")}（仅显示已启用的资源）`, "info", 3000);
  }
}

// 加载数据源列表（只加载已启用的）
async function loadDataSources() {
  try {
    const result = await apiCall("/api/datasources");
    // 只保留已启用的数据源
    dataSources = (result || []).filter((ds) => ds.enabled !== false);
  } catch (error) {
    console.error("加载数据源失败:", error);
    dataSources = [];
  }
}

// 加载过滤模板（只加载已启用的）
async function loadFilterTemplates() {
  try {
    const result = await apiCall("/api/filter-templates");
    // 只保留已启用的过滤模板
    filterTemplates = (result || []).filter(
      (template) => template.enabled !== false
    );
  } catch (error) {
    console.error("加载过滤模板失败:", error);
    filterTemplates = [];
  }
}

// 加载脱敏规则（只加载已启用的）
async function loadMaskingRules() {
  try {
    const result = await apiCall("/api/masking-rules");
    // 只保留已启用的脱敏规则
    maskingRules = (result || []).filter((rule) => rule.enabled !== false);
  } catch (error) {
    console.error("加载脱敏规则失败:", error);
    maskingRules = [];
  }
}

// 更新数据库选择框
function updateDatabaseSelects() {
  const sourceSelect = document.getElementById("sourceDatabase");
  const targetSelect = document.getElementById("targetDatabase");

  if (!sourceSelect || !targetSelect) return;

  [sourceSelect, targetSelect].forEach((select) => {
    select.innerHTML = '<option value="">选择数据库</option>';
    if (dataSources && Array.isArray(dataSources)) {
      dataSources.forEach((ds) => {
        const option = document.createElement("option");
        option.value = ds.id;
        option.textContent = `${ds.name} (${ds.type})`;
        select.appendChild(option);
      });
    }
  });

  // 添加源数据库选择变化事件监听
  sourceSelect.addEventListener("change", onSourceDatabaseChange);
}

// 源数据库选择变化处理
async function onSourceDatabaseChange() {
  const sourceSelect = document.getElementById("sourceDatabase");
  const selectedDsId = sourceSelect.value;

  if (!selectedDsId) {
    clearTableList();
    return;
  }

  currentSourceDatabase = dataSources.find((ds) => ds.id === selectedDsId);
  if (currentSourceDatabase) {
    await loadTables(selectedDsId);
  }
}

// 清空表列表
function clearTableList() {
  availableTables = [];
  selectedTables = [];
  renderTableList();
  renderSelectedTables();
  updateConfigPreview();
}

// 加载数据库表列表
async function loadTables(dataSourceId) {
  try {
    showAlert("正在加载表列表...", "info", 2000);

    const result = await apiCall(`/api/datasources/${dataSourceId}/tables`);
    availableTables = result || [];

    renderTableList();

    if (availableTables.length > 0) {
      showAlert(`已加载 ${availableTables.length} 张表`, "success");
    } else {
      showAlert("该数据库中没有找到表", "warning");
    }
  } catch (error) {
    console.error("加载表列表失败:", error);
    showAlert("加载表列表失败: " + error.message, "danger");
    availableTables = [];
    renderTableList();
  }
}

// 渲染表列表
function renderTableList() {
  const tableList = document.getElementById("tableList");
  const tableSearch = document.getElementById("tableSearch");

  if (!tableList) return;

  tableList.innerHTML = "";

  if (availableTables.length === 0) {
    tableList.innerHTML =
      '<div class="text-muted text-center py-3">请先选择源数据库</div>';
    updateTableOperations();
    return;
  }

  // 获取搜索关键词
  const searchTerm = tableSearch ? tableSearch.value.toLowerCase() : "";

  // 过滤表
  const filteredTables = availableTables.filter(
    (table) => !searchTerm || table.toLowerCase().includes(searchTerm)
  );

  if (filteredTables.length === 0) {
    tableList.innerHTML =
      '<div class="text-muted text-center py-3">没有找到匹配的表</div>';
    return;
  }

  filteredTables.forEach((tableName) => {
    const isSelected = selectedTables.some((t) => t.name === tableName);

    const tableItem = document.createElement("div");
    tableItem.className = `list-group-item d-flex justify-content-between align-items-center ${
      isSelected ? "table-selected" : ""
    }`;
    tableItem.innerHTML = `
            <div class="form-check">
                <input class="form-check-input" type="checkbox" id="table_${tableName}" 
                       ${
                         isSelected ? "checked" : ""
                       } onchange="toggleTableSelection('${tableName}')">
                <label class="form-check-label ${
                  isSelected ? "fw-bold" : ""
                }" for="table_${tableName}" style="${
      isSelected ? "color: #198754;" : ""
    }">
                    <i class="bi ${
                      isSelected ? "bi-table-fill" : "bi-table"
                    } me-2"></i>${tableName}
                </label>
            </div>
            ${
              isSelected
                ? '<span class="badge bg-success"><i class="bi bi-check-circle-fill me-1"></i>已选择</span>'
                : ""
            }
        `;

    tableList.appendChild(tableItem);
  });

  // 更新表操作按钮状态
  updateTableOperations();
}

// 切换表选择状态
function toggleTableSelection(tableName) {
  const existingIndex = selectedTables.findIndex((t) => t.name === tableName);

  if (existingIndex >= 0) {
    // 取消选择
    selectedTables.splice(existingIndex, 1);
  } else {
    // 添加选择
    selectedTables.push({
      name: tableName,
      conditions: [],
      templateRefs: [],
      maskingRules: {},
      syncData: true, // 默认同步数据
    });
  }

  renderTableList();
  renderSelectedTables();
}

// 渲染已选择的表
function renderSelectedTables() {
  const selectedTablesContainer = document.getElementById("selectedTables");
  const selectedTableCount = document.getElementById("selectedTableCount");

  if (!selectedTablesContainer) return;

  // 更新计数
  if (selectedTableCount) {
    selectedTableCount.textContent = selectedTables.length;
  }

  selectedTablesContainer.innerHTML = "";

  if (selectedTables.length === 0) {
    selectedTablesContainer.innerHTML =
      '<div class="text-muted text-center py-3">请从左侧选择要迁移的表</div>';
    return;
  }

  selectedTables.forEach((table, index) => {
    // 计算配置状态
    const hasFilters =
      table.templateRefs.length > 0 || table.conditions.length > 0;
    const hasMasking = Object.keys(table.maskingRules).length > 0;
    const syncData = table.syncData !== false; // 默认为true

    const tableItem = document.createElement("div");
    tableItem.className = "selected-table-item";
    tableItem.innerHTML = `
        <div style="flex: 1; min-width: 0;">
            <div style="display: flex; align-items: center; margin-bottom: 6px;">
                <i class="bi bi-table" style="margin-right: 8px; color: #198754; font-size: 1rem;"></i>
                <strong style="color: #198754;">${table.name}</strong>
            </div>
            <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                ${
                  hasFilters
                    ? '<span class="badge bg-info" style="font-size: 0.65rem; padding: 2px 6px;"><i class="bi bi-funnel" style="font-size: 0.7rem;"></i> 过滤</span>'
                    : ""
                }
                ${
                  hasMasking
                    ? '<span class="badge bg-warning" style="font-size: 0.65rem; padding: 2px 6px;"><i class="bi bi-shield-check" style="font-size: 0.7rem;"></i> 脱敏</span>'
                    : ""
                }
                ${
                  syncData
                    ? '<span class="badge bg-success" style="font-size: 0.65rem; padding: 2px 6px;"><i class="bi bi-arrow-repeat" style="font-size: 0.7rem;"></i> 同步</span>'
                    : '<span class="badge bg-secondary" style="font-size: 0.65rem; padding: 2px 6px;"><i class="bi bi-file-text" style="font-size: 0.7rem;"></i> 仅结构</span>'
                }
            </div>
        </div>
        <div style="display: flex; gap: 4px; flex-wrap: wrap; flex-shrink: 0; align-items: flex-start;">
            <button class="btn btn-outline-primary btn-sm" onclick="configureTableFilters(${index})" title="配置过滤条件" style="padding: 4px 10px; font-size: 1rem; line-height: 1.2;">
                <i class="bi bi-funnel"></i>
            </button>
            <button class="btn btn-outline-warning btn-sm" onclick="configureTableMasking(${index})" title="配置脱敏规则" style="padding: 4px 10px; font-size: 1rem; line-height: 1.2;">
                <i class="bi bi-shield-check"></i>
            </button>
            <button class="btn btn-outline-${
              syncData ? "success" : "secondary"
            } btn-sm" onclick="toggleTableSyncData(${index})" title="${
      syncData ? "点击切换为仅同步结构" : "点击切换为同步数据"
    }" style="padding: 4px 10px; font-size: 1rem; line-height: 1.2;">
                <i class="bi bi-${syncData ? "arrow-repeat" : "file-text"}"></i>
            </button>
            <button class="btn btn-outline-danger btn-sm" onclick="removeTableSelection('${
              table.name
            }')" title="移除" style="padding: 4px 10px; font-size: 1rem; line-height: 1.2;">
                <i class="bi bi-x-lg"></i>
            </button>
        </div>
    `;

    selectedTablesContainer.appendChild(tableItem);
  });

  // 更新配置预览
  updateConfigPreview();
}

// 移除表选择
function removeTableSelection(tableName) {
  const index = selectedTables.findIndex((t) => t.name === tableName);
  if (index >= 0) {
    selectedTables.splice(index, 1);
    renderTableList();
    renderSelectedTables();
  }
}

// 切换表的数据同步状态
function toggleTableSyncData(tableIndex) {
  const table = selectedTables[tableIndex];
  if (!table) return;

  // 切换同步数据状态
  table.syncData = !table.syncData;

  // 重新渲染
  renderSelectedTables();

  // 显示提示
  const status = table.syncData ? "同步数据" : "仅同步结构";
  showAlert(`表 "${table.name}" 已设置为${status}`, "info", 2000);
}

// 复制表配置
function copyTableConfig(tableIndex) {
  const table = selectedTables[tableIndex];
  if (!table) return;

  // 复制配置到剪贴板
  const config = {
    name: table.name,
    conditions: table.conditions,
    templateRefs: table.templateRefs,
    maskingRules: table.maskingRules,
    syncData: table.syncData,
  };

  // 使用Clipboard API
  const configText = JSON.stringify(config, null, 2);
  navigator.clipboard
    .writeText(configText)
    .then(() => {
      showAlert(`表 "${table.name}" 的配置已复制到剪贴板`, "success", 2000);
    })
    .catch((err) => {
      console.error("复制失败:", err);
      showAlert("复制配置失败", "danger");
    });
}

// 批量切换数据同步状态
function batchToggleSyncData(syncData) {
  if (selectedTables.length === 0) {
    showAlert("请先选择要操作的表", "warning");
    return;
  }

  selectedTables.forEach((table) => {
    table.syncData = syncData;
  });

  renderSelectedTables();

  const status = syncData ? "同步数据" : "仅同步结构";
  showAlert(`已将 ${selectedTables.length} 张表设置为${status}`, "success");
}

// 清空所有已选择的表
function clearAllSelectedTables() {
  if (selectedTables.length === 0) {
    showAlert("没有已选择的表", "info");
    return;
  }

  if (!confirm(`确定要清空所有已选择的 ${selectedTables.length} 张表吗？`)) {
    return;
  }

  selectedTables = [];
  renderTableList();
  renderSelectedTables();
  showAlert("已清空所有已选择的表", "success");
}

// 表搜索功能
function setupTableSearch() {
  const tableSearch = document.getElementById("tableSearch");
  if (tableSearch) {
    tableSearch.addEventListener("input", function () {
      renderTableList();
    });
  }
}

// 配置表的过滤条件
function configureTableFilters(tableIndex) {
  const table = selectedTables[tableIndex];
  if (!table) return;

  showTableFilterModal(table, tableIndex);
}

// 配置表的脱敏规则
function configureTableMasking(tableIndex) {
  const table = selectedTables[tableIndex];
  if (!table) return;

  showTableFilterModal(table, tableIndex, "masking");
}

// 显示表过滤配置模态框
function showTableFilterModal(table, tableIndex, activeTab = "filter") {
  // 创建模态框内容
  const modalContent = `
        <div class="table-filter-config">
            <div class="config-tabs">
                <ul class="nav nav-tabs" id="configTabs" role="tablist">
                    <li class="nav-item" role="presentation">
                        <button class="nav-link ${
                          activeTab === "filter" ? "active" : ""
                        }" id="filter-tab" data-bs-toggle="tab" data-bs-target="#filter-pane" type="button" role="tab">
                            <i class="bi bi-funnel"></i> 过滤条件
                        </button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link ${
                          activeTab === "masking" ? "active" : ""
                        }" id="masking-tab" data-bs-toggle="tab" data-bs-target="#masking-pane" type="button" role="tab">
                            <i class="bi bi-shield-check"></i> 脱敏规则
                        </button>
                    </li>
                </ul>
                
                <div class="tab-content mt-3" id="configTabContent">
                    <!-- 过滤条件面板 -->
                    <div class="tab-pane fade ${
                      activeTab === "filter" ? "show active" : ""
                    }" id="filter-pane" role="tabpanel">
                        <h6><i class="bi bi-table"></i> ${
                          table.name
                        } - 过滤条件配置</h6>
                        
                        <!-- 使用过滤模板 -->
                        <div class="mb-4">
                            <h6 class="text-primary">
                                <i class="bi bi-bookmark"></i> 使用过滤模板
                                <small class="text-muted">(可选择多个模板)</small>
                            </h6>
                            <div class="template-selection">
                                ${
                                  filterTemplates.length > 0
                                    ? filterTemplates
                                        .map(
                                          (template) => `
                                    <div class="card mb-2" style="border: 1px solid var(--border-color);">
                                        <div class="card-body p-3">
                                            <div class="form-check">
                                                <input class="form-check-input" type="checkbox" 
                                                       id="template_${
                                                         template.id
                                                       }" 
                                                       ${
                                                         table.templateRefs.includes(
                                                           template.id
                                                         )
                                                           ? "checked"
                                                           : ""
                                                       }
                                                       onchange="toggleTemplateForTable(${tableIndex}, '${
                                            template.id
                                          }')">
                                                <label class="form-check-label w-100" for="template_${
                                                  template.id
                                                }">
                                                    <div class="d-flex justify-content-between align-items-start">
                                                        <div>
                                                            <strong>${
                                                              template.name
                                                            }</strong>
                                                            <small class="text-muted d-block">${
                                                              template.description ||
                                                              "无描述"
                                                            }</small>
                                                        </div>
                                                        <span class="badge bg-info">${
                                                          template.conditions
                                                            ? template
                                                                .conditions
                                                                .length
                                                            : 0
                                                        } 个条件</span>
                                                    </div>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                `
                                        )
                                        .join("")
                                    : '<div class="alert alert-info">暂无可用的过滤模板，请先创建过滤模板</div>'
                                }
                            </div>
                        </div>
                        
                        <!-- 自定义过滤条件 -->
                        <div class="mb-3">
                            <h6 class="text-primary">
                                <i class="bi bi-plus-circle"></i> 自定义过滤条件
                                <small class="text-muted">(直接添加过滤条件)</small>
                            </h6>
                            <div class="custom-conditions">
                                <div class="card p-3 mb-3" style="border: 1px solid var(--border-color); background: var(--card-bg);">
                                    <div class="row g-2">
                                        <div class="col-md-3">
                                            <label class="form-label small">字段</label>
                                            <select class="form-select" id="conditionField_${tableIndex}">
                                                <option value="">选择字段</option>
                                            </select>
                                        </div>
                                        <div class="col-md-2">
                                            <label class="form-label small">操作符</label>
                                            <select class="form-select" id="conditionOperator_${tableIndex}">
                                                <option value="=">=</option>
                                                <option value="!=">!=</option>
                                                <option value=">">&gt;</option>
                                                <option value="<">&lt;</option>
                                                <option value=">=">&gt;=</option>
                                                <option value="<=">&lt;=</option>
                                                <option value="LIKE">LIKE</option>
                                                <option value="IN">IN</option>
                                                <option value="NOT IN">NOT IN</option>
                                                <option value="IS NULL">IS NULL</option>
                                                <option value="IS NOT NULL">IS NOT NULL</option>
                                            </select>
                                        </div>
                                        <div class="col-md-3">
                                            <label class="form-label small">值</label>
                                            <input type="text" class="form-control" id="conditionValue_${tableIndex}" 
                                                   placeholder="输入值 (多个值用逗号分隔)">
                                        </div>
                                        <div class="col-md-2">
                                            <label class="form-label small">逻辑</label>
                                            <select class="form-select" id="conditionLogic_${tableIndex}">
                                                <option value="AND">AND</option>
                                                <option value="OR">OR</option>
                                            </select>
                                        </div>
                                        <div class="col-md-2">
                                            <label class="form-label small">&nbsp;</label>
                                            <button class="btn btn-primary btn-sm d-block" onclick="addCustomConditionToTable(${tableIndex})">
                                                <i class="bi bi-plus"></i> 添加
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="mt-3">
                                    <h6>已添加的自定义条件 <span class="badge bg-secondary">${
                                      table.conditions.length
                                    }</span></h6>
                                    <div id="tableCustomConditions_${tableIndex}">
                                        ${renderTableCustomConditions(
                                          table.conditions,
                                          tableIndex
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 脱敏规则面板 -->
                    <div class="tab-pane fade ${
                      activeTab === "masking" ? "show active" : ""
                    }" id="masking-pane" role="tabpanel">
                        <h6><i class="bi bi-table"></i> ${
                          table.name
                        } - 脱敏规则配置</h6>
                        
                        <!-- 使用脱敏规则模板 -->
                        <div class="mb-4">
                            <h6 class="text-primary">
                                <i class="bi bi-bookmark"></i> 使用脱敏规则模板
                                <small class="text-muted">(快速应用预设规则)</small>
                            </h6>
                            <div class="masking-template-selection">
                                ${
                                  maskingRules.length > 0
                                    ? maskingRules
                                        .map(
                                          (rule) => `
                                    <div class="card mb-2" style="border: 1px solid var(--border-color);">
                                        <div class="card-body p-3">
                                            <div class="d-flex justify-content-between align-items-center">
                                                <div>
                                                    <strong>${
                                                      rule.name
                                                    }</strong>
                                                    <span class="badge bg-info ms-2">${getTypeLabel(
                                                      rule.type
                                                    )}</span>
                                                    <small class="text-muted d-block">${
                                                      rule.description ||
                                                      "无描述"
                                                    }</small>
                                                </div>
                                                <button class="btn btn-outline-primary btn-sm" 
                                                        onclick="applyMaskingTemplate(${tableIndex}, '${
                                            rule.id
                                          }')">
                                                    <i class="bi bi-plus"></i> 应用模板
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                `
                                        )
                                        .join("")
                                    : '<div class="alert alert-info">暂无可用的脱敏规则模板，请先创建脱敏规则</div>'
                                }
                            </div>
                        </div>
                        
                        <!-- 自定义脱敏规则 -->
                        <div class="mb-3">
                            <h6 class="text-primary">
                                <i class="bi bi-plus-circle"></i> 自定义脱敏规则
                                <small class="text-muted">(为特定字段配置脱敏)</small>
                            </h6>
                            <div class="masking-rules-config">
                                <div class="card p-3 mb-3" style="border: 1px solid var(--border-color); background: var(--card-bg);">
                                    <div class="row g-2">
                                        <div class="col-md-4">
                                            <label class="form-label small">字段</label>
                                            <select class="form-select" id="maskingFieldSelect_${tableIndex}">
                                                <option value="">选择字段</option>
                                            </select>
                                        </div>
                                        <div class="col-md-4">
                                            <label class="form-label small">脱敏类型</label>
                                            <select class="form-select" id="maskingTypeSelect_${tableIndex}" onchange="onMaskingTypeChange(${tableIndex})">
                                                <option value="">选择脱敏类型</option>
                                                <!-- 脱敏类型选项将由JavaScript动态生成 -->
                                            </select>
                                        </div>
                                        <div class="col-md-4">
                                            <label class="form-label small">&nbsp;</label>
                                            <button class="btn btn-primary btn-sm d-block" onclick="addCustomMaskingRuleToTable(${tableIndex})">
                                                <i class="bi bi-plus"></i> 添加脱敏
                                            </button>
                                        </div>
                                    </div>
                                    <!-- 脱敏模板选择区域 -->
                                    <div class="row g-2 mt-2" id="maskingTemplateOptions_${tableIndex}" style="display: none;">
                                        <div class="col-12">
                                            <label class="form-label small">选择脱敏模板</label>
                                            <div class="template-buttons" id="maskingTemplateButtons_${tableIndex}">
                                                <!-- 模板按钮将在这里动态生成 -->
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <!-- 自定义脱敏规则区域 -->
                                    <div class="row g-2 mt-2" id="customMaskingOptions_${tableIndex}" style="display: none;">
                                        <div class="col-md-6">
                                            <label class="form-label small">正则表达式</label>
                                            <input type="text" class="form-control" id="customMaskingPattern_${tableIndex}" 
                                                   placeholder="例如: ^(.{2})(.+)(.{2})$">
                                        </div>
                                        <div class="col-md-6">
                                            <label class="form-label small">替换模式</label>
                                            <input type="text" class="form-control" id="customMaskingReplace_${tableIndex}" 
                                                   placeholder="例如: $1***$3">
                                        </div>
                                        <div class="col-12">
                                            <label class="form-label small">测试输入</label>
                                            <div class="input-group">
                                                <input type="text" class="form-control" id="customMaskingTest_${tableIndex}" 
                                                       placeholder="输入测试数据">
                                                <button class="btn btn-outline-info" type="button" onclick="testCustomMasking(${tableIndex})">
                                                    <i class="bi bi-play-circle"></i> 测试
                                                </button>
                                            </div>
                                            <div id="customMaskingTestResult_${tableIndex}" class="mt-2" style="display: none;">
                                                <small class="text-muted">脱敏结果：</small>
                                                <div class="alert alert-info py-2" id="customMaskingTestOutput_${tableIndex}"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="mt-3">
                                    <h6>已配置的脱敏规则 <span class="badge bg-warning">${
                                      Object.keys(table.maskingRules).length
                                    }</span></h6>
                                    <div id="tableMaskingRules_${tableIndex}">
                                        ${renderTableMaskingRules(
                                          table.maskingRules,
                                          tableIndex
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="modal-footer d-flex justify-content-end gap-2" style="border-top: 1px solid var(--border-color); background: transparent; padding: 1rem;">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                <i class="bi bi-x"></i> 关闭
            </button>
            <button type="button" class="btn btn-primary" data-bs-dismiss="modal">
                <i class="bi bi-check"></i> 保存配置
            </button>
        </div>
    `;

  // 显示模态框
  showCustomModal("表配置", modalContent, () => {
    // 模态框显示后加载字段列表
    loadTableColumns(currentSourceDatabase.id, table.name, tableIndex);

    // 更新脱敏类型选择器
    updateMaskingTypeSelector(tableIndex);

    // 添加自定义脱敏类型选择事件
    const maskingTypeSelect = document.getElementById(
      `maskingTypeSelect_${tableIndex}`
    );
    if (maskingTypeSelect) {
      maskingTypeSelect.addEventListener("change", function () {
        const customOptions = document.getElementById(
          `customMaskingOptions_${tableIndex}`
        );
        if (this.value === "custom") {
          customOptions.style.display = "block";
        } else {
          customOptions.style.display = "none";
        }
      });
    }
  });
}

// 渲染表的自定义条件
function renderTableCustomConditions(conditions, tableIndex) {
  if (!conditions || conditions.length === 0) {
    return '<div class="text-muted">暂无自定义条件</div>';
  }

  return conditions
    .map(
      (condition, index) => `
        <div class="card mb-2" style="border: 1px solid var(--border-color);">
            <div class="card-body p-2">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <code>${condition.field} ${condition.operator} ${
        condition.value
      }</code>
                        ${
                          index < conditions.length - 1
                            ? `<span class="badge bg-secondary ms-2">${condition.logic}</span>`
                            : ""
                        }
                    </div>
                    <button class="btn btn-sm btn-outline-danger" onclick="removeCustomConditionFromTable(${tableIndex}, ${index})">
                        <i class="bi bi-x"></i>
                    </button>
                </div>
            </div>
        </div>
    `
    )
    .join("");
}

// 渲染表的脱敏规则
function renderTableMaskingRules(tableMaskingRules, tableIndex) {
  if (Object.keys(tableMaskingRules).length === 0) {
    return '<div class="text-muted">暂无脱敏规则</div>';
  }

  return Object.entries(tableMaskingRules)
    .map(([field, ruleConfig]) => {
      let ruleDisplay = "";
      if (typeof ruleConfig === "string") {
        // 兼容旧格式（只有规则ID）
        const rule = maskingRules.find((r) => r.id === ruleConfig);
        ruleDisplay = rule ? rule.name : "未知规则";
      } else {
        // 新格式（包含类型和配置）
        ruleDisplay = `${getTypeLabel(ruleConfig.type)}`;
        if (ruleConfig.customRule) {
          ruleDisplay += ` (${ruleConfig.customRule})`;
        }
      }

      return `
            <div class="card mb-2" style="border: 1px solid var(--border-color);">
                <div class="card-body p-2">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <strong>${field}</strong>
                            <i class="bi bi-arrow-right mx-2"></i>
                            <span class="badge bg-warning">${ruleDisplay}</span>
                        </div>
                        <button class="btn btn-sm btn-outline-danger" onclick="removeMaskingRuleFromTable(${tableIndex}, '${field}')">
                            <i class="bi bi-x"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    })
    .join("");
}

// 自定义模态框
function showCustomModal(title, content, onShown = null) {
  const modalId = "customConfigModal";
  let modal = document.getElementById(modalId);

  if (!modal) {
    modal = document.createElement("div");
    modal.id = modalId;
    modal.className = "modal fade";
    modal.tabIndex = -1;
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
        <div class="modal-dialog modal-lg">
            <div class="modal-content" style="background: var(--card-bg); border: 1px solid var(--border-color);">
                <div class="modal-header" style="border-bottom: 1px solid var(--border-color);">
                    <h5 class="modal-title" style="color: var(--primary-color);">${title}</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" style="filter: invert(1);"></button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>

            </div>
        </div>
    `;

  const bootstrapModal = new bootstrap.Modal(modal);

  if (onShown) {
    modal.addEventListener("shown.bs.modal", onShown, { once: true });
  }

  bootstrapModal.show();
}

// 加载表字段
async function loadTableColumns(dataSourceId, tableName, tableIndex) {
  try {
    const result = await apiCall(
      `/api/datasources/${dataSourceId}/tables/${tableName}/columns`
    );
    const columns = result || [];

    // 更新过滤条件字段选择框
    const conditionFieldSelect = document.getElementById(
      `conditionField_${tableIndex}`
    );
    if (conditionFieldSelect) {
      conditionFieldSelect.innerHTML = '<option value="">选择字段</option>';
      columns.forEach((column) => {
        const option = document.createElement("option");
        option.value = column.name || column;
        option.textContent = column.name || column;
        conditionFieldSelect.appendChild(option);
      });
    }

    // 更新脱敏规则字段选择框
    const maskingFieldSelect = document.getElementById(
      `maskingFieldSelect_${tableIndex}`
    );
    if (maskingFieldSelect) {
      maskingFieldSelect.innerHTML = '<option value="">选择字段</option>';
      columns.forEach((column) => {
        const option = document.createElement("option");
        option.value = column.name || column;
        option.textContent = column.name || column;
        maskingFieldSelect.appendChild(option);
      });
    }
  } catch (error) {
    console.error("加载表字段失败:", error);
    showAlert("加载表字段失败: " + error.message, "danger");
  }
}

// 添加自定义条件到表
function addCustomConditionToTable(tableIndex) {
  const table = selectedTables[tableIndex];
  if (!table) return;

  const fieldSelect = document.getElementById(`conditionField_${tableIndex}`);
  const operatorSelect = document.getElementById(
    `conditionOperator_${tableIndex}`
  );
  const valueInput = document.getElementById(`conditionValue_${tableIndex}`);
  const logicSelect = document.getElementById(`conditionLogic_${tableIndex}`);

  const field = fieldSelect.value;
  const operator = operatorSelect.value;
  const value = valueInput.value.trim();
  const logic = logicSelect.value;

  if (!field) {
    showAlert("请选择字段", "warning");
    return;
  }

  if (!operator) {
    showAlert("请选择操作符", "warning");
    return;
  }

  // 对于某些操作符，值是可选的
  if (!value && !["IS NULL", "IS NOT NULL"].includes(operator)) {
    showAlert("请输入值", "warning");
    return;
  }

  // 处理IN操作符的值格式
  let processedValue = value;
  if (operator.toUpperCase() === "IN" || operator.toUpperCase() === "NOT IN") {
    // 如果值不是以括号开头，自动添加括号
    if (!value.startsWith("(")) {
      processedValue = `(${value})`;
    }
  }

  // 添加条件
  const condition = {
    field: field,
    operator: operator,
    value: processedValue,
    logic: logic,
  };

  table.conditions.push(condition);

  // 重新渲染条件列表
  const conditionsContainer = document.getElementById(
    `tableCustomConditions_${tableIndex}`
  );
  if (conditionsContainer) {
    conditionsContainer.innerHTML = renderTableCustomConditions(
      table.conditions,
      tableIndex
    );
  }

  // 清空输入
  fieldSelect.value = "";
  operatorSelect.value = "=";
  valueInput.value = "";
  logicSelect.value = "AND";

  // 更新主界面显示
  renderSelectedTables();

  showAlert("已添加过滤条件", "success", 2000);
}

// 移除自定义条件
function removeCustomConditionFromTable(tableIndex, conditionIndex) {
  const table = selectedTables[tableIndex];
  if (!table || conditionIndex < 0 || conditionIndex >= table.conditions.length)
    return;

  table.conditions.splice(conditionIndex, 1);

  // 重新渲染条件列表
  const conditionsContainer = document.getElementById(
    `tableCustomConditions_${tableIndex}`
  );
  if (conditionsContainer) {
    conditionsContainer.innerHTML = renderTableCustomConditions(
      table.conditions,
      tableIndex
    );
  }

  // 更新主界面显示
  renderSelectedTables();

  showAlert("已移除过滤条件", "success", 2000);
}

// 应用脱敏模板
function applyMaskingTemplate(tableIndex, ruleId) {
  const table = selectedTables[tableIndex];
  const rule = maskingRules.find((r) => r.id === ruleId);

  if (!table || !rule) return;

  // 检查是否有可用字段
  const fieldSelect = document.getElementById(
    `maskingFieldSelect_${tableIndex}`
  );
  if (!fieldSelect || fieldSelect.options.length <= 1) {
    showAlert("请先加载表字段", "warning");
    return;
  }

  // 在当前界面显示字段选择区域，而不是新的模态框
  const templateCard = event.target.closest(".card");
  if (!templateCard) return;

  // 创建字段选择界面
  const fieldOptions = Array.from(fieldSelect.options)
    .slice(1) // 跳过第一个空选项
    .map(
      (option) => `
      <div class="form-check">
        <input class="form-check-input" type="checkbox" id="template_field_${option.value}" value="${option.value}">
        <label class="form-check-label" for="template_field_${option.value}">
          ${option.text}
        </label>
      </div>
    `
    )
    .join("");

  // 替换模板卡片内容为字段选择界面
  templateCard.innerHTML = `
    <div class="card-body p-3">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h6 class="mb-0">选择要应用 "${rule.name}" 脱敏规则的字段：</h6>
        <button class="btn btn-sm btn-outline-secondary" onclick="cancelApplyMaskingTemplate(${tableIndex}, '${ruleId}')">
          <i class="bi bi-x"></i> 取消
        </button>
      </div>
      <div class="field-selection mb-3" style="max-height: 200px; overflow-y: auto;">
        ${fieldOptions}
      </div>
      <div class="d-flex justify-content-end gap-2">
        <button type="button" class="btn btn-outline-secondary btn-sm" onclick="cancelApplyMaskingTemplate(${tableIndex}, '${ruleId}')">
          取消
        </button>
        <button type="button" class="btn btn-primary btn-sm" onclick="confirmApplyMaskingTemplate(${tableIndex}, '${ruleId}')">
          <i class="bi bi-check"></i> 应用
        </button>
      </div>
    </div>
  `;
}

// 取消应用脱敏模板
function cancelApplyMaskingTemplate(tableIndex, ruleId) {
  const rule = maskingRules.find((r) => r.id === ruleId);
  if (!rule) return;

  // 恢复原始的模板卡片
  const templateCard = event.target.closest(".card");
  if (!templateCard) return;

  templateCard.innerHTML = `
    <div class="card-body p-3">
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <strong>${rule.name}</strong>
          <span class="badge bg-info ms-2">${getTypeLabel(rule.type)}</span>
          <small class="text-muted d-block">${
            rule.description || "无描述"
          }</small>
        </div>
        <button class="btn btn-outline-primary btn-sm" onclick="applyMaskingTemplate(${tableIndex}, '${
    rule.id
  }')">
          <i class="bi bi-plus"></i> 应用模板
        </button>
      </div>
    </div>
  `;
}

// 确认应用脱敏模板
function confirmApplyMaskingTemplate(tableIndex, ruleId) {
  const table = selectedTables[tableIndex];
  const rule = maskingRules.find((r) => r.id === ruleId);

  if (!table || !rule) return;

  // 获取选中的字段
  const selectedFields = [];
  const checkboxes = document.querySelectorAll(
    'input[id^="template_field_"]:checked'
  );
  checkboxes.forEach((checkbox) => {
    selectedFields.push(checkbox.value);
  });

  if (selectedFields.length === 0) {
    showAlert("请至少选择一个字段", "warning");
    return;
  }

  // 应用脱敏规则到选中的字段
  selectedFields.forEach((field) => {
    table.maskingRules[field] = {
      type: rule.type,
      ruleId: ruleId,
      ruleName: rule.name,
    };
  });

  // 重新渲染脱敏规则列表
  const rulesContainer = document.getElementById(
    `tableMaskingRules_${tableIndex}`
  );
  if (rulesContainer) {
    rulesContainer.innerHTML = renderTableMaskingRules(
      table.maskingRules,
      tableIndex
    );
  }

  // 恢复原始的模板卡片
  cancelApplyMaskingTemplate(tableIndex, ruleId);

  // 更新主界面显示
  renderSelectedTables();

  showAlert(`已为 ${selectedFields.length} 个字段应用脱敏规则`, "success");
}

// 添加自定义脱敏规则到表
function addCustomMaskingRuleToTable(tableIndex) {
  const table = selectedTables[tableIndex];
  if (!table) return;

  const fieldSelect = document.getElementById(
    `maskingFieldSelect_${tableIndex}`
  );
  const typeSelect = document.getElementById(`maskingTypeSelect_${tableIndex}`);

  const field = fieldSelect.value;
  const type = typeSelect.value;

  if (!field) {
    showAlert("请选择字段", "warning");
    return;
  }

  if (!type) {
    showAlert("请选择脱敏类型", "warning");
    return;
  }

  // 构建脱敏规则配置
  const maskingConfig = {
    type: type,
  };

  if (type === "custom") {
    // 自定义脱敏规则
    const patternInput = document.getElementById(
      `customMaskingPattern_${tableIndex}`
    );
    const replaceInput = document.getElementById(
      `customMaskingReplace_${tableIndex}`
    );

    const pattern = patternInput ? patternInput.value.trim() : "";
    const replace = replaceInput ? replaceInput.value.trim() : "";

    if (!pattern || !replace) {
      showAlert("请输入正则表达式和替换模式", "warning");
      return;
    }

    // 验证正则表达式
    try {
      new RegExp(pattern);
    } catch (error) {
      showAlert("正则表达式格式错误: " + error.message, "danger");
      return;
    }

    maskingConfig.pattern = pattern;
    maskingConfig.replace = replace;
  } else {
    // 使用模板脱敏
    const templateOptions = document.getElementById(
      `maskingTemplateOptions_${tableIndex}`
    );
    if (templateOptions) {
      const selectedType = templateOptions.dataset.selectedType;
      const selectedTemplate = templateOptions.dataset.selectedTemplate;
      const templatePattern = templateOptions.dataset.templatePattern;
      const templateReplace = templateOptions.dataset.templateReplace;

      if (selectedType && templatePattern && templateReplace) {
        maskingConfig.pattern = templatePattern;
        maskingConfig.replace = templateReplace;
        maskingConfig.templateIndex = selectedTemplate;
      } else {
        showAlert("请选择一个脱敏模板", "warning");
        return;
      }
    }
  }

  // 添加脱敏规则
  table.maskingRules[field] = maskingConfig;

  // 重新渲染脱敏规则列表
  const rulesContainer = document.getElementById(
    `tableMaskingRules_${tableIndex}`
  );
  if (rulesContainer) {
    rulesContainer.innerHTML = renderTableMaskingRules(
      table.maskingRules,
      tableIndex
    );
  }

  // 清空选择
  fieldSelect.value = "";
  typeSelect.value = "";

  // 清空自定义输入
  const patternInput = document.getElementById(
    `customMaskingPattern_${tableIndex}`
  );
  const replaceInput = document.getElementById(
    `customMaskingReplace_${tableIndex}`
  );
  const testInput = document.getElementById(`customMaskingTest_${tableIndex}`);
  if (patternInput) patternInput.value = "";
  if (replaceInput) replaceInput.value = "";
  if (testInput) testInput.value = "";

  // 隐藏选项
  const templateOptions = document.getElementById(
    `maskingTemplateOptions_${tableIndex}`
  );
  const customOptions = document.getElementById(
    `customMaskingOptions_${tableIndex}`
  );
  if (templateOptions) templateOptions.style.display = "none";
  if (customOptions) customOptions.style.display = "none";

  // 隐藏测试结果
  const testResult = document.getElementById(
    `customMaskingTestResult_${tableIndex}`
  );
  if (testResult) testResult.style.display = "none";

  // 更新主界面显示
  renderSelectedTables();

  showAlert("已添加脱敏规则", "success", 2000);
}

// 移除脱敏规则
function removeMaskingRuleFromTable(tableIndex, field) {
  const table = selectedTables[tableIndex];
  if (!table) return;

  delete table.maskingRules[field];

  // 重新渲染脱敏规则列表
  const rulesContainer = document.getElementById(
    `tableMaskingRules_${tableIndex}`
  );
  if (rulesContainer) {
    rulesContainer.innerHTML = renderTableMaskingRules(
      table.maskingRules,
      tableIndex
    );
  }

  // 更新主界面显示
  renderSelectedTables();

  showAlert("已移除脱敏规则", "success", 2000);
}

// 为表切换过滤模板
function toggleTemplateForTable(tableIndex, templateId) {
  const table = selectedTables[tableIndex];
  if (!table) return;

  const index = table.templateRefs.indexOf(templateId);
  if (index >= 0) {
    table.templateRefs.splice(index, 1);
  } else {
    table.templateRefs.push(templateId);
  }

  renderSelectedTables();
}

// 为表添加脱敏规则（保留兼容性）
function addMaskingRuleToTable(tableIndex) {
  const table = selectedTables[tableIndex];
  if (!table) return;

  const fieldSelect = document.getElementById(
    `maskingFieldSelect_${tableIndex}`
  );
  const ruleSelect = document.getElementById(`maskingRuleSelect_${tableIndex}`);

  const field = fieldSelect ? fieldSelect.value : "";
  const ruleId = ruleSelect ? ruleSelect.value : "";

  if (!field || !ruleId) {
    showAlert("请选择字段和脱敏规则", "warning");
    return;
  }

  const rule = maskingRules.find((r) => r.id === ruleId);
  if (!rule) {
    showAlert("找不到指定的脱敏规则", "danger");
    return;
  }

  table.maskingRules[field] = {
    type: rule.type,
    ruleId: ruleId,
    ruleName: rule.name,
  };

  // 重新渲染脱敏规则列表
  const rulesContainer = document.getElementById(
    `tableMaskingRules_${tableIndex}`
  );
  if (rulesContainer) {
    rulesContainer.innerHTML = renderTableMaskingRules(
      table.maskingRules,
      tableIndex
    );
  }

  // 清空选择
  if (fieldSelect) fieldSelect.value = "";
  if (ruleSelect) ruleSelect.value = "";

  renderSelectedTables();
  showAlert("已添加脱敏规则", "success", 2000);
}

// 更新过滤模板选择框
function updateFilterTemplateSelect() {
  const select = document.getElementById("filterTemplate");
  if (!select) return;

  select.innerHTML = '<option value="">选择过滤模板</option>';

  if (filterTemplates && Array.isArray(filterTemplates)) {
    filterTemplates.forEach((template) => {
      const option = document.createElement("option");
      option.value = template.id;
      option.textContent = template.name;
      select.appendChild(option);
    });
  }
}

// 更新脱敏规则选择框
function updateMaskingRuleSelect() {
  const select = document.getElementById("maskingRule");
  if (!select) return;

  select.innerHTML = '<option value="">选择脱敏规则</option>';

  if (maskingRules && Array.isArray(maskingRules)) {
    maskingRules.forEach((rule) => {
      const option = document.createElement("option");
      option.value = rule.id;
      option.textContent = `${rule.name} (${getTypeLabel(rule.type)})`;
      select.appendChild(option);
    });
  }
}

// 获取脱敏类型标签
function getTypeLabel(type) {
  const labels = {
    phone: "手机号",
    email: "邮箱",
    idcard: "身份证",
    bankcard: "银行卡号",
    name: "姓名",
    address: "地址",
    ip: "IP地址",
    company: "企业信息",
    license: "车牌号",
    passport: "护照",
    custom: "自定义",
  };
  return labels[type] || type;
}

// 获取重复数据处理策略标签
function getDuplicateStrategyLabel(strategy) {
  const labels = {
    ignore: "跳过重复记录",
    replace: "替换重复记录",
    update: "更新重复记录",
    error: "报错停止",
  };
  return labels[strategy] || strategy;
}

// 刷新数据库列表
async function refreshDatabases() {
  try {
    await Promise.all([
      loadDataSources(),
      loadFilterTemplates(),
      loadMaskingRules(),
    ]);

    updateDatabaseSelects();
    updateFilterTemplateSelect();
    updateMaskingRuleSelect();

    showAlert("数据已刷新，只显示已启用的资源", "success");
  } catch (error) {
    showAlert("刷新数据失败: " + error.message, "danger");
  }
}

// 显示新建任务页面
function showMigrationTaskModal() {
  // 清空表单，准备新建任务
  newTask();

  // 切换到新建任务标签页
  const newTaskTab = document.getElementById("new-task-tab");
  if (newTaskTab) {
    const tab = new bootstrap.Tab(newTaskTab);
    tab.show();
  }
}

function addFilterTemplate() {
  const templateSelect = document.getElementById("filterTemplate");
  if (!templateSelect.value) {
    showAlert("请先选择一个过滤模板", "warning");
    return;
  }
  showAlert("添加过滤模板功能开发中...", "info");
}

function addMaskingRule() {
  const ruleSelect = document.getElementById("maskingRule");
  if (!ruleSelect.value) {
    showAlert("请先选择一个脱敏规则", "warning");
    return;
  }
  showAlert("添加脱敏规则功能开发中...", "info");
}

function startMigration() {
  // 验证迁移任务配置
  const validationResult = validateMigrationConfig();
  if (!validationResult.valid) {
    showAlert(validationResult.message, "warning");
    return;
  }

  // 显示迁移确认对话框
  showMigrationConfirmModal();
}

// 验证迁移配置
function validateMigrationConfig() {
  // 检查任务名称
  const taskName = document.getElementById("taskName");
  if (!taskName || !taskName.value.trim()) {
    return { valid: false, message: "请输入任务名称" };
  }

  // 检查源数据库
  const sourceDatabase = document.getElementById("sourceDatabase");
  if (!sourceDatabase || !sourceDatabase.value) {
    return { valid: false, message: "请选择源数据库" };
  }

  // 检查目标数据库
  const targetDatabase = document.getElementById("targetDatabase");
  if (!targetDatabase || !targetDatabase.value) {
    return { valid: false, message: "请选择目标数据库" };
  }

  // 检查是否选择了表
  if (selectedTables.length === 0) {
    return { valid: false, message: "请至少选择一张表进行迁移" };
  }

  // 检查源数据库和目标数据库不能相同
  if (sourceDatabase.value === targetDatabase.value) {
    return { valid: false, message: "源数据库和目标数据库不能相同" };
  }

  return { valid: true };
}

// 显示迁移确认对话框
function showMigrationConfirmModal() {
  const taskName = document.getElementById("taskName").value.trim();
  const sourceDb = dataSources.find(
    (ds) => ds.id === document.getElementById("sourceDatabase").value
  );
  const targetDb = dataSources.find(
    (ds) => ds.id === document.getElementById("targetDatabase").value
  );
  const duplicateStrategy = document.getElementById("duplicateStrategy").value;

  // 统计配置信息
  const configuredTables = selectedTables.filter(
    (table) =>
      table.templateRefs.length > 0 ||
      table.conditions.length > 0 ||
      Object.keys(table.maskingRules).length > 0
  );

  const totalFilters = selectedTables.reduce(
    (sum, table) => sum + table.templateRefs.length + table.conditions.length,
    0
  );

  const totalMaskingRules = selectedTables.reduce(
    (sum, table) => sum + Object.keys(table.maskingRules).length,
    0
  );

  const modalContent = `
    <div class="migration-confirm">
      <div class="alert alert-info">
        <i class="bi bi-info-circle"></i>
        <strong>请确认迁移任务配置</strong>
      </div>
      
      <div class="row mb-3">
        <div class="col-md-6">
          <h6 class="text-primary">基本信息</h6>
          <ul class="list-unstyled">
            <li><strong>任务名称:</strong> ${taskName}</li>
            <li><strong>源数据库:</strong> ${sourceDb.name} (${
    sourceDb.type
  })</li>
            <li><strong>目标数据库:</strong> ${targetDb.name} (${
    targetDb.type
  })</li>
            <li><strong>重复数据处理:</strong> ${getDuplicateStrategyLabel(
              duplicateStrategy
            )}</li>
          </ul>
        </div>
        <div class="col-md-6">
          <h6 class="text-primary">迁移统计</h6>
          <ul class="list-unstyled">
            <li><strong>迁移表数:</strong> ${selectedTables.length} 张</li>
            <li><strong>已配置表:</strong> ${configuredTables.length} 张</li>
            <li><strong>过滤条件:</strong> ${totalFilters} 个</li>
            <li><strong>脱敏规则:</strong> ${totalMaskingRules} 个</li>
          </ul>
        </div>
      </div>

      <div class="mb-3">
        <h6 class="text-primary">表配置详情</h6>
        <div class="table-responsive">
          <table class="table table-sm mb-0" style="line-height: 1.1;">
            <thead>
              <tr>
                <th style="padding: 4px 8px; text-align: center; vertical-align: middle;">表名</th>
                <th style="padding: 4px 8px; text-align: center; vertical-align: middle;">过滤模板</th>
                <th style="padding: 4px 8px; text-align: center; vertical-align: middle;">自定义条件</th>
                <th style="padding: 4px 8px; text-align: center; vertical-align: middle;">脱敏规则</th>
                <th style="padding: 4px 8px; text-align: center; vertical-align: middle;">数据同步</th>
                <th style="padding: 4px 8px; text-align: center; vertical-align: middle;">状态</th>
              </tr>
            </thead>
            <tbody>
              ${selectedTables
                .map((table) => {
                  const hasConfig =
                    table.templateRefs.length > 0 ||
                    table.conditions.length > 0 ||
                    Object.keys(table.maskingRules).length > 0;
                  const syncData = table.syncData !== false;
                  return `
                  <tr>
                    <td style="padding: 4px 8px; text-align: center; vertical-align: middle;"><strong>${
                      table.name
                    }</strong></td>
                    <td style="padding: 4px 8px; text-align: center; vertical-align: middle;"><span class="badge bg-info">${
                      table.templateRefs.length
                    }</span></td>
                    <td style="padding: 4px 8px; text-align: center; vertical-align: middle;"><span class="badge bg-secondary">${
                      table.conditions.length
                    }</span></td>
                    <td style="padding: 4px 8px; text-align: center; vertical-align: middle;"><span class="badge bg-warning">${
                      Object.keys(table.maskingRules).length
                    }</span></td>
                    <td style="padding: 4px 8px; text-align: center; vertical-align: middle;">
                      ${
                        syncData
                          ? '<span class="badge bg-success">同步</span>'
                          : '<span class="badge bg-secondary">仅结构</span>'
                      }
                    </td>
                    <td style="padding: 4px 8px; text-align: center; vertical-align: middle;">
                      ${
                        hasConfig
                          ? '<i class="bi bi-check-circle-fill text-success" title="已配置"></i>'
                          : '<i class="bi bi-exclamation-triangle text-warning" title="未配置"></i>'
                      }
                    </td>
                  </tr>
                `;
                })
                .join("")}
            </tbody>
          </table>
        </div>
      </div>

      ${
        configuredTables.length < selectedTables.length
          ? `
      <div class="alert alert-warning">
        <i class="bi bi-exclamation-triangle"></i>
        <strong>注意:</strong> 有 ${
          selectedTables.length - configuredTables.length
        } 张表未配置过滤条件或脱敏规则，将按原样迁移数据。
      </div>
      `
          : ""
      }

      <div class="d-flex justify-content-end gap-2 mt-4">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
          <i class="bi bi-x"></i> 取消
        </button>
        <button type="button" class="btn btn-success" onclick="executeMigration()" data-bs-dismiss="modal">
          <i class="bi bi-play-fill"></i> 开始迁移
        </button>
      </div>
    </div>
  `;

  showCustomModal("确认迁移任务", modalContent);
}

// 执行迁移任务
async function executeMigration() {
  const taskName = document.getElementById("taskName").value.trim();
  const sourceDbId = document.getElementById("sourceDatabase").value;
  const targetDbId = document.getElementById("targetDatabase").value;

  // 获取重复数据处理策略
  const duplicateStrategy = document.getElementById("duplicateStrategy");
  const tableStrategy = document.getElementById("tableStrategy");
  const strategy = duplicateStrategy ? duplicateStrategy.value : "ignore";
  const tableHandling = tableStrategy ? tableStrategy.value : "use_existing";

  // 构建迁移任务配置
  const taskConfig = {
    name: taskName,
    source_database: sourceDbId,
    target_database: targetDbId,
    duplicate_strategy: strategy,
    table_strategy: tableHandling,
    tables: selectedTables.map((table) => ({
      name: table.name,
      filterTemplates: table.templateRefs,
      customConditions: table.conditions,
      maskingRules: table.maskingRules,
      syncData: table.syncData !== false, // 是否同步数据，默认为true
    })),
    status: "draft", // 先保存为草稿
  };

  try {
    let taskId;

    if (currentEditingTask) {
      // 编辑现有任务：更新任务配置
      showAlert("正在更新并启动迁移任务...", "info");

      const result = await apiCall(
        `/api/migration-tasks/${currentEditingTask}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(taskConfig),
        }
      );
      taskId = currentEditingTask;
      showAlert(`任务 "${taskName}" 已更新`, "success");
    } else {
      // 新建任务：创建新的任务配置
      showAlert("正在创建并启动迁移任务...", "info");

      const result = await apiCall("/api/migration-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskConfig),
      });
      taskId = result.id;
      showAlert(`任务 "${taskName}" 已创建`, "success");
    }

    // 立即启动任务
    const startResult = await apiCall(`/api/migration-tasks/${taskId}/start`, {
      method: "POST",
    });

    if (startResult) {
      showAlert(`迁移任务 "${taskName}" 已成功启动！`, "success", 3000);

      // 显示迁移进度监控
      showMigrationProgress(taskId);

      // 清空表单和编辑状态
      resetMigrationForm();
      currentEditingTask = null;

      // 更新标签页标题
      const taskTabTitle = document.getElementById("taskTabTitle");
      if (taskTabTitle) {
        taskTabTitle.innerHTML = `<i class="bi bi-plus-circle"></i> 新建任务`;
      }

      // 更新任务列表
      await loadMigrationTasks();
    } else {
      throw new Error("启动迁移任务失败");
    }
  } catch (error) {
    console.error("执行迁移任务失败:", error);
    showAlert("执行迁移任务失败: " + error.message, "danger");
  }
}

// 显示迁移进度
function showMigrationProgress(taskId) {
  const modalContent = `
    <div class="migration-progress">
      <div class="text-center mb-4">
        <h5>迁移任务进行中</h5>
        <p class="text-muted">任务ID: ${taskId}</p>
      </div>
      
      <div class="progress mb-3" style="height: 20px;">
        <div class="progress-bar progress-bar-striped progress-bar-animated" 
             role="progressbar" 
             style="width: 0%" 
             id="migrationProgressBar">
          0%
        </div>
      </div>
      
      <div class="migration-status">
        <div class="d-flex justify-content-between mb-2">
          <span>当前状态:</span>
          <span id="migrationStatus" class="badge bg-info">初始化中...</span>
        </div>
        <div class="d-flex justify-content-between mb-2">
          <span>当前表:</span>
          <span id="currentTable">-</span>
        </div>
        <div class="d-flex justify-content-between mb-2">
          <span>已处理记录:</span>
          <span id="processedRecords">0</span>
        </div>
        <div class="d-flex justify-content-between mb-2">
          <span>开始时间:</span>
          <span id="startTime">${new Date().toLocaleString()}</span>
        </div>
      </div>
      
      <div class="mt-4">
        <h6>执行日志</h6>
        <div id="migrationLogs" class="border rounded p-2" style="height: 200px; overflow-y: auto; background: var(--card-bg); font-family: monospace; font-size: 12px;">
          <div class="text-info">[${new Date().toLocaleTimeString()}] 迁移任务已启动...</div>
        </div>
      </div>
      
      <div class="d-flex justify-content-end gap-2 mt-3">
        <button type="button" class="btn btn-outline-warning" onclick="pauseMigration('${taskId}')">
          <i class="bi bi-pause"></i> 暂停
        </button>
        <button type="button" class="btn btn-outline-danger" onclick="stopMigration('${taskId}')">
          <i class="bi bi-stop"></i> 停止
        </button>
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
          <i class="bi bi-eye-slash"></i> 后台运行
        </button>
      </div>
    </div>
  `;

  showCustomModal("迁移进度", modalContent, () => {
    // 开始轮询迁移状态
    startMigrationPolling(taskId);
  });
}

// 开始轮询迁移状态
function startMigrationPolling(taskId) {
  const pollInterval = setInterval(async () => {
    try {
      const status = await apiCall(`/api/migration/status/${taskId}`);
      updateMigrationProgress(status);

      // 如果任务完成或失败，停止轮询
      if (
        status.status === "completed" ||
        status.status === "failed" ||
        status.status === "stopped"
      ) {
        clearInterval(pollInterval);
      }
    } catch (error) {
      console.error("获取迁移状态失败:", error);
      clearInterval(pollInterval);
    }
  }, 2000); // 每2秒轮询一次

  // 保存轮询ID，用于清理
  window.migrationPollInterval = pollInterval;
}

// 更新迁移进度显示
function updateMigrationProgress(status) {
  const progressBar = document.getElementById("migrationProgressBar");
  const statusElement = document.getElementById("migrationStatus");
  const currentTableElement = document.getElementById("currentTable");
  const processedRecordsElement = document.getElementById("processedRecords");
  const logsElement = document.getElementById("migrationLogs");

  if (progressBar) {
    const progress = Math.round(status.progress || 0);
    progressBar.style.width = `${progress}%`;
    progressBar.textContent = `${progress}%`;

    // 根据状态改变进度条颜色
    progressBar.className = "progress-bar progress-bar-striped";
    if (status.status === "completed") {
      progressBar.classList.add("bg-success");
    } else if (status.status === "failed") {
      progressBar.classList.add("bg-danger");
    } else if (status.status === "paused") {
      progressBar.classList.add("bg-warning");
    } else {
      progressBar.classList.add("progress-bar-animated");
    }
  }

  if (statusElement) {
    statusElement.textContent = getStatusLabel(status.status);
    statusElement.className = `badge ${getStatusBadgeClass(status.status)}`;
  }

  if (currentTableElement && status.currentTable) {
    currentTableElement.textContent = status.currentTable;
  }

  if (processedRecordsElement && status.processedRecords !== undefined) {
    processedRecordsElement.textContent =
      status.processedRecords.toLocaleString();
  }

  // 更新按钮状态
  updateMigrationButtons(status);

  // 更新模态框标题
  updateMigrationModalTitle(status);

  // 添加新的日志条目
  if (logsElement && status.logs && status.logs.length > 0) {
    status.logs.forEach((log) => {
      const logEntry = document.createElement("div");
      logEntry.className = `text-${getLogLevel(log.level)}`;
      logEntry.textContent = `[${new Date(
        log.timestamp
      ).toLocaleTimeString()}] ${log.message}`;
      logsElement.appendChild(logEntry);
    });

    // 滚动到底部
    logsElement.scrollTop = logsElement.scrollHeight;
  }
}

// 获取状态标签
function getStatusLabel(status) {
  const labels = {
    initializing: "初始化中",
    running: "运行中",
    paused: "已暂停",
    completed: "已完成",
    failed: "失败",
    stopped: "已停止",
  };
  return labels[status] || status;
}

// 获取状态徽章样式
function getStatusBadgeClass(status) {
  const classes = {
    initializing: "bg-info",
    running: "bg-primary",
    paused: "bg-warning",
    completed: "bg-success",
    failed: "bg-danger",
    stopped: "bg-secondary",
  };
  return classes[status] || "bg-info";
}

// 获取日志级别样式
function getLogLevel(level) {
  const levels = {
    info: "info",
    warning: "warning",
    error: "danger",
    success: "success",
  };
  return levels[level] || "muted";
}

// 暂停迁移
async function pauseMigration(taskId) {
  try {
    const result = await apiCall(`/api/migration/pause/${taskId}`, {
      method: "POST",
    });

    if (result && result.success) {
      showAlert("迁移任务已暂停", "warning");
    } else {
      throw new Error(result?.message || "暂停任务失败");
    }
  } catch (error) {
    console.error("暂停迁移任务失败:", error);
    showAlert("暂停迁移任务失败: " + error.message, "danger");
  }
}

// 停止迁移
async function stopMigration(taskId) {
  if (!confirm("确定要停止迁移任务吗？此操作不可撤销。")) {
    return;
  }

  try {
    const result = await apiCall(`/api/migration/stop/${taskId}`, {
      method: "POST",
    });

    if (result && result.success) {
      showAlert("迁移任务已停止", "warning");

      // 清理轮询
      if (window.migrationPollInterval) {
        clearInterval(window.migrationPollInterval);
      }
    } else {
      throw new Error(result?.message || "停止任务失败");
    }
  } catch (error) {
    console.error("停止迁移任务失败:", error);
    showAlert("停止迁移任务失败: " + error.message, "danger");
  }
}

// 重置迁移表单
function resetMigrationForm() {
  // 清空任务名称
  const taskName = document.getElementById("taskName");
  if (taskName) taskName.value = "";

  // 重置数据库选择
  const sourceDatabase = document.getElementById("sourceDatabase");
  const targetDatabase = document.getElementById("targetDatabase");
  if (sourceDatabase) sourceDatabase.value = "";
  if (targetDatabase) targetDatabase.value = "";

  // 重置重复数据处理策略
  const duplicateStrategy = document.getElementById("duplicateStrategy");
  if (duplicateStrategy) duplicateStrategy.value = "ignore";

  // 重置表处理策略
  const tableStrategy = document.getElementById("tableStrategy");
  if (tableStrategy) tableStrategy.value = "use_existing";

  // 清空表选择
  selectedTables = [];
  availableTables = [];
  currentSourceDatabase = null;
  currentEditingTask = null;

  // 重新渲染界面
  renderTableList();
  renderSelectedTables();

  // 立即更新配置预览
  updateConfigPreview();

  showAlert("表单已重置，可以配置新的迁移任务", "info");
}

// 新建任务（清空表单）
function newTask() {
  resetMigrationForm();

  // 更新标签页标题
  const taskTabTitle = document.getElementById("taskTabTitle");
  if (taskTabTitle) {
    taskTabTitle.innerHTML = "新建任务";
  }

  // 切换到新建任务标签页
  const newTaskTab = document.getElementById("new-task-tab");
  if (newTaskTab) {
    const tab = new bootstrap.Tab(newTaskTab);
    tab.show();
  }

  // 确保配置预览立即更新
  setTimeout(() => {
    updateConfigPreview();
  }, 100);
}
// ==================== 任务管理功能 ====================

// 加载迁移任务列表
async function loadMigrationTasks() {
  try {
    const result = await apiCall("/api/migration-tasks");
    migrationTasks = result || [];
    filteredTasks = [...migrationTasks];
    renderMigrationTasks();
    updateTaskStats();
    updateTaskCountBadge();
  } catch (error) {
    console.error("加载任务列表失败:", error);
    migrationTasks = [];
    filteredTasks = [];
    renderMigrationTasks();
  }
}

// 渲染迁移任务卡片
function renderMigrationTasks() {
  const container = document.getElementById("migrationTasksContainer");
  const emptyState = document.getElementById("emptyState");

  if (!container) return;

  container.innerHTML = "";

  if (filteredTasks.length === 0) {
    if (emptyState) emptyState.style.display = "block";
    hideBatchActions();
    return;
  }

  if (emptyState) emptyState.style.display = "none";

  filteredTasks.forEach((task) => {
    const taskCard = createTaskCard(task);
    container.appendChild(taskCard);
  });

  // 更新批量操作按钮状态
  updateBatchSelection();
}

// 创建任务卡片
function createTaskCard(task) {
  const col = document.createElement("div");
  col.className = "col-md-6 col-lg-4 mb-4";

  const statusInfo = getStatusInfo(task.status);
  const progressPercent = task.progress || 0;
  const duration = calculateDuration(task.start_at, task.end_at);

  col.innerHTML = `
    <div class="card h-100 task-card" style="border: 1px solid var(--border-color); background: var(--card-bg);" data-task-id="${
      task.id
    }">
      <div class="card-header d-flex justify-content-between align-items-center" style="border-bottom: 1px solid var(--border-color);">
        <div class="d-flex align-items-center">
          <input type="checkbox" class="form-check-input me-2 task-checkbox" data-task-id="${
            task.id
          }" onchange="updateBatchSelection()">
          <h6 class="mb-0">
            <i class="bi bi-diagram-3 me-2"></i>
            ${task.name}
          </h6>
        </div>
        <span class="badge ${statusInfo.class}">${statusInfo.text}</span>
      </div>
      <div class="card-body">
        <!-- 进度条 -->
        <div class="mb-3">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <small class="text-muted">进度</small>
            <small class="text-muted">${progressPercent}%</small>
          </div>
          <div class="progress" style="height: 8px;">
            <div class="progress-bar ${getProgressBarClass(task.status)}" 
                 role="progressbar" 
                 style="width: ${progressPercent}%">
            </div>
          </div>
        </div>
        
        <!-- 任务信息 -->
        <div class="task-info">
          <div class="row g-2 mb-2">
            <div class="col-6">
              <small class="text-muted">源数据库:</small>
              <div class="text-truncate" title="${
                task.source_database || "未知"
              }">${getDataSourceName(task.source_database) || "未知"}</div>
            </div>
            <div class="col-6">
              <small class="text-muted">目标数据库:</small>
              <div class="text-truncate" title="${
                task.target_database || "未知"
              }">${getDataSourceName(task.target_database) || "未知"}</div>
            </div>
          </div>
          
          <div class="row g-2 mb-2">
            <div class="col-6">
              <small class="text-muted">处理记录:</small>
              <div>${(task.processed_records || 0).toLocaleString()} / ${(
    task.total_records || 0
  ).toLocaleString()}</div>
            </div>
            <div class="col-6">
              <small class="text-muted">当前表:</small>
              <div class="text-truncate" title="${task.current_table || "-"}">${
    task.current_table || "-"
  }</div>
            </div>
          </div>
          
          <div class="row g-2 mb-3">
            <div class="col-6">
              <small class="text-muted">修改时间:</small>
              <div>${formatDateTime(task.update_at)}</div>
            </div>
            <div class="col-6">
              <small class="text-muted">耗时:</small>
              <div>${duration}</div>
            </div>
          </div>
          
          ${
            task.error_message
              ? `
          <div class="alert alert-danger alert-sm p-2 mb-3">
            <small><i class="bi bi-exclamation-triangle me-1"></i>${task.error_message}</small>
          </div>
          `
              : ""
          }
        </div>
      </div>
      <div class="card-footer d-flex justify-content-between align-items-center" style="border-top: 1px solid var(--border-color); background: transparent;">
        <small class="text-muted">
          <i class="bi bi-clock me-1"></i>
          ${formatRelativeTime(task.create_at)}
        </small>
        <div class="btn-group btn-group-sm">
          ${getTaskActions(task)}
        </div>
      </div>
    </div>
  `;

  return col;
}

// 获取状态信息
function getStatusInfo(status) {
  const statusMap = {
    draft: { text: "草稿", class: "bg-secondary" },
    initializing: { text: "初始化中", class: "bg-info" },
    running: { text: "运行中", class: "bg-primary" },
    paused: { text: "已暂停", class: "bg-warning" },
    completed: { text: "已完成", class: "bg-success" },
    failed: { text: "失败", class: "bg-danger" },
    stopped: { text: "已停止", class: "bg-secondary" },
  };
  return statusMap[status] || { text: status, class: "bg-secondary" };
}

// 获取进度条样式
function getProgressBarClass(status) {
  const classMap = {
    draft: "bg-secondary",
    initializing: "bg-info",
    running: "bg-primary progress-bar-striped progress-bar-animated",
    paused: "bg-warning",
    completed: "bg-success",
    failed: "bg-danger",
    stopped: "bg-secondary",
  };
  return classMap[status] || "bg-primary";
}

// 获取任务操作按钮
function getTaskActions(task) {
  let actions = [];

  // 草稿状态的操作
  if (task.status === "draft") {
    actions.push(`<button class="btn btn-outline-primary btn-sm" onclick="editTask('${task.id}')" title="编辑任务">
      <i class="bi bi-pencil"></i>
    </button>`);
    actions.push(`<button class="btn btn-outline-success btn-sm" onclick="runTaskFromDraft('${task.id}')" title="运行任务">
      <i class="bi bi-play"></i>
    </button>`);
  }

  // 运行中状态的操作
  else if (task.status === "running") {
    actions.push(`<button class="btn btn-outline-warning btn-sm" onclick="pauseTask('${task.id}')" title="暂停任务">
      <i class="bi bi-pause"></i>
    </button>`);
    actions.push(`<button class="btn btn-outline-danger btn-sm" onclick="stopTask('${task.id}')" title="停止任务">
      <i class="bi bi-stop"></i>
    </button>`);
  }

  // 暂停状态的操作
  else if (task.status === "paused") {
    actions.push(`<button class="btn btn-outline-primary btn-sm" onclick="resumeTask('${task.id}')" title="恢复任务">
      <i class="bi bi-play"></i>
    </button>`);
    actions.push(`<button class="btn btn-outline-danger btn-sm" onclick="stopTask('${task.id}')" title="停止任务">
      <i class="bi bi-stop"></i>
    </button>`);
  }

  // 已完成状态的操作
  else if (task.status === "completed") {
    actions.push(`<button class="btn btn-outline-success btn-sm" onclick="rerunTask('${task.id}')" title="重新运行">
      <i class="bi bi-arrow-clockwise"></i>
    </button>`);
    actions.push(`<button class="btn btn-outline-primary btn-sm" onclick="editTask('${task.id}')" title="编辑任务">
      <i class="bi bi-pencil"></i>
    </button>`);
    actions.push(`<button class="btn btn-outline-info btn-sm" onclick="duplicateTask('${task.id}')" title="复制任务">
      <i class="bi bi-files"></i>
    </button>`);
  }

  // 失败或停止状态的操作
  else if (task.status === "failed" || task.status === "stopped") {
    actions.push(`<button class="btn btn-outline-primary btn-sm" onclick="retryTask('${task.id}')" title="重试任务">
      <i class="bi bi-arrow-clockwise"></i>
    </button>`);
    actions.push(`<button class="btn btn-outline-primary btn-sm" onclick="editTask('${task.id}')" title="编辑任务">
      <i class="bi bi-pencil"></i>
    </button>`);
  }

  // 通用操作
  actions.push(`<button class="btn btn-outline-info btn-sm" onclick="viewTaskDetails('${task.id}')" title="查看详情">
    <i class="bi bi-eye"></i>
  </button>`);

  // 删除操作（非运行状态可删除）
  if (task.status !== "running" && task.status !== "initializing") {
    actions.push(`<button class="btn btn-outline-danger btn-sm" onclick="deleteTask('${task.id}')" title="删除任务">
      <i class="bi bi-trash"></i>
    </button>`);
  }

  return actions.join("");
}

// 更新任务统计
function updateTaskStats() {
  const stats = {
    total: migrationTasks.length,
    draft: migrationTasks.filter((t) => t.status === "draft").length,
    running: migrationTasks.filter((t) => t.status === "running").length,
    completed: migrationTasks.filter((t) => t.status === "completed").length,
    failed: migrationTasks.filter((t) => t.status === "failed").length,
    paused: migrationTasks.filter((t) => t.status === "paused").length,
  };

  const totalElement = document.getElementById("totalTasks");
  const draftElement = document.getElementById("draftTasks");
  const runningElement = document.getElementById("runningTasks");
  const completedElement = document.getElementById("completedTasks");
  const failedElement = document.getElementById("failedTasks");
  const pausedElement = document.getElementById("pausedTasks");

  if (totalElement) totalElement.textContent = stats.total;
  if (draftElement) draftElement.textContent = stats.draft;
  if (runningElement) runningElement.textContent = stats.running;
  if (completedElement) completedElement.textContent = stats.completed;
  if (failedElement) failedElement.textContent = stats.failed;
  if (pausedElement) pausedElement.textContent = stats.paused;
}

// 更新任务数量徽章
function updateTaskCountBadge() {
  const badge = document.getElementById("taskCountBadge");
  if (badge) {
    badge.textContent = migrationTasks.length;
  }
}

// 过滤任务
function filterTasks() {
  const searchTerm = document.getElementById("taskSearch").value.toLowerCase();
  const statusFilter = document.getElementById("taskStatusFilter").value;
  const dateFilter = document.getElementById("taskDateFilter").value;

  filteredTasks = migrationTasks.filter((task) => {
    // 搜索过滤
    const matchesSearch =
      !searchTerm || task.name.toLowerCase().includes(searchTerm);

    // 状态过滤
    const matchesStatus = !statusFilter || task.status === statusFilter;

    // 日期过滤
    const matchesDate =
      !dateFilter || matchesDateFilter(task.create_at, dateFilter);

    return matchesSearch && matchesStatus && matchesDate;
  });

  renderMigrationTasks();
}

// 日期过滤匹配
function matchesDateFilter(dateStr, filter) {
  if (!dateStr) return false;

  const taskDate = new Date(dateStr);
  const now = new Date();

  switch (filter) {
    case "today":
      return taskDate.toDateString() === now.toDateString();
    case "week":
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return taskDate >= weekAgo;
    case "month":
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return taskDate >= monthAgo;
    default:
      return true;
  }
}

// 设置标签页事件
function setupTabEvents() {
  const taskListTab = document.getElementById("task-list-tab");
  if (taskListTab) {
    taskListTab.addEventListener("shown.bs.tab", function () {
      // 切换到任务列表时刷新数据
      loadMigrationTasks();
    });
  }
}

// 保存任务为草稿
async function saveTaskAsDraft() {
  const validationResult = validateMigrationConfig();
  if (!validationResult.valid) {
    showAlert(validationResult.message, "warning");
    return;
  }

  const taskName = document.getElementById("taskName").value.trim();
  const sourceDbId = document.getElementById("sourceDatabase").value;
  const targetDbId = document.getElementById("targetDatabase").value;
  const duplicateStrategy = document.getElementById("duplicateStrategy").value;
  const tableStrategy = document.getElementById("tableStrategy").value;

  const taskConfig = {
    name: taskName,
    source_database: sourceDbId,
    target_database: targetDbId,
    duplicate_strategy: duplicateStrategy,
    table_strategy: tableStrategy,
    tables: selectedTables.map((table) => ({
      name: table.name,
      filterTemplates: table.templateRefs,
      customConditions: table.conditions,
      maskingRules: table.maskingRules,
      syncData: table.syncData !== false, // 是否同步数据，默认为true
    })),
    status: "draft",
  };

  try {
    let result;
    if (currentEditingTask) {
      // 编辑现有任务：更新任务配置
      result = await apiCall(`/api/migration-tasks/${currentEditingTask}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskConfig),
      });
    } else {
      // 新建任务：创建新的任务配置
      result = await apiCall("/api/migration-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskConfig),
      });
    }

    if (result) {
      // 保存成功后，自动保存当前配置状态
      autoSaveTaskConfig();

      const action = currentEditingTask ? "更新" : "保存";
      showAlert(`任务已${action}为草稿`, "success");
      await loadMigrationTasks();

      // 清空编辑状态
      currentEditingTask = null;

      // 更新标签页标题
      const taskTabTitle = document.getElementById("taskTabTitle");
      if (taskTabTitle) {
        taskTabTitle.innerHTML = `<i class="bi bi-plus-circle"></i> 新建任务`;
      }

      // 切换到任务列表标签页
      const taskListTab = document.getElementById("task-list-tab");
      if (taskListTab) {
        const tab = new bootstrap.Tab(taskListTab);
        tab.show();
      }
    }
  } catch (error) {
    console.error("保存任务失败:", error);
    showAlert("保存任务失败: " + error.message, "danger");
  }
}

// 编辑任务
async function editTask(taskId) {
  const task = migrationTasks.find((t) => t.id === taskId);
  if (!task) return;

  currentEditingTask = taskId;

  // 填充表单数据
  document.getElementById("taskName").value = task.name;
  document.getElementById("sourceDatabase").value = task.source_database;
  document.getElementById("targetDatabase").value = task.target_database;

  if (task.duplicate_strategy) {
    document.getElementById("duplicateStrategy").value =
      task.duplicate_strategy;
  }

  if (task.table_strategy) {
    document.getElementById("tableStrategy").value = task.table_strategy;
  }

  // 先清空当前选择
  selectedTables = [];
  availableTables = [];

  // 加载表数据
  if (task.source_database) {
    currentSourceDatabase = dataSources.find(
      (ds) => ds.id === task.source_database
    );
    if (currentSourceDatabase) {
      await loadTables(task.source_database);

      // 等待表列表加载完成后，恢复选中的表和配置
      if (task.tables && Array.isArray(task.tables)) {
        selectedTables = task.tables.map((table) => ({
          name: table.name,
          templateRefs: table.filterTemplates || table.filter_templates || [],
          conditions: table.customConditions || table.custom_conditions || [],
          maskingRules: table.maskingRules || table.masking_rules || {},
          syncData: table.syncData !== false, // 恢复同步数据状态，默认为true
        }));

        // 重新渲染表列表和已选择的表，确保左侧复选框状态正确
        renderTableList();
        renderSelectedTables();
      }
    }
  }

  // 更新标签页标题
  const taskTabTitle = document.getElementById("taskTabTitle");
  if (taskTabTitle) {
    taskTabTitle.innerHTML = `<i class="bi bi-pencil"></i> 编辑任务`;
  }

  // 切换到新建任务标签页
  const newTaskTab = document.getElementById("new-task-tab");
  if (newTaskTab) {
    const tab = new bootstrap.Tab(newTaskTab);
    tab.show();
  }

  // 编辑任务时，保存当前配置状态作为重载点
  setTimeout(() => {
    autoSaveTaskConfig();
    // 确保配置预览更新
    updateConfigPreview();
  }, 500); // 延迟保存，确保所有数据都已加载完成

  showAlert("任务已加载到编辑器，可以修改后保存", "info");
}

// 从草稿运行任务
async function runTaskFromDraft(taskId) {
  const task = migrationTasks.find((t) => t.id === taskId);
  if (!task) return;

  try {
    const result = await apiCall(`/api/migration-tasks/${taskId}/start`, {
      method: "POST",
    });

    if (result) {
      showAlert(`任务 "${task.name}" 已启动`, "success");
      await loadMigrationTasks();
    }
  } catch (error) {
    console.error("启动任务失败:", error);
    showAlert("启动任务失败: " + error.message, "danger");
  }
}

// 任务操作函数
async function pauseTask(taskId) {
  try {
    await apiCall(`/api/migration/pause/${taskId}`, { method: "POST" });
    showAlert("任务已暂停", "success");
    await loadMigrationTasks();
  } catch (error) {
    showAlert("暂停任务失败: " + error.message, "danger");
  }
}

async function stopTask(taskId) {
  if (!confirm("确定要停止这个任务吗？此操作不可撤销。")) {
    return;
  }

  try {
    await apiCall(`/api/migration/stop/${taskId}`, { method: "POST" });
    showAlert("任务已停止", "success");
    await loadMigrationTasks();
  } catch (error) {
    showAlert("停止任务失败: " + error.message, "danger");
  }
}

async function resumeTask(taskId) {
  try {
    await apiCall(`/api/migration-tasks/${taskId}/start`, { method: "POST" });
    showAlert("任务已恢复", "success");
    await loadMigrationTasks();
  } catch (error) {
    showAlert("恢复任务失败: " + error.message, "danger");
  }
}

async function retryTask(taskId) {
  if (!confirm("确定要重试这个任务吗？")) {
    return;
  }

  try {
    await apiCall(`/api/migration-tasks/${taskId}/start`, { method: "POST" });
    showAlert("任务已重新启动", "success");
    await loadMigrationTasks();
  } catch (error) {
    showAlert("重试任务失败: " + error.message, "danger");
  }
}

// 重新运行已完成的任务
async function rerunTask(taskId) {
  if (!confirm("确定要重新运行这个任务吗？这将重新执行整个迁移过程。")) {
    return;
  }

  try {
    // 重置任务状态并重新启动
    const task = migrationTasks.find((t) => t.id === taskId);
    if (task) {
      // 重置任务状态
      const resetTask = {
        ...task,
        status: "draft",
        progress: 0,
        current_table: "",
        processed_records: 0,
        total_records: 0,
        error_message: "",
        start_at: null,
        end_at: null,
      };

      await apiCall(`/api/migration-tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resetTask),
      });

      // 启动任务
      await apiCall(`/api/migration-tasks/${taskId}/start`, { method: "POST" });
      showAlert("任务已重新启动", "success");
      await loadMigrationTasks();
    }
  } catch (error) {
    showAlert("重新运行任务失败: " + error.message, "danger");
  }
}

// 复制任务
async function duplicateTask(taskId) {
  const task = migrationTasks.find((t) => t.id === taskId);
  if (!task) return;

  const newTaskName = prompt("请输入新任务的名称:", task.name + " - 副本");
  if (!newTaskName || newTaskName.trim() === "") {
    return;
  }

  try {
    const duplicatedTask = {
      name: newTaskName.trim(),
      source_database: task.source_database,
      target_database: task.target_database,
      duplicate_strategy: task.duplicate_strategy,
      tables: task.tables,
      status: "draft",
    };

    const result = await apiCall("/api/migration-tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(duplicatedTask),
    });

    if (result) {
      showAlert("任务已复制为草稿", "success");
      await loadMigrationTasks();
    }
  } catch (error) {
    showAlert("复制任务失败: " + error.message, "danger");
  }
}

async function deleteTask(taskId) {
  if (!confirm("确定要删除这个任务吗？此操作不可撤销。")) {
    return;
  }

  try {
    await apiCall(`/api/migration-tasks/${taskId}`, { method: "DELETE" });
    showAlert("任务已删除", "success");
    await loadMigrationTasks();
  } catch (error) {
    showAlert("删除任务失败: " + error.message, "danger");
  }
}

// 查看任务详情
function viewTaskDetails(taskId) {
  const task = migrationTasks.find((t) => t.id === taskId);
  if (!task) return;

  const modalContent = `
    <div class="task-details" style="padding: 0;">
      <!-- 任务状态卡片 -->
      <div class="card mb-4" style="border: 1px solid var(--border-color); background: var(--card-bg);">
        <div class="card-header d-flex justify-content-between align-items-center" style="background: var(--primary-color); color: white; border-bottom: none;">
          <h6 class="mb-0"><i class="bi bi-info-circle me-2"></i>任务概览</h6>
          <span class="badge ${getStatusInfo(task.status).class} fs-6">${
    getStatusInfo(task.status).text
  }</span>
        </div>
        <div class="card-body">
          <div class="row g-4">
            <div class="col-md-6">
              <div class="info-group">
                <h6 class="text-primary mb-3"><i class="bi bi-gear me-2"></i>基本信息</h6>
                <div class="info-list">
                  <div class="info-item">
                    <span class="info-label"><i class="bi bi-tag me-1"></i>任务名称</span>
                    <span class="info-value">${task.name}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label"><i class="bi bi-hash me-1"></i>任务ID</span>
                    <span class="info-value text-muted">${task.id}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label"><i class="bi bi-speedometer2 me-1"></i>执行进度</span>
                    <div class="progress-container">
                      <div class="progress" style="height: 8px;">
                        <div class="progress-bar bg-primary" style="width: ${
                          task.progress || 0
                        }%"></div>
                      </div>
                      <span class="progress-text">${task.progress || 0}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="col-md-6">
              <div class="info-group">
                <h6 class="text-success mb-3"><i class="bi bi-activity me-2"></i>执行统计</h6>
                <div class="info-list">
                  <div class="info-item">
                    <span class="info-label"><i class="bi bi-database me-1"></i>处理记录</span>
                    <span class="info-value">
                      <span class="text-success fw-bold">${(
                        task.processed_records || 0
                      ).toLocaleString()}</span>
                      <span class="text-muted">/ ${(
                        task.total_records || 0
                      ).toLocaleString()}</span>
                    </span>
                  </div>
                  <div class="info-item">
                    <span class="info-label"><i class="bi bi-table me-1"></i>当前表</span>
                    <span class="info-value ${
                      task.current_table ? "text-info" : "text-muted"
                    }">${task.current_table || "暂无"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 时间信息卡片 -->
      <div class="card mb-4" style="border: 1px solid var(--border-color); background: var(--card-bg);">
        <div class="card-header" style="background: var(--secondary-color); color: white; border-bottom: none;">
          <h6 class="mb-0"><i class="bi bi-clock me-2"></i>时间信息</h6>
        </div>
        <div class="card-body">
          <div class="row g-3">
            <div class="col-md-4">
              <div class="time-info">
                <div class="time-label"><i class="bi bi-calendar-plus me-1"></i>开始时间</div>
                <div class="time-value">${
                  formatDateTime(task.start_at) || "未开始"
                }</div>
              </div>
            </div>
            <div class="col-md-4">
              <div class="time-info">
                <div class="time-label"><i class="bi bi-calendar-check me-1"></i>修改时间</div>
                <div class="time-value">${
                  formatDateTime(task.update_at) || "无"
                }</div>
              </div>
            </div>
            ${
              task.end_at
                ? `
            <div class="col-md-4">
              <div class="time-info">
                <div class="time-label"><i class="bi bi-calendar-x me-1"></i>结束时间</div>
                <div class="time-value">${formatDateTime(task.end_at)}</div>
              </div>
            </div>
            `
                : ""
            }
          </div>
        </div>
      </div>

      ${
        task.error_message
          ? `
      <!-- 错误信息卡片 -->
      <div class="card mb-4" style="border: 1px solid #dc3545; background: var(--card-bg);">
        <div class="card-header" style="background: #dc3545; color: white; border-bottom: none;">
          <h6 class="mb-0"><i class="bi bi-exclamation-triangle me-2"></i>错误信息</h6>
        </div>
        <div class="card-body">
          <div class="alert alert-danger mb-0" style="background: rgba(220, 53, 69, 0.1); border: 1px solid rgba(220, 53, 69, 0.3);">
            <i class="bi bi-bug me-2"></i>${task.error_message}
          </div>
        </div>
      </div>
      `
          : ""
      }
      
      <!-- 操作按钮 -->
      <div class="d-flex justify-content-between align-items-center pt-3" style="border-top: 1px solid var(--border-color);">
        <div class="d-flex gap-2 flex-wrap">
          ${
            task.status === "draft" ||
            task.status === "completed" ||
            task.status === "failed" ||
            task.status === "stopped"
              ? `
          <button type="button" class="btn btn-outline-primary btn-sm" onclick="editTask('${task.id}')" data-bs-dismiss="modal">
            <i class="bi bi-pencil me-1"></i>编辑任务
          </button>
          `
              : ""
          }
          ${
            task.status === "completed"
              ? `
          <button type="button" class="btn btn-outline-success btn-sm" onclick="rerunTask('${task.id}')" data-bs-dismiss="modal">
            <i class="bi bi-arrow-clockwise me-1"></i>重新运行
          </button>
          <button type="button" class="btn btn-outline-info btn-sm" onclick="duplicateTask('${task.id}')" data-bs-dismiss="modal">
            <i class="bi bi-files me-1"></i>复制任务
          </button>
          <button type="button" class="btn btn-outline-secondary btn-sm" onclick="exportTask('${task.id}')" data-bs-dismiss="modal">
            <i class="bi bi-download me-1"></i>导出配置
          </button>
          `
              : ""
          }
          ${
            task.status === "failed" || task.status === "stopped"
              ? `
          <button type="button" class="btn btn-outline-warning btn-sm" onclick="retryTask('${task.id}')" data-bs-dismiss="modal">
            <i class="bi bi-arrow-clockwise me-1"></i>重试任务
          </button>
          `
              : ""
          }
          ${
            task.status === "running"
              ? `
          <button type="button" class="btn btn-primary btn-sm" onclick="showTaskProgress('${task.id}')" data-bs-dismiss="modal">
            <i class="bi bi-eye me-1"></i>查看进度
          </button>
          `
              : ""
          }
        </div>
        <div class="d-flex gap-2">
          <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">
            <i class="bi bi-x me-1"></i>关闭
          </button>
          ${
            task.status !== "running" && task.status !== "initializing"
              ? `
          <button type="button" class="btn btn-outline-danger btn-sm" onclick="deleteTask('${task.id}')" data-bs-dismiss="modal">
            <i class="bi bi-trash me-1"></i>删除
          </button>
          `
              : ""
          }
        </div>
      </div>
    </div>

    <style>
      .task-details .info-group {
        height: 100%;
      }
      
      .task-details .info-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      
      .task-details .info-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        background: rgba(var(--primary-rgb), 0.05);
        border-radius: 6px;
        border-left: 3px solid var(--primary-color);
      }
      
      .task-details .info-label {
        font-weight: 500;
        color: var(--text-color);
        font-size: 0.9rem;
      }
      
      .task-details .info-value {
        font-weight: 600;
        color: var(--primary-color);
        text-align: right;
      }
      
      .task-details .progress-container {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 120px;
      }
      
      .task-details .progress {
        flex: 1;
        background: rgba(var(--primary-rgb), 0.1);
      }
      
      .task-details .progress-text {
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--primary-color);
        min-width: 35px;
      }
      
      .task-details .time-info {
        text-align: center;
        padding: 12px;
        background: rgba(var(--secondary-rgb), 0.05);
        border-radius: 8px;
        border: 1px solid rgba(var(--secondary-rgb), 0.1);
      }
      
      .task-details .time-label {
        font-size: 0.85rem;
        color: var(--text-muted);
        margin-bottom: 4px;
        font-weight: 500;
      }
      
      .task-details .time-value {
        font-size: 0.9rem;
        font-weight: 600;
        color: var(--text-color);
      }
      
      .task-details .card-header h6 {
        font-weight: 600;
      }
      
      .task-details .btn-sm {
        padding: 0.375rem 0.75rem;
        font-size: 0.875rem;
      }
    </style>
  `;

  showCustomModal(`任务详情 - ${task.name}`, modalContent);
}

// 显示任务进度
function showTaskProgress(taskId) {
  showMigrationProgress(taskId);
}

// 刷新任务列表
async function refreshTasks() {
  try {
    await loadMigrationTasks();
    showAlert("任务列表已刷新", "success");
  } catch (error) {
    showAlert("刷新任务列表失败: " + error.message, "danger");
  }
}

// 工具函数
function getDataSourceName(dsId) {
  const ds = dataSources.find((d) => d.id === dsId);
  return ds ? ds.name : dsId ? dsId.substring(0, 8) + "..." : "未知";
}

function calculateDuration(startTime, endTime) {
  if (!startTime) return "-";

  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : new Date();
  const duration = end - start;

  if (duration < 0) return "-";

  const hours = Math.floor(duration / (1000 * 60 * 60));
  const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((duration % (1000 * 60)) / 1000);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
}

function formatDateTime(dateStr) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleString("zh-CN");
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return "-";

  const now = new Date();
  const date = new Date(dateStr);
  const diff = now - date;

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days > 0) {
    return `${days}天前`;
  } else if (hours > 0) {
    return `${hours}小时前`;
  } else if (minutes > 0) {
    return `${minutes}分钟前`;
  } else {
    return "刚刚";
  }
}

// ==================== 批量操作功能 ====================

let selectedTaskIds = [];

// 更新批量选择状态
function updateBatchSelection() {
  const checkboxes = document.querySelectorAll(".task-checkbox:checked");
  selectedTaskIds = Array.from(checkboxes).map((cb) => cb.dataset.taskId);

  const batchOperations = document.getElementById("batchOperations");
  const selectedCount = document.getElementById("selectedCount");

  if (selectedTaskIds.length > 0) {
    batchOperations.style.display = "block";
    selectedCount.textContent = selectedTaskIds.length;
  } else {
    batchOperations.style.display = "none";
  }
}

// 清除选择
function clearSelection() {
  const checkboxes = document.querySelectorAll(".task-checkbox");
  checkboxes.forEach((cb) => (cb.checked = false));
  selectedTaskIds = [];
  updateBatchSelection();
}

// 批量编辑
function batchEdit() {
  if (selectedTaskIds.length === 0) {
    showAlert("请先选择要编辑的任务", "warning");
    return;
  }

  if (selectedTaskIds.length > 1) {
    showAlert("批量编辑功能暂时只支持单个任务，请选择一个任务进行编辑", "info");
    return;
  }

  editTask(selectedTaskIds[0]);
  clearSelection();
}

// 批量运行
async function batchRun() {
  if (selectedTaskIds.length === 0) {
    showAlert("请先选择要运行的任务", "warning");
    return;
  }

  const runnableTasks = selectedTaskIds.filter((taskId) => {
    const task = migrationTasks.find((t) => t.id === taskId);
    return (
      task &&
      (task.status === "draft" ||
        task.status === "failed" ||
        task.status === "stopped")
    );
  });

  if (runnableTasks.length === 0) {
    showAlert(
      "选中的任务中没有可运行的任务（只有草稿、失败或已停止的任务可以运行）",
      "warning"
    );
    return;
  }

  if (!confirm(`确定要运行 ${runnableTasks.length} 个任务吗？`)) {
    return;
  }

  let successCount = 0;
  let failCount = 0;

  for (const taskId of runnableTasks) {
    try {
      await apiCall(`/api/migration-tasks/${taskId}/start`, { method: "POST" });
      successCount++;
    } catch (error) {
      console.error(`启动任务 ${taskId} 失败:`, error);
      failCount++;
    }
  }

  showAlert(
    `批量运行完成：成功 ${successCount} 个，失败 ${failCount} 个`,
    successCount > 0 ? "success" : "warning"
  );
  await loadMigrationTasks();
  clearSelection();
}

// 批量删除
async function batchDelete() {
  if (selectedTaskIds.length === 0) {
    showAlert("请先选择要删除的任务", "warning");
    return;
  }

  const deletableTasks = selectedTaskIds.filter((taskId) => {
    const task = migrationTasks.find((t) => t.id === taskId);
    return task && task.status !== "running" && task.status !== "initializing";
  });

  if (deletableTasks.length === 0) {
    showAlert(
      "选中的任务中没有可删除的任务（运行中的任务不能删除）",
      "warning"
    );
    return;
  }

  if (
    !confirm(`确定要删除 ${deletableTasks.length} 个任务吗？此操作不可撤销。`)
  ) {
    return;
  }

  let successCount = 0;
  let failCount = 0;

  for (const taskId of deletableTasks) {
    try {
      await apiCall(`/api/migration-tasks/${taskId}`, { method: "DELETE" });
      successCount++;
    } catch (error) {
      console.error(`删除任务 ${taskId} 失败:`, error);
      failCount++;
    }
  }

  showAlert(
    `批量删除完成：成功 ${successCount} 个，失败 ${failCount} 个`,
    successCount > 0 ? "success" : "warning"
  );
  await loadMigrationTasks();
  clearSelection();
}

// 全选/取消全选
function toggleSelectAll() {
  const checkboxes = document.querySelectorAll(".task-checkbox");
  const allChecked = Array.from(checkboxes).every((cb) => cb.checked);

  checkboxes.forEach((cb) => {
    cb.checked = !allChecked;
  });

  updateBatchSelection();
}

// 导出任务配置
function exportTask(taskId) {
  const task = migrationTasks.find((t) => t.id === taskId);
  if (!task) return;

  // 构建导出数据
  const exportData = {
    name: task.name,
    source_database: getDataSourceName(task.source_database),
    target_database: getDataSourceName(task.target_database),
    duplicate_strategy: task.duplicate_strategy,
    tables: task.tables,
    created_at: task.create_at,
    exported_at: new Date().toISOString(),
  };

  // 转换为JSON字符串
  const jsonString = JSON.stringify(exportData, null, 2);

  // 创建下载链接
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `migration_task_${task.name.replace(/[^a-zA-Z0-9]/g, "_")}_${
    new Date().toISOString().split("T")[0]
  }.json`;

  // 触发下载
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  showAlert("任务配置已导出", "success");
}

// 导入任务配置
function importTask() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.onchange = async function (event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const importData = JSON.parse(text);

      // 验证导入数据格式
      if (!importData.name || !importData.tables) {
        throw new Error("无效的任务配置文件格式");
      }

      // 创建新任务
      const newTask = {
        name: importData.name + " (导入)",
        source_database: "", // 需要用户重新选择
        target_database: "", // 需要用户重新选择
        duplicate_strategy: importData.duplicate_strategy || "ignore",
        tables: importData.tables,
        status: "draft",
      };

      const result = await apiCall("/api/migration-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTask),
      });

      if (result) {
        showAlert("任务配置已导入，请重新选择数据源", "success");
        await loadMigrationTasks();

        // 自动编辑导入的任务
        editTask(result.id);
      }
    } catch (error) {
      showAlert("导入任务配置失败: " + error.message, "danger");
    }
  };

  input.click();
}

// 脱敏类型变化处理
function onMaskingTypeChange(tableIndex) {
  const typeSelect = document.getElementById(`maskingTypeSelect_${tableIndex}`);
  const templateOptions = document.getElementById(
    `maskingTemplateOptions_${tableIndex}`
  );
  const customOptions = document.getElementById(
    `customMaskingOptions_${tableIndex}`
  );

  if (!typeSelect) return;

  const selectedType = typeSelect.value;

  // 隐藏所有选项
  if (templateOptions) templateOptions.style.display = "none";
  if (customOptions) customOptions.style.display = "none";

  if (!selectedType) return;

  if (selectedType === "custom") {
    // 显示自定义脱敏选项
    if (customOptions) customOptions.style.display = "block";
  } else {
    // 显示模板选择选项
    if (templateOptions) {
      templateOptions.style.display = "block";
      loadMaskingTemplatesForType(tableIndex, selectedType);
    }
  }
}

// 为指定类型加载脱敏模板
async function loadMaskingTemplatesForType(tableIndex, typeId) {
  const templateButtons = document.getElementById(
    `maskingTemplateButtons_${tableIndex}`
  );
  if (!templateButtons) return;

  try {
    // 尝试从API加载脱敏类型
    const maskingTypes = await apiCall("/api/masking-types");
    const maskingType = maskingTypes.find((t) => t.id === typeId);

    if (
      maskingType &&
      maskingType.templates &&
      maskingType.templates.length > 0
    ) {
      // 生成模板按钮
      templateButtons.innerHTML = "";

      // 添加测试区域
      const testArea = document.createElement("div");
      testArea.className = "template-test-area mb-3";
      testArea.innerHTML = `
        <div class="row g-2">
          <div class="col-md-8">
            <label class="form-label small">测试输入</label>
            <input type="text" class="form-control" id="templateTestInput_${tableIndex}" 
                   placeholder="输入测试数据">
          </div>
          <div class="col-md-4">
            <label class="form-label small">&nbsp;</label>
            <button class="btn btn-outline-info btn-sm d-block" onclick="testSelectedTemplate(${tableIndex})">
              <i class="bi bi-play-circle"></i> 测试脱敏
            </button>
          </div>
        </div>
        <div id="templateTestResult_${tableIndex}" class="mt-2" style="display: none;">
          <small class="text-muted">脱敏结果：</small>
          <div class="alert alert-info py-2" id="templateTestOutput_${tableIndex}"></div>
        </div>
      `;
      templateButtons.appendChild(testArea);

      maskingType.templates.forEach((template, index) => {
        const button = document.createElement("div");
        button.className = "template-btn";
        button.onclick = () =>
          selectMaskingTemplate(tableIndex, typeId, index, template);
        button.innerHTML = `
          <div class="template-header">
            <div class="template-name">${template.name}</div>
            <div class="template-example"><code>${template.example}</code></div>
          </div>
          <div class="template-description">${template.description}</div>
        `;
        templateButtons.appendChild(button);
      });
    } else {
      // 使用默认模板
      templateButtons.innerHTML =
        '<div class="alert alert-info">该类型暂无可用模板</div>';
    }
  } catch (error) {
    console.error("加载脱敏模板失败:", error);
    templateButtons.innerHTML =
      '<div class="alert alert-warning">加载模板失败，请手动配置</div>';
  }
}

// 选择脱敏模板
function selectMaskingTemplate(tableIndex, typeId, templateIndex, template) {
  // 更新按钮状态（跳过测试区域）
  document
    .querySelectorAll(`#maskingTemplateButtons_${tableIndex} .template-btn`)
    .forEach((btn, i) => {
      btn.classList.toggle("active", i === templateIndex);
    });

  // 存储选中的模板信息
  const templateOptions = document.getElementById(
    `maskingTemplateOptions_${tableIndex}`
  );
  if (templateOptions) {
    templateOptions.dataset.selectedType = typeId;
    templateOptions.dataset.selectedTemplate = templateIndex;
    templateOptions.dataset.templatePattern = template.pattern;
    templateOptions.dataset.templateReplace = template.replace;
    templateOptions.dataset.templateName = template.name;
  }

  // 自动填充测试数据（如果测试输入为空）
  const testInput = document.getElementById(`templateTestInput_${tableIndex}`);
  if (testInput && !testInput.value) {
    // 根据类型提供默认测试数据
    const testData = getTestDataForType(typeId);
    if (testData) {
      testInput.value = testData;
    }
  }
}

// 测试选中的模板
function testSelectedTemplate(tableIndex) {
  const templateOptions = document.getElementById(
    `maskingTemplateOptions_${tableIndex}`
  );
  const testInput = document.getElementById(`templateTestInput_${tableIndex}`);
  const testResult = document.getElementById(
    `templateTestResult_${tableIndex}`
  );
  const testOutput = document.getElementById(
    `templateTestOutput_${tableIndex}`
  );

  if (!templateOptions || !testInput || !testResult || !testOutput) return;

  const pattern = templateOptions.dataset.templatePattern;
  const replace = templateOptions.dataset.templateReplace;
  const templateName = templateOptions.dataset.templateName;
  const testValue = testInput.value.trim();

  if (!pattern || !replace) {
    showAlert("请先选择一个脱敏模板", "warning");
    return;
  }

  if (!testValue) {
    showAlert("请输入测试数据", "warning");
    return;
  }

  try {
    const regex = new RegExp(pattern);
    const result = testValue.replace(regex, replace);

    testOutput.innerHTML = `
      <strong>模板:</strong> ${templateName}<br>
      <strong>原始数据:</strong> ${testValue}<br>
      <strong>脱敏结果:</strong> ${result}
    `;
    testResult.style.display = "block";

    if (result === testValue) {
      showAlert("正则表达式未匹配到数据，请检查测试数据格式", "warning");
    }
  } catch (error) {
    showAlert("正则表达式错误: " + error.message, "danger");
    testResult.style.display = "none";
  }
}

// 根据类型获取测试数据
function getTestDataForType(typeId) {
  const testData = {
    keep_head_tail: "测试数据内容",
    keep_head: "保留开头测试",
    keep_tail: "测试保留结尾",
    phone: "13812345678",
    email: "user@example.com",
    idcard: "11010119900101123X",
    bank_card: "6222021234567890",
    name: "张三丰",
    chinese_name: "王小明",
    address: "北京市朝阳区建国门外大街1号",
    ip: "192.168.1.100",
    company: "北京测试科技有限公司",
    license: "京A12345",
    passport: "E12345678",
    custom: "自定义测试数据",
  };
  return testData[typeId] || "测试数据";
}

// 测试自定义脱敏
function testCustomMasking(tableIndex) {
  const patternInput = document.getElementById(
    `customMaskingPattern_${tableIndex}`
  );
  const replaceInput = document.getElementById(
    `customMaskingReplace_${tableIndex}`
  );
  const testInput = document.getElementById(`customMaskingTest_${tableIndex}`);
  const testResult = document.getElementById(
    `customMaskingTestResult_${tableIndex}`
  );
  const testOutput = document.getElementById(
    `customMaskingTestOutput_${tableIndex}`
  );

  if (
    !patternInput ||
    !replaceInput ||
    !testInput ||
    !testResult ||
    !testOutput
  )
    return;

  const pattern = patternInput.value.trim();
  const replace = replaceInput.value.trim();
  const testValue = testInput.value.trim();

  if (!pattern || !replace || !testValue) {
    showAlert("请填写正则表达式、替换模式和测试输入", "warning");
    return;
  }

  try {
    const regex = new RegExp(pattern);
    const result = testValue.replace(regex, replace);

    testOutput.innerHTML = `
      <strong>原始数据:</strong> ${testValue}<br>
      <strong>脱敏结果:</strong> ${result}
    `;
    testResult.style.display = "block";

    if (result === testValue) {
      showAlert("正则表达式未匹配到数据，请检查模式", "warning");
    }
  } catch (error) {
    showAlert("正则表达式错误: " + error.message, "danger");
    testResult.style.display = "none";
  }
}

// 更新脱敏类型选择器（在配置表时调用）
function updateMaskingTypeSelector(tableIndex) {
  const typeSelect = document.getElementById(`maskingTypeSelect_${tableIndex}`);
  if (!typeSelect) return;

  // 清空现有选项
  typeSelect.innerHTML = '<option value="">选择脱敏类型</option>';

  // 添加自定义选项
  const customOption = document.createElement("option");
  customOption.value = "custom";
  customOption.textContent = "自定义脱敏";
  typeSelect.appendChild(customOption);

  // 尝试加载脱敏类型
  apiCall("/api/masking-types")
    .then((maskingTypes) => {
      if (maskingTypes && maskingTypes.length > 0) {
        // 按分类分组
        const categories = {};
        maskingTypes.forEach((type) => {
          if (!type.enabled) return;

          if (!categories[type.category]) {
            categories[type.category] = [];
          }
          categories[type.category].push(type);
        });

        // 添加分组选项
        Object.keys(categories).forEach((category) => {
          const optgroup = document.createElement("optgroup");
          optgroup.label = category;

          categories[category].forEach((type) => {
            const option = document.createElement("option");
            option.value = type.id;
            option.textContent = type.name;
            optgroup.appendChild(option);
          });

          typeSelect.appendChild(optgroup);
        });
      }
    })
    .catch((error) => {
      console.error("加载脱敏类型失败:", error);
      // 添加一些默认选项
      const defaultTypes = [
        { id: "keep_head_tail", name: "保留首尾-通用" },
        { id: "keep_head", name: "保留开头-通用" },
        { id: "keep_tail", name: "保留结尾-通用" },
        { id: "phone", name: "手机号" },
        { id: "email", name: "邮箱" },
        { id: "idcard", name: "身份证" },
      ];

      defaultTypes.forEach((type) => {
        const option = document.createElement("option");
        option.value = type.id;
        option.textContent = type.name;
        typeSelect.appendChild(option);
      });
    });
}

// 更新迁移按钮状态
function updateMigrationButtons(status) {
  const buttonContainer = document.querySelector(
    ".migration-progress .d-flex.justify-content-end"
  );
  if (!buttonContainer) return;

  const taskId = status.taskId || status.id;

  switch (status.status) {
    case "completed":
      buttonContainer.innerHTML = `
        <button type="button" class="btn btn-success" disabled>
          <i class="bi bi-check-circle"></i> 迁移完成
        </button>
        <button type="button" class="btn btn-outline-primary" onclick="restartMigration('${taskId}')">
          <i class="bi bi-arrow-clockwise"></i> 重新执行
        </button>
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
          <i class="bi bi-x"></i> 关闭
        </button>
      `;
      break;

    case "failed":
      buttonContainer.innerHTML = `
        <button type="button" class="btn btn-danger" disabled>
          <i class="bi bi-x-circle"></i> 迁移失败
        </button>
        <button type="button" class="btn btn-outline-primary" onclick="restartMigration('${taskId}')">
          <i class="bi bi-arrow-clockwise"></i> 重新执行
        </button>
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
          <i class="bi bi-x"></i> 关闭
        </button>
      `;
      break;

    case "stopped":
      buttonContainer.innerHTML = `
        <button type="button" class="btn btn-secondary" disabled>
          <i class="bi bi-stop-circle"></i> 已停止
        </button>
        <button type="button" class="btn btn-outline-primary" onclick="restartMigration('${taskId}')">
          <i class="bi bi-arrow-clockwise"></i> 重新执行
        </button>
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
          <i class="bi bi-x"></i> 关闭
        </button>
      `;
      break;

    case "paused":
      buttonContainer.innerHTML = `
        <button type="button" class="btn btn-outline-success" onclick="resumeMigration('${taskId}')">
          <i class="bi bi-play"></i> 继续
        </button>
        <button type="button" class="btn btn-outline-danger" onclick="stopMigration('${taskId}')">
          <i class="bi bi-stop"></i> 停止
        </button>
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
          <i class="bi bi-eye-slash"></i> 后台运行
        </button>
      `;
      break;

    case "running":
    default:
      // 保持原有的运行中按钮
      buttonContainer.innerHTML = `
        <button type="button" class="btn btn-outline-warning" onclick="pauseMigration('${taskId}')">
          <i class="bi bi-pause"></i> 暂停
        </button>
        <button type="button" class="btn btn-outline-danger" onclick="stopMigration('${taskId}')">
          <i class="bi bi-stop"></i> 停止
        </button>
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
          <i class="bi bi-eye-slash"></i> 后台运行
        </button>
      `;
      break;
  }
}

// 重新执行迁移任务
async function restartMigration(taskId) {
  try {
    showAlert("正在重新启动迁移任务...", "info");

    const result = await apiCall(`/api/migration-tasks/${taskId}/start`, {
      method: "POST",
    });

    if (result) {
      showAlert("迁移任务已重新启动", "success");

      // 重新开始轮询
      startMigrationPolling(taskId);

      // 更新按钮为运行状态
      const status = { status: "running", taskId: taskId };
      updateMigrationButtons(status);
    }
  } catch (error) {
    console.error("重新启动迁移任务失败:", error);
    showAlert("重新启动迁移任务失败: " + error.message, "danger");
  }
}

// 继续迁移任务（从暂停状态恢复）
async function resumeMigration(taskId) {
  try {
    showAlert("正在恢复迁移任务...", "info");

    // 这里需要后端支持恢复功能，暂时使用重新启动
    const result = await apiCall(`/api/migration-tasks/${taskId}/start`, {
      method: "POST",
    });

    if (result) {
      showAlert("迁移任务已恢复", "success");

      // 重新开始轮询
      startMigrationPolling(taskId);

      // 更新按钮为运行状态
      const status = { status: "running", taskId: taskId };
      updateMigrationButtons(status);
    }
  } catch (error) {
    console.error("恢复迁移任务失败:", error);
    showAlert("恢复迁移任务失败: " + error.message, "danger");
  }
}

// 更新迁移模态框标题
function updateMigrationModalTitle(status) {
  const modalTitle = document.querySelector(".modal-title");
  if (!modalTitle) return;

  switch (status.status) {
    case "completed":
      modalTitle.textContent = "迁移完成";
      break;
    case "failed":
      modalTitle.textContent = "迁移失败";
      break;
    case "stopped":
      modalTitle.textContent = "迁移已停止";
      break;
    case "paused":
      modalTitle.textContent = "迁移已暂停";
      break;
    case "running":
    default:
      modalTitle.textContent = "迁移进度";
      break;
  }
}

// ==================== 批量操作功能 ====================

// 更新批量选择状态
function updateBatchSelection() {
  const checkboxes = document.querySelectorAll(".task-checkbox");
  const checkedBoxes = document.querySelectorAll(".task-checkbox:checked");
  const selectAllCheckbox = document.getElementById("selectAllTasks");
  const batchActionsContainer = document.getElementById("batchActions");
  const selectedCountElement = document.getElementById("selectedCount");

  if (selectAllCheckbox) {
    if (checkedBoxes.length === 0) {
      selectAllCheckbox.indeterminate = false;
      selectAllCheckbox.checked = false;
    } else if (checkedBoxes.length === checkboxes.length) {
      selectAllCheckbox.indeterminate = false;
      selectAllCheckbox.checked = true;
    } else {
      selectAllCheckbox.indeterminate = true;
      selectAllCheckbox.checked = false;
    }
  }

  if (selectedCountElement) {
    selectedCountElement.textContent = checkedBoxes.length;
  }

  // 显示或隐藏批量操作按钮
  if (checkedBoxes.length > 0) {
    showBatchActions();
  } else {
    hideBatchActions();
  }
}

// 全选/取消全选
function toggleSelectAll() {
  const selectAllCheckbox = document.getElementById("selectAllTasks");
  const checkboxes = document.querySelectorAll(".task-checkbox");

  checkboxes.forEach((checkbox) => {
    checkbox.checked = selectAllCheckbox.checked;
  });

  updateBatchSelection();
}

// 显示批量操作按钮
function showBatchActions() {
  const batchActionsContainer = document.getElementById("batchActions");
  if (batchActionsContainer) {
    batchActionsContainer.style.display = "flex";
  }
}

// 隐藏批量操作按钮
function hideBatchActions() {
  const batchActionsContainer = document.getElementById("batchActions");
  if (batchActionsContainer) {
    batchActionsContainer.style.display = "none";
  }
}

// 获取选中的任务ID
function getSelectedTaskIds() {
  const checkedBoxes = document.querySelectorAll(".task-checkbox:checked");
  return Array.from(checkedBoxes).map((checkbox) => checkbox.dataset.taskId);
}

// 批量删除任务
async function batchDeleteTasks() {
  const selectedIds = getSelectedTaskIds();
  if (selectedIds.length === 0) {
    showAlert("请先选择要删除的任务", "warning");
    return;
  }

  const confirmMessage = `确定要删除选中的 ${selectedIds.length} 个任务吗？此操作不可撤销。`;
  if (!confirm(confirmMessage)) {
    return;
  }

  let successCount = 0;
  let failCount = 0;

  for (const taskId of selectedIds) {
    try {
      await apiCall(`/api/migration-tasks/${taskId}`, { method: "DELETE" });
      successCount++;
    } catch (error) {
      console.error(`删除任务 ${taskId} 失败:`, error);
      failCount++;
    }
  }

  if (successCount > 0) {
    showAlert(
      `成功删除 ${successCount} 个任务${
        failCount > 0 ? `，${failCount} 个任务删除失败` : ""
      }`,
      failCount > 0 ? "warning" : "success"
    );
    await loadMigrationTasks();
  } else {
    showAlert("批量删除失败", "danger");
  }
}

// 批量启动任务
async function batchStartTasks() {
  const selectedIds = getSelectedTaskIds();
  if (selectedIds.length === 0) {
    showAlert("请先选择要启动的任务", "warning");
    return;
  }

  // 过滤出可以启动的任务（草稿、失败、停止状态）
  const startableTasks = selectedIds.filter((taskId) => {
    const task = migrationTasks.find((t) => t.id === taskId);
    return task && ["draft", "failed", "stopped"].includes(task.status);
  });

  if (startableTasks.length === 0) {
    showAlert("选中的任务中没有可以启动的任务", "warning");
    return;
  }

  const confirmMessage = `确定要启动选中的 ${startableTasks.length} 个任务吗？`;
  if (!confirm(confirmMessage)) {
    return;
  }

  let successCount = 0;
  let failCount = 0;

  for (const taskId of startableTasks) {
    try {
      await apiCall(`/api/migration-tasks/${taskId}/start`, { method: "POST" });
      successCount++;
    } catch (error) {
      console.error(`启动任务 ${taskId} 失败:`, error);
      failCount++;
    }
  }

  if (successCount > 0) {
    showAlert(
      `成功启动 ${successCount} 个任务${
        failCount > 0 ? `，${failCount} 个任务启动失败` : ""
      }`,
      failCount > 0 ? "warning" : "success"
    );
    await loadMigrationTasks();
  } else {
    showAlert("批量启动失败", "danger");
  }
}

// 批量停止任务
async function batchStopTasks() {
  const selectedIds = getSelectedTaskIds();
  if (selectedIds.length === 0) {
    showAlert("请先选择要停止的任务", "warning");
    return;
  }

  // 过滤出可以停止的任务（运行中、暂停状态）
  const stoppableTasks = selectedIds.filter((taskId) => {
    const task = migrationTasks.find((t) => t.id === taskId);
    return task && ["running", "paused"].includes(task.status);
  });

  if (stoppableTasks.length === 0) {
    showAlert("选中的任务中没有可以停止的任务", "warning");
    return;
  }

  const confirmMessage = `确定要停止选中的 ${stoppableTasks.length} 个任务吗？`;
  if (!confirm(confirmMessage)) {
    return;
  }

  let successCount = 0;
  let failCount = 0;

  for (const taskId of stoppableTasks) {
    try {
      await apiCall(`/api/migration-tasks/${taskId}/stop`, { method: "POST" });
      successCount++;
    } catch (error) {
      console.error(`停止任务 ${taskId} 失败:`, error);
      failCount++;
    }
  }

  if (successCount > 0) {
    showAlert(
      `成功停止 ${successCount} 个任务${
        failCount > 0 ? `，${failCount} 个任务停止失败` : ""
      }`,
      failCount > 0 ? "warning" : "success"
    );
    await loadMigrationTasks();
  } else {
    showAlert("批量停止失败", "danger");
  }
}

// 批量导出任务配置
function batchExportTasks() {
  const selectedIds = getSelectedTaskIds();
  if (selectedIds.length === 0) {
    showAlert("请先选择要导出的任务", "warning");
    return;
  }

  const selectedTasks = selectedIds
    .map((taskId) => migrationTasks.find((t) => t.id === taskId))
    .filter((task) => task);

  const exportData = {
    exportTime: new Date().toISOString(),
    tasks: selectedTasks.map((task) => ({
      name: task.name,
      sourceDatabase: task.source_database,
      targetDatabase: task.target_database,
      duplicateStrategy: task.duplicate_strategy,
      tableStrategy: task.table_strategy,
      tables: task.tables,
      createAt: task.create_at,
    })),
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `migration_tasks_${new Date().toISOString().split("T")[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showAlert(`成功导出 ${selectedTasks.length} 个任务配置`, "success");
}

// 清除所有选择
function clearAllSelection() {
  const checkboxes = document.querySelectorAll(".task-checkbox");
  const selectAllCheckbox = document.getElementById("selectAllTasks");

  checkboxes.forEach((checkbox) => {
    checkbox.checked = false;
  });

  if (selectAllCheckbox) {
    selectAllCheckbox.checked = false;
    selectAllCheckbox.indeterminate = false;
  }

  updateBatchSelection();
}

// ==================== 表选择批量操作功能 ====================

// 全选表
function selectAllTables() {
  const tableSearch = document.getElementById("tableSearch");
  const searchTerm = tableSearch ? tableSearch.value.toLowerCase() : "";

  // 获取当前显示的表（考虑搜索过滤）
  const filteredTables = availableTables.filter(
    (table) => !searchTerm || table.toLowerCase().includes(searchTerm)
  );

  let addedCount = 0;
  filteredTables.forEach((tableName) => {
    const isAlreadySelected = selectedTables.some((t) => t.name === tableName);
    if (!isAlreadySelected) {
      selectedTables.push({
        name: tableName,
        conditions: [],
        templateRefs: [],
        maskingRules: {},
      });
      addedCount++;
    }
  });

  if (addedCount > 0) {
    renderTableList();
    renderSelectedTables();
    showAlert(`已选择 ${addedCount} 张表`, "success", 2000);
  } else {
    showAlert("所有显示的表都已选择", "info", 2000);
  }
}

// 全不选表
function deselectAllTables() {
  const tableSearch = document.getElementById("tableSearch");
  const searchTerm = tableSearch ? tableSearch.value.toLowerCase() : "";

  // 获取当前显示的表（考虑搜索过滤）
  const filteredTables = availableTables.filter(
    (table) => !searchTerm || table.toLowerCase().includes(searchTerm)
  );

  let removedCount = 0;
  filteredTables.forEach((tableName) => {
    const index = selectedTables.findIndex((t) => t.name === tableName);
    if (index >= 0) {
      selectedTables.splice(index, 1);
      removedCount++;
    }
  });

  if (removedCount > 0) {
    renderTableList();
    renderSelectedTables();
    showAlert(`已取消选择 ${removedCount} 张表`, "success", 2000);
  } else {
    showAlert("没有需要取消选择的表", "info", 2000);
  }
}

// 反选表
function invertTableSelection() {
  const tableSearch = document.getElementById("tableSearch");
  const searchTerm = tableSearch ? tableSearch.value.toLowerCase() : "";

  // 获取当前显示的表（考虑搜索过滤）
  const filteredTables = availableTables.filter(
    (table) => !searchTerm || table.toLowerCase().includes(searchTerm)
  );

  let addedCount = 0;
  let removedCount = 0;

  filteredTables.forEach((tableName) => {
    const index = selectedTables.findIndex((t) => t.name === tableName);
    if (index >= 0) {
      // 已选择的表，取消选择
      selectedTables.splice(index, 1);
      removedCount++;
    } else {
      // 未选择的表，添加选择
      selectedTables.push({
        name: tableName,
        conditions: [],
        templateRefs: [],
        maskingRules: {},
      });
      addedCount++;
    }
  });

  renderTableList();
  renderSelectedTables();

  if (addedCount > 0 || removedCount > 0) {
    showAlert(
      `反选完成：新增 ${addedCount} 张表，取消 ${removedCount} 张表`,
      "success",
      3000
    );
  } else {
    showAlert("没有可反选的表", "info", 2000);
  }
}

// 更新表操作按钮的显示状态和计数
function updateTableOperations() {
  const tableOperations = document.getElementById("tableOperations");
  const availableTableCount = document.getElementById("availableTableCount");

  if (availableTables.length > 0) {
    if (tableOperations) {
      tableOperations.style.display = "flex";
    }
    if (availableTableCount) {
      const tableSearch = document.getElementById("tableSearch");
      const searchTerm = tableSearch ? tableSearch.value.toLowerCase() : "";

      // 计算当前显示的表数量（考虑搜索过滤）
      const filteredCount = availableTables.filter(
        (table) => !searchTerm || table.toLowerCase().includes(searchTerm)
      ).length;

      availableTableCount.textContent = filteredCount;
    }
  } else {
    if (tableOperations) {
      tableOperations.style.display = "none";
    }
  }
}

// 更新配置预览
function updateConfigPreview() {
  const configPreview = document.getElementById("configPreview");
  if (!configPreview) return;

  const taskName = document.getElementById("taskName")?.value || "";
  const sourceDatabase = document.getElementById("sourceDatabase")?.value || "";
  const targetDatabase = document.getElementById("targetDatabase")?.value || "";
  const duplicateStrategy =
    document.getElementById("duplicateStrategy")?.value || "ignore";
  const tableStrategy =
    document.getElementById("tableStrategy")?.value || "use_existing";

  // 调试信息
  console.log("配置预览更新:", {
    taskName,
    sourceDatabase,
    targetDatabase,
    selectedTablesCount: selectedTables.length,
    currentEditingTask,
  });

  if (
    !taskName &&
    !sourceDatabase &&
    !targetDatabase &&
    selectedTables.length === 0
  ) {
    configPreview.innerHTML = `
      <div class="text-muted text-center py-3">
        <i class="bi bi-gear"></i>
        <div class="mt-2">配置任务信息后将在此显示预览</div>
      </div>
    `;
    return;
  }

  const configuredTables = selectedTables.filter(
    (table) =>
      table.templateRefs.length > 0 ||
      table.conditions.length > 0 ||
      Object.keys(table.maskingRules).length > 0
  );

  const totalFilters = selectedTables.reduce(
    (sum, table) => sum + table.templateRefs.length + table.conditions.length,
    0
  );

  const totalMaskingRules = selectedTables.reduce(
    (sum, table) => sum + Object.keys(table.maskingRules).length,
    0
  );

  configPreview.innerHTML = `
    <div class="config-preview-content">
      <div class="mb-3">
        <h6 class="text-primary mb-2"><i class="bi bi-info-circle"></i> 任务信息</h6>
        <div class="row g-2 small">
          <div class="col-12">
            <strong>任务名称:</strong> ${
              taskName || '<span class="text-muted">未设置</span>'
            }
          </div>
          <div class="col-6">
            <strong>源库:</strong> ${
              sourceDatabase || '<span class="text-muted">未选择</span>'
            }
          </div>
          <div class="col-6">
            <strong>目标库:</strong> ${
              targetDatabase || '<span class="text-muted">未选择</span>'
            }
          </div>
        </div>
      </div>
      
      <div class="mb-3">
        <h6 class="text-success mb-2"><i class="bi bi-table"></i> 表配置</h6>
        <div class="row g-2 small">
          <div class="col-6">
            <strong>选择表数:</strong> <span class="badge bg-primary">${
              selectedTables.length
            }</span>
          </div>
          <div class="col-6">
            <strong>已配置:</strong> <span class="badge bg-success">${
              configuredTables.length
            }</span>
          </div>
          <div class="col-6">
            <strong>过滤条件:</strong> <span class="badge bg-info">${totalFilters}</span>
          </div>
          <div class="col-6">
            <strong>脱敏规则:</strong> <span class="badge bg-warning">${totalMaskingRules}</span>
          </div>
        </div>
      </div>
      
      <div class="mb-3">
        <h6 class="text-secondary mb-2"><i class="bi bi-gear"></i> 策略设置</h6>
        <div class="small">
          <div class="mb-1">
            <strong>重复处理:</strong> 
            <span class="badge bg-secondary">${getStrategyDisplayName(
              duplicateStrategy
            )}</span>
          </div>
          <div>
            <strong>表处理:</strong> 
            <span class="badge bg-secondary">${getTableStrategyDisplayName(
              tableStrategy
            )}</span>
          </div>
        </div>
      </div>
      
      ${
        selectedTables.length > 0 &&
        configuredTables.length < selectedTables.length
          ? `
        <div class="alert alert-warning py-2 px-3 small">
          <i class="bi bi-exclamation-triangle"></i>
          有 ${selectedTables.length - configuredTables.length} 张表未配置规则
        </div>
      `
          : ""
      }
    </div>
  `;
}

// 获取策略显示名称
function getStrategyDisplayName(strategy) {
  const strategies = {
    ignore: "跳过重复",
    replace: "替换重复",
    update: "更新重复",
    error: "报错停止",
  };
  return strategies[strategy] || strategy;
}

// 获取表策略显示名称
function getTableStrategyDisplayName(strategy) {
  const strategies = {
    use_existing: "使用现有表",
    recreate: "重新创建表",
    create_only: "仅创建新表",
  };
  return strategies[strategy] || strategy;
}

// 刷新配置预览
function refreshConfigPreview() {
  updateConfigPreview();
  showAlert("配置预览已刷新", "info", 1500);
}

// 监听表单变化，自动更新预览
document.addEventListener("DOMContentLoaded", function () {
  // 监听任务名称变化
  const taskNameInput = document.getElementById("taskName");
  if (taskNameInput) {
    taskNameInput.addEventListener("input", updateConfigPreview);
  }

  // 监听数据库选择变化
  const sourceDbSelect = document.getElementById("sourceDatabase");
  if (sourceDbSelect) {
    sourceDbSelect.addEventListener("change", updateConfigPreview);
  }

  const targetDbSelect = document.getElementById("targetDatabase");
  if (targetDbSelect) {
    targetDbSelect.addEventListener("change", updateConfigPreview);
  }

  // 监听策略选择变化
  const duplicateStrategySelect = document.getElementById("duplicateStrategy");
  if (duplicateStrategySelect) {
    duplicateStrategySelect.addEventListener("change", updateConfigPreview);
  }

  const tableStrategySelect = document.getElementById("tableStrategy");
  if (tableStrategySelect) {
    tableStrategySelect.addEventListener("change", updateConfigPreview);
  }
});

// 保存当前任务配置状态
function saveCurrentTaskConfig() {
  const taskName = document.getElementById("taskName")?.value || "";
  const sourceDatabase = document.getElementById("sourceDatabase")?.value || "";
  const targetDatabase = document.getElementById("targetDatabase")?.value || "";
  const duplicateStrategy =
    document.getElementById("duplicateStrategy")?.value || "ignore";
  const tableStrategy =
    document.getElementById("tableStrategy")?.value || "use_existing";
  const filterTemplate = document.getElementById("filterTemplate")?.value || "";
  const maskingRule = document.getElementById("maskingRule")?.value || "";

  savedTaskConfig = {
    taskName,
    sourceDatabase,
    targetDatabase,
    duplicateStrategy,
    tableStrategy,
    filterTemplate,
    maskingRule,
    selectedTables: JSON.parse(JSON.stringify(selectedTables)), // 深拷贝
    availableTables: [...availableTables],
    currentSourceDatabase,
  };

  console.log("任务配置已保存:", savedTaskConfig);
}

// 重载任务配置
function reloadTaskConfig() {
  if (!savedTaskConfig) {
    showAlert("没有可重载的配置，请先保存任务配置", "warning");
    return;
  }

  // 显示确认对话框
  if (!confirm("确定要重载配置吗？当前的修改将会丢失。")) {
    return;
  }

  try {
    // 恢复表单字段
    const taskNameInput = document.getElementById("taskName");
    if (taskNameInput) taskNameInput.value = savedTaskConfig.taskName;

    const sourceDbSelect = document.getElementById("sourceDatabase");
    if (sourceDbSelect) sourceDbSelect.value = savedTaskConfig.sourceDatabase;

    const targetDbSelect = document.getElementById("targetDatabase");
    if (targetDbSelect) targetDbSelect.value = savedTaskConfig.targetDatabase;

    const duplicateStrategySelect =
      document.getElementById("duplicateStrategy");
    if (duplicateStrategySelect)
      duplicateStrategySelect.value = savedTaskConfig.duplicateStrategy;

    const tableStrategySelect = document.getElementById("tableStrategy");
    if (tableStrategySelect)
      tableStrategySelect.value = savedTaskConfig.tableStrategy;

    const filterTemplateSelect = document.getElementById("filterTemplate");
    if (filterTemplateSelect)
      filterTemplateSelect.value = savedTaskConfig.filterTemplate;

    const maskingRuleSelect = document.getElementById("maskingRule");
    if (maskingRuleSelect)
      maskingRuleSelect.value = savedTaskConfig.maskingRule;

    // 恢复表选择状态
    selectedTables = JSON.parse(JSON.stringify(savedTaskConfig.selectedTables));
    availableTables = [...savedTaskConfig.availableTables];
    currentSourceDatabase = savedTaskConfig.currentSourceDatabase;

    // 重新渲染界面
    renderTableList();
    renderSelectedTables();
    updateConfigPreview();

    showAlert("配置已重载到上次保存的状态", "success");
  } catch (error) {
    console.error("重载配置失败:", error);
    showAlert("重载配置失败: " + error.message, "danger");
  }
}

// 自动保存配置（在关键操作时调用）
function autoSaveTaskConfig() {
  saveCurrentTaskConfig();
}
