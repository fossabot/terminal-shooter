# NOVA 公式サイト

`terminal-shooter/site/` にある静的サイトです。ビルド不要の素の HTML/CSS/JS で構成されています。

## ローカルで確認

```bash
cd site
python3 -m http.server 8080
# → http://localhost:8080
```

## Cloudflare Pages へのデプロイ

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create application** → **Pages**
2. **Connect to Git** でリポジトリ `ryotagtagtag-wq/terminal-shooter` を選択
3. ビルド設定:
   - **Build command**: `(空)` ※ビルド不要
   - **Build output directory**: `site`
4. **Save and Deploy** でデプロイ

リポジトリへの push で自動デプロイされます。

## カスタムドメイン（任意）

Pages プロジェクトの **Custom domains** から `galaxy-strike.example.com` 等を追加。
Cloudflare 側で DNS は自動設定されます。

## ヘッダー

`_headers` でセキュリティヘッダーとキャッシュ制御を設定済みです。
`css/` `js/` は URL が変わらないため 1 年間の強キャッシュを付けています（`assets/*` と同様に `css/*` `js/*` へも追記する場合は適宜調整してください）。

## ライセンス

MIT
