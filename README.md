# runaway

**enode** 프로젝트에 새로 들어온 사람이 가장 먼저 볼 저장소다. AI-DLC v1
절차를 실제로 밟은 기록과, enode가 무엇을 관측하고 어떻게 보여주는지를
한곳에 모아 둔다.

## 이 저장소가 필요한 사람

- **enode**가 뭔지 아직 감이 안 잡히는 사람
- AI-DLC v1으로 unit을 나누기 전에, 그 절차에서 사람과 AI가 어떤 고민을
  주고받는지 먼저 보고 싶은 사람
- 팀원 각자의 Units Generation 결과를 나중에 종합해야 하는데, 그 판단
  근거를 어떻게 읽어야 할지 기준이 필요한 사람

## 먼저 읽을 것

### [→ enode 입문 전체 읽기](https://nacl1119.github.io/runaway/)

AI-DLC v1이 밟은 순서 → enode 개념 사전 → 유닛을 왜 이렇게 나눴는지 →
실제 대시보드 화면 → 팀원들의 다른 결과를 이해하는 법, 이 순서로 읽으면
된다. 산출물 태그를 클릭하면 원본이 아니라, 왜 그 문서를 검토했고 어떤
결정을 왜 골랐는지 재가공한 설명이 열린다. 어떤 문서가 판단에 실제로
쓰였고 어떤 문서는 읽기만 하고 안 썼는지도 태그 색으로 구분해 둔다.

## 화면 미리보기

enode는 노드가 스스로 작업을 신청하고, Mediator가 그 신청을 받아 배정하는
구조다. 아래는 그 관측 결과를 보여주는 참고 대시보드 화면이다.

![Mediator의 Fleet nodes LIVE 관측과 작업 템플릿이 보이는 운영 화면](enode-dashboard/screenshots/operations-dashboard.png)

운영자가 보는 화면 — 지금 떠 있는 노드와 각 노드가 신청한 작업 템플릿을
LIVE로 관측한다.

![작업별 기능·Run ID·상태·데이터 출처가 보이는 개인 작업 목록](enode-dashboard/screenshots/my-work.png)

개발자가 보는 화면 — 자신이 맡은 작업이 어떤 Run으로, 어떤 상태로 진행
중인지 확인한다.

두 화면이 각각 어떤 enode 개념과 맞물리는지는 위 primer의 "대시보드 화면"
절에서 하나씩 설명한다.

### 직접 띄워보려면

Python 표준 라이브러리만으로 돌아간다. 이 저장소를 클론한 뒤:

```bash
cd enode-dashboard
ENODE_MEDIATOR_TOKEN=dev-dashboard-token python server.py
```

(PowerShell이면 `$env:ENODE_MEDIATOR_TOKEN = "dev-dashboard-token"`을 먼저
실행한다.)

- 운영 화면 — <http://127.0.0.1:8765/>
- 내 작업 화면 — <http://127.0.0.1:8765/me>

**Mediator·Postgres가 안 떠 있어도 화면은 그대로 뜬다** — LIVE 패널만
연결 실패로 표시될 뿐이다. `dev-dashboard-token`은 로컬 데모용
placeholder일 뿐, 실제 Mediator에 붙일 때만 그쪽 토큰과 맞추면 된다.
설정 항목(포트·Mediator 주소 등)과 검증 상태는
[enode-dashboard/README.md](enode-dashboard/README.md)를 본다.

## 구성

- [docs/](docs/) — GitHub Pages로 배포되는 primer 원본(`index.html`)
- [ENODE-PRIMER.md](ENODE-PRIMER.md) — 같은 내용의 GitHub 마크다운 버전
  (다이어그램·클릭 상호작용 없이 텍스트로만)
- [enode-dashboard/](enode-dashboard/) — 참고 대시보드의 원본 구현과 전체
  화면 캡처([SAMPLE.md](enode-dashboard/SAMPLE.md))

## 원본이 궁금하면

- AI-DLC v1을 실제로 실행한 저장소 —
  [taeels/enode-fixup-workshop](https://github.com/taeels/enode-fixup-workshop),
  `v1-run-02` 브랜치
- enode 설계 원본(ADR·프로토콜 문서) —
  [enode-design](https://github.com/taeels/enode-design)
