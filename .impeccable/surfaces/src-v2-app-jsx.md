---
version: 1
slug: "src-v2-app-jsx"
primary_target: "src/v2/App.jsx"
related_targets: []
---

# Surface: 球友誌 v2（主畫面、登入、表單、設定）

Mode: Operate。使用者：一起打球的朋友圈，手機為主。任務：找人揪團、聯絡、維護名單。功能與原版完全相同，只換視覺。

## Direction contract

THESIS: 球友名單是一張正式排球記分表（scoresheet），每位球友是表上的一列紀錄；拒絕原版那種漂浮圓角卡片配粉彩漸層的通用 App 版面。

OWN-WORLD: 記分表白紙底（略帶冷灰），表格墨線是深藍黑，主隊藍與客隊紅兩種原子筆墨色分別是主要動作與危險動作；五個位置各有一條固定色線（舉球、主攻、副攻、攔中、自由），像路線圖一樣貫穿篩選、欄位標頭、球友列左緣。細 1px 格線、方角、表頭小字全大寫標籤，數字用等寬表格數字。

STORY: 打開就看到依位置分區的名單，一眼知道誰打什麼、程度多少，點聯絡圖示直接開 IG／LINE，新增按鈕永遠在拇指範圍。

FIRST VIEWPORT: 頂部是記分表抬頭（logo、球友誌、場次式統計：總人數與最愛數），下方一排五格位置分頁（羅馬數字 I–V 加色線與人數）作為主導覽，接著是目前位置的球友列；右下角固定藍墨新增鈕。

FORM: 排球比賽記分表，grounded list 第 6 名，seed key eab44b19。加碼：位置色線來自捷運路線圖（rail map）；最愛與狀態用蓋章表示、不消失，來自機票票夾（ticket wallet）。

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
