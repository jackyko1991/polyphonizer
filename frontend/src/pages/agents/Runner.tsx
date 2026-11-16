/**
 * AI agent ▸ Runner (#/agents/runner): the Polyphonizer runner, which turns PDFs and photos of printed music into
 * notes for Transcribe (and later serves the AI agent), on your own computer, on a VPS or as a Hugging Face Space.
 * The commands match runner/server.py, runner/Dockerfile and pixi.toml; keep them in step.
 */
import { ShellCommand, useLang } from "@learnkit/web";
import { Callout, List, P, Page, Section, type L, type SectionInfo } from "../kit";

const PAGE = "agent-runner";
const SECTIONS: SectionInfo[] = [
  { id: "what", title: ["What the runner does", "執行器做什麼"] },
  { id: "computer", title: ["On your own computer", "在你自己的電腦上"] },
  { id: "vps", title: ["On a VPS", "在 VPS 上"] },
  { id: "space", title: ["As a Hugging Face Space", "作為 Hugging Face Space"] },
  { id: "connect", title: ["Connect the site", "連接網站"] },
  { id: "safe", title: ["Safe by design", "安全的設計"] },
];

const CADDY = `runner.example.org {
\treverse_proxy 127.0.0.1:8765
}`;
const SPACE_README = `---
title: Polyphonizer runner
sdk: docker
app_port: 8765
---`;

