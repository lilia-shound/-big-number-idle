# 部署指引：三种免费托管方式，任选其一

项目已做零配置适配：
- `vite.config.ts` 中 `base: "./"`（相对路径，任意静态托管可用）
- GitHub Pages workflow 已就绪（`.github/workflows/deploy.yml`）
- 本地构建产物在 `dist/`，可直接上传

---

## 方式一：GitHub Pages（推荐，免费 + 自动更新）

1. 在 GitHub 新建仓库（如 `big-number-idle`），不要勾选 README
2. 把项目文件推送上去：
   ```bash
   git init
   git add .
   git commit -m "feat: big number idle stage 0"
   git branch -M main
   git remote add origin https://github.com/<你的用户名>/big-number-idle.git
   git push -u origin main
   ```
3. 仓库 Settings → Pages → Source 选 **GitHub Actions**
4. 推送代码后 workflow 自动构建并发布，1~2 分钟出网址：
   `https://<你的用户名>.github.io/big-number-idle/`

## 方式二：Netlify Drop（最简单，无需 git）

1. 本地执行 `npm run build`，得到 `dist/` 目录
2. 打开 https://app.netlify.com/drop ，把 `dist/` 文件夹拖进去
3. 立即获得网址，可自定义子域名

## 方式三：itch.io（游戏社区，适合正式发布）

1. 在 itch.io 创建项目，Kind 选 **HTML**
2. 本地执行 `npm run build`，把 `dist/` 压缩成 zip 上传
3. 页面即内嵌可玩，适合分享给玩家

---

## 想让云端代部署？

云端环境无 GitHub 凭据。若需要我代为推送 + 开启 Pages，请提供：
- 一个 **GitHub Personal Access Token**（勾选 repo + workflow 权限，classic token 即可）
- 目标仓库名（如 `big-number-idle`）

我会安装 git/gh 并完成建仓、推送、开启 Pages 全流程。
