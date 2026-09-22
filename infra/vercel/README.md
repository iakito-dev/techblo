# Vercel Terraform

This directory manages the Vercel project configuration for Techblo.

## Authentication

Create a Vercel token and export it before running Terraform:

```bash
export VERCEL_API_TOKEN="..."
```

## 注意: state はローカル管理

Remote state は設定していないため、別 PC でクローンした場合は `terraform apply` を直接実行しないこと。
必ず下記の import 手順を先に実行して state を復元すること。

## First-time import

The Vercel project already exists, so import it before applying:

```bash
cd infra/vercel
terraform init
terraform import vercel_project.techblo prj_6blDBFDsD1S8ZARpLZTU9wvVneEu
```

Environment variables already exist in Vercel. To put them under Terraform state, import each
`vercel_project_environment_variable.production["KEY"]` resource using the Vercel environment
variable ID from the Vercel API or dashboard network response.

Use the import ID format shown by the provider:

```bash
terraform import 'vercel_project_environment_variable.production["DATABASE_URL"]' \
  prj_xxxxxxxxxxxxxxxxxxxxxxxxxxxx/ENVIRONMENT_VARIABLE_ID
```

Secrets are configured with Vercel's `sensitive` flag and Terraform `value_wo`, so values are
written to Vercel without being persisted in Terraform state.

## Preview 環境の env

`vercel_project_environment_variable.preview` が Preview ターゲットにも production と同じキーを
設定する。これがないと PR の Preview デプロイが `lib/env.ts` の検証で落ちる。

値は既定で production を流用する(`locals.tf` の `coalesce`)。Preview だけ別の値(例: 専用の
Neon ブランチ DB)にしたい場合は `terraform.tfvars` に `*_preview` を指定して上書きする:

```hcl
database_url_preview = "..."   # 省略時は database_url を流用
```

既に Vercel 上に Preview 用 env が存在する場合は、apply 前に import すること:

```bash
terraform import 'vercel_project_environment_variable.preview["DATABASE_URL"]' \
  prj_xxxxxxxxxxxxxxxxxxxxxxxxxxxx/ENVIRONMENT_VARIABLE_ID
```

## Local variables

Do not commit `terraform.tfvars`. Create it locally from the current app environment:

```bash
cat > terraform.tfvars <<'EOF'
database_url         = "..."
better_auth_secret   = "..."
google_client_id     = "..."
google_client_secret = "..."
EOF
```

Then run:

```bash
terraform plan
terraform apply
```
