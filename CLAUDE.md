# 이 저장소에서 일할 때

## 원본과 빌드 결과물을 구분한다

`docs/`는 GitHub Pages가 배포하는 **빌드 결과물**이다. 직접 고치지 않는다.
진짜 원본은 `primer-src/`(primer)다. `primer-src/template.html`을 고친 뒤
`cd primer-src && perl build.pl`로 다시 빌드해서 `docs/`에 반영한다.
자세한 건 [primer-src/README.md](primer-src/README.md)를 본다.

## nacl1119은 같은 저장소를 여러 세션에 동시에 맡긴다

이 저장소의 로컬 클론(`C:\Users\MSI\Documents\enode-work\runaway`)을 여러
Claude Code 세션이 동시에 쓰는 일이 흔하다 — 별도 클론이 아니라 **같은
워킹 디렉터리를 공유**하므로, 한 세션의 커밋이 다른 세션에도 즉시 보인다.

파일을 쓰기 전에:

1. `ListAgents`로 다른 세션이 떠 있는지 확인한다
2. `git status`가 자신이 만들지 않은 변경을 보이면(또는 Read 도구가
   "changed on disk" 경고를 주면) 되돌리거나 덮어쓰지 않는다
3. 겹칠 것 같으면 `SendMessage`로 그 세션에 물어서 파일을 나누거나
   순서를 정한다

## primer(재가공 문서·비교 분석) 콘텐츠의 인용 규칙

`primer-src/template.html`처럼 원문을 발췌해서 근거로 삼는 페이지에
새 인용 블록(`source-block`)을 추가하면, **발행 전에 반드시** 각 인용을
`git show origin/<branch>:<path> | grep`으로 실제 원본과 대조한다. 서로
떨어진 두 문장을 이어붙일 땐 "(중략)" 같은 표시를 명시한다. 마크다운
원문의 `**강조**`나 `` `code` ``를 그대로 넣지 않는다 — HTML이라 안
렌더링되고 글자 그대로 보인다. `<b>`/`<code>` 태그로 바꿔 쓴다.
