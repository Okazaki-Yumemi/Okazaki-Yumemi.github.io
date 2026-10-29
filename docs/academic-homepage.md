# Academic homepage — implementation and review

Local branch: `codex/academic-homepage`. Deployment authorized by the author on 2026-10-29. GitHub Pages uses the existing Actions workflow; root HTML snapshots are not part of this release.

## Architecture and scope

The existing site is Hexo 8.1.2 / Butterfly 5.7.0 (npm theme), with Markdown posts in `source/_posts`, standalone About/Projects pages, custom assets, and generator scripts. `scripts/academic.js` adds five static routes under `/research/` using `source/_data/academic.json`. The academic layout has its own CSS and navigation, no Butterfly wallpaper or blog widgets, no new dependencies, and no links in the blog navigation. The original blog and all 35 article sources are unchanged. Writing links intentionally lead to the two existing DeepInfer notes selected by the author.

The original workflow builds on main and can deploy Pages when `WEB_WRITER_ENABLED=true`. The historical root HTML copies remain untouched. Academic pages are part of the normal `public/` output. Independent layout/navigation is implemented; independent hosting/domain is not configured.

## Content and sources (checked 2026-10-29)

Identity, portrait, email, and general research interests: author supplied. Research disclosure was subsequently reduced at the author's request: generic topic heading, under-review status, no actual manuscript title, mechanism, numerical/stability claims, attachments, or code links. Generic heading is a topic label, not a replacement paper title. CV remains null and hidden.

| Project | Classification and evidence | Decision |
|---|---|---|
| CS336 | Public non-fork; README explicitly distinguishes self-study implementations from Stanford starter code; assignments and notes tree | Selected; large experiments explicitly qualified |
| YMarkdownG | Public non-fork; README, package.json (author, Electron/React/TypeScript), src and electron tree | Selected; version and platform limitations retained |
| NanTangJieYu-V | Public non-fork; README describes domain logic, state persistence, player/admin/display interfaces and tests | Selected; intended scale, no claim of actual attendance |
| SJTU-empty-Classroom-Radar | Public non-fork; app.py imports Flask/Requests and implements schedule/realtime search; templates/index.html | Selected; no live-service uptime claim |
| SJTUHPC2026 | Public non-fork; README empty; description and Assignments tree support shell/C/C++/CMake exercises | Full projects only; no HPC speedup claims |
| MiniVim | GitHub fork of SJTUJohnClass/MiniVim; course specification and C++ tree | Full projects only; personal scope explicitly unverified |

All project links use `https://github.com/Okazaki-Yumemi/<name>`. Public API metadata and README/source were read; functional project execution and full contributor attribution were not audited, so no sole-authorship or benchmark claims are made. Private research READMEs were reviewed only to determine exclusion; no private contents or URLs are copied here or into generated pages. Upstream-derived research code is not presented as original work.

The public repository inventory below records initial screening by fork status and purpose, not a claim that every repository received a full source review. Focused evidence review covered the six candidates above. Other forks are excluded absent evidence of substantial personal contributions; other coursework/tools remain outside the curated list. No star-based ranking was used.

## Run and validate

```sh
npm ci
npm run build
npm run check
node tools/check-academic.mjs
npm run server -- --ip 127.0.0.1
```

Open http://127.0.0.1:4000/research/ . Supporting routes: manuscripts/, projects/, writing/, contact/.

`npm run check` verifies 141 pages, all 35 posts and local links. The academic checker additionally checks exact writing selection, under-review status, no protocol-relative links, hidden CV, canonical metadata, and absence of restricted research details. Browser QA includes desktop and 390px mobile layouts and dark mode; screenshots are under `docs/screenshots/`. The theme uses Butterfly's expiring localStorage format. No tracking, animation libraries, or generated research graphics added.

## Maintenance and release

Edit `source/_data/academic.json` to update profile, manuscripts, project records, contacts, or selected article permalinks. Add a project with `selected:true` for the homepage, otherwise it appears only in the full list. Set `cv` only after supplying an approved real PDF in public assets. All fields must remain approved for public disclosure. Do not copy unpublished manuscript details into this file.

Review with `git diff` for tracked edits and `git diff --no-index -- /dev/null <new-file>` (Git Bash) for new files. The original untracked images are unrelated and must not be staged. After manual approval, explicitly stage the academic source/assets/checker/docs and merge the reviewed branch. Existing Actions deployment is unchanged; do not run `publish:root`, push main, or dispatch deployment before approval. For legacy root-based Pages, the existing documented root publish step is needed after approval. Keeping `/research/` does not provide access control: it will be public if deployed.

## Public repository screening inventory

- ACMOJ-John-26Spring — non-fork; curated only if reviewed above
- BayesianOptimization — fork; excluded unless reviewed above
- Cell-City — non-fork; curated only if reviewed above
- claude-code — fork; excluded unless reviewed above
- claude-code-source-code — fork; excluded unless reviewed above
- claude-code-sourcemap — fork; excluded unless reviewed above
- ConfLayers — fork; excluded unless reviewed above
- Cpp_SJTU — non-fork; curated only if reviewed above
- CS336 — non-fork; curated only if reviewed above
- CUDA_PROGRAMMING_GUIDE_simplified-Chinese — non-fork; curated only if reviewed above
- DeepInfer — fork; excluded unless reviewed above
- desktopManager — non-fork; curated only if reviewed above
- EAGLE — fork; excluded unless reviewed above
- GPTQModel — fork; excluded unless reviewed above
- HungYi_Lee_ML_2023_spring — non-fork; curated only if reviewed above
- Kangaroo — fork; excluded unless reviewed above
- Kimi-Linear — fork; excluded unless reviewed above
- knapspec — fork; excluded unless reviewed above
- KNN-SSD — fork; excluded unless reviewed above
- llama.cpp — fork; excluded unless reviewed above
- MiniVim — fork; excluded unless reviewed above
- MyRustLearningRoute — non-fork; curated only if reviewed above
- my_cs61a_study_codes — non-fork; curated only if reviewed above
- NanTangJieYu-V — non-fork; curated only if reviewed above
- OI-wiki — fork; excluded unless reviewed above
- Okazaki-Yumemi — non-fork; curated only if reviewed above
- Okazaki-Yumemi.github.io — non-fork; curated only if reviewed above
- PasteMD — fork; excluded unless reviewed above
- PKU-Ai-Infra — non-fork; curated only if reviewed above
- PLFM_RADAR — fork; excluded unless reviewed above
- Quasar — fork; excluded unless reviewed above
- ShangHaiJiaoTongUniversity-Basic-introduction-to-Artificial-Intelligence- — non-fork; curated only if reviewed above
- shuiyuan-session-lock — non-fork; curated only if reviewed above
- SJTU-empty-Classroom-Radar — non-fork; curated only if reviewed above
- sjtu-monitor — fork; excluded unless reviewed above
- SJTUHPC2026 — non-fork; curated only if reviewed above
- SmartPointers — fork; excluded unless reviewed above
- SparseSpec — fork; excluded unless reviewed above
- STLite-ACM-2026 — fork; excluded unless reviewed above
- SWIFT — fork; excluded unless reviewed above
- UCBerkeley-CS189-Sp24-Machine-Learning — fork; excluded unless reviewed above
- vllm — fork; excluded unless reviewed above
- WebsiteSpeedRun — non-fork; curated only if reviewed above
- YangZhouTHO — non-fork; curated only if reviewed above
- YMarkdownG — non-fork; curated only if reviewed above

