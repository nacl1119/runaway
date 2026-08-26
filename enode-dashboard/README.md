# enode 로컬 대시보드

Python 표준 라이브러리만 사용하는 로컬 운영 대시보드입니다. 브라우저는 이 서버만 호출하고, 서버가 Bearer 토큰을 보관한 채 Mediator를 대신 호출합니다. Mediator 요청에서는 시스템 프록시를 명시적으로 비활성화합니다.

## 화면 미리보기

실행 없이 현재 결과를 확인할 수 있습니다.

### 운영 화면

![운영 대시보드](screenshots/operations-dashboard.png)

### 사용자 화면

![내 작업 화면](screenshots/my-work.png)

## 실행

```powershell
$env:ENODE_MEDIATOR_TOKEN = "dev-dashboard-token"
python .\server.py
```

- 운영 화면: <http://127.0.0.1:8765/>
- 내 작업: <http://127.0.0.1:8765/me>

## 설정

`config.json`에서 Mediator 주소·토큰, enode 바이너리 경로, 노드 설정 후보 경로, Postgres 호스트·포트를 바꿀 수 있습니다. 환경변수 `ENODE_MEDIATOR_URL`, `ENODE_MEDIATOR_TOKEN`, `ENODE_PRINCIPAL`, `ENODE_DASHBOARD_HOST`, `ENODE_DASHBOARD_PORT`, `ENODE_DASHBOARD_CONFIG`, `ENODE_BIN_DIR`, `ENODE_GO_PATHS`, `ENODE_NODE_CONFIG_PATHS`, `ENODE_DATABASE_HOST`, `ENODE_DATABASE_PORT`가 같은 항목보다 우선합니다. 여러 경로 환경변수는 Windows에서 세미콜론으로 구분합니다.

토큰을 외부에 공유하거나 저장소에 커밋하지 마세요. 현재 들어 있는 `dev-dashboard-token`은 로컬 데모용 값입니다.

## 데이터 신뢰성

- LIVE: PC 셋업 점검, Mediator capability, Run과 record tar, Ask 인박스, git 이메일
- MOCK: 노드 지도, 여러 Run을 가로지르는 AI 누적 집계, 사용자가 로컬에 저장하는 프로젝트 라벨

Mediator가 꺼져 있어도 웹 서버와 화면은 유지되고 각 LIVE 패널에 연결 실패가 표시됩니다.

## 현재 검증 상태

- Python 문법 및 JavaScript 문법 검사 통과
- `/`, `/me`, `/api/setup` HTTP 200 확인
- 실제 브라우저에서 운영/사용자 화면 렌더링 확인
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
   └─ my-work.png
```
