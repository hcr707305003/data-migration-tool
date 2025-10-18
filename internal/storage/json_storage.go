package storage

import (
	"data-migration-tool/internal/models"
	"encoding/json"
	"io/ioutil"
	"log"
	"os"
	"path/filepath"
	"sync"
	"time"
)

type JSONStorage struct {
	dataDir string
	mutex   sync.RWMutex
}

func NewJSONStorage(dataDir string) *JSONStorage {
	storage := &JSONStorage{
		dataDir: dataDir,
	}
	
	// 自动初始化数据目录和文件
	if err := storage.Initialize(); err != nil {
		// 记录错误但不中断程序
		log.Printf("警告: 初始化数据目录失败: %v", err)
	}
	
	return storage
}

// Initialize 初始化数据目录和必要的JSON文件
func (s *JSONStorage) Initialize() error {
	// 创建数据目录
	if err := os.MkdirAll(s.dataDir, 0755); err != nil {
		return err
	}
	
	log.Printf("数据目录已初始化: %s", s.dataDir)
	
	// 初始化所有必要的JSON文件
	if err := s.initializeDataFiles(); err != nil {
		return err
	}
	
	log.Printf("数据文件初始化完成")
	return nil
}

// initializeDataFiles 初始化所有数据文件
func (s *JSONStorage) initializeDataFiles() error {
	// 定义需要初始化的文件和默认数据
	files := map[string]interface{}{
		"datasources":       s.getDefaultDataSources(),
		"filter_templates":  s.getDefaultFilterTemplates(),
		"masking_rules":     s.getDefaultMaskingRules(),
		"masking_types":     s.getDefaultMaskingTypes(),
		"table_migrations":  []models.TableMigration{},
		"migration_tasks":   []models.MigrationTask{},
		"migration_records": []models.MigrationRecord{},
	}
	
	for filename, defaultData := range files {
		filePath := s.getFilePath(filename)
		
		// 检查文件是否存在
		if _, err := os.Stat(filePath); os.IsNotExist(err) {
			// 文件不存在，创建默认文件
			if err := s.saveData(filename, defaultData); err != nil {
				return err
			}
			log.Printf("已创建默认文件: %s", filename+".json")
		}
	}
	
	return nil
}

// getDefaultDataSources 获取默认数据源配置（空数组）
func (s *JSONStorage) getDefaultDataSources() []models.DataSource {
	return []models.DataSource{}
}

// getDefaultFilterTemplates 获取默认过滤模板
func (s *JSONStorage) getDefaultFilterTemplates() []models.FilterTemplate {
	now := time.Now()
	return []models.FilterTemplate{
		{
			ID:          "default-active-users",
			Name:        "活跃用户过滤模板",
			Description: "筛选最近30天活跃的用户",
			Conditions: []models.FilterCondition{
				{
					Field:    "status",
					Operator: "=",
					Value:    "active",
					Logic:    "AND",
				},
				{
					Field:    "last_login",
					Operator: ">=",
					Value:    "DATE_SUB(NOW(), INTERVAL 30 DAY)",
					Logic:    "AND",
				},
			},
			Enabled:  true,
			CreateAt: now,
		},
		{
			ID:          "default-recent-orders",
			Name:        "近期订单过滤模板",
			Description: "筛选最近一年的订单",
			Conditions: []models.FilterCondition{
				{
					Field:    "order_date",
					Operator: ">=",
					Value:    "DATE_SUB(NOW(), INTERVAL 1 YEAR)",
					Logic:    "AND",
				},
				{
					Field:    "status",
					Operator: "IN",
					Value:    "('completed', 'shipped', 'delivered')",
					Logic:    "AND",
				},
			},
			Enabled:  true,
			CreateAt: now,
		},
	}
}

