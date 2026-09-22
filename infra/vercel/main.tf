terraform {
  required_version = ">= 1.11.0"

  required_providers {
    vercel = {
      source  = "vercel/vercel"
      version = "~> 5.3"
    }
  }
}

provider "vercel" {
  team = var.vercel_team_id
}

resource "vercel_project" "techblo" {
  name      = var.project_name
  framework = "nextjs"

  install_command = "bun install --frozen-lockfile --ignore-scripts"
  node_version    = "24.x"

  git_repository = {
    type = "github"
    repo = var.github_repository
  }
}

# プロジェクトを corpex → techblo にリネームしたことに伴う state アドレス移行。
# moved により terraform apply が destroy/recreate ではなく state mv 相当を行う。
moved {
  from = vercel_project.corpex
  to   = vercel_project.techblo
}

resource "vercel_project_environment_variable" "production" {
  for_each = local.production_environment_variable_sensitivity

  project_id = vercel_project.techblo.id
  team_id    = var.vercel_team_id
  key        = each.key
  value_wo   = local.production_environment_variable_values[each.key]
  target     = ["production"]
  sensitive  = each.value
}

# Preview デプロイ用の env。未設定だと lib/env.ts の検証で PR の Preview ビルドが落ちるため、
# production と同じキーを Preview ターゲットにも設定する(値は preview 上書き or production 流用)。
resource "vercel_project_environment_variable" "preview" {
  for_each = local.preview_environment_variable_sensitivity

  project_id = vercel_project.techblo.id
  team_id    = var.vercel_team_id
  key        = each.key
  value_wo   = local.preview_environment_variable_values[each.key]
  target     = ["preview"]
  sensitive  = each.value
}
