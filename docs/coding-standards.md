# 代码规范文档

本文档基于 hcm-platform-fe 项目的实际代码规范整理，用于 AI Code Review 检查。

## 1. 命名规范

### 1.1 常量命名

**规则**: 常量必须全部大写，单词之间使用下划线分隔

```typescript
// ✅ 正确
const MAX_COUNT = 100;
const API_BASE_URL = "https://api.example.com";
const DEFAULT_PAGE_SIZE = 20;

// ❌ 错误
const maxCount = 100;
const apiBaseUrl = "https://api.example.com";
const defaultPageSize = 20;
```

### 1.2 函数命名

**规则**:

- 普通函数使用小驼峰命名法 (camelCase)
- React 组件使用大驼峰命名法 (PascalCase)

```typescript
// ✅ 正确 - 普通函数
function getUserInfo() {}
const calculateTotal = () => {};

// ✅ 正确 - React 组件
function UserProfile() {}
const DataTable = () => {};

// ❌ 错误
function GetUserInfo() {} // 普通函数不应使用大驼峰
const data_table = () => {}; // 不应使用下划线
```

### 1.3 组件命名规范

**规则**: 组件文件名、组件名称、Props 接口名称必须保持一致

```typescript
// 文件名: UserProfile.tsx

// ✅ 正确
interface UserProfileProps {
  userId: string;
}

const UserProfile: React.FC<UserProfileProps> = (props) => {
  // ...
};

export default UserProfile;

// ❌ 错误
interface Props {
  // 应该是 UserProfileProps
  userId: string;
}
```

**特殊情况**:

- 如果文件名是 `index.tsx`，组件名应该使用父目录名称
- 蛇形命名的目录（如 `user_profile`）会自动转换为驼峰命名（`UserProfile`）

**ESLint 规则**: `@moka-fe/consistent-comp-naming`

### 1.4 Class 组件命名

```typescript
// ✅ 正确
interface UserListProps {
  users: User[];
}

interface UserListState {
  loading: boolean;
}

class UserList extends React.Component<UserListProps, UserListState> {
  // ...
}

// ❌ 错误
class UserList extends React.Component<Props, State> {
  // Props 和 State 应该有组件名前缀
}
```

## 2. TypeScript 规范

### 2.1 严格类型检查

**规则**:

- 禁止使用 `any` 类型
- 必须显式声明函数返回类型（对于导出的函数）
- 启用严格的 null 检查

```typescript
// ✅ 正确
function getUser(id: string): Promise<User | null> {
  return api.fetchUser(id);
}

// ❌ 错误
function getUser(id: any): any {
  // 禁止使用 any
  return api.fetchUser(id);
}
```

**TSConfig 配置**:

```json
{
  "noImplicitAny": true,
  "strictNullChecks": true,
  "strictFunctionTypes": true
}
```

### 2.2 枚举初始化

**规则**: 枚举必须显式初始化

```typescript
// ✅ 正确
enum Status {
  Pending = 0,
  Active = 1,
  Completed = 2,
}

// ❌ 错误
enum Status {
  Pending,
  Active,
  Completed,
}
```

**ESLint 规则**: `@typescript-eslint/prefer-enum-initializers`

### 2.3 魔法数字

**规则**: 避免使用魔法数字，应定义为常量

```typescript
// ✅ 正确
const MAX_RETRY_COUNT = 3;
const TIMEOUT_MS = 5000;

function retry() {
  for (let i = 0; i < MAX_RETRY_COUNT; i++) {
    // ...
  }
}

// ❌ 错误
function retry() {
  for (let i = 0; i < 3; i++) {
    // 魔法数字
    // ...
  }
}
```

**允许的数字**: -1, 0, 1

**ESLint 规则**: `@typescript-eslint/no-magic-numbers`

### 2.4 可选链

**规则**: 优先使用可选链操作符

```typescript
// ✅ 正确
const userName = user?.profile?.name;

// ❌ 错误
const userName = user && user.profile && user.profile.name;
```

**ESLint 规则**: `@typescript-eslint/prefer-optional-chain`

## 3. React 规范