// getDefaultMaskingRules 获取默认脱敏规则
func (s *JSONStorage) getDefaultMaskingRules() []models.MaskingRule {
	now := time.Now()
	return []models.MaskingRule{
		{
			ID:       "default-phone-masking",
			Name:     "手机号标准脱敏",
			Type:     "phone",
			Pattern:  "^(\\d{3})(\\d{4})(\\d{4})$",
			Replace:  "$1****$3",
			Enabled:  true,
			CreateAt: now,
		},
		{
			ID:       "default-email-masking",
			Name:     "邮箱标准脱敏",
			Type:     "email",
			Pattern:  "^([^@]{1})[^@]*(@.+)$",
			Replace:  "$1***$2",
			Enabled:  true,
			CreateAt: now,
		},
		{
			ID:       "default-idcard-masking",
			Name:     "身份证标准脱敏",
			Type:     "idcard",
			Pattern:  "^(\\d{6})(\\d{8})(\\d{4})$",
			Replace:  "$1********$3",
			Enabled:  true,
			CreateAt: now,
		},
		{
			ID:       "default-name-masking",
			Name:     "姓名脱敏规则",
			Type:     "name",
			Pattern:  "^(.)(.+)$",
			Replace:  "$1**",
			Enabled:  true,
			CreateAt: now,
		},
		{
			ID:       "default-bankcard-masking",
			Name:     "银行卡号脱敏",
			Type:     "bank_card",
			Pattern:  "^(\\d{4})(\\d{8,12})(\\d{4})$",
			Replace:  "$1********$3",
			Enabled:  true,
			CreateAt: now,
		},
		{
			ID:       "default-address-masking",
			Name:     "地址脱敏规则",
			Type:     "address",
			Pattern:  "^([\\p{Han}]{2,4}[省市])(.+)$",
			Replace:  "$1****",
			Enabled:  true,
			CreateAt: now,
		},
		{
			ID:       "default-ip-masking",
			Name:     "IP地址脱敏",
			Type:     "ip",
			Pattern:  "^(\\d{1,3}\\.\\d{1,3})\\.(\\d{1,3})\\.(\\d{1,3})$",
			Replace:  "$1.*.*",
			Enabled:  true,
			CreateAt: now,
		},
		{
			ID:       "default-general-masking",
			Name:     "通用首尾保留脱敏",
			Type:     "keep_head_tail",
			Pattern:  "^(.{1,2})(.+)(.{1,2})$",
			Replace:  "$1***$3",
			Enabled:  true,
			CreateAt: now,
		},
	}
}

