/**
 * @author Toru Nagashima <https://github.com/mysticatea>
 */
'use strict'

/**
 * @typedef {import('eslint').Linter.LintMessage} LintMessage
 */
/**
 * @typedef {object} GroupState
 * @property {Set<string>} GroupState.disableAllKeys
 * @property {Map<string, string[]>} GroupState.disableRuleKeys
 */
// 配置 ESLint 如何处理 JS 之外的文件，需要符合一定的接口
module.exports = {
  /** @param {string} code */
  /**
   * 接收两个参数的：
   *  code：文件内容
   *  filename：文件名
   */
  preprocess(code) {
    /**
     * 在这里，你可以去掉任何非JS内容, 或者拆分成多个字符串以被分别检查进行筛选
     * 
     * 可以对文件内容进行过滤(过滤掉不需要检查的内容)
     * 或者进行分块分别检查(例如 .md 文件，每个 JS 块可能是独立的，此时需要独立出不同的上下文)
     * 或者对文件内容合并(例如 .html 文件，每个脚本可能具有相同的上下文，此时可以合并所有的脚本统一检查)
     */
    return [code]
  },

  /**
   * @param {LintMessage[][]} messages 是一个二维数组，外层每一项都对应 preprocess 返回数组内容的检查结果，内层每一项对应规则检查结果
   * @returns {LintMessage[]} 调整所有错误的位置，使其与原始的未处理的代码中的位置相对应，并将它们聚合成一个打平的数组并返回。
   */
  postprocess(messages) {
    const message_示例数据 = [
      [
        {
          ruleId: "vue/html-self-closing",
          severity: 1,
          message: "Require self-closing on HTML elements (<div>).",
          line: 2,
          column: 3,
          nodeType: "VElement",
          endLine: 2,
          endColumn: 23,
          fix: {
            range: [
              27,
              34,
            ],
            text: "/>",
          },
        },
        {
          ruleId: "vue/comment-directive",
          severity: 2,
          message: "clear",
          line: 3,
          column: 12,
          nodeType: null,
          messageId: "clear",
        },
        {
          ruleId: "vue/comment-directive",
          severity: 2,
          message: "clear",
          line: 3,
          column: 12,
          nodeType: null,
          messageId: "clear",
        },
        {
          ruleId: "vue/multi-word-component-names",
          severity: 2,
          message: "Component name \"\" should always be multi-word.",
          line: 7,
          column: 9,
          nodeType: "Literal",
          messageId: "unexpected",
          endLine: 7,
          endColumn: 11,
        },
        {
          ruleId: "vue/comment-directive",
          severity: 2,
          message: "clear",
          line: 10,
          column: 10,
          nodeType: null,
          messageId: "clear",
        },
        {
          ruleId: "vue/comment-directive",
          severity: 2,
          message: "clear",
          line: 12,
          column: 16,
          nodeType: null,
          messageId: "clear",
        },
      ],
    ]
    const state = {
      /** @type {GroupState} */
      block: {
        disableAllKeys: new Set(),
        disableRuleKeys: new Map()
      },
      /** @type {GroupState} */
      line: {
        disableAllKeys: new Set(),
        disableRuleKeys: new Map()
      }
    }
    /** @type {string[]} */
    const usedDisableDirectiveKeys = []
    /** @type {Map<string,LintMessage>} */
    const unusedDisableDirectiveReports = new Map()

    // Filter messages which are in disabled area. 过滤处于禁用区域的消息
    // 处理 /* eslint-disable */ eslint 禁用规则，筛选掉需要过滤的错误信息
    const filteredMessages = messages[0].filter((message) => {
      if (message.ruleId === 'vue/comment-directive') {
        const directiveType = message.messageId
        const data = message.message.split(' ')
        switch (directiveType) {
          case 'disableBlock':
            state.block.disableAllKeys.add(data[1])
            break
          case 'disableLine':
            state.line.disableAllKeys.add(data[1])
            break
          case 'enableBlock':
            state.block.disableAllKeys.clear()
            break
          case 'enableLine':
            state.line.disableAllKeys.clear()
            break
          case 'disableBlockRule':
            addDisableRule(state.block.disableRuleKeys, data[1], data[2])
            break
          case 'disableLineRule':
            addDisableRule(state.line.disableRuleKeys, data[1], data[2])
            break
          case 'enableBlockRule':
            state.block.disableRuleKeys.delete(data[1])
            break
          case 'enableLineRule':
            state.line.disableRuleKeys.delete(data[1])
            break
          case 'clear':
            state.block.disableAllKeys.clear()
            state.block.disableRuleKeys.clear()
            state.line.disableAllKeys.clear()
            state.line.disableRuleKeys.clear()
            break
          default:
            // unused eslint-disable comments report
            unusedDisableDirectiveReports.set(messageToKey(message), message)
            break
        }
        return false
      } else {
        const disableDirectiveKeys = []
        if (state.block.disableAllKeys.size) {
          disableDirectiveKeys.push(...state.block.disableAllKeys)
        }
        if (state.line.disableAllKeys.size) {
          disableDirectiveKeys.push(...state.line.disableAllKeys)
        }
        if (message.ruleId) {
          const block = state.block.disableRuleKeys.get(message.ruleId)
          if (block) {
            disableDirectiveKeys.push(...block)
          }
          const line = state.line.disableRuleKeys.get(message.ruleId)
          if (line) {
            disableDirectiveKeys.push(...line)
          }
        }

        if (disableDirectiveKeys.length) {
          // Store used eslint-disable comment key
          usedDisableDirectiveKeys.push(...disableDirectiveKeys)
          return false
        } else {
          return true
        }
      }
    })

    if (unusedDisableDirectiveReports.size) {
      for (const key of usedDisableDirectiveKeys) {
        // Remove used eslint-disable comments 删除使用的eslint禁用注释
        unusedDisableDirectiveReports.delete(key)
      }
      // Reports unused eslint-disable comments 报告未使用的eslint禁用注释
      filteredMessages.push(...unusedDisableDirectiveReports.values())
      filteredMessages.sort(compareLocations)
    }

    return filteredMessages
  },

  /**
   * 当使用处理器时，默认不会执行自动修复，即使在命令行上启用了 --fix 标志。
   * 此时需要设置 supportsAutofix 为 true，并且在 postprocess 属性中进行配置
   */
  supportsAutofix: true // 默认为 false
}

/**
 * @param {Map<string, string[]>} disableRuleKeys
 * @param {string} rule
 * @param {string} key
 */
function addDisableRule(disableRuleKeys, rule, key) {
  let keys = disableRuleKeys.get(rule)
  if (keys) {
    keys.push(key)
  } else {
    keys = [key]
    disableRuleKeys.set(rule, keys)
  }
}

/**
 * @param {LintMessage} message
 * @returns {string} message key
 */
function messageToKey(message) {
  return `line:${message.line},column${
    // -1 because +1 by ESLint's `report-translator`.
    message.column - 1
  }`
}

/**
 * Compares the locations of two objects in a source file
 * @param {Position} itemA The first object
 * @param {Position} itemB The second object
 * @returns {number} A value less than 1 if itemA appears before itemB in the source file, greater than 1 if
 * itemA appears after itemB in the source file, or 0 if itemA and itemB have the same location.
 */
function compareLocations(itemA, itemB) {
  return itemA.line - itemB.line || itemA.column - itemB.column
}