export default function RunnerPage({ section }: { section: string | null }) {
  const { pick } = useLang();
  const Cmd = ({ t }: { t: string }) => <ShellCommand text={t} plain />;
  return (
    <Page
      id={PAGE}
      overline={["AI agent", "AI 代理"] as L}
      title={["Runner and servers", "執行器與伺服器"]}
      intro={[
        "Transcribe turns a PDF or photo of printed music into notes. A browser can't do that alone, so a small program, the **runner**, does it: on your own computer (free and private), on a server you rent, or as a Hugging Face Space.",
        "「轉成樂譜」能把印刷樂譜的 PDF 或照片轉成音符。瀏覽器自己做不到，所以由一個小程式 **執行器** 來做：在你自己的電腦上（免費且私密）、在你租的伺服器上，或作為 Hugging Face Space。",
      ]}
      sections={SECTIONS}
      focus={section}
    >
      <Section page={PAGE} id="what" n={1} title={SECTIONS[0].title}>
        <P
          t={[
            "The site sends the file; the runner reads it with KobiMusic's **copisteria** (an open model, Apache-2.0, on the CPU, about 30 seconds a page) and sends back MusicXML, which opens in the editor. It keeps no files.",
            "網站送出檔案；執行器用 KobiMusic 的 **copisteria**（開放模型，Apache-2.0，用 CPU，每頁約 30 秒）讀譜，再把 MusicXML 傳回來，在編輯器中開啟。它不保留任何檔案。",
          ]}
        />
        <P
          t={[
            "All three places run the same program and speak the same small protocol (`GET /status`, `POST /omr`, `POST /transcribe`), so the site only needs its address. The AI helper will use the same runner later.",
            "三個地方執行的是同一個程式、說同一套小協定（`GET /status`、`POST /omr`、`POST /transcribe`），所以網站只需要它的位址。之後 AI 助手也會使用同一個執行器。",
          ]}
        />
      </Section>

      <Section page={PAGE} id="computer" n={2} title={SECTIONS[1].title}>
        <P
          t={[
            "You need [pixi](https://pixi.sh) and a copy of Polyphonizer's repository. Once, install the reader (PyTorch and about 131 MB of model files):",
            "你需要 [pixi](https://pixi.sh) 和一份 Polyphonizer 的程式庫。先安裝一次讀譜器（PyTorch 與約 131 MB 的模型檔）：",
          ]}
        />
        <Cmd t={"git clone https://github.com/jackyko1991/polyphonizer\ncd polyphonizer\npixi run -e omr omr-setup"} />
        <P t={["Then, whenever you want to transcribe, start the runner and leave it open:", "之後每次要轉譜時，啟動執行器並讓它保持開著："]} />
        <Cmd t="pixi run runner" />
        <P
          t={[
            "It answers at `http://127.0.0.1:8765`, the address Transcribe tries first: the dialog finds it by itself. On an Intel Mac, PyTorch has no build for this Python: use a server or a Space instead.",
            "它在 `http://127.0.0.1:8765` 回應，這正是「轉成樂譜」最先嘗試的位址：對話框會自動找到它。Intel 晶片的 Mac 沒有這個 Python 版本的 PyTorch：請改用伺服器或 Space。",
          ]}
        />
      </Section>

      <Section page={PAGE} id="vps" n={3} title={SECTIONS[2].title}>
        <P
          t={[
            "Any small Linux server with Docker will do (2 CPUs and 4 GB of memory are plenty). Build the image from the repository and start it, reachable only from the server itself, with a long secret token:",
            "任何裝有 Docker 的小型 Linux 伺服器都可以（2 顆 CPU、4 GB 記憶體就很足夠）。從程式庫建置映像檔並啟動，只讓伺服器本身連得到，並設定一個夠長的秘密權杖：",
          ]}
        />
        <Cmd
          t={
            "git clone https://github.com/jackyko1991/polyphonizer && cd polyphonizer\ndocker build -f runner/Dockerfile -t polyphonizer-runner .\ndocker run -d --restart unless-stopped -e PZ_TOKEN=$(openssl rand -hex 24) -p 127.0.0.1:8765:8765 polyphonizer-runner"
          }
        />
        <P
          t={[
            "Write the token down (`docker inspect` shows it). The site is served over HTTPS, so the runner must be too: point a domain at the server and let [Caddy](https://caddyserver.com) get the certificate and pass requests on. Its whole `Caddyfile`:",
            "記下這個權杖（`docker inspect` 可以看到）。網站使用 HTTPS，所以執行器也必須是 HTTPS：把網域指向伺服器，讓 [Caddy](https://caddyserver.com) 取得憑證並轉送請求。完整的 `Caddyfile`：",
          ]}
        />
        <Cmd t={CADDY} />
        <P
          t={[
            "Your runner's address is then `https://runner.example.org` (your domain).",
            "你的執行器位址就是 `https://runner.example.org`（換成你的網域）。",
          ]}
        />
      </Section>

      <Section page={PAGE} id="space" n={4} title={SECTIONS[3].title}>
        <P
          t={[
            "A Hugging Face Space runs the same Docker image on Hugging Face's computers, with HTTPS included.",
            "Hugging Face Space 會在 Hugging Face 的電腦上執行同一個 Docker 映像檔，並已附帶 HTTPS。",
          ]}
        />
        <List
          ordered
          items={[
            [
              "Create a new Space with the **Docker** SDK (Blank) and the free **CPU basic** hardware. Hugging Face may ask for a paid plan to create Spaces; check its pricing page.",
              "建立新的 Space，SDK 選 **Docker**（Blank），硬體選免費的 **CPU basic**。Hugging Face 可能要求付費方案才能建立 Space；請查看它的價格頁。",
            ],
            [
              "In the Space's **Settings ▸ Variables and secrets**, add a secret named `PZ_TOKEN` with a long random value.",
              "在 Space 的 **Settings ▸ Variables and secrets** 新增一個名為 `PZ_TOKEN` 的 secret，值設為一串夠長的隨機字元。",
            ],
            [
              "Put the `runner` folder of Polyphonizer's repository in the Space's repository, copy `runner/Dockerfile` to its top as `Dockerfile`, and start its `README.md` with:",
              "把 Polyphonizer 程式庫的 `runner` 資料夾放進 Space 的程式庫，把 `runner/Dockerfile` 複製到最上層並命名為 `Dockerfile`，`README.md` 的開頭寫：",
            ],
          ]}
        />
        <Cmd t={SPACE_README} />
        <P
          t={[
            "Push, and wait for the build (several minutes: it fetches PyTorch and the model). Keep the Space **public** (the token protects it), and its address is `https://<your-name>-<space-name>.hf.space`. A free Space sleeps when unused; the first request after that takes about half a minute longer.",
            "推送後等待建置（需要幾分鐘：要下載 PyTorch 和模型）。讓 Space 保持 **公開**（由權杖保護），位址是 `https://<你的名稱>-<space 名稱>.hf.space`。免費 Space 閒置時會休眠；之後的第一次請求會多花大約半分鐘。",
          ]}
        />
      </Section>

      <Section page={PAGE} id="connect" n={5} title={SECTIONS[4].title}>
        <P
          t={[
            "In the editor, open **Transcribe**. Under **My computer or my server**, type the address and the token, and press **Connect**: it says what the runner can do (\"reads pages\"). The address and token stay in this browser.",
            "在編輯器中打開 **轉成樂譜**。在 **我的電腦或我的伺服器** 下方輸入位址與權杖，按 **連線**：它會顯示執行器能做什麼（「讀譜」）。位址與權杖只保存在這個瀏覽器裡。",
          ]}
        />
        <Callout kind="tip" title={["Check it from a terminal", "從終端機檢查"]}>
          <p>{pick(["The status of your runner, with your token:", "用你的權杖查詢執行器狀態："])}</p>
          <Cmd t={'curl -H "Authorization: Bearer <token>" https://runner.example.org/status'} />
        </Callout>
      </Section>

      <Section page={PAGE} id="safe" n={6} title={SECTIONS[5].title}>
        <List
          items={[
            [
              "On your computer it listens on `127.0.0.1` only: nothing on the network can reach it.",
              "在你的電腦上它只監聽 `127.0.0.1`：網路上的任何東西都連不到它。",
            ],
            [
              "On a server it refuses to start without `PZ_TOKEN`, and every request must carry it.",
              "在伺服器上，沒有設定 `PZ_TOKEN` 它就拒絕啟動，而且每個請求都必須帶著權杖。",
            ],
            [
              "Only Polyphonizer's own pages may call it from a browser (CORS); other websites are refused.",
              "只有 Polyphonizer 自己的網頁能從瀏覽器呼叫它（CORS）；其他網站一律拒絕。",
            ],
            [
              "Files are read in a temporary folder that is deleted before the answer goes back; nothing is kept or logged.",
              "檔案在暫存資料夾中讀取，回應送出前就會刪除；不保留、不記錄任何內容。",
            ],
            [
              "Plain `http://` is accepted for this computer only: anywhere else the site insists on HTTPS.",
              "只有這台電腦可以用一般的 `http://`：其他位址網站一律要求 HTTPS。",
            ],
          ]}
        />
      </Section>
    </Page>
  );
}
