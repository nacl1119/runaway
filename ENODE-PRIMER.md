# enode 입문 — AI-DLC v1 실행 노트

`enode-fixup-workshop` 저장소에서 AWS AI-DLC v1 절차를 따라 Requirements
Analysis부터 Units Generation까지 실행한 과정을, 처음 보는 사람 기준으로 풀어
쓴 문서다. 진행 순서 → enode 용어 사전 → 유닛을 왜 이렇게 나눴는지 → 이미
만들어진 대시보드 화면(이 저장소의 [`enode-dashboard/`](enode-dashboard/))
순서로 읽으면 된다.

| | |
|---|---|
| 대상 저장소 | `taeels/enode-fixup-workshop` |
| 브랜치 | `v1-run-02` |
| 도달 지점 | Units Generation (Construction 이전, 코드는 안 씀) |

## 목차

- [1. AI-DLC v1이 밟은 순서](#1-ai-dlc-v1이-밟은-순서)
- [2. enode 용어 사전](#2-enode-용어-사전)
- [3. 유닛을 이렇게 나눈 이유 — 회의용](#3-유닛을-이렇게-나눈-이유--회의용)
- [4. 이미 있는 대시보드 화면](#4-이미-있는-대시보드-화면)

---

## 1. AI-DLC v1이 밟은 순서

AI-DLC는 INCEPTION(무엇을 왜 만들지) → CONSTRUCTION(어떻게 만들지) →
OPERATIONS(어떻게 배포·운영할지) 세 단계로 된 절차다. 이번 실행은 INCEPTION
안에서 아래 순서로 진행했고, **Units Generation에서 멈췄다** — 코드는 한 줄도
쓰지 않았다.

| # | 단계 | 상태 | 무슨 일이 있었나 |
|---|---|---|---|
| 1 | Workspace Detection | 항상 실행 | 기존 코드가 있는지 확인. enode는 Go 1.26으로 짜인 다섯 실행파일(`mediator`·`enode`·`enodectl`·`runctl`·`iapadapter`)짜리 브라운필드 프로젝트였다 |
| 2 | Reverse Engineering | 조건부 · 브라운필드만 | 다른 세션(v2 리뷰 워크스페이스)이 이미 만들어 둔 아키텍처·컴포넌트·API 문서 아홉 개를 그대로 옮겨왔다. 코드가 그 스캔 시점과 같다는 것만 확인하고 다시 훑지 않았다 |
| 3 | Requirements Analysis | 항상 실행 | 요구사항 문서의 미정 표시 25개 중 **유닛 경계에 실제로 영향을 주는 2개만** 질문했다(호스트 제어판 서버 위치, drain 노출 범위). 나머지 23개는 미정인 채로 기록만 하고 넘어갔다. 이후 정본 설계 저장소(`enode-design`)를 대조해 `GET /v1/nodes` 응답 모양은 이미 결정·구현된 값(`ADR-065`)으로 교체하고, drain을 무기한 걸면 대기열도 무기한 대기한다는 상호작용(`ADR-064` §5)을 새 미정으로 추가했다 |
| 4 | User Stories | **건너뜀** | 대상이 외부 고객이 아니라 팀 자체 개발보드 함대를 관리하는 내부 도구고, 요구사항 문서 자체가 이미 기능마다 목적·수용 기준을 담고 있어 스토리로 다시 쓰면 같은 내용을 반복하게 됐다 |
| 5 | Workflow Planning | 항상 실행 | 남은 단계 중 무엇을 실행할지 정했다. 분석만 해봐도 `internal/store`와 `internal/api`가 세 기능(현황판·대기열·drain)에서 공통으로 겹친다는 게 이미 보였다 — 유닛으로 어떻게 처리할지는 다음 단계로 넘겼다 |
| 6 | Application Design | 조건부 · 이번엔 강제 | 원래는 "새 컴포넌트가 있을 때만" 실행하는 조건부 단계지만, Units Generation의 전제조건으로 못 박혀 있어 강제 실행했다. drain 정책이 Mediator에 닿는 새 엔드포인트(`POST /v1/nodes/{id}/drain`, 그 노드 자신만 호출 가능)처럼 실제 설계 결정을 확정했다 |
| 7 | **Units Generation** | 이번 실행의 목표 지점 | 요구사항 넷을 유닛 넷으로 쪼갰다. **파일이 겹치는지는 아무도 시키지 않았는데** 앞선 단계의 관측을 근거로 스스로 확인했다 — 3절에서 자세히 다룬다 |
| 8 | Construction | 이번 라운드 아님 | 여기서부터가 실제 코드를 쓰는 단계다. 실행 지시(`START.md`)가 "Units Generation까지"로 못 박아 뒀으므로 멈췄다. 팀이 유닛을 나눠 맡으면 그때부터 시작되는 구간이다 |

---

## 2. enode 용어 사전

### 시스템을 이루는 것들

- **enode** — 프로젝트 전체의 이름이자, 자원이 있는 기계(개발보드가 꽂힌 PC
  등)에 상주하는 노드 데몬 프로세스의 이름이기도 하다. "부재중인 담당자의
  대리인" — 복제할 수 없는 자원에 AI가 대신 접근하게 하는 것이 존재 이유다.
- **Mediator** — 중앙 서버 하나. 상태(누가 무엇을 하고 있나)를 유일하게
  소유한다. 매칭·임대·시퀀싱을 하고 결과를 봉인한다. PostgreSQL에 저장한다.
- **노드(node)** — 광고를 보내는 기계 한 대. `node_id`로 식별한다. 노드는
  절대 먼저 듣지 않는다 — 항상 자기가 Mediator로 연결을 건다(방화벽 뒤
  개발보드가 아무 설정 없이 함대에 들어올 수 있는 이유).
- **enodectl** — 한 기계에 있는 enode를 로컬에서 관리하는 CLI —
  `status`·`start`·`stop`·`logs`. 오늘은 HTTP를 전혀 안 쓰는 순수 로컬
  도구다. 이번 기능(호스트 제어판)이 여기 첫 HTTP 서버를 얹는다.
- **runctl** — 사람이 쓰는 CLI. 무상태. Run을 제출하고 상태를 조회하고
  취소한다.
- **하네스(harness)** — 노드가 실제로 실행하는 AI 실행기. 지금은 `claude`
  CLI 하나뿐이다.

### 일이 흘러가는 방식

- **Run** — 사용자가 제출한 작업 실행 하나. `CREATED → RESOLVING →
  ALLOCATING → RUNNING → VERIFYING → SUCCEEDED/FAILED` 상태를 지나간다.
- **계약(contract)** — Run이 무엇을 할지 선언한 문서. 단계(`step`)들과 그
  사이의 의존(`needs`)을 담는다.
- **광고(advertise)** — 노드가 "나는 무엇을 할 수 있다"를 스스로 알리는
  것. 매번 전부를 다시 보내고, 만료된다. 소유자가 편집할 수 없다 — 다음
  광고가 덮어버리기 때문이다.
- **임대(lease)** — Mediator가 노드 하나를 어느 Run에 배타적으로 묶는 것.
  노드 하나엔 임대가 최대 하나뿐이다. 광고와 달리 사람이 정하고, 만료되지
  않는다 — 이 차이가 drain 기능의 핵심 축이다.
- **claim** — 노드가 "내가 할 일 있어?"라고 Mediator에 롱폴(길게 붙잡는
  요청)로 묻는 것. 저장소에서 유일하게 비멱등인 지점이다.
- **Record** — Run이 끝나면 파일시스템에 봉인되는 실행 기록. 봉인되면 고칠
  수도 지울 수도 없다.

### 이번 라운드에서 새로 배우는 것

- **drain** — 노드 소유자가 "내 자원 돌려줘"라고 말하는 것. 새 임대만
  막는 `graceful` 모드와, 다음 단계 경계에서 강제로 놓는 `at-boundary`
  모드가 있다. Run을 죽이지 않는다는 게 핵심 — 그 점이 "선점(이번엔 안
  만듦)"과 갈리는 지점이다.
- **소유자(principal)** — 노드를 함대에 내놓은 사람. 지금까지는 장부에
  기록만 되고 아무 데도 쓰이지 않았다 — 이번 기능이 처음으로 이걸 쓴다.
- **QUEUED** — 새로 생기는 Run 상태. 지금은 자원이 다 차 있으면(`409`)
  즉시 실패(`FAILED`)로 죽는데, 이번 기능은 대기시켰다가 자원이 풀리면
  자동으로 재시도하게 한다.
- **운용 관측** — 운영자가 지금 함대에 무슨 일이 있는지 보는 것 —
  `GET /v1/nodes`가 담당한다. **배정 판정이 아니다** — 실제 배정 가능
  여부는 항상 Mediator의 매칭 함수만 안다.
- **INVARIANTS** — 정본 설계 저장소(`enode-design`)가 정한, 절대 깨면 안
  되는 규칙 목록. `I1`(노드 하나는 동시에 임대 하나), `I4`(봉인된 Record는
  못 고침) 등. 이번 기능들은 전부 이 규칙을 건드리지 않는 선에서 설계됐다.
- **ADR** — Architecture Decision Record. 이번에 세 개(`ADR-063` drain,
  `ADR-064` 대기열, `ADR-065` 운용 관측)를 대조했다. 앞 둘은 아직 초안(미결),
  마지막은 이미 결정·구현됐다.

---

## 3. 유닛을 이렇게 나눈 이유 — 회의용

요구사항 넷이 그대로 유닛 넷이 됐다. 그런데 그냥 넷으로 나눈 게 아니라, **어느
파일이 겹치는지를 스스로 찾아서** 그 위에 병합 순서 권고를 얹었다 — 아무도
"파일 겹침을 확인해라"라고 시키지 않았는데도.

| 유닛 | 이름 | 출처 | 의존 | 담당 후보 |
|---|---|---|---|---|
| U1 | 중앙 현황판 | requirements.md 3.1.2 | 없음 — U2와 서로를 완성시켜준다 | 대시보드 계열 |
| U2 | 대기열 | requirements.md 3.2.2 | U1과 상호 의존 — 둘 다 끝나야 수용 기준이 참 | |
| U3 | drain | requirements.md 3.2.1 | 없음 — U2와 동작으로 얽힘(코드 의존 아님) | |
| U4 | 호스트 제어판 | requirements.md 3.1.1 | **U1·U3에 진짜 의존** — 그 둘의 엔드포인트가 서야 완주 가능 | 대시보드 계열 |

### 어느 파일에서 실제로 부딪히나

`internal/api/api.go`는 **파일 하나**에 API 라우트 15개가 전부 등록돼 있는
구조다 — 세 유닛이 여기 동시에 손을 대면 병합 순서를 정하지 않는 이상 반드시
부딪힌다.

| 파일 / 패키지 | U1 현황판 | U2 대기열 | U3 drain | U4 제어판 |
|---|:---:|:---:|:---:|:---:|
| `internal/api/api.go` (단일 830줄) | ● | ● | ● | – |
| `internal/store` (패키지, 파일 12개) | ● | ● | ● | – |
| `internal/match/match.go` | – | – | ● | – |
| `cmd/enodectl` | – | – | – | ● |

> **회의에서 이렇게 말하면 된다** — "유닛은 요구사항 그대로 넷이지만,
> 현황판·대기열·drain 셋이 `api.go` 한 파일과 `internal/store` 패키지를 같이
> 건드립니다. 동시에 시작해도 되는데, 그 파일에 손대는 순간(=병합 시점)만
> 순서를 정해야 합니다. 제가 맡은 호스트 제어판(U4)은 현황판·drain의
> 엔드포인트가 서야 끝까지 검증할 수 있어서, 뼈대는 먼저 만들되 완료 표시는
> 그 둘이 끝난 뒤로 미루겠습니다."

### 파일은 안 겹치는데 동작으로 얽히는 것 하나

drain(U3)을 무기한으로 걸어두면, 그 노드를 기다리는 대기열(U2)의 Run도
무기한 대기하게 된다(`ADR-064`). 코드 의존은 아니라서 유닛은 따로 개발해도
되지만, **통합 테스트는 반드시 같이 봐야 한다.**

---

## 4. 이미 있는 대시보드 화면

이 저장소의 [`enode-dashboard/`](enode-dashboard/)에 Python 표준 라이브러리만
으로 짠 참고 대시보드가 이미 있다. 화면별 원본 크기 스크린샷과 상세 설명은
[`enode-dashboard/SAMPLE.md`](enode-dashboard/SAMPLE.md)에 있다 — 여기서는
**어느 화면이 enode의 어느 개념과 대응하는지**만 짚는다.

> 아래 스크린샷은 Mediator가 꺼진 상태에서 찍혔다 — `WinError 10061`(연결
> 거부)이 보이는 이유다. 데이터는 비어 있지만 화면 구조와
> `LIVE`/`MOCK`/`CONFIG` 같은 출처 배지는 실제 그대로다.

### 운영 화면 — Fleet nodes

[![Fleet nodes 상세](enode-dashboard/screenshots/operations-running-enodes-detail.png)](enode-dashboard/screenshots/operations-running-enodes-detail.png)

이 화면이 정확히 우리 **U1(중앙 현황판)**이 만드는 화면이다.

| 화면 라벨 | enode 개념 |
|---|---|
| `ACTIVE ADVERTISEMENTS` | `GET /v1/nodes` 응답의 `nodes[]` — **광고** + 관측된 **임대** |
| `LEASE OBSERVED` | 그 노드 행의 `lease` 필드 — "지금 이 순간 그렇게 보였다"일 뿐, 배정을 보장하지 않는다(**운용 관측**은 배정 판정이 아니다) |
| `WORK TEMPLATES` | enode의 정식 개념이 아니다 — 대시보드가 얹은 사용자 편의 분류. 노드가 광고하는 진짜 capability(`agent.reason`)와 혼동하지 않는다 |

### 사용자 화면 — 내 작업 목록

[![내 작업 목록 상세](enode-dashboard/screenshots/my-work-list-detail.png)](enode-dashboard/screenshots/my-work-list-detail.png)

| 화면 라벨 | enode 개념 |
|---|---|
| `NOT LINKED` | 아직 이 로컬 메모가 **Run**과 안 이어짐 |
| `RESOLVING`·`ALLOCATING`·`RUNNING`·`VERIFYING`·`SUCCEEDED`·`FAILED` | **Run**의 정식 상태 그대로 — 화면이 새 어휘를 만들지 않는다 |
| `OFFLINE` | Mediator 통신 실패라는 로컬 UI 상태 — Run 상태와 어휘를 섞지 않는다(**광고 vs 정책** 축 분리와 같은 태도) |

### DLC 맥락 태그

[![DLC 맥락 태그 상세](enode-dashboard/screenshots/my-work-dlc-context-detail.png)](enode-dashboard/screenshots/my-work-dlc-context-detail.png)

화면 자체가 "이건 enode의 정식 DLC 단계 필드가 아니라 화면상의 추정"이라고
못 박아 둔다. 우리가 다루는 **AI-DLC**(이 문서 1절의 계획 절차)와 이 **DLC
맥락 태그**(런타임 추정)는 이름은 비슷해도 다른 개념이다 — 헷갈리지 않아야
한다.

나머지 화면(전체 구성 둘, Run 조사, Run 상세)은
[`enode-dashboard/SAMPLE.md`](enode-dashboard/SAMPLE.md)에서 원본 크기로 볼
수 있다.

---

*이 문서는 `taeels/enode-fixup-workshop`의 AI-DLC v1 실행(브랜치
`v1-run-02`) 산출물을 바탕으로 정리했다. 원본 실행 문서는 그 저장소의
`aidlc-docs/inception/`에 있다.*
