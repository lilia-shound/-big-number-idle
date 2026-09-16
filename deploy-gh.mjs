/**
 * 一次性部署脚本：用 isomorphic-git 推送项目到 GitHub 并开启 Pages。
 * 运行后即可删除（含 token 痕迹，勿保留）。
 */

import git from "isomorphic-git";
import { request } from "isomorphic-git/http/node";
import https from "node:https";
import fs from "node:fs";
import path from "node:path";

const TOKEN = process.env.GH_TOKEN;
const OWNER = "lilia-shound";
const REPO = "-big-number-idle";
const DIR = "/home/marvis/Marvis/User/A438F1A20F20F670C139790DB9B642BF/workspace/conv_e695ff646a1d4c2fbb05c7bef71f4568/output/big-number-idle";

if (!TOKEN) {
  console.error("缺少 GH_TOKEN 环境变量");
  process.exit(1);
}

const auth = {
  username: "token",
  password: TOKEN,
};

const onAuthFailure = (url, authErr) => {
  console.error("auth failure:", url, authErr);
  return { cancel: true };
};

const remoteUrl = `https://github.com/${OWNER}/${REPO}.git`;

async function main() {
  // 1. init
  await git.init({ fs, dir: DIR, defaultBranch: "main" });

  // 2. add 全部（遵循 .gitignore）
  await git.add({ fs, dir: DIR, filepath: "." });

  // 3. commit
  await git.commit({
    fs,
    dir: DIR,
    author: { name: "marvis-deploy", email: "marvis@deploy.local" },
    message: "fix: ordinal rebirth sci format via unlockedNotations; drop redundant sci upgrade",
  });

  // 4. push
  const res = await git.push({
    fs,
    dir: DIR,
    http: { request },
    onAuth: () => auth,
    onAuthFailure,
    remote: "origin",
    url: remoteUrl,
    ref: "main",
    corsProxy: undefined,
    force: true,
  });
  console.log("push ok:", JSON.stringify(res));

  // 5. 开启 Pages（GitHub Actions 源）
  const apiRes = await httpsRequest(
    "PUT",
    `/repos/${OWNER}/${REPO}/pages`,
    { build_type: "workflow" },
    TOKEN
  );
  console.log("pages api:", apiRes.statusCode, apiRes.body);
}

function httpsRequest(method, apiPath, payload, token) {
  return new Promise((resolve, reject) => {
    const body = payload ? JSON.stringify(payload) : null;
    const req = https.request(
      {
        hostname: "api.github.com",
        path: apiPath,
        method,
        headers: {
          Authorization: `token ${token}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "marvis-deploy",
          "Content-Type": "application/json",
          "Content-Length": body ? Buffer.byteLength(body) : 0,
        },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve({ statusCode: res.statusCode, body: data }));
      }
    );
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

main().catch((e) => {
  console.error("部署失败:", e.message);
  process.exit(1);
});