// getDefaultMaskingTypes 获取默认脱敏类型
func (s *JSONStorage) getDefaultMaskingTypes() []models.MaskingType {
	now := time.Now()
	return []models.MaskingType{
		{
			ID:          "keep_head_tail",
			Name:        "保留首尾-通用",
			Description: "保留字符串首尾部分，中间用星号替换，适用于所有字符类型",
			Icon:        "bi-arrow-left-right",
			Category:    "通用模板",
			Enabled:     true,
			Templates: []models.MaskingTemplate{
				{
					Name:        "标准保留首尾",
					Description: "保留前1-2个和后1-2个字符",
					Pattern:     "^(.{1,2})(.+)(.{1,2})$",
					Replace:     "$1***$3",
					Example:     "测试数据 -> 测***据",
				},
				{
					Name:        "保留更多首尾",
					Description: "保留前2-3个和后2-3个字符",
					Pattern:     "^(.{2,3})(.+)(.{2,3})$",
					Replace:     "$1****$3",
					Example:     "测试数据内容 -> 测试****容",
				},
			},
			CreateAt: now,
		},
		{
			ID:          "keep_head",
			Name:        "保留开头-通用",
			Description: "只保留字符串开头部分，后面用星号替换",
			Icon:        "bi-arrow-right",
			Category:    "通用模板",
			Enabled:     true,
			Templates: []models.MaskingTemplate{
				{
					Name:        "保留前1-3个字符",
					Description: "保留开头1-3个字符",
					Pattern:     "^(.{1,3})(.+)$",
					Replace:     "$1***",
					Example:     "测试数据 -> 测试***",
				},
				{
					Name:        "保留前2-4个字符",
					Description: "保留开头2-4个字符",
					Pattern:     "^(.{2,4})(.+)$",
					Replace:     "$1****",
					Example:     "测试数据内容 -> 测试数****",
				},
			},
			CreateAt: now,
		},
		{
			ID:          "keep_tail",
			Name:        "保留结尾-通用",
			Description: "只保留字符串结尾部分，前面用星号替换",
			Icon:        "bi-arrow-left",
			Category:    "通用模板",
			Enabled:     true,
			Templates: []models.MaskingTemplate{
				{
					Name:        "保留后1-3个字符",
					Description: "保留结尾1-3个字符",
					Pattern:     "^(.+)(.{1,3})$",
					Replace:     "***$2",
					Example:     "测试数据 -> ***据",
				},
				{
					Name:        "保留后2-4个字符",
					Description: "保留结尾2-4个字符",
					Pattern:     "^(.+)(.{2,4})$",
					Replace:     "****$2",
					Example:     "测试数据内容 -> ****内容",
				},
			},
			CreateAt: now,
		},
		{
			ID:          "full_mask",
			Name:        "全部脱敏",
			Description: "将整个字符串替换为星号",
			Icon:        "bi-eye-slash",
			Category:    "通用模板",
			Enabled:     true,
			Templates: []models.MaskingTemplate{
				{
					Name:        "完全隐藏",
					Description: "全部替换为固定长度星号",
					Pattern:     "^(.+)$",
					Replace:     "****",
					Example:     "任何数据 -> ****",
				},
			},
			CreateAt: now,
		},
		{
			ID:          "phone",
			Name:        "手机号",
			Description: "手机号码脱敏",
			Icon:        "bi-telephone",
			Category:    "常用类型",
			Enabled:     true,
			Templates: []models.MaskingTemplate{
				{
					Name:        "标准脱敏",
					Description: "保留前3位和后4位",
					Pattern:     "^(\\d{3})(\\d{4})(\\d{4})$",
					Replace:     "$1****$3",
					Example:     "13812345678 -> 138****5678",
				},
				{
					Name:        "保留前3位",
					Description: "只保留前3位数字",
					Pattern:     "^(\\d{3})(\\d{8})$",
					Replace:     "$1********",
					Example:     "13812345678 -> 138********",
				},
			},
			CreateAt: now,
		},
		{
			ID:          "email",
			Name:        "邮箱",
			Description: "电子邮箱地址脱敏",
			Icon:        "bi-envelope",
			Category:    "常用类型",
			Enabled:     true,
			Templates: []models.MaskingTemplate{
				{
					Name:        "标准脱敏",
					Description: "保留首字符和域名",
					Pattern:     "^([^@]{1})[^@]*(@.+)$",
					Replace:     "$1***$2",
					Example:     "user@example.com -> u***@example.com",
				},
				{
					Name:        "保留前缀",
					Description: "保留前3个字符",
					Pattern:     "^([^@]{1,3})[^@]*(@.+)$",
					Replace:     "$1***$2",
					Example:     "user@example.com -> use***@example.com",
				},
			},
			CreateAt: now,
		},
		{
			ID:          "idcard",
			Name:        "身份证",
			Description: "身份证号码脱敏",
			Icon:        "bi-person-badge",
			Category:    "常用类型",
			Enabled:     true,
			Templates: []models.MaskingTemplate{
				{
					Name:        "标准脱敏",
					Description: "保留前6位和后4位",
					Pattern:     "^(\\d{6})(\\d{8})(\\d{4})$",
					Replace:     "$1********$3",
					Example:     "110101199001011234 -> 110101********1234",
				},
				{
					Name:        "保留年份",
					Description: "保留前6位和年份",
					Pattern:     "^(\\d{6})(\\d{4})(\\d{4})(\\d{4})$",
					Replace:     "$1$2****$4",
					Example:     "110101199001011234 -> 1101011990****1234",
				},
			},
			CreateAt: now,
		},
		{
			ID:          "bank_card",
			Name:        "银行卡号",
			Description: "银行卡号脱敏",
			Icon:        "bi-credit-card",
			Category:    "常用类型",
			Enabled:     true,
			Templates: []models.MaskingTemplate{
				{
					Name:        "标准脱敏",
					Description: "保留前4位和后4位",
					Pattern:     "^(\\d{4})(\\d{8,12})(\\d{4})$",
					Replace:     "$1********$3",
					Example:     "6222021234567890 -> 6222********7890",
				},
				{
					Name:        "保留前6位",
					Description: "保留银行标识码",
					Pattern:     "^(\\d{6})(\\d{6,10})(\\d{4})$",
					Replace:     "$1******$3",
					Example:     "6222021234567890 -> 622202******7890",
				},
			},
			CreateAt: now,
		},
		{
			ID:          "name",
			Name:        "姓名",
			Description: "人员姓名脱敏",
			Icon:        "bi-person",
			Category:    "个人信息",
			Enabled:     true,
			Templates: []models.MaskingTemplate{
				{
					Name:        "保留姓氏",
					Description: "保留第一个字符",
					Pattern:     "^(.)(.+)$",
					Replace:     "$1**",
					Example:     "张三丰 -> 张**",
				},
				{
					Name:        "保留首尾",
					Description: "保留首尾字符",
					Pattern:     "^(.)(.+)(.)$",
					Replace:     "$1*$3",
					Example:     "张三丰 -> 张*丰",
				},
			},
			CreateAt: now,
		},
		{
			ID:          "chinese_name",
			Name:        "中文姓名",
			Description: "中文姓名专用脱敏",
			Icon:        "bi-person-circle",
			Category:    "个人信息",
			Enabled:     true,
			Templates: []models.MaskingTemplate{
				{
					Name:        "保留姓氏",
					Description: "保留中文姓氏",
					Pattern:     "^([\\p{Han}])([\\p{Han}]+)$",
					Replace:     "$1**",
					Example:     "王小明 -> 王**",
				},
				{
					Name:        "保留首尾",
					Description: "保留首尾中文字符",
					Pattern:     "^([\\p{Han}])([\\p{Han}]+)([\\p{Han}])$",
					Replace:     "$1*$3",
					Example:     "王小明 -> 王*明",
				},
			},
			CreateAt: now,
		},
		{
			ID:          "address",
			Name:        "地址",
			Description: "地址信息脱敏",
			Icon:        "bi-geo-alt",
			Category:    "个人信息",
			Enabled:     true,
			Templates: []models.MaskingTemplate{
				{
					Name:        "保留省市",
					Description: "保留省市信息",
					Pattern:     "^([\\p{Han}]{2,4}[省市])(.+)$",
					Replace:     "$1****",
					Example:     "北京市朝阳区建国门 -> 北京市****",
				},
				{
					Name:        "详细地址脱敏",
					Description: "保留前后部分",
					Pattern:     "^(.{2,6})(.+)(.{2,6})$",
					Replace:     "$1****$3",
					Example:     "北京市朝阳区建国门外大街1号 -> 北京市****1号",
				},
			},
			CreateAt: now,
		},
		{
			ID:          "company",
			Name:        "企业信息",
			Description: "企业相关信息脱敏",
			Icon:        "bi-building",
			Category:    "企业信息",
			Enabled:     true,
			Templates: []models.MaskingTemplate{
				{
					Name:        "企业名称脱敏",
					Description: "保留前缀和后缀",
					Pattern:     "^([\\p{Han}]{2,4})(.+)(有限公司|股份有限公司|集团|科技|贸易)$",
					Replace:     "$1***$3",
					Example:     "北京测试科技有限公司 -> 北京***有限公司",
				},
				{
					Name:        "统一社会信用代码",
					Description: "保留前6位和后4位",
					Pattern:     "^([0-9A-HJ-NPQRTUWXY]{2}\\d{6})(\\d{8})([0-9A-HJ-NPQRTUWXY]{2})$",
					Replace:     "$1********$3",
					Example:     "91110000123456781X -> 91110000********1X",
				},
			},
			CreateAt: now,
		},
		{
			ID:          "license",
			Name:        "车牌号",
			Description: "车牌号码脱敏",
			Icon:        "bi-car-front",
			Category:    "企业信息",
			Enabled:     true,
			Templates: []models.MaskingTemplate{
				{
					Name:        "标准车牌脱敏",
					Description: "保留省份和最后一位",
					Pattern:     "^([\\p{Han}][A-Z])(\\w{4})([A-Z0-9])$",
					Replace:     "$1***$3",
					Example:     "京A12345 -> 京A***5",
				},
				{
					Name:        "新能源车牌",
					Description: "保留省份和能源标识",
					Pattern:     "^([\\p{Han}][A-Z])(\\d{4})([DF])$",
					Replace:     "$1****$3",
					Example:     "京A1234D -> 京A****D",
				},
			},
			CreateAt: now,
		},
		{
			ID:          "ip",
			Name:        "IP地址",
			Description: "IP地址脱敏",
			Icon:        "bi-router",
			Category:    "网络信息",
			Enabled:     true,
			Templates: []models.MaskingTemplate{
				{
					Name:        "标准脱敏",
					Description: "保留前两段IP",
					Pattern:     "^(\\d{1,3}\\.\\d{1,3})\\.(\\d{1,3})\\.(\\d{1,3})$",
					Replace:     "$1.*.*",
					Example:     "192.168.1.100 -> 192.168.*.*",
				},
				{
					Name:        "完全隐藏",
					Description: "全部替换为星号",
					Pattern:     "^\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}$",
					Replace:     "*.*.*.*",
					Example:     "192.168.1.100 -> *.*.*.*",
				},
			},
			CreateAt: now,
		},
		{
			ID:          "passport",
			Name:        "护照",
			Description: "护照号码脱敏",
			Icon:        "bi-passport",
			Category:    "个人信息",
			Enabled:     true,
			Templates: []models.MaskingTemplate{
				{
					Name:        "标准护照脱敏",
					Description: "保留前2位和后2位",
					Pattern:     "^([A-Z]{1,2})(\\d{6})(\\d{1,2})$",
					Replace:     "$1******$3",
					Example:     "E12345678 -> E******78",
				},
				{
					Name:        "保留类型",
					Description: "只保留护照类型",
					Pattern:     "^([A-Z]{1,2})(\\d{7,8})$",
					Replace:     "$1*******",
					Example:     "E12345678 -> E*******",
				},
			},
			CreateAt: now,
		},
		{
			ID:          "custom",
			Name:        "自定义",
			Description: "自定义脱敏规则",
			Icon:        "bi-gear",
			Category:    "其他",
			Enabled:     true,
			Templates: []models.MaskingTemplate{
				{
					Name:        "通用模板",
					Description: "根据需要自定义",
					Pattern:     "^(.+)$",
					Replace:     "****",
					Example:     "自定义数据 -> ****",
				},
			},
			CreateAt: now,
		},
	}
}

