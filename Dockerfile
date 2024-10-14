# ベースイメージとしてNode.jsを使用
FROM node:16

# 作業ディレクトリを設定
WORKDIR /app

# パッケージファイルをコピー
COPY package*.json ./

# 依存関係をインストール
RUN npm install

# アプリケーションのソースコードをコピー
COPY . .

# 環境変数を設定
ENV PORT=3000

# アプリケーションをビルド（必要に応じて）
# RUN npm run build

# コンテナが起動する際に実行されるコマンド
CMD ["npm", "start"]

# アプリケーションがリッスンするポートを指定
EXPOSE 3000