### 3.1 Hooks 规则

**规则**:

- 必须遵循 Hooks 调用规则
- 必须正确声明依赖项

```typescript
// ✅ 正确
const [count, setCount] = useState(0);

useEffect(() => {
  fetchData(count);
}, [count]); // 正确声明依赖

// ❌ 错误
useEffect(() => {
  fetchData(count);
}, []); // 缺少依赖项
```

**ESLint 规则**:

- `react-hooks/rules-of-hooks`
- `react-hooks/exhaustive-deps`

### 3.2 禁止使用内联样式

**规则**: 禁止在组件和 DOM 元素上使用 `style` 属性

```typescript
// ✅ 正确
import styles from './User.module.less';

<div className={styles.container}>
  <UserCard className={styles.card} />
</div>

// ❌ 错误
<div style={{ padding: 10 }}>
  <UserCard style={{ margin: 10 }} />
</div>
```

**ESLint 规则**:

- `react/forbid-component-props`
- `react/forbid-dom-props`

### 3.3 组件自闭合

**规则**: 无子元素的组件必须使用自闭合标签

```typescript
// ✅ 正确
<UserAvatar />
<Input />

// ❌ 错误
<UserAvatar></UserAvatar>
<Input></Input>
```

**ESLint 规则**: `react/self-closing-comp`

### 3.4 布尔属性

**规则**: 布尔属性必须显式传值

```typescript
// ✅ 正确
<Button disabled={true} />
<Input required={false} />

// ❌ 错误
<Button disabled />
```

**ESLint 规则**: `react/jsx-boolean-value`

### 3.5 JSX 中的大括号

**规则**: Props 中不应使用不必要的大括号

```typescript
// ✅ 正确
<User name="John" />
<User age={25} />

// ❌ 错误
<User name={"John"} />
```

**ESLint 规则**: `react/jsx-curly-brace-presence`

### 3.6 列表 Key

**规则**: 列表渲染必须提供唯一的 key

```typescript
// ✅ 正确
{
  users.map((user) => <UserCard key={user.id} user={user} />);
}

// ❌ 错误
{
  users.map((user) => <UserCard user={user} />);
}
```

**ESLint 规则**: `@moka-fe/jsx-key`

### 3.7 构造的 Context 值

**规则**: 避免在 Context.Provider 中使用构造的对象值

```typescript
// ✅ 正确
const value = useMemo(() => ({ user, settings }), [user, settings]);
<UserContext.Provider value={value}>

// ❌ 错误
<UserContext.Provider value={{ user, settings }}>
```

**ESLint 规则**: `react/jsx-no-constructed-context-values`

## 4. 代码质量规范

### 4.1 函数参数数量

**规则**: 函数参数不应超过 3 个

```typescript
// ✅ 正确
interface CreateUserOptions {
  name: string;
  email: string;
  role: string;
  department: string;
}

function createUser(options: CreateUserOptions) {
  // ...
}

// ❌ 错误
function createUser(name: string, email: string, role: string, department: string) {
  // 参数过多
}
```

**ESLint 规则**: `max-params`

### 4.2 文件行数限制

**规则**: 单个文件不应超过合理行数（建议 500 行以内）

**ESLint 规则**: `@moka-fe/max-lines`

### 4.3 回调函数规范

**规则**:

- 回调函数的第一个参数应该是 error
- 回调函数应该是最后一个参数

```typescript
// ✅ 正确
function fetchData(url: string, callback: (error: Error | null, data?: any) => void) {
  // ...
}

// ❌ 错误
function fetchData(callback: (data: any) => void, url: string) {
  // callback 应该是最后一个参数
}

function fetchData(url: string, callback: (data: any, error: Error) => void) {
  // error 应该是第一个参数
}
```

**ESLint 规则**:

- `@moka-fe/callback-first-param-error`
- `@moka-fe/callback-is-last-param`

### 4.4 Promise 返回值

**规则**: Promise 链必须正确返回值

```typescript
// ✅ 正确
return api
  .fetchUser()
  .then((user) => {
    return processUser(user);
  })
  .then((result) => {
    return saveResult(result);
  });

// ❌ 错误
return api.fetchUser().then((user) => {
  processUser(user); // 缺少 return
});
```

