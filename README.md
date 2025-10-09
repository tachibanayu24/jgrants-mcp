# jgrants-mcp

日本の補助金情報を検索するための MCP (Model Context Protocol) サーバー

<a href="https://glama.ai/mcp/servers/@tachibanayu24/jgrants-mcp">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@tachibanayu24/jgrants-mcp/badge" alt="jgrants-mcp MCP server" />
</a>

## 概要

jgrants-mcp は、jGrants（デジタル庁が運営する補助金電子申請システム）の公開 API をラップした MCP サーバーです。LLM から MCP を経由して日本の補助金情報に簡単にアクセスできます。

## 機能

以下の 3 つのツールを提供します。すべてのツールは `structuredContent` フィールドで構造化データを返すため、LLM が効率的に処理できます。

### 1. `list_subsidies`

指定したキーワードで公募中の補助金一覧を取得します。

**パラメータ:**

- `keyword` (文字列, オプション): 検索キーワード（デフォルト: "補助金"）

**返却データ:**
- 補助金のリスト（id, name, title, 対象地域, 補助上限額など）

### 2. `get_subsidy_detail`

補助金の詳細情報を取得します。添付ファイルは軽量なメタデータ（ファイル名、サイズ、インデックス）のみを返し、Base64 データは含まれません。

**パラメータ:**

- `subsidy_id` (文字列, 必須): 補助金の ID（`list_subsidies` で取得した id を指定）

**返却データ:**
- 補助金の詳細情報
- 各添付カテゴリの `AttachmentGroup`:
  - `count`: 添付ファイル数
  - `hasAttachments`: 添付の有無
  - `attachments`: ファイル情報の配列
    - `index`: ダウンロード時に指定するインデックス
    - `name`: ファイル名
    - `sizeBytes`: ファイルサイズ（バイト）

### 3. `download_attachment`

指定した補助金の添付ファイルをダウンロードします。Base64 エンコードされたファイルデータとメタデータを返します。

**パラメータ:**

- `subsidy_id` (文字列, 必須): 補助金の ID
- `category` (文字列, 必須): 添付文書のカテゴリ
  - `application_guidelines`: 公募要領
  - `outline_of_grant`: 交付要綱
  - `application_form`: 申請様式
- `index` (整数, 必須): 添付文書のインデックス（`get_subsidy_detail` の `attachments[n].index` を指定）

**返却データ:**
- `file_name`: ファイル名
- `data`: Base64 エンコードされたファイルデータ
- `data_size_bytes`: ファイルサイズ
- `encoding`: エンコード形式（常に "base64"）

## インストール

### npm 経由でグローバルインストール

```bash
npm install -g jgrants-mcp
```

### npx で直接実行

```bash
npx jgrants-mcp
```

### ローカル開発

```bash
git clone https://github.com/tachibanayu24/jgrants-mcp.git
cd jgrants-mcp
npm install
npm run build
```

## 使用方法

### Claude Desktop での設定

Claude Desktop の設定ファイル（`~/Library/Application Support/Claude/claude_desktop_config.json`）に以下を追加：

```json
{
  "mcpServers": {
    "jgrants": {
      "command": "npx",
      "args": ["jgrants-mcp"]
    }
  }
}
```

### 他の MCP クライアントでの使用

MCP に対応した任意のクライアントから利用可能です。

## 使用例

### 1. 補助金を検索

```
ユーザー: 「介護施設向けの補助金を探して」
```

→ LLM が `list_subsidies` を `keyword: "介護"` で実行

### 2. 詳細情報を取得

```
ユーザー: 「ID a0WJ200000CDTxsMAH の補助金の詳細を教えて」
```

→ LLM が `get_subsidy_detail` を実行し、以下の情報を取得：
- 補助金の詳細（対象者、補助率、上限額など）
- 添付ファイルのメタデータ（ファイル名とサイズ）

### 3. 添付ファイルをダウンロード

```
ユーザー: 「公募要領をダウンロードして」
```

→ LLM が `download_attachment` を実行：
- `category: "application_guidelines"`
- `index: 0`（詳細情報から取得）

## 開発

### 必要な環境

- Node.js 18 以上
- npm または yarn

### ビルド

```bash
npm run build
```

### 開発モード

```bash
npm run dev
```

## API について

このツールは jGrants の公開 API（`https://api.jgrants-portal.go.jp/exp/v1/public`）を使用しています。API キーは不要です。

## ライセンス

MIT