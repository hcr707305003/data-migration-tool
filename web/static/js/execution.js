// 迁移任务列表页面功能

let migrationTasks = [];
let filteredTasks = [];

// 页面加载完成后初始化
document.addEventListener("DOMContentLoaded", function () {
  loadMigrationTasks();
  setupAutoRefresh();
});

// 加载迁移任务列表
async function loadMigrationTasks() {
  try {
    const result = await apiCall("/api/migration-tasks");
    migrationTasks = result || [];
    filteredTasks = [...migrationTasks];
    renderMigrationTasks();
    updateTaskStats();
  } catch (error) {
    console.error("加载任务列表失败:", error);
    showAlert("加载任务列表失败: " + error.message, "danger");
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
        <div class="card h-100" style="border: 1px solid var(--border-color); background: var(--card-bg);">
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
                <span class="badge ${statusInfo.class}">${
    statusInfo.text
  }</span>
            </div>
            <div class="card-body">
                <!-- 进度条 -->
                <div class="mb-3">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <small class="text-muted">进度</small>
                        <small class="text-muted">${progressPercent}%</small>
                    </div>
                    <div class="progress" style="height: 8px;">
                        <div class="progress-bar ${getProgressBarClass(
                          task.status
                        )}" 
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
                            }">${
    getDataSourceName(task.source_database) || "未知"
  }</div>
                        </div>
                        <div class="col-6">
                            <small class="text-muted">目标数据库:</small>
                            <div class="text-truncate" title="${
                              task.target_database || "未知"
                            }">${
    getDataSourceName(task.target_database) || "未知"
  }</div>
                        </div>
                    </div>
                    
                    <div class="row g-2 mb-2">
                        <div class="col-6">
                            <small class="text-muted">处理记录:</small>
                            <div>${(
                              task.processed_records || 0
                            ).toLocaleString()} / ${(
    task.total_records || 0
  ).toLocaleString()}</div>
                        </div>
                        <div class="col-6">
                            <small class="text-muted">当前表:</small>
                            <div class="text-truncate" title="${
                              task.current_table || "-"
                            }">${task.current_table || "-"}</div>
                        </div>
                    </div>
                    
                    <div class="row g-2 mb-3">
                        <div class="col-6">
                            <small class="text-muted">开始时间:</small>
                            <div>${formatDateTime(task.start_at)}</div>
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

  switch (task.status) {
    case "running":
    case "initializing":
      actions.push(`<button class="btn btn-outline-warning btn-sm" onclick="pauseTask('${task.id}')" title="暂停任务">
                <i class="bi bi-pause"></i>
            </button>`);
      actions.push(`<button class="btn btn-outline-danger btn-sm" onclick="stopTask('${task.id}')" title="停止任务">
                <i class="bi bi-stop"></i>
            </button>`);
      actions.push(`<button class="btn btn-outline-info btn-sm" onclick="viewTaskProgress('${task.id}')" title="查看进度">
                <i class="bi bi-activity"></i>
            </button>`);
      break;

    case "paused":
      actions.push(`<button class="btn btn-outline-success btn-sm" onclick="resumeTask('${task.id}')" title="恢复任务">
                <i class="bi bi-play"></i>
            </button>`);
      actions.push(`<button class="btn btn-outline-danger btn-sm" onclick="stopTask('${task.id}')" title="停止任务">
                <i class="bi bi-stop"></i>
            </button>`);
      break;

    case "completed":
      actions.push(`<button class="btn btn-outline-success btn-sm" onclick="rerunTask('${task.id}')" title="重新运行">
                <i class="bi bi-arrow-clockwise"></i>
            </button>`);
      actions.push(`<button class="btn btn-outline-info btn-sm" onclick="duplicateTask('${task.id}')" title="复制任务">
                <i class="bi bi-files"></i>
            </button>`);
      break;

    case "failed":
    case "stopped":
      actions.push(`<button class="btn btn-outline-primary btn-sm" onclick="retryTask('${task.id}')" title="重试任务">
                <i class="bi bi-arrow-clockwise"></i>
            </button>`);
      actions.push(`<button class="btn btn-outline-success btn-sm" onclick="rerunTask('${task.id}')" title="重新运行">
                <i class="bi bi-play-circle"></i>
            </button>`);
      break;
  }

  // 通用操作 - 查看详情（所有状态都有）
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
    running: migrationTasks.filter((t) => t.status === "running").length,
    completed: migrationTasks.filter((t) => t.status === "completed").length,
    failed: migrationTasks.filter((t) => t.status === "failed").length,
    paused: migrationTasks.filter((t) => t.status === "paused").length,
    stopped: migrationTasks.filter((t) => t.status === "stopped").length,
  };

  document.getElementById("totalTasks").textContent = stats.total;
  document.getElementById("runningTasks").textContent = stats.running;
  document.getElementById("completedTasks").textContent = stats.completed;
  document.getElementById("failedTasks").textContent = stats.failed;
  document.getElementById("pausedTasks").textContent = stats.paused;
  document.getElementById("stoppedTasks").textContent = stats.stopped;
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

