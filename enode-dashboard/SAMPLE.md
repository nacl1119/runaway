# enode 대시보드 샘플 화면

GitHub에서 실행 없이 확인하는 화면 안내서입니다.

- [운영 화면](#운영-화면)
- [사용자 화면](#사용자-화면)
- [화면별 역할](#화면별-역할)
- [대시보드 설명서](README.md)

## 운영 화면

[![운영 대시보드 전체 화면](screenshots/operations-dashboard.png)](screenshots/operations-dashboard.png)

위 이미지를 클릭하면 원본 크기로 볼 수 있습니다. 운영 화면은 현재 PC의 프로세스 목록을 클러스터 상태로 오해하지 않고, Mediator의 `GET /v1/nodes`가 반환한 만료 전 advertisement와 응답 시점 lease를 표시합니다.

### Fleet nodes

[![Fleet nodes 상세](screenshots/operations-running-enodes-detail.png)](screenshots/operations-running-enodes-detail.png)

- `ACTIVE ADVERTISEMENTS`: Mediator가 관측하는 만료 전 노드 광고
- `LEASE OBSERVED`: 응답 시점에 관측된 lease이며 이후 배정 가능성을 보장하지 않음
- `agent.reason`과 attrs: 노드가 광고하는 실제 capability
- `WORK TEMPLATES`: 램덤프 분석·빌드·퓨징·테스트·Gerrit push를 분류하는 사용자 작업 템플릿

### Run 조사

[![Run 조사 상세](screenshots/operations-run-inspection-detail.png)](screenshots/operations-run-inspection-detail.png)

Run ID를 입력해 상태, 단계 타임라인, 판정, record와 harness 근거를 조사하는 영역입니다.

## 사용자 화면

[![사용자 대시보드 전체 화면](screenshots/my-work.png)](screenshots/my-work.png)

위 이미지를 클릭하면 원본 크기로 볼 수 있습니다. 사용자 화면은 개인 작업과 선택적 Run ID를 브라우저에 저장하고, 연결된 Run만 Mediator에서 조회합니다.

### 내 작업 목록

[![내 작업 목록 상세](screenshots/my-work-list-detail.png)](screenshots/my-work-list-detail.png)

램덤프 분석, 빌드, 퓨징, 테스트 수행·결과 확인, Gerrit 패치 push 작업을 한 목록에서 관리합니다. 정식 Run 상태는 `RESOLVING`, `ALLOCATING`, `RUNNING`, `VERIFYING`, `SUCCEEDED`, `FAILED`만 사용합니다.

### DLC 맥락 태그

[![DLC 맥락 태그 상세](screenshots/my-work-dlc-context-detail.png)](screenshots/my-work-dlc-context-detail.png)

현재 Run에서 집중할 개발 맥락을 보여주는 화면상의 추정입니다. 진행률이나 enode의 정식 상태기계가 아닙니다.

### Run 상세

[![Run 상세](screenshots/my-work-run-detail.png)](screenshots/my-work-run-detail.png)

목록의 짧은 상태만으로 판단하기 어려울 때 단계, 판정, record와 AI 실행 근거를 확인합니다.

## 화면별 역할

| 화면 | 대상 | 목적 | 데이터 성격 |
|---|---|---|---|
| Fleet nodes | 운영자 | 노드 광고와 관측 lease 확인 | LIVE OBSERVATION |
| Run 조사 | 운영자 | 단일 Run의 실패·판정 근거 조사 | LIVE |
| 내 작업 목록 | 사용자 | 개인 개발 작업과 Run 상태 관리 | LOCAL + LIVE RUN |
| DLC 맥락 태그 | 사용자 | 현재 검토할 개발 맥락 요약 | LIVE + INFERENCE |
| Run 상세 | 사용자 | 단계·판정·harness 근거 확인 | LIVE |

Mediator가 오프라인인 캡처는 연결 실패를 그대로 표시합니다. 샘플 성공 값을 만들어 실제 상태처럼 보이게 하지 않습니다.