func (s *JSONStorage) getFilePath(filename string) string {
	return filepath.Join(s.dataDir, filename+".json")
}

func (s *JSONStorage) loadData(filename string, data interface{}) error {
	s.mutex.RLock()
	defer s.mutex.RUnlock()
	
	filePath := s.getFilePath(filename)
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		// 文件不存在时，初始化为空数组
		switch v := data.(type) {
		case *[]models.DataSource:
			*v = []models.DataSource{}
		case *[]models.FilterTemplate:
			*v = []models.FilterTemplate{}
		case *[]models.MaskingRule:
			*v = []models.MaskingRule{}
		case *[]models.MaskingType:
			*v = []models.MaskingType{}
		case *[]models.TableMigration:
			*v = []models.TableMigration{}
		case *[]models.MigrationTask:
			*v = []models.MigrationTask{}
		case *[]models.MigrationRecord:
			*v = []models.MigrationRecord{}
		}
		return nil
	}
	
	content, err := ioutil.ReadFile(filePath)
	if err != nil {
		return err
	}
	
	if len(content) == 0 {
		// 文件为空时，也初始化为空数组
		switch v := data.(type) {
		case *[]models.DataSource:
			*v = []models.DataSource{}
		case *[]models.FilterTemplate:
			*v = []models.FilterTemplate{}
		case *[]models.MaskingRule:
			*v = []models.MaskingRule{}
		case *[]models.MaskingType:
			*v = []models.MaskingType{}
		case *[]models.TableMigration:
			*v = []models.TableMigration{}
		case *[]models.MigrationTask:
			*v = []models.MigrationTask{}
		case *[]models.MigrationRecord:
			*v = []models.MigrationRecord{}
		}
		return nil
	}
	
	return json.Unmarshal(content, data)
}