// 排序任务
function sortTasks() {
  const sortBy = document.getElementById("taskSortFilter").value;

  filteredTasks.sort((a, b) => {
    switch (sortBy) {
      case "newest":
        return new Date(b.create_at) - new Date(a.create_at);
      case "oldest":
        return new Date(a.create_at) - new Date(b.create_at);
      case "name":
        return a.name.localeCompare(b.name);
      case "progress":
        return (b.progress || 0) - (a.progress || 0);
      default:
        return 0;
    }
  });

  renderMigrationTasks();
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
                    <span class="badge ${
                      getStatusInfo(task.status).class
                    } fs-6">${getStatusInfo(task.status).text}</span>
                </div>
                <div class="card-body">
                    <div class="row g-4">
                        <div class="col-md-6">
                            <div class="info-group">
                                <h6 class="text-primary mb-3"><i class="bi bi-gear me-2"></i>基本信息</h6>
                                <div class="info-list">
                                    <div class="info-item">
                                        <span class="info-label"><i class="bi bi-tag me-1"></i>任务名称</span>
                                        <span class="info-value">${
                                          task.name
                                        }</span>
                                    </div>
                                    <div class="info-item">
                                        <span class="info-label"><i class="bi bi-hash me-1"></i>任务ID</span>
                                        <span class="info-value text-muted">${
                                          task.id
                                        }</span>
                                    </div>
                                    <div class="info-item">
                                        <span class="info-label"><i class="bi bi-speedometer2 me-1"></i>执行进度</span>
                                        <div class="progress-container">
                                            <div class="progress" style="height: 8px;">
                                                <div class="progress-bar bg-primary" style="width: ${
                                                  task.progress || 0
                                                }%"></div>
                                            </div>
                                            <span class="progress-text">${
                                              task.progress || 0
                                            }%</span>
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
                                          task.current_table
                                            ? "text-info"
                                            : "text-muted"
                                        }">${
    task.current_table || "暂无"
  }</span>
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
                                <div class="time-label"><i class="bi bi-calendar-plus me-1"></i>创建时间</div>
                                <div class="time-value">${
                                  formatDateTime(task.create_at) || "无"
                                }</div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="time-info">
                                <div class="time-label"><i class="bi bi-calendar-check me-1"></i>开始时间</div>
                                <div class="time-value">${
                                  formatDateTime(task.start_at) || "未开始"
                                }</div>
                            </div>
                        </div>
                        ${
                          task.end_at
                            ? `
                        <div class="col-md-4">
                            <div class="time-info">
                                <div class="time-label"><i class="bi bi-calendar-x me-1"></i>结束时间</div>
                                <div class="time-value">${formatDateTime(
                                  task.end_at
                                )}</div>
                            </div>
                        </div>
                        `
                            : `
                        <div class="col-md-4">
                            <div class="time-info">
                                <div class="time-label"><i class="bi bi-hourglass me-1"></i>运行时长</div>
                                <div class="time-value">${calculateDuration(
                                  task.start_at,
                                  task.end_at
                                )}</div>
                            </div>
                        </div>
                        `
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
                      task.status === "completed"
                        ? `
                    <button type="button" class="btn btn-outline-success btn-sm" onclick="rerunTask('${task.id}')" data-bs-dismiss="modal">
                        <i class="bi bi-arrow-clockwise me-1"></i>重新运行
                    </button>
                    <button type="button" class="btn btn-outline-info btn-sm" onclick="duplicateTask('${task.id}')" data-bs-dismiss="modal">
                        <i class="bi bi-files me-1"></i>复制任务
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
                      task.status === "running" ||
                      task.status === "initializing"
                        ? `
                    <button type="button" class="btn btn-primary btn-sm" onclick="viewTaskProgress('${task.id}')" data-bs-dismiss="modal">
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
                      task.status !== "running" &&
                      task.status !== "initializing"
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

// 显示任务进度（重用migration.js中的进度监控）
function showTaskProgress(taskId) {
  // 这里可以重用migration.js中的showMigrationProgress函数
  if (typeof showMigrationProgress === "function") {
    showMigrationProgress(taskId);
  } else {
    showAlert("进度监控功能需要在迁移配置页面中查看", "info");
  }
}

// 刷新任务列表
async function refreshMigrationTasks() {
  try {
    await loadMigrationTasks();
    showAlert("任务列表已刷新", "success");
  } catch (error) {
    showAlert("刷新任务列表失败: " + error.message, "danger");
  }
}

// 导出任务记录
function exportTasks() {
  if (migrationTasks.length === 0) {
    showAlert("没有可导出的任务记录", "warning");
    return;
  }

  const csvContent = generateTaskCSV();
  downloadCSV(csvContent, "migration_tasks.csv");
  showAlert("任务记录已导出", "success");
}

// 生成CSV内容
function generateTaskCSV() {
  const headers = [
    "任务名称",
    "状态",
    "进度",
    "处理记录",
    "总记录",
    "创建时间",
    "开始时间",
    "结束时间",
    "错误信息",
  ];
  const rows = migrationTasks.map((task) => [
    task.name,
    getStatusInfo(task.status).text,
    `${task.progress || 0}%`,
    task.processed_records || 0,
    task.total_records || 0,
    formatDateTime(task.create_at),
    formatDateTime(task.start_at),
    formatDateTime(task.end_at),
    task.error_message || "",
  ]);

  return [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");
}

// 下载CSV文件
function downloadCSV(content, filename) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// 设置自动刷新
function setupAutoRefresh() {
  // 每30秒自动刷新一次，只刷新运行中的任务
  setInterval(async () => {
    const hasRunningTasks = migrationTasks.some(
      (task) => task.status === "running" || task.status === "initializing"
    );

    if (hasRunningTasks) {
      await loadMigrationTasks();
    }
  }, 30000);
}

// 工具函数
function getDataSourceName(dsId) {
  // 这里可以从全局数据源列表中获取名称
  // 简化处理，直接返回ID的一部分
  return dsId ? dsId.substring(0, 8) + "..." : "未知";
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

// 自定义模态框（如果common.js中没有的话）
function showCustomModal(title, content, onShown = null) {
  const modalId = "customTaskModal";
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

  // 过滤出可以启动的任务（失败、停止状态）
  const startableTasks = selectedIds.filter((taskId) => {
    const task = migrationTasks.find((t) => t.id === taskId);
    return task && ["failed", "stopped"].includes(task.status);
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
      await apiCall(`/api/migration/stop/${taskId}`, { method: "POST" });
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
      status: task.status,
      progress: task.progress,
      processedRecords: task.processed_records,
      totalRecords: task.total_records,
      createAt: task.create_at,
      startAt: task.start_at,
      endAt: task.end_at,
      errorMessage: task.error_message,
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
// 重新运行任务

async function rerunTask(taskId) {
  if (!confirm("确定要重新运行这个任务吗？这将创建一个新的任务实例。")) {
    return;
  }

  try {
    // 重新运行任务 - 这里可能需要调用特定的API
    await apiCall(`/api/migration-tasks/${taskId}/start`, { method: "POST" });
    showAlert("任务已重新启动", "success");
    await loadMigrationTasks();
  } catch (error) {
    showAlert("重新运行任务失败: " + error.message, "danger");
  }
}

// 复制任务
async function duplicateTask(taskId) {
  const task = migrationTasks.find((t) => t.id === taskId);
  if (!task) {
    showAlert("任务不存在", "danger");
    return;
  }

  try {
    // 创建任务副本
    const duplicatedTask = {
      name: `${task.name} - 副本`,
      source_database: task.source_database,
      target_database: task.target_database,
      duplicate_strategy: task.duplicate_strategy,
      table_strategy: task.table_strategy,
      tables: task.tables,
    };

    await apiCall("/api/migration-tasks", {
      method: "POST",
      body: JSON.stringify(duplicatedTask),
    });

    showAlert("任务已复制", "success");
    await loadMigrationTasks();
  } catch (error) {
    showAlert("复制任务失败: " + error.message, "danger");
  }
}

// 查看任务进度（增强版）
function viewTaskProgress(taskId) {
  const task = migrationTasks.find((t) => t.id === taskId);
  if (!task) return;

  const modalContent = `
        <div class="task-progress-monitor">
            <div class="row mb-4">
                <div class="col-md-6">
                    <div class="progress-info-card">
                        <h6 class="text-primary mb-3">
                            <i class="bi bi-speedometer2 me-2"></i>执行进度
                        </h6>
                        <div class="progress mb-2" style="height: 20px;">
                            <div class="progress-bar bg-primary progress-bar-striped progress-bar-animated" 
                                 style="width: ${task.progress || 0}%">
                                ${task.progress || 0}%
                            </div>
                        </div>
                        <div class="d-flex justify-content-between">
                            <small class="text-muted">当前表: <span class="current-table ${
                              task.current_table ? "text-info" : "text-muted"
                            }">${task.current_table || "无"}</span></small>
                            <small class="text-muted">状态: <span class="task-status ${
                              getStatusInfo(task.status).class
                            }">${getStatusInfo(task.status).text}</span></small>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="progress-stats-card">
                        <h6 class="text-success mb-3">
                            <i class="bi bi-bar-chart me-2"></i>处理统计
                        </h6>
                        <div class="stat-row">
                            <span>已处理记录:</span>
                            <span class="processed-records fw-bold text-success">
                                <span class="text-success fw-bold">${(
                                  task.processed_records || 0
                                ).toLocaleString()}</span>
                                <span class="text-muted">/ ${(
                                  task.total_records || 0
                                ).toLocaleString()}</span>
                            </span>
                        </div>
                        <div class="stat-row">
                            <span>总记录数:</span>
                            <span class="fw-bold">${(
                              task.total_records || 0
                            ).toLocaleString()}</span>
                        </div>
                        <div class="stat-row">
                            <span>处理速度:</span>
                            <span class="processing-speed fw-bold text-info">${calculateProcessingSpeed(
                              task
                            )} 条/秒</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="row mb-4">
                <div class="col-12">
                    <div class="time-info-card">
                        <h6 class="text-info mb-3">
                            <i class="bi bi-clock me-2"></i>时间信息
                        </h6>
                        <div class="row">
                            <div class="col-md-4">
                                <div class="time-item">
                                    <small class="text-muted">开始时间</small>
                                    <div>${
                                      formatDateTime(task.start_at) || "未开始"
                                    }</div>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="time-item">
                                    <small class="text-muted">运行时长</small>
                                    <div class="duration">${calculateDuration(
                                      task.start_at,
                                      task.end_at
                                    )}</div>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="time-item">
                                    <small class="text-muted">预计完成</small>
                                    <div class="estimate-completion">${estimateCompletion(
                                      task
                                    )}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            ${
              task.error_message
                ? `
            <div class="alert alert-danger">
                <h6><i class="bi bi-exclamation-triangle me-2"></i>错误信息</h6>
                <p class="mb-0">${task.error_message}</p>
            </div>
            `
                : ""
            }
            
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <button type="button" class="btn btn-outline-primary btn-sm" onclick="refreshTaskProgress('${
                      task.id
                    }')">
                        <i class="bi bi-arrow-clockwise me-1"></i>刷新进度
                    </button>
                </div>
                <div>
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">关闭</button>
                    ${
                      task.status === "running"
                        ? `
                    <button type="button" class="btn btn-warning" onclick="pauseTask('${task.id}')" data-bs-dismiss="modal">
                        <i class="bi bi-pause me-1"></i>暂停任务
                    </button>
                    <button type="button" class="btn btn-danger" onclick="stopTask('${task.id}')" data-bs-dismiss="modal">
                        <i class="bi bi-stop me-1"></i>停止任务
                    </button>
                    `
                        : ""
                    }
                </div>
            </div>
        </div>
        
        <style>
            .progress-info-card, .progress-stats-card, .time-info-card {
                padding: 1rem;
                background: rgba(var(--primary-rgb), 0.05);
                border-radius: 8px;
                border-left: 4px solid var(--primary-color);
            }
            
            .stat-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 0.5rem;
            }
            
            .time-item {
                text-align: center;
                padding: 0.5rem;
            }
            
            .time-item small {
                display: block;
                margin-bottom: 0.25rem;
            }
        </style>
    `;

  showCustomModal(`任务进度监控 - ${task.name}`, modalContent);
}

// 刷新任务进度
async function refreshTaskProgress(taskId) {
  try {
    await loadMigrationTasks();

    // 更新现有模态框的内容，而不是重新打开
    const task = migrationTasks.find((t) => t.id === taskId);
    if (!task) {
      showAlert("任务不存在", "danger");
      return;
    }

    // 更新模态框内容
    updateTaskProgressModal(task);
  } catch (error) {
    showAlert("刷新进度失败: " + error.message, "danger");
  }
}

// 更新任务进度模态框内容
function updateTaskProgressModal(task) {
  const modal = document.getElementById("customTaskModal");
  if (!modal) return;

  const modalBody = modal.querySelector(".modal-body");
  if (!modalBody) return;

  // 更新进度条
  const progressBar = modalBody.querySelector(".progress-bar");
  if (progressBar) {
    progressBar.style.width = `${task.progress || 0}%`;
    progressBar.textContent = `${task.progress || 0}%`;
  }

  // 更新处理记录数
  const processedRecordsElement = modalBody.querySelector(".processed-records");
  if (processedRecordsElement) {
    processedRecordsElement.innerHTML = `
      <span class="text-success fw-bold">${(
        task.processed_records || 0
      ).toLocaleString()}</span>
      <span class="text-muted">/ ${(
        task.total_records || 0
      ).toLocaleString()}</span>
    `;
  }

  // 更新当前表
  const currentTableElement = modalBody.querySelector(".current-table");
  if (currentTableElement) {
    currentTableElement.textContent = task.current_table || "无";
    currentTableElement.className = `current-table ${
      task.current_table ? "text-info" : "text-muted"
    }`;
  }

  // 更新状态
  const statusElement = modalBody.querySelector(".task-status");
  if (statusElement) {
    const statusInfo = getStatusInfo(task.status);
    statusElement.textContent = statusInfo.text;
    statusElement.className = `task-status ${statusInfo.class}`;
  }

  // 更新处理速度
  const speedElement = modalBody.querySelector(".processing-speed");
  if (speedElement) {
    speedElement.textContent = `${calculateProcessingSpeed(task)} 条/秒`;
  }

  // 更新运行时长
  const durationElement = modalBody.querySelector(".duration");
  if (durationElement) {
    durationElement.textContent = calculateDuration(task.start_at, task.end_at);
  }

  // 更新预计完成时间
  const estimateElement = modalBody.querySelector(".estimate-completion");
  if (estimateElement) {
    estimateElement.textContent = estimateCompletion(task);
  }
}

// 计算处理速度
function calculateProcessingSpeed(task) {
  if (
    !task.start_at ||
    !task.processed_records ||
    task.processed_records === 0
  ) {
    return "0";
  }

  const startTime = new Date(task.start_at);
  const now = new Date();
  const durationSeconds = (now - startTime) / 1000;

  if (durationSeconds <= 0) return "0";

  const speed = task.processed_records / durationSeconds;
  return speed.toFixed(1);
}

// 估算完成时间
function estimateCompletion(task) {
  if (
    !task.start_at ||
    !task.total_records ||
    !task.processed_records ||
    task.processed_records === 0 ||
    task.progress >= 100
  ) {
    return "无法估算";
  }

  const startTime = new Date(task.start_at);
  const now = new Date();
  const elapsedSeconds = (now - startTime) / 1000;

  const remainingRecords = task.total_records - task.processed_records;
  const processingSpeed = task.processed_records / elapsedSeconds;

  if (processingSpeed <= 0) return "无法估算";

  const remainingSeconds = remainingRecords / processingSpeed;
  const estimatedCompletion = new Date(now.getTime() + remainingSeconds * 1000);

  return formatDateTime(estimatedCompletion);
}
