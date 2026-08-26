# enode 로컬 대시보드

Python 표준 라이브러리만 사용하는 로컬 운영 대시보드입니다. 브라우저는 이 서버만 호출하고, 서버가 Bearer 토큰을 보관한 채 Mediator를 대신 호출합니다. Mediator 요청에서는 시스템 프록시를 명시적으로 비활성화합니다.

## 추가된 운영 기능

- 운영 화면의 `Running enodes`: 현재 PC의 `enode.exe` 프로세스와 `config.json`에 선언한 TCP 엔드포인트 상태를 LIVE로 점검
- 개발 기능 카탈로그: 램덤프 분석, 빌드, 퓨징, 테스트 수행, 결과 확인, Gerrit 패치 push
- 사용자 화면의 `내 작업 목록`: 작업 이름·기능·Run ID를 브라우저에 로컬 저장하고 항목별 Run 상태를 Mediator에서 LIVE로 갱신
- 작업 상태: `NOT LINKED`, `CHECKING`, `WAITING`, `RUNNING`, `BLOCKED`, `DONE`, `FAILED`, `SUCCEEDED`, `CANCELED`, `OFFLINE`

## 화면 미리보기

실행 없이 현재 결과를 확인할 수 있습니다.

### 운영 화면

![운영 대시보드](screenshots/operations-dashboard.png)

#### 부분 화면 1 — Running enodes 인벤토리

![Running enodes 상세](screenshots/operations-running-enodes-detail.png)

이 영역은 운영자가 **현재 어느 enode가 실제로 살아 있고, 각 인스턴스가 어떤 개발 기능을 맡도록 구성되었는지** 한눈에 확인하는 곳입니다.

- **ACTIVE INSTANCES**: 이 PC에서 실행 중인 `enode.exe` 프로세스와 `config.json`의 `enode_instances`에 등록한 TCP 엔드포인트를 점검합니다. 캡처의 `0 RUNNING`은 임의의 예시 수치가 아니라 캡처 시점에 발견된 실행 인스턴스가 없다는 LIVE 결과입니다.
- **DEVELOPMENT FUNCTIONS**: 램덤프 분석, 빌드, 퓨징, 테스트 수행, 결과 확인, Gerrit 패치 push처럼 enode가 수행할 수 있는 개발 이슈 처리 범주를 설명합니다.
- **LIVE와 CONFIG의 차이**: 실행 여부는 현재 PC와 엔드포인트를 직접 점검한 `LIVE`이고, 기능 카탈로그 및 인스턴스별 기능 선언은 운영 설정에서 읽은 `CONFIG`입니다. 따라서 기능 카드가 보인다고 해당 worker가 현재 실행 중이라는 뜻은 아닙니다.
- **운영 목적**: 장애 조사나 빌드 요청을 보내기 전에 실행 가능한 worker가 있는지, 필요한 기능이 올바른 인스턴스에 배치되어 있는지를 확인합니다.

#### 부분 화면 2 — Run 조사

![Run 조사 상세](screenshots/operations-run-inspection-detail.png)

이 영역은 하나의 개발 작업 실행을 `Run ID`로 추적하는 진입점입니다.

- Run ID를 입력하고 **조회**하면 Mediator에서 현재 상태, 단계 타임라인, 거절 또는 차단 사유, 최종 판정, record에 저장된 AI 실행 정보를 읽습니다.
- 우측 상태의 `NO RUN`은 아직 유효한 Run 결과를 읽지 못했다는 뜻입니다. Mediator가 오프라인이면 화면 전체를 멈추지 않고 해당 LIVE 조회만 실패 상태로 표시합니다.
- 운영자는 이 결과를 이용해 작업이 대기·실행·차단·완료 중 어디에 있는지 확인하고, 실패 시 어느 단계의 로그와 record를 먼저 조사할지 결정할 수 있습니다.

### 사용자 화면

![내 작업 화면](screenshots/my-work.png)

#### 부분 화면 1 — 내 작업 목록

![내 작업 목록 상세](screenshots/my-work-list-detail.png)

이 영역은 사용자가 램덤프 분석, 빌드, 퓨징, 테스트, 결과 확인, Gerrit 패치 push 같은 **개인 개발 작업을 한 목록에서 관리**하는 곳입니다.

- 각 항목에는 작업 이름, 기능 종류, 선택적인 Run ID가 있으며 이름과 Run ID는 목록에서 바로 수정할 수 있습니다.
- 목록 자체는 브라우저의 로컬 저장소에 보관됩니다. 서버의 공식 작업 데이터처럼 보이지 않도록 `LOCAL SAMPLE` 또는 로컬 출처가 표시됩니다.
- Run ID가 없는 항목은 `NOT LINKED`, 연결된 항목은 조회 중 `CHECKING`을 거쳐 Mediator 응답에 따라 `WAITING`, `RUNNING`, `BLOCKED`, `DONE`, `FAILED`, `SUCCEEDED`, `CANCELED`, `OFFLINE` 등으로 표시됩니다.
- **상세**는 선택한 작업의 Run을 위쪽 Run ID 입력란과 아래 Run 상세 영역에 연결합니다. 삭제 버튼은 로컬 작업 항목만 지웁니다.

#### 부분 화면 2 — DLC 맥락 태그

![DLC 맥락 태그 상세](screenshots/my-work-dlc-context-detail.png)