func (s *JSONStorage) saveData(filename string, data interface{}) error {
	s.mutex.Lock()
	defer s.mutex.Unlock()
	
	content, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return err
	}
	
	filePath := s.getFilePath(filename)
	return ioutil.WriteFile(filePath, content, 0644)
}

// 数据源管理
func (s *JSONStorage) GetDataSources() ([]models.DataSource, error) {
	var dataSources []models.DataSource
	err := s.loadData("datasources", &dataSources)
	return dataSources, err
}

func (s *JSONStorage) SaveDataSource(ds models.DataSource) error {
	dataSources, err := s.GetDataSources()
	if err != nil {
		return err
	}
	
	// 更新或添加
	found := false
	for i, existing := range dataSources {
		if existing.ID == ds.ID {
			dataSources[i] = ds
			found = true
			break
		}
	}
	
	if !found {
		dataSources = append(dataSources, ds)
	}
	
	return s.saveData("datasources", dataSources)
}

func (s *JSONStorage) DeleteDataSource(id string) error {
	dataSources, err := s.GetDataSources()
	if err != nil {
		return err
	}
	
	for i, ds := range dataSources {
		if ds.ID == id {
			dataSources = append(dataSources[:i], dataSources[i+1:]...)
			break
		}
	}
	
	return s.saveData("datasources", dataSources)
}

