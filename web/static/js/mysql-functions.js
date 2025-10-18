// MySQL函数模板库

const MYSQL_FUNCTIONS = {
    // 日期时间函数
    'DATE': {
        template: 'DATE({datetime})',
        description: '提取日期部分',
        params: [
            { name: 'datetime', type: 'text', description: '日期时间字段' }
        ],
        examples: [
            'DATE(NOW())',
            'DATE(created_at)'
        ]
    },
    'DAYOFWEEK': {
        template: 'DAYOFWEEK({date})',
        description: '返回日期的星期几(1=周日,7=周六)',
        params: [
            { name: 'date', type: 'text', description: '日期字段' }
        ],
        examples: [
            'DAYOFWEEK(NOW())',
            'DAYOFWEEK(created_at)'
        ]
    },
    'DAYOFMONTH': {
        template: 'DAYOFMONTH({date})',
        description: '返回日期的天数(1-31)',
        params: [
            { name: 'date', type: 'text', description: '日期字段' }
        ],
        examples: [
            'DAYOFMONTH(NOW())',
            'DAYOFMONTH(created_at)'
        ]
    },
    'DAYOFYEAR': {
        template: 'DAYOFYEAR({date})',
        description: '返回日期在年中的天数(1-366)',
        params: [
            { name: 'date', type: 'text', description: '日期字段' }
        ],
        examples: [
            'DAYOFYEAR(NOW())',
            'DAYOFYEAR(created_at)'
        ]
    },
    'DAYNAME': {
        template: 'DAYNAME({date})',
        description: '返回日期的星期名称',
        params: [
            { name: 'date', type: 'text', description: '日期字段' }
        ],
        examples: [
            'DAYNAME(NOW())',
            'DAYNAME(created_at)'
        ]
    },
    'DATE_SUB': {
        template: 'DATE_SUB(NOW(), INTERVAL {value} {unit})',
        description: '从日期减去指定的时间间隔',
        params: [
            { name: 'value', type: 'number', description: '时间值' },
            { name: 'unit', type: 'select', options: ['DAY', 'WEEK', 'MONTH', 'YEAR', 'HOUR', 'MINUTE', 'SECOND'], description: '时间单位' }
        ],
        examples: [
            'DATE_SUB(NOW(), INTERVAL 30 DAY)',
            'DATE_SUB(NOW(), INTERVAL 1 MONTH)',
            'DATE_SUB(NOW(), INTERVAL 1 YEAR)'
        ]
    },
    'DATE_ADD': {
        template: 'DATE_ADD(NOW(), INTERVAL {value} {unit})',
        description: '向日期添加指定的时间间隔',
        params: [
            { name: 'value', type: 'number', description: '时间值' },
            { name: 'unit', type: 'select', options: ['DAY', 'WEEK', 'MONTH', 'YEAR', 'HOUR', 'MINUTE', 'SECOND'], description: '时间单位' }
        ],
        examples: [
            'DATE_ADD(NOW(), INTERVAL 30 DAY)',
            'DATE_ADD(NOW(), INTERVAL 1 MONTH)',
            'DATE_ADD(NOW(), INTERVAL 1 YEAR)'
        ]
    },
    'NOW': {
        template: 'NOW()',
        description: '返回当前日期和时间',
        params: [],
        examples: ['NOW()']
    },
    'CURDATE': {
        template: 'CURDATE()',
        description: '返回当前日期',
        params: [],
        examples: ['CURDATE()']
    },
    'CURTIME': {
        template: 'CURTIME()',
        description: '返回当前时间',
        params: [],
        examples: ['CURTIME()']
    },
    'DATE_FORMAT': {
        template: 'DATE_FORMAT({date}, \'{format}\')',
        description: '格式化日期',
        params: [
            { name: 'date', type: 'text', description: '日期字段或表达式' },
            { name: 'format', type: 'select', options: ['%Y-%m-%d', '%Y-%m-%d %H:%i:%s', '%Y/%m/%d', '%m/%d/%Y'], description: '日期格式' }
        ],
        examples: [
            'DATE_FORMAT(NOW(), \'%Y-%m-%d\')',
            'DATE_FORMAT(created_at, \'%Y-%m-%d %H:%i:%s\')'
        ]
    },
    'DATEDIFF': {
        template: 'DATEDIFF({date1}, {date2})',
        description: '计算两个日期之间的天数差',
        params: [
            { name: 'date1', type: 'text', description: '日期1' },
            { name: 'date2', type: 'text', description: '日期2' }
        ],
        examples: [
            'DATEDIFF(NOW(), created_at)',
            'DATEDIFF(\'2024-12-31\', NOW())'
        ]
    },
    
    // 字符串函数
    'CONCAT': {
        template: 'CONCAT({str1}, {str2})',
        description: '连接字符串',
        params: [
            { name: 'str1', type: 'text', description: '字符串1' },
            { name: 'str2', type: 'text', description: '字符串2' }
        ],
        examples: [
            'CONCAT(first_name, \' \', last_name)',
            'CONCAT(\'prefix_\', id)'
        ]
    },
    'SUBSTRING': {
        template: 'SUBSTRING({string}, {start}, {length})',
        description: '提取子字符串',
        params: [
            { name: 'string', type: 'text', description: '源字符串' },
            { name: 'start', type: 'number', description: '起始位置' },
            { name: 'length', type: 'number', description: '长度' }
        ],
        examples: [
            'SUBSTRING(name, 1, 3)',
            'SUBSTRING(phone, 4, 4)'
        ]
    },
    'LENGTH': {
        template: 'LENGTH({string})',
        description: '返回字符串长度',
        params: [
            { name: 'string', type: 'text', description: '字符串' }
        ],
        examples: [
            'LENGTH(name)',
            'LENGTH(description)'
        ]
    },
    'UPPER': {
        template: 'UPPER({string})',
        description: '转换为大写',
        params: [
            { name: 'string', type: 'text', description: '字符串' }
        ],
        examples: [
            'UPPER(name)',
            'UPPER(status)'
        ]
    },
    'LOWER': {
        template: 'LOWER({string})',
        description: '转换为小写',
        params: [
            { name: 'string', type: 'text', description: '字符串' }
        ],
        examples: [
            'LOWER(name)',
            'LOWER(email)'
        ]
    },
    
    // 数学函数
    'ABS': {
        template: 'ABS({number})',
        description: '返回绝对值',
        params: [
            { name: 'number', type: 'text', description: '数值' }
        ],
        examples: [
            'ABS(balance)',
            'ABS(-100)'
        ]
    },
    'ROUND': {
        template: 'ROUND({number}, {decimals})',
        description: '四舍五入',
        params: [
            { name: 'number', type: 'text', description: '数值' },
            { name: 'decimals', type: 'number', description: '小数位数' }
        ],
        examples: [
            'ROUND(price, 2)',
            'ROUND(average_score, 1)'
        ]
    },
    'CEIL': {
        template: 'CEIL({number})',
        description: '向上取整',
        params: [
            { name: 'number', type: 'text', description: '数值' }
        ],
        examples: [
            'CEIL(price)',
            'CEIL(3.14)'
        ]
    },
    'FLOOR': {
        template: 'FLOOR({number})',
        description: '向下取整',
        params: [
            { name: 'number', type: 'text', description: '数值' }
        ],
        examples: [
            'FLOOR(price)',
            'FLOOR(3.99)'
        ]
    },
    
    // 聚合函数
    'COUNT': {
        template: 'COUNT({column})',
        description: '计算行数',
        params: [
            { name: 'column', type: 'text', description: '列名或*' }
        ],
        examples: [
            'COUNT(*)',
            'COUNT(id)',
            'COUNT(DISTINCT user_id)'
        ]
    },
    'SUM': {
        template: 'SUM({column})',
        description: '求和',
        params: [
            { name: 'column', type: 'text', description: '数值列名' }
        ],
        examples: [
            'SUM(amount)',
            'SUM(price * quantity)'
        ]
    },
    'AVG': {
        template: 'AVG({column})',
        description: '求平均值',
        params: [
            { name: 'column', type: 'text', description: '数值列名' }
        ],
        examples: [
            'AVG(score)',
            'AVG(price)'
        ]
    },
    'MAX': {
        template: 'MAX({column})',
        description: '求最大值',
        params: [
            { name: 'column', type: 'text', description: '列名' }
        ],
        examples: [
            'MAX(created_at)',
            'MAX(price)'
        ]
    },
    'MIN': {
        template: 'MIN({column})',
        description: '求最小值',
        params: [
            { name: 'column', type: 'text', description: '列名' }
        ],
        examples: [
            'MIN(created_at)',
            'MIN(price)'
        ]
    },
    
    // 条件函数
    'IF': {
        template: 'IF({condition}, {true_value}, {false_value})',
        description: '条件判断',
        params: [
            { name: 'condition', type: 'text', description: '条件表达式' },
            { name: 'true_value', type: 'text', description: '真值' },
            { name: 'false_value', type: 'text', description: '假值' }
        ],
        examples: [
            'IF(status = 1, \'active\', \'inactive\')',
            'IF(age >= 18, \'adult\', \'minor\')'
        ]
    },
    'CASE': {
        template: 'CASE WHEN {condition} THEN {value} ELSE {default} END',
        description: 'CASE条件判断',
        params: [
            { name: 'condition', type: 'text', description: '条件表达式' },
            { name: 'value', type: 'text', description: '返回值' },
            { name: 'default', type: 'text', description: '默认值' }
        ],
        examples: [
            'CASE WHEN status = 1 THEN \'active\' ELSE \'inactive\' END',
            'CASE WHEN score >= 90 THEN \'A\' WHEN score >= 80 THEN \'B\' ELSE \'C\' END'
        ]
    },
    'COALESCE': {
        template: 'COALESCE({value1}, {value2})',
        description: '返回第一个非NULL值',
        params: [
            { name: 'value1', type: 'text', description: '值1' },
            { name: 'value2', type: 'text', description: '值2' }
        ],
        examples: [
            'COALESCE(nickname, username)',
            'COALESCE(mobile, phone, \'N/A\')'
        ]
    }
};