이 영역은 선택한 Run의 상태·거절·판정 정보를 바탕으로 지금 검토해야 할 개발 수명주기 맥락을 정리합니다.

- `MAIN`은 현재 가장 중심적인 맥락, `RELATED`는 함께 확인할 맥락, `범위 밖`은 현재 Run의 직접 대상이 아닌 참고 영역입니다.
- 캡처의 `구현`, `요구사항`, `설계`, `배포` 태그는 **순서나 진행률 막대가 아닙니다**. enode가 제공하는 정식 DLC 단계 필드도 아니며, 현재 Run 정보를 화면에서 해석한 `LIVE + INFERENCE` 결과입니다.
- 사용자는 태그를 통해 “몇 퍼센트 완료됐는가”가 아니라 “지금 어떤 관점으로 이 작업을 살펴봐야 하는가”를 빠르게 파악합니다.

#### 부분 화면 3 — Run 상세

![사용자 Run 상세](screenshots/my-work-run-detail.png)

이 영역은 선택한 작업의 실행 근거를 사용자가 직접 확인하는 곳입니다.

- Run을 적용하면 단계별 타임라인, 최종 판정, harness와 record에 남은 AI 실행 상세가 표시됩니다.
- 목록의 짧은 상태 배지만으로 판단하기 어려운 경우 어느 단계에서 멈췄는지, 결과가 성공·실패로 판정된 근거가 무엇인지 확인할 수 있습니다.
- 캡처처럼 안내 문구만 보이면 아직 적용된 Run이 없거나 LIVE 데이터를 읽지 못한 상태입니다. 샘플 성공 결과로 채우지 않아 실제 연결 상태와 혼동되지 않게 했습니다.

## 실행

```powershell
$env:ENODE_MEDIATOR_TOKEN = "dev-dashboard-token"
python .\server.py
```

- 운영 화면: <http://127.0.0.1:8765/>
- 내 작업: <http://127.0.0.1:8765/me>

## 설정

`config.json`에서 Mediator 주소·토큰, enode 바이너리 경로, 노드 설정 후보 경로, Postgres 호스트·포트, 점검할 `enode_instances`를 바꿀 수 있습니다. 환경변수 `ENODE_MEDIATOR_URL`, `ENODE_MEDIATOR_TOKEN`, `ENODE_PRINCIPAL`, `ENODE_DASHBOARD_HOST`, `ENODE_DASHBOARD_PORT`, `ENODE_DASHBOARD_CONFIG`, `ENODE_BIN_DIR`, `ENODE_GO_PATHS`, `ENODE_NODE_CONFIG_PATHS`, `ENODE_DATABASE_HOST`, `ENODE_DATABASE_PORT`가 같은 항목보다 우선합니다. 여러 경로 환경변수는 Windows에서 세미콜론으로 구분합니다.

원격 또는 별도 포트의 enode는 다음처럼 등록할 수 있습니다.

```json
"enode_instances": [
  {
    "id": "dump-worker-1",
    "name": "램덤프 분석 worker",
    "host": "127.0.0.1",
    "port": 8091,
    "functions": ["dump.analyze", "test.inspect"]
  }
]
```

토큰을 외부에 공유하거나 저장소에 커밋하지 마세요. 현재 들어 있는 `dev-dashboard-token`은 로컬 데모용 값입니다.

## 데이터 신뢰성

- LIVE: PC 셋업 점검, 실행 중 enode 프로세스·설정 엔드포인트, Mediator capability, Run과 record tar, Ask 인박스, git 이메일
- CONFIG: enode 개발 기능 카탈로그와 운영자가 선언한 인스턴스 기능
- LOCAL + LIVE RUN: 내 작업 목록은 브라우저에 저장하고, Run ID가 있는 항목의 상태만 Mediator에서 조회
- MOCK: 여러 Run을 가로지르는 AI 누적 집계, 사용자가 로컬에 저장하는 프로젝트 라벨

Mediator가 꺼져 있어도 웹 서버와 화면은 유지되고 각 LIVE 패널에 연결 실패가 표시됩니다.

## 현재 검증 상태

- Python 문법 및 JavaScript 문법 검사 통과
- `/`, `/me`, `/api/setup`, `/api/enodes` HTTP 200 확인
- 실제 브라우저에서 운영/사용자 화면 렌더링, 작업 추가·Run 상태 갱신·삭제 확인
- 현재 검증 PC에는 WSL Ubuntu/Postgres와 Mediator가 없어 해당 LIVE 패널의 연결 실패 표시를 확인
- 실제 enode 저장소는 비공개 접근 권한이 없어 이 결과물에 바이너리를 포함하지 않음

## 파일 구성

```text
enode-dashboard/
├─ server.py              # 표준 라이브러리 HTTP 서버와 Mediator 프록시
├─ config.json            # 교체 가능한 로컬 설정
├─ static/
│  ├─ index.html          # 운영 화면
│  ├─ me.html             # 사용자 화면
│  ├─ style.css
│  └─ app.js
└─ screenshots/
   ├─ operations-dashboard.png
   ├─ operations-running-enodes-detail.png
   ├─ operations-run-inspection-detail.png
   ├─ my-work.png
   ├─ my-work-list-detail.png
   ├─ my-work-dlc-context-detail.png
   └─ my-work-run-detail.png
```