// 过滤模板管理
func (s *JSONStorage) GetFilterTemplates() ([]models.FilterTemplate, error) {
	var templates []models.FilterTemplate
	err := s.loadData("filter_templates", &templates)
	return templates, err
}

func (s *JSONStorage) SaveFilterTemplate(template models.FilterTemplate) error {
	templates, err := s.GetFilterTemplates()
	if err != nil {
		return err
	}
	
	found := false
	for i, existing := range templates {
		if existing.ID == template.ID {
			templates[i] = template
			found = true
			break
		}
	}
	
	if !found {
		templates = append(templates, template)
	}
	
	return s.saveData("filter_templates", templates)
}

func (s *JSONStorage) DeleteFilterTemplate(id string) error {
	templates, err := s.GetFilterTemplates()
	if err != nil {
		return err
	}
	
	for i, template := range templates {
		if template.ID == id {
			templates = append(templates[:i], templates[i+1:]...)
			break
		}
	}
	
	return s.saveData("filter_templates", templates)
}

// 脱敏规则管理
func (s *JSONStorage) GetMaskingRules() ([]models.MaskingRule, error) {
	var rules []models.MaskingRule
	err := s.loadData("masking_rules", &rules)
	return rules, err
}

func (s *JSONStorage) SaveMaskingRule(rule models.MaskingRule) error {
	rules, err := s.GetMaskingRules()
	if err != nil {
		return err
	}
	
	found := false
	for i, existing := range rules {
		if existing.ID == rule.ID {
			rules[i] = rule
			found = true
			break
		}
	}
	
	if !found {
		rules = append(rules, rule)
	}
	
	return s.saveData("masking_rules", rules)
}

func (s *JSONStorage) DeleteMaskingRule(id string) error {
	rules, err := s.GetMaskingRules()
	if err != nil {
		return err
	}
	
	for i, rule := range rules {
		if rule.ID == id {
			rules = append(rules[:i], rules[i+1:]...)
			break
		}
	}
	
	return s.saveData("masking_rules", rules)
}

// 表迁移配置管理
func (s *JSONStorage) GetTableMigrations() ([]models.TableMigration, error) {
	var migrations []models.TableMigration
	err := s.loadData("table_migrations", &migrations)
	return migrations, err
}