// 获取函数建议
function getMySQLFunctionSuggestions(input) {
    if (!input || input.length < 1) return [];
    
    const upperInput = input.toUpperCase();
    const suggestions = [];
    
    for (const [funcName, funcInfo] of Object.entries(MYSQL_FUNCTIONS)) {
        let score = 0;
        
        // 1. 精确前缀匹配 - 最高优先级
        if (funcName.startsWith(upperInput)) {
            score = 100;
        }
        // 2. 包含匹配 - 中等优先级
        else if (funcName.includes(upperInput)) {
            score = 80;
        }
        // 3. 模糊匹配 - 检查输入的每个字符是否按顺序出现在函数名中
        else {
            let matchIndex = 0;
            let matchCount = 0;
            
            for (let i = 0; i < upperInput.length; i++) {
                const char = upperInput[i];
                const foundIndex = funcName.indexOf(char, matchIndex);
                
                if (foundIndex !== -1) {
                    matchCount++;
                    matchIndex = foundIndex + 1;
                }
            }
            
            // 如果所有字符都能按顺序找到，给予一定分数
            if (matchCount === upperInput.length) {
                score = 60 - (upperInput.length - matchCount) * 5; // 根据匹配度调整分数
            }
        }
        
        // 4. 描述匹配 - 较低优先级
        if (score === 0 && funcInfo.description.toUpperCase().includes(upperInput)) {
            score = 40;
        }
        
        if (score > 0) {
            suggestions.push({
                name: funcName,
                template: funcInfo.template,
                description: funcInfo.description,
                examples: funcInfo.examples,
                params: funcInfo.params,
                score: score
            });
        }
    }
    
    // 按分数排序，分数高的在前
    suggestions.sort((a, b) => b.score - a.score);
    
    return suggestions.slice(0, 10); // 限制返回10个建议
}

// 生成函数模板
function generateFunctionTemplate(funcName, params = {}) {
    const funcInfo = MYSQL_FUNCTIONS[funcName];
    if (!funcInfo) return funcName;
    
    let template = funcInfo.template;
    
    // 替换参数
    for (const [key, value] of Object.entries(params)) {
        template = template.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }
    
    return template;
}