**ESLint 规则**: `@moka-fe/promise-return`

### 4.5 错误处理

**规则**: 不应直接返回 Error 对象，应该抛出

```typescript
// ✅ 正确
function validateUser(user: User) {
  if (!user.email) {
    throw new Error("Email is required");
  }
}

// ❌ 错误
function validateUser(user: User) {
  if (!user.email) {
    return new Error("Email is required");
  }
}
```

**ESLint 规则**: `@moka-fe/no-return-error`

## 5. ES6+ 规范

### 5.1 变量声明

**规则**:

- 禁止使用 `var`
- 优先使用 `const`
- 每个变量单独声明

```typescript
// ✅ 正确
const MAX_SIZE = 100;
let currentIndex = 0;

// ❌ 错误
var maxSize = 100; // 禁止使用 var
let a = 1,
  b = 2; // 应该分开声明
```

**ESLint 规则**:

- `no-var`
- `one-var`

### 5.2 对象简写

**规则**: 对象属性和方法应使用简写语法

```typescript
// ✅ 正确
const name = "John";
const user = {
  name,
  getName() {
    return this.name;
  },
};

// ❌ 错误
const user = {
  name: name,
  getName: function () {
    return this.name;
  },
};
```

**ESLint 规则**: `object-shorthand`

### 5.3 解构赋值

**规则**: 优先使用解构赋值

```typescript
// ✅ 正确
const { name, email } = user;
const [first, second] = array;

// ⚠️ 不强制但推荐
const name = user.name; // 允许，但解构更好
```

**ESLint 规则**: `prefer-destructuring`

### 5.4 扩展运算符

**规则**: 优先使用扩展运算符而不是 `apply`

```typescript
// ✅ 正确
Math.max(...numbers);
const newArray = [...array1, ...array2];

// ❌ 错误
Math.max.apply(Math, numbers);
```

**ESLint 规则**: `prefer-spread`

### 5.5 对象展开

**规则**: 优先使用对象展开而不是 `Object.assign`

```typescript
// ✅ 正确
const merged = { ...defaults, ...options };

// ❌ 错误
const merged = Object.assign({}, defaults, options);
```

**ESLint 规则**: `prefer-object-spread`

## 6. Import 规范

### 6.1 Import 顺序

**规则**: Import 语句应该按照以下顺序组织，组之间空一行

1. 第三方库
2. 内部模块（@/ 开头）
3. 相对路径导入
4. 样式文件

```typescript
// ✅ 正确
import React, { useState } from "react";
import { message } from "antd";
import moment from "moment";

import { UserService } from "@/services/user";
import { formatDate } from "@/utils/time";

import { Header } from "./components/Header";
import { Footer } from "./components/Footer";

import styles from "./index.less";

// ❌ 错误 - 顺序混乱
import styles from "./index.less";
import React from "react";
import { Header } from "./components/Header";
import { UserService } from "@/services/user";
```

**Prettier 规则**: `importSort`

### 6.2 Import 扩展名

**规则**: TypeScript/JavaScript 文件不应包含扩展名，静态资源必须包含扩展名

```typescript
// ✅ 正确
import { utils } from "./utils";
import { User } from "@/types/user";
import logo from "./logo.png";
import styles from "./index.less";

// ❌ 错误
import { utils } from "./utils.ts";
import logo from "./logo";
```

**ESLint 规则**: `import/extensions`

### 6.3 禁止的导入

**规则**: 某些大型库必须通过动态导入使用

```typescript
// ✅ 正确
import { loadMokaBiCharts } from "@/dynamicImports/mokaBiCharts";

const chart = await loadMokaBiCharts();

// ❌ 错误
import MokaBiCharts from "moka-bi-charts"; // 禁止直接导入
import XLSX from "xlsx"; // 禁止直接导入
import AliOSS from "ali-oss"; // 禁止直接导入
```

**禁止直接导入的库**:

- `moka-bi-charts` → 使用 `src/dynamicImports/mokaBiCharts`
- `ali-oss` → 使用 `src/dynamicImports/aliOss`
- `xlsx` → 使用 `src/dynamicImports/xlsx`
- `@handsontable/react` → 使用 `src/dynamicImports/handsontable-react`
- `@antv/g6` → 体积大，避免使用
- `@antv/data-set` → 体积大，避免使用
- `bizcharts` → 体积大，避免使用

**ESLint 规则**: `no-restricted-imports`

### 6.4 Classnames 导入

**规则**: 必须使用特定别名导入 classnames

```typescript
// ✅ 正确
import classNames from "classnames";

// ❌ 错误
import cn from "classnames";
import cls from "classnames";
```

**ESLint 规则**: `@moka-fe/import-classnames`

## 7. 样式规范

### 7.1 样式导入别名

**规则**: 样式文件导入必须使用 `styles` 作为别名

```typescript
// ✅ 正确
import styles from "./index.less";

<div className={styles.container} />;

// ❌ 错误
import s from "./index.less";
import css from "./index.less";
```

**ESLint 规则**: `@moka-fe/style-specifier-alias`

## 8. 代码格式规范

### 8.1 Prettier 配置

```javascript
{
  printWidth: 100,           // 每行最大长度 100 字符
  singleQuote: true,        // 使用单引号
  endOfLine: 'auto',        // 自动处理换行符
  importOrderSeparation: true,      // import 分组之间空行
  importOrderSortSpecifiers: true   // 排序 import 说明符
}
```

### 8.2 引号

**规则**: 使用单引号

```typescript
// ✅ 正确
const message = "Hello World";
import { User } from "@/types";

// ❌ 错误
const message = "Hello World";
```

**ESLint 规则**: `quotes`

### 8.3 注释

**规则**: 注释符号后必须有空格

```typescript
// ✅ 正确
// This is a comment
/* This is a block comment */

// ❌ 错误
//This is a comment
/*This is a block comment*/
```

**ESLint 规则**: `spaced-comment`

## 9. 代码安全规范

### 9.1 禁止的操作

- 禁止使用 `eval`
- 禁止使用 `alert`
- 禁止使用 `with`
- 禁止重新赋值函数声明
- 禁止隐式的全局变量

```typescript
// ❌ 错误
eval("const x = 1");
alert("Hello");
with (obj) {
}
```

**ESLint 规则**:

- `no-eval`
- `no-alert`
- `no-with`
- `no-func-assign`
- `no-global-assign`

### 9.2 变量使用

**规则**:

- 变量必须先声明后使用
- 禁止未使用的变量
- 禁止变量遮蔽

```typescript
// ✅ 正确
const userName = "John";
console.log(userName);

// ❌ 错误
console.log(userName); // 使用前未声明
const userName = "John";

const unused = "value"; // 未使用的变量
```

**ESLint 规则**:

- `no-use-before-define`
- `no-unused-vars`
- `no-shadow`

## 10. Redux/DVA 规范

### 10.1 Redux Action

**规则**: Redux action 必须符合 FSA (Flux Standard Action) 规范

```typescript
// ✅ 正确
const action = {
  type: "USER_FETCH_SUCCESS",
  payload: { user },
};

// ❌ 错误
const action = {
  type: "USER_FETCH_SUCCESS",
  user, // 应该放在 payload 中
};
```

**ESLint 规则**: `@moka-fe/redux-fsa`

## 总结

以上规范是基于 hcm-platform-fe 项目实际使用的 ESLint 和 TypeScript 配置整理而成。在进行 Code Review 时，AI 会重点检查以下方面：

1. **命名规范**：常量、函数、组件、类型的命名
2. **TypeScript 类型安全**：避免 any，正确的类型声明
3. **React 最佳实践**：Hooks 依赖、禁止内联样式、正确的组件结构
4. **代码质量**：函数复杂度、文件大小、参数数量
5. **Import 规范**：正确的导入顺序和别名
6. **代码安全**：避免危险操作
7. **代码格式**：统一的代码风格

这些规范的目的是确保代码的可读性、可维护性和一致性。