func (s *JSONStorage) SaveTableMigration(migration models.TableMigration) error {
	migrations, err := s.GetTableMigrations()
	if err != nil {
		return err
	}
	
	found := false
	for i, existing := range migrations {
		if existing.ID == migration.ID {
			migrations[i] = migration
			found = true
			break
		}
	}
	
	if !found {
		migrations = append(migrations, migration)
	}
	
	return s.saveData("table_migrations", migrations)
}

func (s *JSONStorage) DeleteTableMigration(id string) error {
	migrations, err := s.GetTableMigrations()
	if err != nil {
		return err
	}
	
	for i, migration := range migrations {
		if migration.ID == id {
			migrations = append(migrations[:i], migrations[i+1:]...)
			break
		}
	}
	
	return s.saveData("table_migrations", migrations)
}

// 迁移任务管理
func (s *JSONStorage) GetMigrationTasks() ([]models.MigrationTask, error) {
	var tasks []models.MigrationTask
	err := s.loadData("migration_tasks", &tasks)
	
	// 如果解析失败（可能是格式不兼容），返回空数组并清空文件
	if err != nil {
		// 清空不兼容的数据
		s.saveData("migration_tasks", []models.MigrationTask{})
		return []models.MigrationTask{}, nil
	}
	
	return tasks, nil
}

func (s *JSONStorage) SaveMigrationTask(task models.MigrationTask) error {
	tasks, err := s.GetMigrationTasks()
	if err != nil {
		return err
	}
	
	found := false
	for i, existing := range tasks {
		if existing.ID == task.ID {
			tasks[i] = task
			found = true
			break
		}
	}
	
	if !found {
		tasks = append(tasks, task)
	}
	
	return s.saveData("migration_tasks", tasks)
}

func (s *JSONStorage) DeleteMigrationTask(id string) error {
	tasks, err := s.GetMigrationTasks()
	if err != nil {
		return err
	}
	
	for i, task := range tasks {
		if task.ID == id {
			tasks = append(tasks[:i], tasks[i+1:]...)
			break
		}
	}
	
	return s.saveData("migration_tasks", tasks)
}

// 迁移记录管理
func (s *JSONStorage) GetMigrationRecords() ([]models.MigrationRecord, error) {
	var records []models.MigrationRecord
	err := s.loadData("migration_records", &records)
	return records, err
}

func (s *JSONStorage) SaveMigrationRecord(record models.MigrationRecord) error {
	records, err := s.GetMigrationRecords()
	if err != nil {
		return err
	}
	
	records = append(records, record)
	return s.saveData("migration_records", records)
}

func (s *JSONStorage) GetMigrationRecordsByTaskID(taskID string) ([]models.MigrationRecord, error) {
	records, err := s.GetMigrationRecords()
	if err != nil {
		return nil, err
	}
	
	var taskRecords []models.MigrationRecord
	for _, record := range records {
		if record.TaskID == taskID {
			taskRecords = append(taskRecords, record)
		}
	}
	
	return taskRecords, nil
}

// 脱敏类型管理
func (s *JSONStorage) GetMaskingTypes() ([]models.MaskingType, error) {
	var types []models.MaskingType
	err := s.loadData("masking_types", &types)
	return types, err
}

func (s *JSONStorage) SaveMaskingType(maskingType models.MaskingType) error {
	types, err := s.GetMaskingTypes()
	if err != nil {
		return err
	}
	
	// 查找是否存在相同ID的类型
	found := false
	for i, t := range types {
		if t.ID == maskingType.ID {
			types[i] = maskingType
			found = true
			break
		}
	}
	
	// 如果不存在，添加新类型
	if !found {
		types = append(types, maskingType)
	}
	
	return s.saveData("masking_types", types)
}

func (s *JSONStorage) DeleteMaskingType(id string) error {
	types, err := s.GetMaskingTypes()
	if err != nil {
		return err
	}
	
	// 过滤掉要删除的类型
	var filteredTypes []models.MaskingType
	for _, t := range types {
		if t.ID != id {
			filteredTypes = append(filteredTypes, t)
		}
	}
	
	return s.saveData("masking_types", filteredTypes)
}