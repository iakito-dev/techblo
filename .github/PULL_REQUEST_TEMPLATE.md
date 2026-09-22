<!-- このPRの目的を1-2文で簡潔に -->

## 変更内容

<!-- 何を変えたか、なぜ変えたかをbullet pointで -->

-
-

## 影響範囲

<!-- どのfeature/画面/データに影響があるか -->

- features: `feed` / `bookmarks` / `auth` / ...
- DB schema変更: なし / あり(マイグレーション含む)
- 環境変数追加: なし / あり

## 確認したこと

- [ ] `bun run lint` / `format` / `typecheck` / `test` が通る
- [ ] 該当する `docs/features/*.md` を更新した
- [ ] アーキテクチャ判断があれば `docs/adr/` に追加した
- [ ] レイヤー境界を守っている(`features/A → features/B` していない)
- [ ] Server Action で `requireSession()` を呼んでいる(認証必須の場合)
- [ ] Result型で返している(throw していない)
- [ ] 不要な `'use client'` がない
- [ ] コメントは Why のみ
- [ ] DB 変更があれば破壊的でないか確認
- [ ] スクリーンショット添付(UI変更がある場合)

## AI assist 利用状況

<!-- AI主導で書いた部分があれば明記。レビュー観点として参考に -->

- [ ] AIで生成したコードを含む(該当箇所: `path/to/file`)
- [ ] AIによるレビューを実施(`code-review` skill 等)

## スクリーンショット

<!-- UI変更がある場合 -->

| Before | After |
|---|---|
|  |  |

## 関連 Issue / Discussion

<!-- Closes #123, Related to #456 -->
