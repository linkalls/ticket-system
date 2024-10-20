

# 整理券システム

このプロジェクトは、Node.jsとExpressを使用した整理券発行システムです。MongoDBをデータベースとして使用し、ejsをフロントエンドフレームワークとして採用しています。

## 機能概要

- 管理者によるログイン機能
- 新規整理券の発行
- 発行された整理券の一覧表示
- 各整理券の詳細情報表示（QRコード含む）
- 整理券の状態更新（待機中 → 呼び出し済み）
- 整理券の削除機能
- プッシュ通知による状態変更通知

## 使用技術

- バックエンド：Node.js、Express、Mongoose
- データベース：MongoDB
- フロントエンド：esj
- プッシュ通知：Web Push API
- QRコード生成：qrcodeライブラリ

## セットアップ手順

1. リポジトリをクローンします。
   ```
   git clone https://github.com/[ユーザー名]/ticket-system.git
   ```

2. プロジェクトディレクトリに移動します。
   ```
   cd ticket-system
   ```

3. 必要なパッケージをインストールします。
   ```
   npm install
   ```

4. 環境変数ファイル（.env）を作成し、以下の情報を設定します：
   ```
   MONGODB_URI=your_mongodb_connection_string
   ```

5. データベースをシードします。
   ```
   node seed.js
   ```

6. アプリケーションを起動します。
   ```
   npm start
   ```

## 使用方法

1. 管理者としてログインする：
   ブラウザで http://localhost:3000 にアクセスし、ログインページに移動します。デフォルトの管理者情報は以下です：
   - メール：admin@example.com
   - パスワード：password123

2. 新規整理券発行：
   ログイン後、ホームページで「整理券発行」ボタンをクリックして新しい整理券を作成できます。

3. 整理券一覧表示：
   ホームページで発行されたすべての整理券が一覧表示されます。

4. 整理券詳細表示：
   各整理券のQRコードと詳細情報を確認できます。

5. 整理券状態更新：
   発行された整理券の状態を「待機中」から「呼び出し済み」に変更できます。

6. プッシュ通知設定：
   ブラウザでプッシュ通知を許可すると、整理券の状態が「受け取り済み」になったときに通知を受け取ることができます。

7. ログアウト：
   右上の「ログアウト」ボタンをクリックしてセッションを終了できます。

## 注意点

- このシステムは基本的な機能のみを実装しています。実際の運用には追加のセキュリティ対策やエラー処理が必要です。
- プッシュ通知機能はWeb Push APIを使用しているため、HTTPS環境でのみ完全に機能します。
- MongoDB Atlasなどのクラウドサービスを使用する場合は、適切なセキュリティ設定を行ってください。

このプロジェクトは学習目的で作成されました。実際の運用にはさらなる改善とテストが必要です。


このREADMEファイルには、プロジェクトの概要、使用技術、セットアップ手順、使用方法、注意点などが含まれています。これにより、開発者やユーザーがプロジェクトを理解し、簡単にセットアップして使用できるようになります。

